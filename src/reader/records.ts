import { authoredAnnotations } from '../model/study';
import { resolveInText } from '../model/document';
import { blocksOf, textOf, userState, uid, type NotebookDocument, type Selector, type Annotation } from '../model/types';
export type MarkKind = Exclude<Annotation['kind'],'freehand'>;
export const markKinds: MarkKind[] = ['highlight','underline','circle','wave','box','bracket','check','star','dots','arrow','strike','bold','red'];
export interface SelectionPart { pageId:string; selector:Selector }
export function captureSelection(): SelectionPart[] {
  const selection=getSelection();if(!selection?.rangeCount||selection.isCollapsed)return [];
  const range=selection.getRangeAt(0),parts:SelectionPart[]=[];
  for(const span of document.querySelectorAll<HTMLElement>('.reader-page .ink-text')){
    if(!range.intersectsNode(span)||!span.textContent)continue;
    const own=document.createRange();own.selectNodeContents(span);
    const local=own.cloneRange();
    if(span.contains(range.startContainer))local.setStart(range.startContainer,range.startOffset);
    if(span.contains(range.endContainer))local.setEnd(range.endContainer,range.endOffset);
    const prefix=own.cloneRange();prefix.setEnd(local.startContainer,local.startOffset);
    const exact=local.toString();if(!exact)continue;
    const block=span.closest<HTMLElement>('[data-block]')!,page=span.closest<HTMLElement>('[data-page]')!;
    const text=textOf((block as HTMLElement & {__block:any}).__block);
    const start=Number(span.dataset.offset||0)+prefix.toString().length;
    parts.push({pageId:page.dataset.page!,selector:{blockId:block.dataset.block!,start,end:start+exact.length,exact,prefix:text.slice(Math.max(0,start-24),start),suffix:text.slice(start+exact.length,start+exact.length+24)}});
  }
  return parts;
}
export function addAnnotation(d:NotebookDocument,parts:SelectionPart[],kind:MarkKind){
 const canonical=(selectors:Selector[])=>{
  const out:Selector[]=[];
  for(const blockId of new Set(selectors.map(s=>s.blockId))){const block=blocksOf(d).find(b=>b.id===blockId);if(!block)continue;const text=textOf(block),ranges=selectors.filter(s=>s.blockId===blockId).map(s=>resolveInText(text,s)).filter(s=>s.status==='resolved').sort((a,b)=>a.start-b.start),merged:{start:number;end:number}[]=[];
   for(const r of ranges){const last=merged.at(-1);if(last&&r.start<=last.end)last.end=Math.max(last.end,r.end);else merged.push({start:r.start,end:r.end});}
   for(const {start,end} of merged)out.push({blockId,start,end,exact:text.slice(start,end),prefix:text.slice(Math.max(0,start-24),start),suffix:text.slice(end,end+24)});
  }return out;
 };
 for(const pageId of new Set(parts.map(p=>p.pageId))){
  let selectors=canonical(parts.filter(p=>p.pageId===pageId).map(p=>p.selector));if(!selectors.length)continue;
  const all=[...authoredAnnotations(d,pageId),...d.userState.annotations.filter(a=>a.pageId===pageId)];
  const matching:Annotation[]=[];let changed=true;
  while(changed){changed=false;for(const a of all){if(a.kind!==kind||matching.includes(a))continue;const own=canonical(a.selectors);if(own.some(a=>selectors.some(s=>s.blockId===a.blockId&&s.start<a.end&&s.end>a.start))){matching.push(a);selectors=canonical([...selectors,...own]);changed=true;}}}
  if(matching.length===1&&JSON.stringify(canonical(matching[0].selectors))===JSON.stringify(selectors)){
   const same=matching[0];
   if(same.id.startsWith('author-')){d.userState.dismissedStudyMarks||=[];if(!d.userState.dismissedStudyMarks.includes(same.id))d.userState.dismissedStudyMarks.push(same.id);}
   else d.userState.annotations=d.userState.annotations.filter(a=>a.id!==same.id);
   continue;
  }
  for(const a of matching)if(a.id.startsWith('author-')){d.userState.dismissedStudyMarks||=[];if(!d.userState.dismissedStudyMarks.includes(a.id))d.userState.dismissedStudyMarks.push(a.id);}
  const existing=matching.find(a=>!a.id.startsWith('author-'));
  d.userState.annotations=d.userState.annotations.filter(a=>!matching.includes(a));
  d.userState.annotations.push({id:existing?.id||uid('mark'),kind,pageId,selectors,color:existing?.color||(kind==='highlight'?'#ebc741':['red','circle','wave','star','dots'].includes(kind)?'#b8564a':'#345d76'),width:existing?.width||2,seed:existing?.seed||Math.floor(Math.random()*2147483646)+1,status:'resolved'});
 }
}
export function paintAnnotations(root:HTMLElement,d:NotebookDocument){
  const blocks=new Map(blocksOf(d).map(b=>[b.id,b]));
  const marks=d.userState.annotations.filter(a=>markKinds.includes(a.kind as MarkKind));
  for(const block of root.querySelectorAll<HTMLElement>('[data-block]')){
    const b=blocks.get(block.dataset.block!);if(!b)continue;
    const all=marks.flatMap(a=>a.selectors.filter(s=>s.blockId===b.id).map(s=>({kind:a.kind,...resolveInText(textOf(b),s)}))).filter(s=>s.status==='resolved');
    for(const span of block.querySelectorAll<HTMLElement>('.ink-text')){
      const raw=span.dataset.raw??span.textContent??'';span.dataset.raw=raw;
      const base=Number(span.dataset.offset||0),end=base+raw.length;
      const ranges=all.filter(s=>s.start<end&&s.end>base);
      if(!ranges.length){if(span.querySelector('.reader-mark'))span.textContent=raw;continue;}
      const boundaries=[...new Set([base,end,...ranges.flatMap(s=>[Math.max(base,s.start),Math.min(end,s.end)])])].sort((a,b)=>a-b);
      const fragment=document.createDocumentFragment();
      for(let i=0;i<boundaries.length-1;i++){
        const start=boundaries[i],finish=boundaries[i+1],active=ranges.filter(s=>s.start<finish&&s.end>start),text=raw.slice(start-base,finish-base);
        if(active.length){const n=document.createElement('span');n.className='reader-mark '+[...new Set(active.map(s=>'reader-mark-'+s.kind))].join(' ');n.textContent=text;fragment.append(n);}else fragment.append(document.createTextNode(text));
      }
      span.replaceChildren(fragment);
    }
  }
}
export interface ExportChoices { marks:boolean; questions:boolean; answers:boolean; legacy:boolean }
export function readerCopy(d:NotebookDocument,choices:ExportChoices){
  const copy=structuredClone(d),old=copy.userState;
  const personal=Object.values(choices).some(Boolean);copy.userState=userState(personal?old.lastPageId:copy.notebook.chapters[0].pages[0].id);copy.userState.preferences={...old.preferences,weatherCity:'',weatherEnabled:false,timerRunning:false,timerEnd:undefined,timerRemaining:1500};
  if(personal){copy.userState.readingAnchor=old.readingAnchor;copy.userState.readingPositions=old.readingPositions;}
  if(choices.marks){copy.userState.annotations=old.annotations;copy.userState.dismissedStudyMarks=old.dismissedStudyMarks;}
  if(choices.questions)copy.userState.doubts=old.doubts;
  if(choices.answers){copy.userState.answers=old.answers;copy.userState.checks=old.checks;}
  if(choices.legacy){copy.userState.notes=old.notes;copy.userState.bookmarks=old.bookmarks;copy.userState.layouts=old.layouts;if(!choices.marks)copy.userState.annotations=old.annotations.filter(a=>a.kind==='freehand');}
  return copy;
}
export function questionPrompt(d:NotebookDocument){
  const questions=d.userState.doubts.filter(q=>q.status==='open');
  return '请按 https://github.com/BurntRoses/paper-notebook 的 skills/paper-notebook/SKILL.md 生成关联答疑册。保留原文语境，核实条件、公式和来源。交付实际生成的单文件离线 HTML：对话环境附上可下载文件，编程智能体在工作区生成。不要用文字或源码代替成品。\n\n'+JSON.stringify({parent:{notebookId:d.notebook.id},title:d.notebook.title,revision:d.notebook.revision,doubtLinks:questions.map(q=>({doubtId:q.id,pageId:q.pageId,blockId:q.selector.blockId,quote:q.selector.exact,question:q.question,context:textOf(blocksOf(d).find(b=>b.id===q.selector.blockId)||{id:'missing',type:'prose',text:''})})),sources:d.notebook.sources},null,2);
}
