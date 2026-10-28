import { blocksOf, pagesOf, type NotebookDocument, type Page } from '../model/types';
import { renderBlock } from '../ui/blocks';
import { el } from '../ui/dom';
import { PageSurface, type SurfacePage } from './surface';
import { authoredAnnotations, drawInk } from './ink';

/** Print is a separate projection. It never changes the saved reader profile or source IDs. */
export interface PrintOptions { orientation:'portrait'|'landscape'; includeRecords:boolean }
export const defaultPrintOptions:PrintOptions={orientation:'portrait',includeRecords:true};
const mm=(n:number)=>n*96/25.4;

function printDocument(source:NotebookDocument,records:boolean){
 const d=structuredClone(source);d.extensions.readerProfile={...(d.extensions.readerProfile as object),lineSpacing:1.85,theme:'paper-light'};
 if(!records){d.userState.answers={};d.userState.checks={};}
 if(records){
  const blocks:Page['blocks']=[];
  for(const n of d.userState.notes)blocks.push({id:'print-note-'+n.id,type:'prose',title:n.title||'我的笔记',text:[pagesOf(d).find(p=>p.id===n.pageId)?.title,n.selector?.exact,n.text,n.back].filter(Boolean).join('\n\n')});
  for(const q of d.userState.doubts)blocks.push({id:'print-question-'+q.id,type:'quote',title:q.status==='resolved'?'已解答的疑问':'待解答的疑问',text:q.selector.exact+'\n\n'+q.question});
  for(const [id,a] of Object.entries(d.userState.answers)){const b=blocksOf(d).find(b=>b.id===id);if(!b)continue;blocks.push({id:'print-answer-'+id,type:'prose',title:'我的作答 · '+(b.title||b.question||id),text:[a.submitted?'已提交':'草稿',a.text,b.options?.filter(o=>a.selected.includes(o.id)).map(o=>o.text).join('；'),a.matches?Object.entries(a.matches).map(([left,right])=>{const l=b.pairs?.find(p=>p.id===left),r=b.pairs?.find(p=>p.id===right);return (l?.left||left)+' → '+(r?.right||right)}).join('\n'):undefined].filter(Boolean).join('\n\n')});}
  const checked=blocksOf(d).flatMap(b=>(b.items||[]).filter(i=>d.userState.checks[i.id]).map(i=>i.text));if(checked.length)blocks.push({id:'print-checks',type:'prose',title:'已完成的学习任务',text:checked.map(s=>'✓ '+s).join('\n')});
  const unresolved=d.userState.annotations.filter(a=>a.status&&a.status!=='resolved');if(unresolved.length)blocks.push({id:'print-unplaced',type:'prose',title:'待重新定位的标记',text:unresolved.map(a=>a.kind+' · '+a.selectors.map(s=>s.exact).join(' / ')).join('\n')});
  if(blocks.length)d.notebook.chapters.push({id:'print-records',title:'学习记录附录',pages:[{id:'print-records-page',title:'我的笔记、疑问与作答',layout:'reading',blocks}]});
 }
 return d;
}

export function createPrintView(source:NotebookDocument,options:PrintOptions,original?:{pages:SurfacePage[];render:(p:SurfacePage,index:number)=>HTMLElement}){
 document.querySelector('#print-root')?.remove();document.querySelector('#print-page-size')?.remove();
 const root=el('div');root.id='print-root';root.dataset.orientation=options.orientation;root.setAttribute('aria-hidden','true');document.body.append(root);
 const style=el('style');style.id='print-page-size';style.textContent=`@page { size: A4 ${options.orientation}; margin: 0; }`;document.head.append(style);
 const dimensions=options.orientation==='portrait'?{width:mm(210),height:mm(297)}:{width:mm(297),height:mm(210)};
 const d=printDocument(source,options.includeRecords);
 const sourceBlocks=new Map(blocksOf(d).map(b=>[b.id,b]));
 const surface=new PageSurface(d,options.orientation,16,b=>{const n=renderBlock(b,d,{answer:()=>{},check:()=>{},edit:()=>{},image:()=>{}},sourceBlocks.get(b.id)||b);(n as HTMLElement&{__block:unknown}).__block=sourceBlocks.get(b.id)||b;return n;},dimensions,root);
 const populate=()=>{
  root.replaceChildren();const sheets=surface.paginate();sheets.forEach((p,i)=>root.append(surface.render(p,i)));
  if(options.includeRecords&&original){
   const strokes=source.userState.annotations.filter(a=>a.kind==='freehand'&&(!a.status||a.status==='resolved'));
   for(const p of original.pages){if(!strokes.some(a=>a.pageId===p.id&&(a.sheet||0)===p.part))continue;
    const sheet=surface.make({id:p.id+'-ink-'+p.part,title:'原页笔迹 · '+p.title,layout:'reading',blocks:[]});sheet.classList.add('ink-appendix');sheet.querySelector('.reader-chapter')!.textContent='学习记录附录 · 原页位置保留';
    sheet.querySelector('.reader-page-heading')!.append(el('p','reader-subtitle','自由笔迹保留在原页缩略图中，不覆盖重新排版的正文。'));
    const body=sheet.querySelector<HTMLElement>('.reader-page-body')!,content=sheet.querySelector<HTMLElement>('.reader-content')!,rendered=original.render(p,original.pages.indexOf(p));const originalPage=rendered.matches('.page-surface')?rendered:rendered.querySelector<HTMLElement>('.page-surface')!;originalPage.querySelectorAll('.page-corner,.paper-note').forEach(n=>n.remove());originalPage.style.transform='none';originalPage.classList.add('print-original');content.append(originalPage);root.append(sheet);
    drawInk(originalPage,[...authoredAnnotations(source,p.id),...source.userState.annotations.filter(a=>a.pageId===p.id)],source);
    const scale=Math.min(body.clientWidth/originalPage.offsetWidth,body.clientHeight/originalPage.offsetHeight);originalPage.style.transformOrigin='top left';originalPage.style.transform=`scale(${scale})`;originalPage.style.setProperty('--original-scale',`scale(${scale})`);sheet.querySelector(':scope > .reader-page-footer .folio-number')!.textContent=String(root.children.length);
   }
  }
  // KaTeX bases wrap at relation/operator boundaries. Scale only an indivisible
  // base (for example a very wide matrix), keeping ordinary long sums readable.
  for(const formula of root.querySelectorAll<HTMLElement>('.print-sheet:not(.ink-appendix) .formula')){const width=Math.max(0,...[...formula.querySelectorAll<HTMLElement>('.katex-html > .base')].map(n=>n.getBoundingClientRect().width));if(width>formula.clientWidth)formula.style.fontSize=(parseFloat(getComputedStyle(formula).fontSize)*formula.clientWidth/width)+'px';}
  for(const paper of root.querySelectorAll<HTMLElement>('.print-sheet:not(.ink-appendix)'))drawInk(paper,[...authoredAnnotations(source,paper.dataset.page!),...(options.includeRecords?source.userState.annotations.filter(a=>a.kind!=='freehand'&&a.pageId===paper.dataset.page):[])],source);
 };
 populate();
 return {root,reflow:populate,dispose:()=>{root.remove();style.remove();}};
}

export async function preparePrint(source:NotebookDocument,options:PrintOptions=defaultPrintOptions,original?:Parameters<typeof createPrintView>[2]){
 const view=createPrintView(source,options,original);
 try{
  // All chapters are mounted, so their font subsets load before measurements are finalized.
  await document.fonts.ready;
  const images=[...view.root.querySelectorAll('img')];images.forEach(img=>img.loading='eager');await Promise.all(images.map(img=>img.decode().catch(()=>{})));
  view.reflow();await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));return view;
 }catch(error){view.dispose();throw error;}
}
