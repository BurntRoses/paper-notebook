import { pagesOf, type Block, type NotebookDocument, type Page, type PaperShape } from '../model/types';
import { frameFor, paperSize, safeBoundary } from '../model/paper';
import { el } from '../ui/dom';
export interface SurfacePage extends Page {part:number;totalParts:number}
export type FragmentBlock=Block & {_offset?:number;_oversize?:boolean};
/** A physical sheet is a view of existing page/block IDs, never a rewrite of the source. */
export class PageSurface {
 constructor(public d:NotebookDocument,public shape:PaperShape,public fontSize:number,private renderBlock:(b:Block)=>HTMLElement,private dimensions?:{width:number;height:number}){}
 size=()=>this.dimensions||paperSize(this.shape);
 make(page:Page,part=0){
  const article=el('article',`reader-page paper page-surface page-layout-${page.layout||'reading'}`);article.dataset.page=page.id;article.dataset.part=String(part);article.dataset.shape=this.shape;article.dataset.subject=page.subject||'general';article.dataset.ruling=page.paper?.ruling||'lined';article.setAttribute('aria-label',page.title);
  const {width,height}=this.size(),bottom=(innerWidth<600?138:88)+(page.layout==='cornell'?100:0);article.style.width=width+'px';article.style.height=height+'px';article.style.setProperty('--rule',Math.max(page.paper?.lineHeight||32,Math.ceil(this.fontSize*1.35/2)*2)+'px');article.style.setProperty('--reading-size',this.fontSize+'px');article.style.setProperty('--body-bottom',bottom+'px');article.style.setProperty('--summary-bottom',(bottom-92)+'px');article.style.setProperty('--body-height',(height-159-bottom)+'px');
  article.append(el('div','paper-fibers'),el('div','binding-holes'));
  const heading=el('header','reader-page-heading');heading.append(el('div','reader-chapter',this.d.notebook.chapters.find(c=>c.pages.some(p=>p.id===page.id))?.title||this.d.notebook.title),el('h1','',page.title));if(page.subtitle)heading.append(el('p','reader-subtitle',page.subtitle));if(part)heading.append(el('span','continued-label','续页 · '+(part+1)));article.append(heading);
  const body=el('div','reader-page-body');const content=el('div','reader-content');body.append(content);article.append(body);
  if(page.layout==='cornell'){
   const cues=el('aside','cornell-cues');cues.append(el('h3','','回忆线索'));for(const cue of page.cues||[])cues.append(el('p','cornell-cue',cue.text));body.prepend(cues);
   if(page.summary){const summary=el('section','cornell-summary');summary.append(el('strong','summary-label','合上笔记，试着复述'),el('span','',page.summary));article.append(summary);}
  }
  const footer=el('footer','reader-page-footer');footer.append(el('span','folio-number'));article.append(footer);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('ink-overlay');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);article.append(svg);
  return article;
 }
 block(page:Page,b:Block){
  const node=this.renderBlock(b),offset=(b as FragmentBlock)._offset||0;
  if((b as FragmentBlock)._oversize){node.classList.add('oversize-object');node.style.maxHeight='var(--body-height)';}
  if(offset)node.querySelectorAll<HTMLElement>('.ink-text').forEach(s=>s.dataset.offset=String(Number(s.dataset.offset||0)+offset));
  const frame=frameFor(this.d,page,this.shape,b.id);
  if(page.layout==='free'&&frame){node.classList.add('placed-object');Object.assign(node.style,{left:frame.x+'px',top:frame.y+'px',width:frame.width+'px',height:frame.height?frame.height+'px':'auto',zIndex:String(frame.z)});}
  return node;
 }
 render(page:SurfacePage,index:number){
  const article=this.make(page,page.part),content=article.querySelector<HTMLElement>('.reader-content')!;
  page.blocks.forEach(b=>{const n=this.block(page,b);if(n.classList.contains('placed-object')&&!(b as FragmentBlock)._offset)article.append(n);else content.append(n);});
  article.querySelector('.folio-number')!.textContent=String(index+1).padStart(2,'0')+(page.totalParts>1?` · ${page.part+1}/${page.totalParts}`:'');
  if(!page.blocks.length)content.append(el('p','reader-empty','从页眉导入 AI 生成的结构化教程。'));
  return article;
 }
 paginate():SurfacePage[]{
  const measure=el('div','surface-measure');document.body.append(measure);const result:SurfacePage[]=[];
  try{for(const source of pagesOf(this.d)){
   if(source.layout==='free'&&source.blocks.every(b=>frameFor(this.d,source,this.shape,b.id))){const count=Math.max(1,...source.blocks.map(b=>(frameFor(this.d,source,this.shape,b.id)?.sheet||0)+1));for(let part=0;part<count;part++)result.push({...source,blocks:source.blocks.filter(b=>(frameFor(this.d,source,this.shape,b.id)?.sheet||0)===part),part,totalParts:count});continue;}
   let part=0,blocks:Block[]=[],article=this.make(source),content=article.querySelector<HTMLElement>('.reader-content')!;measure.replaceChildren(article);
   const limit=()=>article.querySelector<HTMLElement>('.reader-page-body')!.clientHeight;
   const height=()=>content.scrollHeight;
   const flush=()=>{result.push({...source,blocks,part:part++,totalParts:1});blocks=[];article=this.make(source,part);content=article.querySelector<HTMLElement>('.reader-content')!;measure.replaceChildren(article);};
   const append=(b:Block)=>{const n=this.block(source,b);content.append(n);return n;};
   for(const sourceBlock of source.blocks){
    let b:FragmentBlock={...sourceBlock},guard=0;
    while(guard++<1000){
     const n=append(b);if(height()<=limit()+1){blocks.push(b);break;}n.remove();
     // Text is split at measured line boundaries. Offsets continue to address the original block.
     if(['prose','concept','quote','callout','code'].includes(b.type)&&b.text&&b.text.length>1){
      let lo=0,hi=b.text.length;while(lo<hi){const mid=Math.ceil((lo+hi)/2),t={...b,text:b.text.slice(0,mid)};const probe=append(t),fits=height()<=limit();probe.remove();if(fits)lo=mid;else hi=mid-1;}
      let cut=safeBoundary(b.text,lo);if(cut<1&&blocks.length){flush();continue;}if(cut<1)cut=safeBoundary(b.text,Math.min(b.text.length,200));
      if(cut<b.text.length){const lineBreak=b.text.lastIndexOf('\n',cut);const space=b.text.lastIndexOf(' ',cut);const word=Math.max(lineBreak,space);if(word>cut-35&&word>0)cut=word+1;}
      const head={...b,text:b.text.slice(0,cut)};append(head);blocks.push(head);const rest=b.text.slice(cut);if(!rest)break;flush();b={...b,title:undefined,text:rest,_offset:(b._offset||0)+cut};continue;
     }
     if(['steps','checklist','comparison'].includes(b.type)){
      const key=b.type==='comparison'?'rows':'items',items=(b[key]||[]) as any[];
      if(items.length>1){let take=0;for(let i=1;i<=items.length;i++){const probe=append({...b,[key]:items.slice(0,i)}),fits=height()<=limit();probe.remove();if(!fits)break;take=i;}if(!take&&blocks.length){flush();continue;}const oversize=!take;take=Math.max(1,take);const head={...b,[key]:items.slice(0,take),_oversize:oversize};append(head);blocks.push(head);const rest=items.slice(take);if(!rest.length)break;const offset=key==='items'?items.slice(0,take).reduce((s,i)=>s+i.text.length+1,0):0,rowOffset=key==='rows'?items.slice(0,take).flat().reduce((s,i)=>s+i.length+1,0):0;flush();b={...b,title:undefined,[key]:rest,_offset:(b._offset||0)+offset,_rowOffset:Number(b._rowOffset||0)+rowOffset};continue;}
     }
     if(blocks.length){flush();continue;}
     // An indivisible technical object is fully available in its own scrollable viewport.
     b={...b,_oversize:true};append(b);blocks.push(b);break;
    }
   }
   if(blocks.length||part===0)flush();const own=result.filter(p=>p.id===source.id);own.forEach(p=>p.totalParts=own.length);
  }}finally{measure.remove();}return result;
 }
}
