import './style.css';
import './math.css';
import './paper.css';
import './fonts.css';
import './textbook.css';
import './theme.css';
import './materials.css';
import './print.css';
import { icon } from '../ui/icons';
import { preparePrint, createPrintView, type PrintOptions } from './print';
import generationInstructions from '../../skills/paper-notebook/assets/agent-prompt.txt?raw';
import { PageSurface, type SurfacePage, type FragmentBlock } from './surface';
import { authoredAnnotations } from '../model/study';
import { PaperEditor, readingMarks } from './editor';
import { paperShape, paperSize } from '../model/paper';
import { saveDraft, loadDraft } from '../model/store';
import { unzipSync, strFromU8 } from 'fflate';
import { captureShell, exportHTML, exportBundle, exportPreview, pagePNG, notices } from '../io/export';
import { importText, exportMarkdown } from '../io/markdown';
import { mergeUpdate, parseDocument, resolveSelector } from '../model/document';
import { conceptExample } from '../examples';
import { introNotebook } from '../intro';
import { blocksOf, pagesOf, textOf, uid, type Block, type Doubt, type NotebookDocument, type Page, type ReaderPresentation, type ReaderLayout, type ReaderDirection, type PaperShape, type ReadingAnchor } from '../model/types';
import { renderBlock } from '../ui/blocks';
import { button, el, modal, textarea, input, label, select, checkbox, download, safeName, copyText, toast, enhanceSelects } from '../ui/dom';
import { setLocale } from '../ui/i18n';
import { captureSelection, questionPrompt, readerCopy, type SelectionPart, type ExportChoices } from './records';

// Capture the bundled shell before any reader UI or user data enters the DOM.
captureShell();
const raw=document.querySelector('#notebook-data')?.textContent||'null';
let embedded:NotebookDocument|null=null,loadError='';
try{const value=JSON.parse(raw);if(value)embedded=parseDocument(value).document;}catch(error){loadError=String(error);}
const appRoot=el('div','reader-app-root');document.querySelector('#app')?.append(appRoot);
if(new URLSearchParams(location.search).has('poster'))appRoot.classList.add('poster-mode');
type Anchor=Omit<ReadingAnchor,'offset'> & {top:number};
const interactive='button,a,input,textarea,select,summary,dialog,.reader-selection-toolbar,.stationery,[contenteditable=true],.paper-note,.object-handles';

class ReaderApp {
  editor:PaperEditor;private sheets:SurfacePage[]=[];private paginationKey='';private saveTick=0;private ready=false;toolsOpen=false;zoom=1;immersive=false;private chromeTick=0;
  invalidate=()=>{this.paginationKey='';};
  get shape():PaperShape{return paperShape(this.profile?.pageShape,innerWidth,innerHeight);}
  d:NotebookDocument; pageIndex=0; profile:ReaderPresentation; sidebarOpen:boolean;
  sidebarTab:'contents'|'highlights'|'records'|'sources'='contents'; search=''; private sessionBooks=new Map<string,NotebookDocument>();
  private toolbar:HTMLElement|null=null;
  private gesture:{x:number;y:number;page:HTMLElement;pointer:number;side:'left'|'right';progress:number}|null=null;
  private scrollObserver:IntersectionObserver|null=null;
  private pageHeights=new Map<string,number>();
  private liveSlots=new Set<HTMLElement>();
  private scrollTick=0; private resizeTick=0; private lastWidth=innerWidth; private selectionTick=0;
  private printJob:Awaited<ReturnType<typeof preparePrint>>|undefined;private printPreparing=false;private fontsCalibrated=false;
  private printState:{anchor:Anchor;index:number;x:number;y:number}|undefined;private printRestoring=false;
  private turnAnimations=new Set<Animation>();
  constructor(d:NotebookDocument){
    this.d=d;if(d.userState.preferences.fontSize===18)d.userState.preferences.fontSize=24;this.sessionBooks.set(d.notebook.id,d);
    this.profile={font:'hand',lineSpacing:1.85,layout:'single',direction:'horizontal',sidebar:innerWidth<1000?'collapsed':'open',theme:'paper-light',motion:'full',pageShape:'auto',transition:'turn',...(d.extensions.readerProfile as Partial<ReaderPresentation>||{})};
    this.editor=new PaperEditor(this,appRoot);
    this.sidebarOpen=innerWidth>=800&&this.profile.sidebar==='open';setLocale(this.en?'en':'zh');
    this.paginate();this.pageIndex=this.indexForAnchor(d.userState.readingAnchor||{pageId:d.userState.lastPageId});
    const saved=structuredClone(d.userState.readingAnchor);this.render();if(saved)this.restoreSaved(saved);if(this.actualLayout()==='scroll'&&!saved)requestAnimationFrame(()=>this.goPage(this.pageIndex));this.bind();(window as unknown as {reader:ReaderApp}).reader=this;
    // Font subsets may emit several loadingdone events while a new page is mounted.
    // One ready pass is enough to correct pagination without replacing controls in a loop.
    document.fonts.ready.then(()=>{if(this.fontsCalibrated)return;this.fontsCalibrated=true;const a=this.anchor();this.invalidate();this.render(a);});
    const noDraft=new URLSearchParams(location.search).has('demo');
    if(!noDraft)loadDraft(d.notebook.id).then(draft=>{if(draft&&draft.userState.updatedAt>d.userState.updatedAt){this.d=parseDocument(draft).document;this.profile={...this.profile,...this.d.extensions.readerProfile as object};this.invalidate();this.paginate();const saved=structuredClone(this.d.userState.readingAnchor);this.pageIndex=this.indexForAnchor(saved||{pageId:this.d.userState.lastPageId});this.render();if(saved)this.restoreSaved(saved);toast('已恢复本机草稿');}this.ready=true;}).catch(()=>{this.ready=true;toast('本机草稿不可用，请及时导出副本。',true);});else this.ready=true;
    if(loadError)toast(this.t('内嵌内容无效，当前显示示例。可重新导入源文件。','Embedded data is invalid. A sample is open; import your source again.'),true);
  }
  get pages(){return this.sheets.length?this.sheets:pagesOf(this.d) as SurfacePage[]} get page(){return this.pages[this.pageIndex]||this.pages[0]}
  get sheetSize(){const size=paperSize(this.shape);if(this.immersive||innerWidth<600||this.shape==='portrait'){const inset=this.immersive?0:24,head=this.immersive?0:76;return {width:size.width,height:Math.max(580,Math.round(size.width*(innerHeight-head)/(innerWidth-inset)))};}const availableWidth=Math.max(300,innerWidth-(this.sidebarOpen?284:48));return {...size,height:Math.max(size.height,Math.min(1050,Math.round(size.width*(innerHeight-76)/availableWidth)))};}
  get readingSize(){return this.d.userState.preferences.fontSize*(innerWidth<600?1.5:1);}
  paginate(){const key=JSON.stringify([this.d.notebook,this.d.userState.layouts,this.shape,this.readingSize,this.sheetSize,this.profile.font,this.profile.lineSpacing]);if(key===this.paginationKey)return;const old=this.sheets[this.pageIndex];this.d.extensions.readerProfile={...this.profile};this.sheets=new PageSurface(this.d,this.shape,this.readingSize,b=>this.block(b),this.sheetSize).paginate();this.paginationKey=key;if(old){const index=this.sheets.findIndex(p=>p.id===old.id&&p.part===old.part);this.pageIndex=index>=0?index:Math.min(this.pageIndex,this.sheets.length-1);}}
  get en(){return this.d.userState.preferences.language==='en'}
  async pageImage(){await document.fonts.ready;return pagePNG(appRoot.querySelector<HTMLElement>('.page-surface')!);}
  get marks(){return this.d.userState.annotations}
  t(zh:string,en:string){return this.en?en:zh}
  actualLayout():Exclude<ReaderLayout,'auto'>{
    if(this.profile.layout==='spread')return innerWidth>=1000?'spread':'single';
    if(this.profile.layout!=='auto')return this.profile.layout;
    return 'single';
  }
  motion(){return this.profile.motion!=='reduced'&&this.d.userState.preferences.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches}
  indexForAnchor(a:Pick<ReadingAnchor,'pageId'|'blockId'|'sheet'|'textOffset'>){
    const own=this.pages.map((p,index)=>({p,index})).filter(({p})=>p.id===a.pageId);
    if(a.blockId){const matching=own.filter(({p})=>p.blocks.some(b=>b.id===a.blockId));if(a.textOffset!==undefined){const at=matching.find(({p})=>p.blocks.some(b=>b.id===a.blockId&&((b as FragmentBlock)._offset||0)<=a.textOffset!&&((b as FragmentBlock)._offset||0)+(b.text?.length||textOf(b).length)>a.textOffset!));if(at)return at.index;}const part=matching.find(({p})=>p.part===a.sheet);if(part)return part.index;if(matching.length)return matching[0].index;}
    return own.find(({p})=>p.part===a.sheet)?.index??own[0]?.index??0;
  }
  anchorNode(a:Pick<ReadingAnchor,'pageId'|'blockId'|'sheet'|'textOffset'>){const page=this.pages[this.indexForAnchor(a)],paper=appRoot.querySelector<HTMLElement>(`[data-page="${CSS.escape(page.id)}"][data-part="${page.part}"]`);return a.blockId?paper?.querySelector<HTMLElement>(`[data-block="${CSS.escape(a.blockId)}"]`):paper;}
  remember(){this.d.extensions.readerProfile={...this.profile,sidebar:this.sidebarOpen?'open':'collapsed'};const a=this.anchor(),r=this.anchorNode(a)?.getBoundingClientRect();this.d.userState.lastPageId=a.pageId;this.d.userState.readingAnchor={pageId:a.pageId,blockId:a.blockId,sheet:a.sheet,textOffset:a.textOffset,offset:r?Math.max(0,Math.min(1,(100-r.top)/Math.max(1,r.height))):0};if(this.ready){this.d.userState.updatedAt=new Date().toISOString();clearTimeout(this.saveTick);this.saveTick=window.setTimeout(()=>saveDraft(this.d).catch(()=>{}),300);}}
  anchor():Anchor{
    const nodes=[...appRoot.querySelectorAll<HTMLElement>('.reader-page [data-block]')];
    const block=nodes.find(n=>n.getBoundingClientRect().bottom>100);
    const paper=block?.closest<HTMLElement>('[data-page]');return {pageId:paper?.dataset.page||this.page.id,blockId:block?.dataset.block,sheet:Number(paper?.dataset.part??this.page.part),textOffset:Number(block?.querySelector<HTMLElement>('.ink-text')?.dataset.offset||0),top:block?.getBoundingClientRect().top||100};
  }
  restore(a?:Anchor){if(!a)return;requestAnimationFrame(()=>{
    const target=this.anchorNode(a);
    if(target)window.scrollBy({top:target.getBoundingClientRect().top-a.top,behavior:'instant'});
  })}
  restoreSaved(a:ReadingAnchor){requestAnimationFrame(()=>{const node=this.anchorNode(a);if(node){const r=node.getBoundingClientRect();window.scrollBy({top:r.top+a.offset*r.height-100,behavior:'instant'});this.remember()}})}
  render(a?:Anchor){
    document.documentElement.dataset.paperTheme=this.profile.theme;
    this.editor.cancel(false);
    this.cancelTurn();this.paginate();if(a)this.pageIndex=this.indexForAnchor(a);
    this.scrollObserver?.disconnect();this.liveSlots.clear();this.clearToolbar();appRoot.replaceChildren();
    document.documentElement.lang=this.en?'en':'zh-CN';document.title=this.d.notebook.title+' · Paper Notebook';
    appRoot.dataset.layout=this.actualLayout();appRoot.dataset.direction=this.profile.direction;appRoot.dataset.shape=this.shape;
    appRoot.dataset.theme=this.profile.theme;appRoot.dataset.motion=this.motion()?'full':'reduced';appRoot.classList.toggle('is-immersive',this.immersive);
    appRoot.classList.toggle('sidebar-collapsed',!this.sidebarOpen);appRoot.style.setProperty('--reading-size',this.readingSize+'px');
    const header=el('header','reader-header');const brand=button(this.t('关于 Paper Notebook 与项目导航','About Paper Notebook and project links'),()=>this.showAbout(),'reader-brand','');brand.append(el('span','reader-seal','纸'),el('div','book-identity'));brand.lastElementChild!.append(el('small','book-eyebrow','PAPER NOTEBOOK · 学习笔记'),el('strong','',this.d.notebook.title));
    const controls=el('nav','reader-controls');controls.setAttribute('aria-label',this.t('阅读操作','Reader controls'));
    const contents=button(this.t('目录','Contents'),()=>this.toggleSidebar(),'reader-control','');contents.append(icon('contents'));contents.setAttribute('aria-expanded',String(this.sidebarOpen));contents.setAttribute('aria-controls','reader-sidebar');
    const files=el('details','reader-files'),fileTrigger=el('summary');fileTrigger.title=this.t('文件：导入、下载与 PDF','Files: import, download and PDF');fileTrigger.setAttribute('aria-label',fileTrigger.title);fileTrigger.setAttribute('aria-expanded','false');fileTrigger.append(icon('folder'));files.append(fileTrigger);files.ontoggle=()=>fileTrigger.setAttribute('aria-expanded',String(files.open));const menu=el('div','reader-file-menu');menu.append(button(this.t('导入','Import'),()=>{files.open=false;this.showImport()}),button(this.t('下载','Download'),()=>{files.open=false;this.showExport()}),button(this.t('导出 PDF','Export PDF'),()=>{files.open=false;this.showPDF()}));files.append(menu);
    const theme=button(this.t('切换日夜模式','Toggle day and night'),()=>{const a=this.anchor();this.profile.theme=this.profile.theme==='paper-night'?'paper-light':'paper-night';this.render(a)},'reader-control theme-toggle','');theme.append(icon(this.profile.theme==='paper-night'?'sun':'moon'));theme.setAttribute('aria-pressed',String(this.profile.theme==='paper-night'));
    const settings=button(this.t('阅读设置','Reading settings'),()=>this.showSettings(),'reader-control','');settings.append(icon('type'));const immersive=button(this.t('沉浸阅读','Immersive reading'),()=>this.setImmersive(true),'reader-control immersion-entry','');immersive.append(icon('expand'));
    controls.append(contents,theme,settings,immersive,files);
    header.append(brand,controls);appRoot.append(header);
    const shell=el('div','reader-shell');shell.append(this.renderSidebar());
    if(this.sidebarOpen&&(innerWidth<800||this.immersive)){const backdrop=button(this.t('收起目录','Close contents'),()=>this.toggleSidebar(false),'sidebar-backdrop');backdrop.tabIndex=-1;shell.append(backdrop)}
    const stage=el('main','reader-stage');stage.id='reader-stage';stage.tabIndex=-1;
    const wrap=el('div','reader-page-wrap');
    if(this.actualLayout()==='scroll')this.renderScroll(wrap);else this.visiblePages().forEach(p=>wrap.append(this.renderPage(p)));
    stage.append(wrap,this.renderNavigation());shell.append(stage);appRoot.append(shell);
    const reveal=button('显示阅读控制',()=>this.wakeChrome(),'reveal-controls','•••');appRoot.append(reveal);
    this.fitPages();this.editor.paint();this.remember();this.restore(a);this.wakeChrome();
  }
  fitPages(){const stage=appRoot.querySelector<HTMLElement>('.reader-stage')!,columns=this.actualLayout()==='spread'?2:1,gap=this.immersive?0:24;stage.style.overflowX=this.zoom>1?'auto':'clip';const wrap=stage.querySelector<HTMLElement>('.reader-page-wrap');if(wrap){wrap.style.width=this.zoom>1?'max-content':'100%';wrap.style.overflow='visible';}for(const paper of stage.querySelectorAll<HTMLElement>('.page-surface')){const width=Math.max(240,(stage.clientWidth-gap-(columns-1)*16)/columns),height=Math.max(300,innerHeight-(this.immersive?0:76)),scale=Math.min(width/paper.offsetWidth,height/paper.offsetHeight,2)*this.zoom,slot=paper.parentElement!;paper.style.transform=`scale(${scale})`;slot.style.width=paper.offsetWidth*scale+'px';slot.style.height=paper.offsetHeight*scale+'px';slot.style.setProperty('--paper-scale',String(scale));}this.positionNavigation();}
  positionNavigation(){const nav=appRoot.querySelector<HTMLElement>('.reader-navigation'),paper=appRoot.querySelector<HTMLElement>('.page-surface');if(!nav||!paper)return;const r=paper.getBoundingClientRect();nav.style.left=(r.left+r.width/2)+'px';nav.style.top=Math.min(innerHeight-56,r.bottom-58)+'px';nav.style.maxWidth=Math.max(280,r.width-24)+'px';}
  setImmersive(value=!this.immersive){const a=this.anchor();this.immersive=value;this.sidebarOpen=false;this.toolsOpen=false;this.invalidate();this.render(a);window.scrollTo(0,0);}
  wakeChrome(){clearTimeout(this.chromeTick);appRoot.classList.remove('immersive-quiet');const nav=appRoot.querySelector<HTMLElement>('.reader-navigation');if(nav)nav.inert=false;if(this.immersive)this.chromeTick=window.setTimeout(()=>{if(this.toolsOpen||this.toolbar||this.sidebarOpen||document.querySelector('dialog[open]')||nav?.contains(document.activeElement))return;appRoot.classList.add('immersive-quiet');if(nav)nav.inert=true;},2600);}
  visiblePages(){return this.pages.slice(this.pageIndex,this.pageIndex+(this.actualLayout()==='spread'?2:1))}
  renderScroll(wrap:HTMLElement){
    this.pages.forEach((page,index)=>{const slot=el('div','reader-page-slot');slot.dataset.pageSlot=page.id;slot.dataset.index=String(index);slot.style.minHeight=(this.pageHeights.get(page.id+':'+page.part)||Math.max(800,innerHeight-120))+'px';
      if(Math.abs(index-this.pageIndex)<2){slot.append(this.renderPage(page));this.liveSlots.add(slot)}wrap.append(slot);
    });
    this.scrollObserver=new IntersectionObserver(entries=>{if(this.printState)return;for(const entry of entries){const slot=entry.target as HTMLElement,index=Number(slot.dataset.index),page=this.pages[index];
      if(entry.isIntersecting){if(!slot.firstChild){slot.append(this.renderPage(page));this.fitPages();this.editor.paint()}slot.style.minHeight='';this.liveSlots.add(slot)}
      else if(slot.firstChild){const height=slot.getBoundingClientRect().height;this.pageHeights.set(page.id+':'+page.part,height);slot.style.minHeight=height+'px';slot.replaceChildren();this.liveSlots.delete(slot)}
    }},{rootMargin:'1100px 0px'});
    requestAnimationFrame(()=>{wrap.querySelectorAll('.reader-page-slot').forEach(n=>this.scrollObserver?.observe(n))});
  }
  renderSidebar(){
    const aside=el('aside','reader-sidebar');aside.id='reader-sidebar';aside.setAttribute('aria-label',this.t('目录、记录与来源','Contents, records and sources'));aside.inert=!this.sidebarOpen;
    const tabs=el('nav','sidebar-tabs');for(const [id,zh,en] of [['contents','目录','Contents'],['highlights','重点','Key passages'],['records','记录','Records'],['sources','来源','Sources']] as const){const b=button(this.t(zh,en),()=>{this.sidebarTab=id;this.refreshSidebar()},'sidebar-tab');b.setAttribute('aria-pressed',String(this.sidebarTab===id));tabs.append(b)}aside.append(tabs);
    if(this.sidebarTab==='contents'){
      const search=input(this.search,this.t('搜索正文','Search text'));search.type='search';search.setAttribute('aria-label',this.t('搜索正文','Search text'));search.className='sidebar-search';
      const list=el('div','sidebar-list');const fill=()=>{list.replaceChildren();if(this.search.trim()){
        const query=this.search.toLocaleLowerCase();let count=0;
        this.pages.forEach(p=>p.blocks.forEach(b=>{if((p.title+' '+(b.title||'')+' '+textOf(b)).toLocaleLowerCase().includes(query)){count++;const hit=button(b.title||textOf(b).slice(0,70)||p.title,()=>this.goBlock(p.id,b.id),'sidebar-result');hit.append(el('span','result-page',p.title));list.append(hit)}}));
        if(!count)list.append(el('p','empty-state',this.t('没有匹配内容','No results')));
      }else this.d.notebook.chapters.forEach(c=>{const section=el('section','sidebar-chapter');section.append(el('h2','',c.title));c.pages.forEach(p=>{const b=button(p.title,()=>this.goPage(this.pages.findIndex(s=>s.id===p.id),true),'sidebar-page');b.dataset.pageLink=p.id;b.setAttribute('aria-current',p.id===this.page.id?'page':'false');section.append(b);
        for(const block of p.blocks.filter(b=>['formula','diagram','chart','exercise','comparison'].includes(b.type)))section.append(button(this.blockLabel(block),()=>this.goBlock(p.id,block.id),'sidebar-block'));
      });list.append(section)})};
      search.oninput=()=>{this.search=search.value;fill()};aside.append(search,list);fill();
    }else if(this.sidebarTab==='highlights'){
      for(const page of pagesOf(this.d)){
        const marks=[...authoredAnnotations(this.d,page.id),...this.marks.filter(a=>a.pageId===page.id&&a.kind!=='freehand'&&(!a.status||a.status==='resolved'))];if(!marks.length)continue;
        const section=el('section','key-passages');section.append(el('h2','key-page-title',page.title));
        for(const mark of marks){const text=mark.selectors.map(s=>s.exact).join(' … ');if(!text)continue;const block=page.blocks.find(b=>b.id===mark.selectors[0]?.blockId),card=button(text,()=>this.goBlock(page.id,block?.id||''),'key-passage');card.dataset.kind=mark.kind;if(block?.study?.aside)card.append(el('small','key-explanation',block.study.aside));section.append(card)}aside.append(section);
      }
    }else if(this.sidebarTab==='records'){
      const pending=this.d.userState.doubts.filter(q=>q.status==='open');
      if(pending.length)aside.append(button(this.t('导出答疑任务','Export questions'),()=>download(safeName(this.d.notebook.title)+'-questions.txt',questionPrompt(this.d)),'sidebar-action'));
      for(const q of this.d.userState.doubts){const card=el('div','record-card');card.append(button((q.status==='resolved'?'✓ ':'')+q.question,()=>this.showDoubt(q),'record-title'),button('“'+q.selector.exact.slice(0,64)+'”',()=>this.goBlock(q.pageId,q.selector.blockId),'record-quote'));if(resolveSelector(this.d,q.selector).status!=='resolved')card.append(el('span','record-status',this.t('待关联原文','Source needs relinking')));aside.append(card)}
      this.editor.pending(aside);
      this.editor.notes(aside);
      for(const mark of this.marks.filter(a=>a.status!=='needs-placement')){const row=el('div','record-card');row.append(button(mark.kind==='freehand'?'手绘笔迹 · '+(mark.tool||'pen'):mark.selectors.map(s=>s.exact).join(' … ').slice(0,95),()=>this.goBlock(mark.pageId,mark.selectors[0]?.blockId||''),'record-title '+`record-${mark.kind}`),button(this.t('移除标记','Remove mark'),()=>this.editor.change(()=>{this.d.userState.annotations=this.d.userState.annotations.filter(a=>a.id!==mark.id)}),'record-remove','×'));if(mark.status&&mark.status!=='resolved')row.append(el('span','record-status',this.t('待关联原文','Source needs relinking')));aside.append(row)}
      if(!this.marks.length&&!this.d.userState.doubts.length&&!this.d.userState.notes.length)aside.append(el('p','empty-state',this.t('选取原文可添加阅读标记；点击已有标记可删除。','Select a passage to mark it. Click an existing mark to remove it.')));
    }else{
      this.d.notebook.sources.forEach(s=>{const card=el('div','source-card');if(s.url&&/^https?:\/\//i.test(s.url)){const a=el('a','',s.title+' ↗');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';card.append(a)}else card.append(el('p','',s.title));if(s.locator)card.append(el('p','',s.locator));aside.append(card)});
      if(!this.d.notebook.sources.length)aside.append(el('p','empty-state',this.t('此教程尚未列出外部来源。','No external sources listed.')));
      aside.append(button(this.t('关于与许可','About and licenses'),()=>this.showAbout(),'sidebar-action'));
    }
    const support=el('section','sidebar-support');support.append(el('p','',this.t('这本笔记的工具来自开源项目。喜欢这种学习方式？给它留一颗星，或来提个点子。','Enjoy this notebook? Leave a star or share an idea.')));const star=el('a','support-star','☆ 给小笔记一颗 Star ↗');star.href='https://github.com/BurntRoses/paper-notebook';star.target='_blank';star.rel='noopener noreferrer';const nav=el('nav');for(const [name,url]of [['生成新笔记','https://burntroses.github.io/paper-notebook/chat-start.html'],['项目主页','https://burntroses.github.io/paper-notebook/'],['反馈建议','https://github.com/BurntRoses/paper-notebook/issues']]){const a=el('a','',name);a.href=url;a.target='_blank';a.rel='noopener noreferrer';nav.append(a);}support.append(star,nav);aside.append(support);
    return aside;
  }
  refreshSidebar(){const old=appRoot.querySelector('.reader-sidebar');old?.replaceWith(this.renderSidebar())}
  toggleSidebar(open=!this.sidebarOpen){const a=this.anchor();this.sidebarOpen=open;this.render(a)}
  blockLabel(b:Block){const icon:Record<string,string>={formula:'∑',diagram:'◇',chart:'⌁',exercise:'?',comparison:'▦'};const names:Record<string,string>={formula:this.t('公式','Formula'),diagram:this.t('图示','Diagram'),chart:this.t('数据图','Data chart'),exercise:this.t('练习','Exercise'),comparison:this.t('对照表','Comparison')};return `${icon[b.type]} ${b.title||b.question||names[b.type]}`}
  renderPage(page:SurfacePage){
    const slot=el('div','paper-slot');
    const paper=new PageSurface(this.d,this.shape,this.readingSize,b=>this.block(b),this.sheetSize).render(page,this.pages.indexOf(page));
    for(const side of ['left','right'] as const){const corner=button(side==='right'?'拖动页角到下一页':'拖动页角到上一页',()=>{},'page-corner corner-'+side,'');corner.dataset.corner=side;paper.append(corner);}
    slot.append(paper);return slot;
  }
  block(b:Block){const root=renderBlock(b,this.d,{answer:(id,answer)=>{this.d.userState.answers[id]=structuredClone(answer);const pageId=this.page.id;this.invalidate();this.paginate();const index=this.pages.findIndex(p=>p.id===pageId&&p.blocks.some(b=>b.id===id));if(index>=0)this.pageIndex=index;this.render();},check:(id,value)=>{this.d.userState.checks[id]=value;this.remember()},edit:()=>{},image:b=>this.showImage(b)});
    (root as HTMLElement & {__block:Block}).__block=blocksOf(this.d).find(source=>source.id===b.id)||b;return root;
  }
  renderNavigation(){
    const footer=el('footer','reader-navigation');footer.setAttribute('aria-label',this.t('翻页','Page navigation'));const prev=button(this.t('上一页','Previous page'),()=>this.turn(-1),'reader-nav',this.profile.direction==='horizontal'?'←':'↑'),next=button(this.t('下一页','Next page'),()=>this.turn(1),'reader-nav',this.profile.direction==='horizontal'?'→':'↓');prev.disabled=this.pageIndex===0;next.disabled=this.pageIndex+this.step>=this.pages.length;
    const count=button('页码与目录',()=>this.toggleSidebar(),'reader-count');count.textContent=this.countLabel();const annotate=button('圈画标记',()=>{this.editor.cacheSelection();this.toolsOpen=!this.toolsOpen;const old=appRoot.querySelector('.reader-navigation');old?.replaceWith(this.renderNavigation());this.positionNavigation();this.wakeChrome()},'reader-footer-action','◌');annotate.setAttribute('aria-expanded',String(this.toolsOpen));annotate.onpointerdown=e=>{this.editor.cacheSelection();e.preventDefault();};
    footer.append(prev,count,next,annotate);if(this.immersive)footer.append(button('退出沉浸阅读',()=>this.setImmersive(false),'reader-footer-action','⛶'));if(this.toolsOpen){const panel=this.editor.toolbar();panel.append(el('p','mark-hint','选取原文后标记 · 仅保存阅读记录'));footer.append(panel);}return footer;
  }
  get step(){return this.actualLayout()==='spread'?2:1}
  countLabel(){return `${this.pageIndex+1}${this.step===2&&this.pageIndex+1<this.pages.length?'–'+(this.pageIndex+2):''} / ${this.pages.length}`}
  turn(delta:number){this.goPage(Math.max(0,Math.min(this.pages.length-1,this.pageIndex+delta*this.step)))}
  goPage(index:number,fromSidebar=false){
    if(index<0||index>=this.pages.length)return;
    const oldIndex=this.pageIndex;this.pageIndex=index;const close=fromSidebar&&(innerWidth<800||this.immersive);if(close)this.sidebarOpen=false;
    if(this.actualLayout()==='scroll'&&!close){const slot=appRoot.querySelector<HTMLElement>(`.reader-page-slot[data-index="${this.pageIndex}"]`);if(slot){if(!slot.firstChild){slot.append(this.renderPage(this.page));this.fitPages();this.editor.paint()}slot.scrollIntoView({block:'start',behavior:this.motion()?'smooth':'instant'});this.remember();this.updateProgress();return}}
    const snapshot=this.motion()&&this.profile.transition!=='none'&&oldIndex!==index?appRoot.querySelector<HTMLElement>('.reader-page-wrap')?.cloneNode(true) as HTMLElement:undefined;
    this.render();window.scrollTo({top:0,behavior:'instant'});
    if(snapshot&&this.actualLayout()!=='scroll')this.animatePage(snapshot,index>oldIndex?1:-1);
  }
  animatePage(snapshot:HTMLElement,sign:number){
    const wrap=appRoot.querySelector<HTMLElement>('.reader-page-wrap')!;
    const scene=el('div','page-transition');scene.setAttribute('aria-hidden','true');scene.inert=true;scene.append(snapshot);wrap.parentElement!.append(scene);
    const rect=wrap.getBoundingClientRect();scene.style.cssText=`left:${wrap.offsetLeft}px;top:${wrap.offsetTop}px;width:${rect.width}px;max-height:${Math.min(rect.height,innerHeight-(this.immersive?0:70))}px`;
    const vertical=this.profile.direction==='vertical',axis=vertical?'Y':'X';const mode=this.profile.transition||'turn';let keyframes:Keyframe[];
    if(mode==='turn'){
      snapshot.style.transformOrigin=vertical?(sign>0?'center top':'center bottom'):(sign>0?'left center':'right center');
      keyframes=[{transform:`perspective(1800px) rotate${vertical?'X':'Y'}(0deg)`,opacity:1,filter:'brightness(1)'},{transform:`perspective(1800px) rotate${vertical?'X':'Y'}(${sign*(vertical?58:-58)}deg)`,opacity:1,filter:'brightness(.87)',offset:.65},{transform:`perspective(1800px) rotate${vertical?'X':'Y'}(${sign*(vertical?95:-95)}deg)`,opacity:0,filter:'brightness(.8)'}];
    }else if(mode==='cover'){const shadow=getComputedStyle(wrap).getPropertyValue('--turn-shadow').trim();keyframes=[{transform:'translate(0)',boxShadow:`-10px 0 24px ${shadow}`},{transform:`translate${axis}(${-sign*105}%)`,boxShadow:`-20px 0 35px ${shadow}`}];}
    else keyframes=[{transform:'translate(0)',opacity:1},{transform:mode==='slide'?`translate${axis}(${-sign*100}%)`:'translate(0)',opacity:mode==='fade'?0:1}];
    const animation=snapshot.animate(keyframes,{duration:mode==='turn'?380:280,easing:'cubic-bezier(.22,.68,.23,1)',fill:'forwards'});this.turnAnimations.add(animation);const finish=()=>{scene.remove();this.turnAnimations.delete(animation)};animation.finished.then(finish,finish);
    if(mode==='slide'){const incoming=wrap.animate([{transform:`translate${axis}(${sign*100}%)`},{transform:'translate(0)'}],{duration:280,easing:'ease-out'});this.turnAnimations.add(incoming);incoming.finished.then(()=>this.turnAnimations.delete(incoming),()=>this.turnAnimations.delete(incoming));}
  }
  cancelGesture(rebound=false){
    const g=this.gesture;this.gesture=null;if(!g)return;
    g.page.style.removeProperty('--corner-pull');delete g.page.dataset.dragSide;
    if(rebound&&this.motion()){const corner=g.page.querySelector<HTMLElement>('.corner-'+g.side);if(corner){const animation=corner.animate([{width:(42+g.progress*180)+'px',height:(42+g.progress*180)+'px'},{width:'42px',height:'42px'}],{duration:190,easing:'ease-out'});this.turnAnimations.add(animation);animation.finished.then(()=>this.turnAnimations.delete(animation),()=>this.turnAnimations.delete(animation));}}
  }
  cancelTurn(){this.cancelGesture();for(const animation of this.turnAnimations)animation.cancel();this.turnAnimations.clear();document.querySelectorAll('.page-transition').forEach(n=>n.remove());}
  goBlock(pageId:string,blockId:string){const index=this.pages.findIndex(p=>p.id===pageId&&(!blockId||p.blocks.some(b=>b.id===blockId)));if(index<0){toast(this.t('原页面已移除，记录保留在侧栏。','The original page is missing. Your record is kept.'));return}this.goPage(index,true);requestAnimationFrame(()=>{const target=appRoot.querySelector<HTMLElement>(`[data-block="${CSS.escape(blockId)}"]`);target?.focus({preventScroll:true});target?.classList.add('reader-located')})}
  updateProgress(){
    appRoot.querySelectorAll<HTMLElement>('[data-page-link]').forEach(n=>n.setAttribute('aria-current',n.dataset.pageLink===this.page.id?'page':'false'));
    const count=appRoot.querySelector('.reader-count');if(count)count.textContent=this.countLabel();
    const buttons=appRoot.querySelectorAll<HTMLButtonElement>('.reader-nav');if(buttons[0])buttons[0].disabled=this.pageIndex===0;if(buttons[1])buttons[1].disabled=this.pageIndex+this.step>=this.pages.length;
  }
  bind(){
    enhanceSelects();new MutationObserver(()=>enhanceSelects()).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',e=>{const cue=(e.target as HTMLElement).closest<HTMLElement>('[data-cue-block]');if(cue)this.goBlock(cue.closest<HTMLElement>('[data-page]')!.dataset.page!,cue.dataset.cueBlock!);});
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){if(this.immersive&&!document.querySelector('dialog[open]')){this.setImmersive(false);return;}this.cancelGesture(true);this.clearToolbar();if(this.sidebarOpen&&innerWidth<800&&!document.querySelector('dialog[open]'))this.toggleSidebar(false);return}
      if(document.querySelector('dialog[open]')||(e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]'))return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='p'){e.preventDefault();this.showPDF();return;}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();this.sidebarTab='contents';this.toggleSidebar(true);appRoot.querySelector<HTMLInputElement>('.sidebar-search')?.focus();return}
      if(e.ctrlKey||e.metaKey||e.altKey)return;if(e.key.toLowerCase()==='i'){e.preventDefault();this.setImmersive();return;}
      if(['ArrowRight','PageDown'].includes(e.key)||(this.profile.direction==='vertical'&&e.key==='ArrowDown')){e.preventDefault();this.turn(1)}
      else if(['ArrowLeft','PageUp'].includes(e.key)||(this.profile.direction==='vertical'&&e.key==='ArrowUp')){e.preventDefault();this.turn(-1)}
      else if(e.key==='Home'){e.preventDefault();this.goPage(0)}else if(e.key==='End'){e.preventDefault();this.goPage(this.pages.length-1)}
    });
    document.addEventListener('pointerdown',e=>{const corner=(e.target as HTMLElement).closest<HTMLElement>('[data-corner]');if(!corner||e.button!==0||this.actualLayout()==='scroll')return;const page=corner.closest<HTMLElement>('.page-surface')!,side=corner.dataset.corner as 'left'|'right';
      if(side==='left'&&this.pageIndex===0||side==='right'&&this.pageIndex+this.step>=this.pages.length)return;
      e.preventDefault();this.cancelTurn();corner.setPointerCapture(e.pointerId);this.gesture={x:e.clientX,y:e.clientY,page,pointer:e.pointerId,side,progress:0};
    });
    document.addEventListener('pointermove',e=>{if(this.immersive)this.wakeChrome();const g=this.gesture;if(!g||g.pointer!==e.pointerId)return;e.preventDefault();const vertical=this.profile.direction==='vertical',distance=vertical?g.y-e.clientY:g.x-e.clientX,extent=vertical?g.page.getBoundingClientRect().height:g.page.getBoundingClientRect().width;g.progress=Math.min(1,Math.max(0,distance*(g.side==='right'?1:-1)/extent));g.page.style.setProperty('--corner-pull',Math.round(42+g.progress*180)+'px');g.page.dataset.dragSide=g.side;});
    const cancelTurn=()=>this.cancelGesture(true);
    document.addEventListener('pointercancel',cancelTurn);window.addEventListener('blur',cancelTurn);
    document.addEventListener('pointerup',e=>{const g=this.gesture;if(g&&g.pointer===e.pointerId){const commit=g.progress>.18||Math.hypot(e.clientX-g.x,e.clientY-g.y)<7;this.cancelGesture(!commit);if(commit)this.turn(g.side==='right'?1:-1);return;}
      if(this.immersive&&!getSelection()?.toString())this.wakeChrome();if(!(e.target as HTMLElement).closest(interactive))window.setTimeout(()=>this.showToolbar(),50);
    });
    document.addEventListener('selectionchange',()=>{clearTimeout(this.selectionTick);this.selectionTick=window.setTimeout(()=>{if(getSelection()?.isCollapsed)this.clearToolbar();else if(!document.querySelector('dialog[open]'))this.showToolbar()},180)});
    window.addEventListener('resize',()=>{if(this.printState)return;this.cancelTurn();clearTimeout(this.resizeTick);this.resizeTick=window.setTimeout(()=>{const a=this.anchor();if(this.lastWidth>=800&&innerWidth<800)this.sidebarOpen=false;this.lastWidth=innerWidth;this.pageHeights.clear();this.render(a)},160)});
    window.addEventListener('scroll',()=>{if(this.printState)return;if(this.scrollTick)return;this.scrollTick=requestAnimationFrame(()=>{this.scrollTick=0;if(this.printState)return;this.clearToolbar();this.positionNavigation();if(this.actualLayout()!=='scroll')return;const active=[...this.liveSlots].sort((a,b)=>Math.abs(a.getBoundingClientRect().top-100)-Math.abs(b.getBoundingClientRect().top-100))[0];if(active){this.pageIndex=Number(active.dataset.index);this.remember();this.updateProgress()}})},{passive:true});
    window.addEventListener('beforeprint',()=>{this.beginPrint();if(!this.printJob)this.printJob=createPrintView(this.d,{orientation:'portrait',includeRecords:true},{pages:this.pages,render:p=>this.renderPage(p)});});
    window.addEventListener('afterprint',()=>this.finishPrint());const printMedia=matchMedia('print');printMedia.addEventListener('change',event=>{if(!event.matches)this.finishPrint();});
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>this.cancelTurn());
    window.addEventListener('pagehide',()=>{if(this.ready)void saveDraft(this.d).catch(()=>{});});
  }
  showToolbar(){
    if(document.querySelector('dialog[open]'))return;const parts=captureSelection();if(!parts.length)return;this.clearToolbar();const bar=this.editor.toolbar(parts);bar.classList.add('reader-selection-toolbar');bar.append(button(this.t('复制','Copy'),()=>copyText(parts.map(p=>p.selector.exact).join('\n')),'stationery-tool','⧉'));appRoot.querySelector('.reader-navigation .stationery')?.remove();appRoot.querySelector('.reader-navigation')?.append(bar);this.toolbar=bar;this.wakeChrome();
  }
  clearToolbar(){this.toolbar?.remove();this.toolbar=null;}
  showDoubt(q:Doubt){const m=modal('历史疑问');m.body.append(el('blockquote','reader-quote',q.selector.exact),el('p','',q.question));m.foot.append(button('返回原文',()=>{m.close();this.goBlock(q.pageId,q.selector.blockId)},'primary'));}
  showSettings(){
    const m=modal(this.t('阅读设置','Reading settings'));const a=this.anchor();
    m.body.append(label(this.t('阅读缩放','Reading zoom'),select([['1','适应纸面'],['1.25','125%'],['1.5','150%'],['2','200%']],String(this.zoom),v=>{this.zoom=Number(v);this.fitPages();this.editor.paint();})));
    const change=<K extends keyof ReaderPresentation>(key:K,value:ReaderPresentation[K])=>{this.profile[key]=value;this.render(a)};
    m.body.append(label(this.t('版式','Layout'),select([['auto',this.t('随屏幕调整','Automatic')],['single',this.t('单页','Single page')],['spread',this.t('双页','Spread')],['scroll',this.t('连续阅读','Continuous')]],this.profile.layout,v=>change('layout',v as ReaderLayout))),
      label(this.t('纸张方向','Paper orientation'),select([['auto',this.t('自然比例','Natural')],['portrait',this.t('竖版','Portrait')],['landscape',this.t('横版','Landscape')]],this.profile.pageShape||'auto',v=>change('pageShape',v as ReaderPresentation['pageShape']))),
      label(this.t('翻页方向','Page direction'),select([['horizontal',this.t('左右','Horizontal')],['vertical',this.t('上下','Vertical')]],this.profile.direction,v=>change('direction',v as ReaderDirection))),
      label(this.t('翻页效果','Transition'),select([['turn',this.t('仿真','Simulated page')],['cover',this.t('覆盖','Cover')],['slide',this.t('滑动','Slide')],['none',this.t('无动画','None')]],this.profile.transition||'turn',v=>change('transition',v as ReaderPresentation['transition']))));
    m.body.append(label(this.t('正文字体','Reading font'),select([['hand','文楷 · 随书嵌入'],['serif','宋体 / 衬线 · 系统字体'],['sans','黑体 / 无衬线 · 系统字体']],this.profile.font||'hand',v=>change('font',v as ReaderPresentation['font']))),label(this.t('行距','Line spacing'),select([['1.65','舒适 · 1.65'],['1.85','宽松 · 1.85'],['2.05','留白 · 2.05']],String(this.profile.lineSpacing||1.85),v=>change('lineSpacing',Number(v) as ReaderPresentation['lineSpacing']))));
    const size=input(String(this.d.userState.preferences.fontSize));size.type='range';size.min='14';size.max='36';size.onchange=()=>{this.d.userState.preferences.fontSize=Number(size.value);this.render(a)};m.body.append(label(this.t('字号','Text size'),size));
    m.body.append(label(this.t('纸色','Paper color'),select([['paper-light',this.t('日间','Day')],['paper-night',this.t('夜间','Night')]],this.profile.theme,v=>change('theme',v as ReaderPresentation['theme']))),label(this.t('减少动态','Reduce motion'),checkbox(this.profile.motion==='reduced',v=>change('motion',v?'reduced':'full'))),label(this.t('界面语言','Interface language'),select([['zh','中文'],['en','English']],this.en?'en':'zh',v=>{this.d.userState.preferences.language=v as 'zh'|'en';setLocale(v as 'zh'|'en');this.render(a)})));
    m.foot.append(button(this.t('完成','Done'),()=>{m.close();this.render(a)},'primary'));
  }
  async showImport(){
    const m=modal(this.t('导入教程','Import a tutorial'));const area=textarea('',9);area.placeholder=this.t('粘贴 Markdown、TXT 或 JSON','Paste Markdown, TXT or JSON');area.setAttribute('aria-label',this.t('教程源文本','Tutorial source text'));
    const file=el('input');file.type='file';file.accept='.md,.txt,.json,.zip,.html';file.setAttribute('aria-label',this.t('选择教程文件','Choose tutorial file'));const preview=el('div','import-preview');preview.setAttribute('role','status');
    let candidate:NotebookDocument|null=null;let update=false;
    const accept=button(this.t('导入','Import'),()=>{if(!candidate)return;const next=candidate;m.close();this.sessionBooks.set(this.d.notebook.id,this.d);this.d=next;this.editor.reset();this.profile={...this.profile,...next.extensions.readerProfile as object};this.invalidate();this.paginate();this.sessionBooks.set(next.notebook.id,next);const saved=structuredClone(next.userState.readingAnchor);this.pageIndex=this.indexForAnchor(saved||{pageId:next.userState.lastPageId});this.pageHeights.clear();this.search='';setLocale(this.en?'en':'zh');this.sidebarTab='contents';this.render();window.scrollTo(0,0);if(saved)this.restoreSaved(saved)},'primary');accept.disabled=true;
    const inspect=(source:string)=>{candidate=null;accept.disabled=true;preview.replaceChildren();try{
      const parsed=importText(source);let next=parsed.document;update=next.notebook.id===this.d.notebook.id&&next.extensions.baseRevision!==undefined;
      if(update){const merged=mergeUpdate(this.d,next);next=merged.document;parsed.warnings.push(...merged.warnings);}
      const blocks=blocksOf(next);preview.append(el('strong','',`${next.notebook.title} · ${pagesOf(next).length} ${this.t('页','pages')}`),el('p','',`${next.notebook.chapters.length} ${this.t('章','chapters')} · ${blocks.filter(b=>b.type==='image'||b.type==='diagram').length} ${this.t('图','figures')} · ${blocks.filter(b=>b.type==='exercise').length} ${this.t('题','exercises')}`));
      const list=el('ul');next.notebook.chapters.forEach(c=>list.append(el('li','',c.title)));preview.append(list);
      if(update)preview.append(el('p','',this.t('正文更新将保留当前标记、疑问和作答。','This content update keeps your current marks, questions and answers.')));
      for(const warning of parsed.warnings)preview.append(el('p','import-warning',warning));
      candidate=next;accept.disabled=false;
    }catch(error){preview.append(el('p','import-error',String(error instanceof Error?error.message:error)));}};
    area.oninput=()=>{candidate=null;accept.disabled=true;preview.replaceChildren()};
    file.onchange=async()=>{const f=file.files?.[0];if(!f)return;candidate=null;accept.disabled=true;try{
      if(f.size>50*1024*1024)throw new Error(this.t('单次导入限制 50 MB。','Import limit is 50 MB.'));
      let source:string;if(/\.zip$/i.test(f.name)){
        const files=unzipSync(new Uint8Array(await f.arrayBuffer()),{filter:entry=>/notebook\.json$/i.test(entry.name)&&entry.originalSize<50*1024*1024});const name=Object.keys(files).find(n=>/notebook\.json$/i.test(n));if(!name)throw new Error(this.t('ZIP 中缺少 notebook.json。','ZIP has no notebook.json.'));source=strFromU8(files[name]);
      }else if(/\.html$/i.test(f.name)){const html=await f.text();const parsed=new DOMParser().parseFromString(html,'text/html');source=parsed.querySelector('#notebook-data')?.textContent||'';if(!source)throw new Error(this.t('HTML 缺少 notebook-data。','HTML has no notebook-data.'))}
      else source=await f.text();area.value=source;inspect(source);
    }catch(error){preview.replaceChildren(el('p','import-error',String(error)))}};
    m.body.append(file,area,button(this.t('预览导入','Preview import'),()=>inspect(area.value),'quiet'),preview);
    m.foot.append(button(this.t('生成前问答','Brief before generation'),()=>{m.close();this.showBriefInterview()},'quiet'),button(this.t('生成说明','Generation prompt'),()=>copyText(this.generationPrompt()),'quiet'),accept);area.focus();
  }
  showBriefInterview(){
    const brief=this.d.notebook.brief||{goal:'',level:'',minutes:30,materials:[],exercises:false,language:'中文',route:'systematic',imagePolicy:'original'};
    const m=modal(this.t('生成前问答','Brief before generation'),this.t('回答会写入生成提示，不会改动教程正文。','Answers shape the prompt and do not edit the lesson.'));
    m.dialog.classList.add('brief-interview');
    const goal=textarea(brief.goal,2);goal.placeholder=this.t('这次要解决什么问题？','What should this study solve?');
    const level=input(brief.level||'');level.placeholder=this.t('已有基础，例如“学过一次函数”','Prior knowledge');
    const minutes=input(String(brief.minutes||30));minutes.type='number';minutes.min='5';minutes.max='10000';
    const language=select([['中文','中文'],['English','English'],['中英术语对照','中文 + English terms']],brief.language||'中文');
    const style=select([['简洁直述','简洁直述'],['推导充分','推导充分'],['具体例子为主','具体例子为主'],['保留原文语气','保留原文语气']],brief.languageStyle||'简洁直述');
    const difficulty=select([['入门','入门：解释必要前提'],['进阶','进阶：推导与应用'],['专业','专业：使用学科术语']],brief.difficulty||'入门');
    const exercises=checkbox(brief.exercises,()=>{});
    const horizon=select([['short','短期速览：一个问题或一节课'],['long','长期学习：课程或持续复习']],brief.horizon||'short');
    const route=select([['quick','快速理解'],['systematic','系统学习'],['deep','深入探究'],['practice','实践操作'],['review','复习巩固']],brief.route||'systematic');
    const fidelity=select([['strict','严格遵循材料：题库、讲义、原文优先'],['guided','以材料为主，允许补充必要背景'],['open','开放组织，可补充可靠来源']],brief.materialFidelity||'guided');
    const material=textarea((brief.materials||[]).join('\n'),3);material.placeholder=this.t('材料名称、文件、章节或题库范围','Files, chapters, question bank or scope');
    const terms=textarea(brief.termPolicy||'',2);terms.placeholder=this.t('术语表、统一译法、需要校正的词','Glossary, preferred translations or corrections');
    m.body.append(label(this.t('参考材料','Reference materials'),material),el('p','brief-note','复制给 AI 后，先上传准备好的文件，或明确回复“没有文件”。无文件时，AI 将按可用能力检索可靠资料并绘制图解，再用选择题确认主题等需求。'),label(this.t('学习目标','Learning goal'),goal),label(this.t('基础情况','Prior knowledge'),level),label(this.t('预计时长（分钟）','Time in minutes'),minutes),label(this.t('语言风格','Language'),language),label(this.t('表达风格','Writing style'),style),label(this.t('难易程度','Difficulty'),difficulty),label(this.t('包含练习','Include exercises'),exercises),label(this.t('学习周期','Horizon'),horizon),label(this.t('内容路线','Route'),route),label(this.t('材料遵循程度','Material fidelity'),fidelity),label(this.t('术语与校正要求','Terms and corrections'),terms));
    const output=el('textarea','brief-output');output.readOnly=true;output.rows=8;output.setAttribute('aria-label',this.t('生成提示预览','Prompt preview'));
    const make=()=>{const selected={goal:goal.value.trim(),level:level.value.trim(),minutes:Math.max(5,Number(minutes.value||30)),materials:material.value.split(/\n+/).map(x=>x.trim()).filter(Boolean),exercises:exercises.checked,language:language.value,languageStyle:style.value,difficulty:difficulty.value,route:route.value,horizon:horizon.value,materialFidelity:fidelity.value,termPolicy:terms.value.trim()};output.value=this.briefPrompt(selected);return selected;};
    [goal,level,minutes,language,style,difficulty,exercises,horizon,route,fidelity,material,terms].forEach(n=>n.addEventListener('input',make));[language,style,difficulty,horizon,route,fidelity].forEach(n=>n.addEventListener('change',make));m.body.append(el('p','brief-note',this.t('上传 PDF、图片或扫描件时：先 OCR，保留页码与原文，再单独列出校正；严格材料模式下不擅自修题、改答案或补充材料之外的结论。','For PDFs, images or scans: OCR first, retain page references and raw text, then list corrections separately. Strict mode never rewrites questions, answers or source claims.')),output);make();
    m.foot.append(button(this.t('复制给 Agent','Copy for agent'),()=>{make();void copyText(output.value)},'primary'),button(this.t('关闭','Close'),m.close,'quiet'));
  }
  briefPrompt(brief:Record<string,unknown>){
    return generationInstructions+'\n\n以下是我已在阅读器填写的学习偏好。保留已有答案；若我尚未上传文件或明确说没有文件，仍先按上述流程等待文件，不要立刻生成。\n'+JSON.stringify(brief,null,2)+'\nPDF/扫描材料使用可用 OCR，保留页码、原文与疑点；严格材料模式不擅自修改题目、答案或顺序。';
  }
  generationPrompt(){return this.briefPrompt({goal:'',level:'',minutes:30,materials:[],language:'中文',route:'systematic',horizon:'short',materialFidelity:'guided',termPolicy:''});}
  showExport(){
    const m=modal(this.t('下载副本','Download a copy'));m.body.append(el('p','export-summary',this.d.notebook.title+' · v'+this.d.notebook.revision));
    const card=el('div','export-card');card.append(el('strong','','一个 HTML，整本笔记随身带'),el('span','','双击即可打开。字体、素材、教程源数据和所选学习记录都已内嵌；无需素材目录，也无需联网。'));m.body.append(card);
    const choices:ExportChoices={marks:true,questions:true,answers:true,legacy:true};
    m.body.append(label(this.t('包含阅读标记、作答与历史学习记录','Include all personal records'),checkbox(true,v=>{choices.marks=v;choices.questions=v;choices.answers=v;choices.legacy=v;})));
    const status=el('p','export-status');status.setAttribute('role','status');
    const save=async(format:string)=>{this.remember();const d=readerCopy(this.d,choices);try{
      if(format==='html')await exportHTML(d);else if(format==='zip')await exportBundle(d);else if(format==='json')download(safeName(d.notebook.title)+'.json',JSON.stringify(d,null,2),'application/json');else if(format==='md')download(safeName(d.notebook.title)+'.md',exportMarkdown(d));else await exportPreview(appRoot.querySelector<HTMLElement>('.reader-page')!,this.page.title);m.close();
    }catch(error){status.textContent=String(error)}};
    const advanced=el('details','export-advanced');advanced.append(el('summary','','高级导出'));
    const format=select([['zip','HTML + 源文件 ZIP'],['json','源 JSON'],['md','Markdown'],['png','当前页图片 PNG']],'zip');advanced.append(label('格式',format),el('p','brief-note','用于编辑、迁移或分享局部页面。日常阅读只需上面的 HTML。'),button('下载所选格式',()=>{void save(format.value)},'quiet'));m.body.append(advanced,status);
    const primary=button(this.t('下载离线 HTML','Download offline HTML'),async()=>{primary.disabled=true;try{await save('html')}finally{primary.disabled=false}},'primary');
    m.foot.append(button(this.t('导出 PDF','Export PDF'),()=>{m.close();this.showPDF()},'quiet'),primary);
  }
  async preparePDF(options:PrintOptions){
    this.remember();this.beginPrint();this.printJob?.dispose();
    try{this.printJob=await preparePrint(this.d,options,{pages:this.pages,render:p=>this.renderPage(p)});return this.printJob.root;}
    catch(error){this.finishPrint();throw error;}
  }
  private beginPrint(){
    if(!this.printState)this.printState={anchor:this.anchor(),index:this.pageIndex,x:scrollX,y:scrollY};
    this.cancelTurn();clearTimeout(this.resizeTick);this.scrollObserver?.disconnect();
  }
  private finishPrint(){
    if(matchMedia('print').matches)return;
    this.printJob?.dispose();this.printJob=undefined;
    const state=this.printState;if(!state||this.printRestoring)return;this.printRestoring=true;
    // Print hides the reader and collapses the document scroll range. Restore
    // after screen layout returns, before allowing virtualization to resume.
    requestAnimationFrame(()=>{
      this.pageIndex=state.index;window.scrollTo({left:state.x,top:state.y,behavior:'instant'});
      const target=this.anchorNode(state.anchor);if(target)window.scrollBy({top:target.getBoundingClientRect().top-state.anchor.top,behavior:'instant'});
      this.fitPages();this.editor.paint();this.updateProgress();
      requestAnimationFrame(()=>{this.printState=undefined;this.printRestoring=false;appRoot.querySelectorAll('.reader-page-slot').forEach(n=>this.scrollObserver?.observe(n));this.remember();});
    });
  }
  showPDF(){
    const m=modal(this.t('导出 PDF','Export PDF'),'按 A4 重新排版，使用浅色纸张。打印窗口中选择“另存为 PDF”。');
    const options:PrintOptions={orientation:'portrait',includeRecords:true},preview=el('div','pdf-preview'),paper=el('div','pdf-paper');
    paper.setAttribute('aria-hidden','true');preview.append(paper,el('p','','正文 12pt · 四周至少 12mm 留白\n公式与例题尽量整块保留，长表格重复表头。'));m.body.append(preview,label('A4 方向',select([['portrait','纵向 · 210 × 297 mm'],['landscape','横向 · 297 × 210 mm']],'portrait',v=>{options.orientation=v as PrintOptions['orientation'];paper.classList.toggle('landscape',v==='landscape')})),label('包含学习记录',checkbox(true,v=>options.includeRecords=v)),el('p','brief-note','文字标记跟随原文重新排版；自由笔迹保留为原页附录。取消或完成打印后，继续在原位置阅读。'));
    const status=el('p','export-status');status.setAttribute('role','status');m.body.append(status);
    const print=button('打开系统打印',async()=>{if(this.printPreparing)return;this.printPreparing=true;print.disabled=true;status.textContent='正在加载字体、图片并编排 A4 页面……';this.cancelTurn();try{
      await this.preparePDF(options);m.close();window.print();
    }catch(error){status.textContent=String(error)}finally{this.printPreparing=false;print.disabled=false;}},'primary');
    m.foot.append(button('返回阅读',m.close,'quiet'),print);
  }
  showImage(b:Block){const asset=this.d.assets.find(a=>a.id===b.assetId);if(!asset)return;const m=modal(b.title||this.t('图片','Image'));const img=el('img','reader-image');img.src=asset.data;img.alt=b.alt||'';m.body.append(img);if(b.caption)m.body.append(el('p','',b.caption));if(asset.source)m.body.append(el('p','',asset.source+(asset.license?' · '+asset.license:'')));m.foot.append(button(this.t('关闭','Close'),m.close,'primary'))}
  showAbout(){const m=modal('Paper Notebook','一张纸的亲切，一本教材的认真。');m.body.append(el('p','','让 AI 生成图文并茂的教程，在这里离线阅读、圈画和复习。'));
    const links=el('nav','project-links');links.setAttribute('aria-label','项目导航');
    for(const [name,url] of [['项目首页 ↗','https://burntroses.github.io/paper-notebook/'],['用 AI 制作一本 ↗','https://burntroses.github.io/paper-notebook/chat-start.html'],['☆ 给纸上灵感一颗 Star ↗','https://github.com/BurntRoses/paper-notebook'],['使用许可 ↗','https://github.com/BurntRoses/paper-notebook/blob/main/LICENSE']]){const a=el('a','',name);a.href=url;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}m.body.append(links);
    const details=el('details');details.append(el('summary','','第三方许可'),el('pre','license-text',notices));m.body.append(details);m.foot.append(button('继续阅读',m.close,'primary'))}
}
new ReaderApp(embedded||structuredClone(introNotebook));
