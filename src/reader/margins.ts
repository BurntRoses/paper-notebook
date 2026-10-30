import { pagesOf, textOf, type Note, type NotebookDocument, type Page } from '../model/types';
import type { FragmentBlock, SurfacePage } from './surface';
import { fragmentRanges } from './anchors';
import { selectorRects } from './ink';

export type Cue=NonNullable<Page['cues']>[number];
export function cueSelector(d:NotebookDocument,pageId:string,cue:Cue){
 const source=pagesOf(d).find(p=>p.id===pageId)?.blocks.find(b=>b.id===cue.blockId);
 if(!source||!cue.anchor)return;
 const text=textOf(source),start=text.indexOf(cue.anchor);if(start<0)return;
 return {blockId:source.id,start,end:start+cue.anchor.length,exact:cue.anchor,prefix:text.slice(Math.max(0,start-24),start),suffix:text.slice(start+cue.anchor.length,start+cue.anchor.length+24)};
}
/** A cue follows its actual phrase, including formula parameters on later sheets. */
export function cuesForSheet(page:SurfacePage,d?:NotebookDocument){
 return (page.cues||[]).filter(cue=>{
  if(!cue.blockId)return page.part===0;
  const selector=d?cueSelector(d,page.id,cue):undefined;
  return page.blocks.some(b=>{
   if(b.id!==cue.blockId||b._captionOnly)return false;
   if(selector)return fragmentRanges(b).some(r=>r.start<=selector.start&&r.end>selector.start);
   if(cue.anchor)return textOf(b).includes(cue.anchor);
   return !(b as FragmentBlock)._offset&&!b._rowOffset&&!b._formulaContinuation&&Number(b._stepStart||1)===1;
  });
 });
}
export function cueNode(cue:Cue){
 const node=document.createElement(cue.blockId?'button':'p');node.className='cornell-cue margin-preset';node.textContent=cue.text;node.dataset.cueId=cue.id;
 if(node instanceof HTMLButtonElement)node.type='button';
 if(cue.blockId)node.dataset.cueBlock=cue.blockId;if(cue.anchor)node.dataset.cueAnchor=cue.anchor;
 node.title=cue.anchor?'对应原文：'+cue.anchor:'查看对应正文';return node;
}
/** Place cues beside their source lines. Personal notes can push later entries down. */
export function layoutPaperMargins(root:ParentNode,d:NotebookDocument){
 for(const zone of root.querySelectorAll<HTMLElement>('.paper-notes,.paper-bottom')){
  const paper=zone.closest<HTMLElement>('.page-surface');if(!paper||!zone.clientHeight)continue;
  const stream=zone.querySelector<HTMLElement>('.margin-stream')||zone,rect=zone.getBoundingClientRect(),scale=rect.height/zone.offsetHeight;
  const padding=parseFloat(getComputedStyle(zone).paddingTop)||0,origin=rect.top+padding*scale;
  const entries=[...stream.children].filter((n):n is HTMLElement=>n instanceof HTMLElement).map((node,order)=>{
   let top=Number(node.dataset.marginPosition||0)*Math.max(0,zone.clientHeight-70);
   if(node.dataset.cueBlock){
    const cue={id:node.dataset.cueId||'',text:node.textContent||'',blockId:node.dataset.cueBlock,anchor:node.dataset.cueAnchor};
    const selector=cueSelector(d,paper.dataset.page!,cue),source=paper.querySelector<HTMLElement>(`.reader-content [data-block="${CSS.escape(cue.blockId)}"]`);
    const target=selector?selectorRects(paper,d,selector)[0]:source?.getBoundingClientRect();
    if(target)top=Math.max(0,(target.top-origin)/scale);
   }
   return {node,top,order};
  }).sort((a,b)=>a.top-b.top||a.order-b.order);
  let end=0;for(const [i,{node,top}] of entries.entries()){
   if(stream.children[i]!==node)stream.insertBefore(node,stream.children[i]||null);
   const gap=Math.max(0,top-end);node.style.marginTop=gap+'px';end+=gap+node.offsetHeight+10;
  }
 }
}
export function summaryForSheet(d:NotebookDocument,page:SurfacePage){
 const summary=page.summary?.trim();
 if(!summary||page.part!==page.totalParts-1)return '';
 return pagesOf(d).find(p=>p.summary?.trim()===summary)?.id===page.id?summary:'';
}
export function notesForSheet(notes:Note[],page:SurfacePage,index:number,anchorIndex:(note:Note)=>number,region:'right'|'bottom'){
 return notes.filter(n=>n.pageId===page.id&&(n.region||'right')===region&&(n.selector?anchorIndex(n)===index:Math.min(n.sheet||0,page.totalParts-1)===page.part));
}
