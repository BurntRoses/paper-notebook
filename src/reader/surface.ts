import { pagesOf, parameterText, type Block, type NotebookDocument, type Page, type PaperShape } from '../model/types';
import { frameFor, paperSize, safeBoundary } from '../model/paper';
import { el } from '../ui/dom';
import { fitFigureBlock } from '../ui/figures';
import { cueNode, cuesForSheet, summaryForSheet } from './margins';
export interface SurfacePage extends Page {part:number;totalParts:number}
export type FragmentBlock=Block & {_offset?:number;_oversize?:boolean;_captionOnly?:boolean};
/** A physical sheet is a view of existing page/block IDs, never a rewrite of the source. */
export class PageSurface {
 constructor(public d:NotebookDocument,public shape:PaperShape,public fontSize:number,private renderBlock:(b:Block)=>HTMLElement,private dimensions?:{width:number;height:number},private printRoot?:HTMLElement){}
 size=()=>this.dimensions||paperSize(this.shape);
 make(page:Page,part=0){
  const layout=page.layout||'cornell',profile=this.d.extensions.readerProfile as {font?:string;lineSpacing?:number;marginNotes?:boolean;bottomNotes?:boolean}|undefined;
  const article=el('article',`reader-page paper page-surface page-layout-${layout}${this.printRoot?' print-sheet':''}`);article.dataset.page=page.id;article.dataset.part=String(part);article.dataset.shape=this.shape;article.dataset.font=profile?.font||'hand';article.dataset.subject=page.subject||'general';article.dataset.ruling=page.paper?.ruling||'lined';article.setAttribute('aria-label',page.title);
  const {width,height}=this.size(),foot=Math.round(Math.min(52,Math.max(36,height*.055))),notesHeight=Math.round(Math.min(88,Math.max(64,height*.09))),bottom=foot+(profile?.bottomNotes!==false?notesHeight+12:0),top=part?Math.min(50,Math.round(height*.09)):Math.round(Math.min(140,Math.max(124,height*.15)))+(page.subtitle?28:0);
  article.style.setProperty('--page-left',Math.round(Math.min(90,Math.max(46,width*.065)))+'px');article.style.setProperty('--page-right',Math.round(Math.min(65,Math.max(30,width*.043)))+'px');article.style.setProperty('--notes-height',notesHeight+'px');article.style.setProperty('--heading-size',Math.min(36,Math.max(28,width*.037))+'px');article.style.width=width+'px';article.style.height=height+'px';article.style.setProperty('--rule',Math.max(page.paper?.lineHeight||0,Math.ceil(this.fontSize*(profile?.lineSpacing||2.05)/2)*2)+'px');article.style.setProperty('--reading-size',this.fontSize+'px');article.style.setProperty('--body-top',top+'px');article.style.setProperty('--body-bottom',bottom+'px');article.style.setProperty('--summary-bottom',foot+'px');article.style.setProperty('--body-height',(height-top-4-bottom)+'px');article.dataset.continued=String(part>0);
  article.append(el('div','paper-fibers'),el('div','binding-holes'));
  const heading=el('header','reader-page-heading');heading.append(el('div','reader-chapter',part?page.title:this.d.notebook.chapters.find(c=>c.pages.some(p=>p.id===page.id))?.title||this.d.notebook.title));if(!part){heading.append(el('h1','',page.title));if(page.subtitle)heading.append(el('p','reader-subtitle',page.subtitle));}article.append(heading);
  const body=el('div','reader-page-body');const content=el('div','reader-content');body.append(content);article.append(body);
  if(profile?.bottomNotes!==false){const summary=el('section','cornell-summary paper-bottom');summary.setAttribute('aria-label','底栏批注');article.append(summary);}
  if(profile?.marginNotes!==false){article.classList.add('has-margin-notes');body.append(el('aside','paper-notes'));}
  const footer=el('footer','reader-page-footer');footer.append(el('span','folio-number'));article.append(footer);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('ink-overlay');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);article.append(svg);
  return article;
 }
 block(page:Page,b:Block){
  const node=b._captionOnly?el('section','content-block figure-caption-continuation'):this.renderBlock(b),offset=(b as FragmentBlock)._offset||0;
  if(b._captionOnly){node.dataset.block=b.id;node.append(el('small','caption-continuation-label','图注 · '+(page.blocks.find(source=>source.id===b.id)?.title||page.title)),el('p','figure-caption',b.text||''));}

  if(b._figureBlockHeight)node.dataset.figureHeight=String(b._figureBlockHeight);
  if(this.printRoot&&b._printScale)node.style.zoom=String(b._printScale);
  if((b as FragmentBlock)._oversize){node.classList.add('oversize-object');node.style.maxHeight='var(--body-height)';}
  if(offset)node.querySelectorAll<HTMLElement>('.ink-text').forEach(s=>s.dataset.offset=String(Number(s.dataset.offset||0)+offset));
  const frame=frameFor(this.d,page,this.shape,b.id);
  if(!this.printRoot&&page.layout==='free'&&frame){node.classList.add('placed-object');Object.assign(node.style,{left:frame.x+'px',top:frame.y+'px',width:frame.width+'px',height:frame.height?frame.height+'px':'auto',zIndex:String(frame.z)});}
  return node;
 }
 render(page:SurfacePage,index:number){
  const article=this.make(page,page.part),content=article.querySelector<HTMLElement>('.reader-content')!;
  const margin=article.querySelector('.paper-notes'),stream=el('div','margin-stream');margin?.append(stream);for(const cue of cuesForSheet(page,this.d))stream.append(cueNode(cue));
  const summary=summaryForSheet(this.d,page);if(summary)article.querySelector('.paper-bottom')?.append(el('p','margin-preset',summary));
  page.blocks.forEach(b=>{const n=this.block(page,b);if(n.classList.contains('placed-object')&&!(b as FragmentBlock)._offset)article.append(n);else content.append(n);});
  article.querySelector('.folio-number')!.textContent=String(index+1).padStart(2,'0')+(page.totalParts>1?` · ${page.part+1}/${page.totalParts}`:'');
  if(!page.blocks.length)content.append(el('p','reader-empty','从页眉导入 AI 生成的结构化教程。'));
  return article;
 }
 paginate():SurfacePage[]{
  const measure=el('div','surface-measure');(this.printRoot||document.body).append(measure);const result:SurfacePage[]=[];
  try{for(const source of pagesOf(this.d)){const sourceStart=result.length;
   if(!this.printRoot&&source.layout==='free'&&source.blocks.every(b=>frameFor(this.d,source,this.shape,b.id))){const count=Math.max(1,...source.blocks.map(b=>(frameFor(this.d,source,this.shape,b.id)?.sheet||0)+1));for(let part=0;part<count;part++)result.push({...source,blocks:source.blocks.filter(b=>(frameFor(this.d,source,this.shape,b.id)?.sheet||0)===part),part,totalParts:count});continue;}
   let part=0,blocks:Block[]=[],article=this.make(source),content=article.querySelector<HTMLElement>('.reader-content')!;measure.replaceChildren(article);
   const limit=()=>article.querySelector<HTMLElement>('.reader-page-body')!.clientHeight;
   const height=()=>content.scrollHeight;
   const flush=()=>{result.push({...source,blocks,part:part++,totalParts:1});blocks=[];article=this.make(source,part);content=article.querySelector<HTMLElement>('.reader-content')!;measure.replaceChildren(article);};
   const append=(b:Block)=>{const n=this.block(source,b);content.append(n);
    if(n.querySelector('.figure-media')){
      // Fit a fresh sheet first. A figure may use the rest of this sheet if it
      // still has enough room to read; otherwise move it whole to the next one.
      const remaining=limit()-(n.getBoundingClientRect().top-article.querySelector('.reader-page-body')!.getBoundingClientRect().top)-3,fullHeight=n.getBoundingClientRect().height;
      const media=n.querySelector<HTMLElement>('.figure-media')!,mediaHeight=media.getBoundingClientRect().height;
      const overhead=fullHeight-mediaHeight;
      const available=remaining>=overhead+Math.min(150,mediaHeight*.6)?remaining:limit()-4;
      fitFigureBlock(n,available);b._figureBlockHeight=available;
    }
    return n;};
   const commit=(b:Block)=>{let node=append(b);if(this.printRoot&&height()>limit()+1&&!blocks.length){const scale=Math.min(1,(limit()-20)/node.getBoundingClientRect().height);node.remove();b={...b,_printScale:scale};node=append(b);}blocks.push(b);};
   for(const sourceBlock of source.blocks){
    let b:FragmentBlock={...sourceBlock},guard=0;
    while(guard++<1000){
     const n=append(b),media=n.querySelector<HTMLElement>('.figure-media');
     if(media&&b.caption&&!blocks.length&&media.offsetHeight<100){
      // A long caption must not reduce the image to a sliver. Keep the complete
      // image on this sheet and continue its caption as live text on the next.
      const caption=b.caption;n.remove();commit({...b,caption:undefined});flush();
      b={id:b.id,type:b.type,text:caption,_captionOnly:true,keepTogether:false};continue;
     }
     if(height()<=limit()+1){blocks.push(b);break;}
     // A block that fits a fresh sheet moves whole. Never sacrifice a definition,
     // short program, table or worked argument just to fill the previous sheet.
     const ownHeight=n.getBoundingClientRect().height;n.remove();
     const explainedFormula=b.type==='formula'&&(b.parameters?.length||0)>1;
     if(blocks.length&&!explainedFormula&&(ownHeight<=limit()||b.keepTogether)){flush();continue;}
     // Text is split at measured line boundaries. Offsets continue to address the original block.
     if((!b.keepTogether||this.printRoot)&&(['prose','concept','quote','callout'].includes(b.type)||b._captionOnly)&&b.text&&b.text.length>1){
      let lo=0,hi=b.text.length;while(lo<hi){const mid=Math.ceil((lo+hi)/2),t={...b,text:b.text.slice(0,mid)};const probe=append(t),fits=height()<=limit();probe.remove();if(fits)lo=mid;else hi=mid-1;}
      let cut=safeBoundary(b.text,lo);if(cut<1&&blocks.length){flush();continue;}if(cut<1)cut=safeBoundary(b.text,Math.min(b.text.length,200));
      if(cut<b.text.length){const sentence=Math.max(...['。','！','？','；','\n'].map(mark=>b.text!.lastIndexOf(mark,cut-1)));if(sentence>cut*.7)cut=sentence+1;const lineBreak=b.text.lastIndexOf('\n',cut);const space=b.text.lastIndexOf(' ',cut);const word=Math.max(lineBreak,space);if(word>cut-35&&word>0)cut=word+1;}
      const head={...b,text:b.text.slice(0,cut)};commit(head);const rest=b.text.slice(cut);if(!rest)break;flush();b={...b,title:undefined,text:rest,_offset:(b._offset||0)+cut};continue;
     }
     if(b.type==='formula'&&(b.parameters?.length||0)>1){
      const parameters=b.parameters!,offset=Number(b._parameterOffset??((b.text||b.latex||'').length+1));let take=0;
      for(let i=1;i<=parameters.length;i++){const probe=append({...b,parameters:parameters.slice(0,i),text:i===parameters.length?b.text:undefined,_parameterOffset:offset}),fits=height()<=limit();probe.remove();if(!fits)break;take=i;}
      if(!take&&blocks.length){flush();continue;}
      if(take===1&&blocks.length&&parameters.length>2){flush();continue;}
      if(parameters.length-take===1&&take>2)take--;
      // Keep each symbol and its explanation together, repeating the live formula on continuation sheets.
      if(take>0){const head={...b,parameters:parameters.slice(0,take),text:take===parameters.length?b.text:undefined,_parameterOffset:offset};commit(head);if(take===parameters.length)break;
       flush();b={...b,title:undefined,parameters:parameters.slice(take),_formulaContinuation:true,_parameterOffset:offset+parameters.slice(0,take).reduce((sum,p)=>sum+parameterText(p).length+1,0)};continue;}
     }
     if(this.printRoot&&b.type==='code'&&b.text?.includes('\n')){
      const lines=b.text.split('\n');let take=0;
      for(let i=1;i<=lines.length;i++){const probe=append({...b,text:lines.slice(0,i).join('\n')}),fits=height()<=limit();probe.remove();if(!fits)break;take=i;}
      if(!take&&blocks.length){flush();continue;}take=Math.max(1,take);
      const head={...b,text:lines.slice(0,take).join('\n')};commit(head);if(take===lines.length)break;
      const offset=head.text.length+1;flush();b={...b,title:undefined,text:lines.slice(take).join('\n'),_offset:(b._offset||0)+offset};continue;
     }
     if(this.printRoot&&b.type==='example'&&(b.steps?.length||0)>1){
      const steps=b.steps!;let take=0;
      for(let i=1;i<=steps.length;i++){const probe=append({...b,steps:steps.slice(0,i),result:i===steps.length?b.result:undefined}),fits=height()<=limit();probe.remove();if(!fits)break;take=i;}
      if(!take&&blocks.length){flush();continue;}take=Math.max(1,take);
      const head={...b,steps:steps.slice(0,take),result:take===steps.length?b.result:undefined};commit(head);if(take===steps.length)break;
      const offset=(b.prompt?b.prompt.length+1:0)+steps.slice(0,take).reduce((sum,item)=>sum+item.text.length+1,0);
      flush();b={...b,title:undefined,prompt:undefined,steps:steps.slice(take),_offset:(b._offset||0)+offset,_stepStart:Number(b._stepStart||1)+take};continue;
     }
     if((!b.keepTogether||this.printRoot)&&['steps','checklist','comparison'].includes(b.type)){
      const key=b.type==='comparison'?'rows':'items',items=(b[key]||[]) as any[];
      if(items.length>1){let take=0;for(let i=1;i<=items.length;i++){const probe=append({...b,[key]:items.slice(0,i)}),fits=height()<=limit();probe.remove();if(!fits)break;take=i;}if(!take&&blocks.length){flush();continue;}const oversize=!take;take=Math.max(1,take);const head={...b,[key]:items.slice(0,take),_oversize:oversize};commit(head);const rest=items.slice(take);if(!rest.length)break;const offset=key==='items'?items.slice(0,take).reduce((s,i)=>s+i.text.length+1,0):0,rowOffset=key==='rows'?items.slice(0,take).flat().reduce((s,i)=>s+i.length+1,0):0;flush();b={...b,title:undefined,[key]:rest,_offset:(b._offset||0)+offset,_rowOffset:Number(b._rowOffset||0)+rowOffset,_stepStart:Number(b._stepStart||1)+take};continue;}
     }
     if(blocks.length){flush();continue;}
     // An indivisible technical object is fully available in its own scrollable viewport.
     b={...b,_oversize:true,...(this.printRoot?{_printScale:Math.min(1,(limit()-20)/ownHeight)}:{})};append(b);blocks.push(b);break;
    }
   }
   if(blocks.length||part===0)flush();const own=result.slice(sourceStart);own.forEach(p=>p.totalParts=own.length);
  }}finally{measure.remove();}return result;
 }
}
