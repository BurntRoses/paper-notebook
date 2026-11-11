import { pagesOf, textOf, type NotebookDocument } from './types';

/** Check observable editorial defects; knowledge relevance is reviewed by the author. */
export function reviewTeaching(d:NotebookDocument){
 const warnings:{rule:string;location:string;guidance:string}[]=[],seen=new Set<string>();let notes=0,titled=0;
 const compact=(s:string)=>s.replace(/\s/g,'');
 const warn=(rule:string,location:string,guidance:string)=>warnings.push({rule,location,guidance});
 for(const page of pagesOf(d)){
  for(const cue of page.cues||[]){
   notes++;if(cue.title)titled++;
   const source=page.blocks.find(b=>b.id===cue.blockId),body=compact(cue.text);
   if(!source)warn('margin-source',cue.id,'将页边讲解关联到本页实际内容块。');
   else if(!['image','diagram','chart'].includes(source.type)){
    if(!cue.anchor)warn('margin-anchor',cue.id,'为文字注释补充所解释的原句 anchor，使说明随原句对齐和续页。');
    if(body.length>=14&&compact(textOf(source)).includes(body))warn('margin-copy',cue.id,'右栏与正文逐字重复；补充定义含义、短例子、推理依据或省略此条。');
   }
   if(seen.has(body)&&body)warn('margin-repeat',cue.id,'重复的页边说明应就近保留一次。');
   if(!body)warn('margin-empty',cue.id,'页边注释需要完整的说明内容。');
   seen.add(body);
  }
  for(const block of page.blocks){
   const used=new Set<string>();
   for(const mark of block.study?.marks||[]){
    const key=JSON.stringify([mark.text,mark.kind,mark.color||'']);
    if(used.has(key))warn('emphasis-repeat',block.id,'同一原句的同类作者标记重复，只需保留一次。');
    used.add(key);
    if(mark.text.length>48)warn('emphasis-length',block.id,'强调范围较长，检查能否收窄到核心概念、关系或决定性条件。');
   }
  }
 }
 return {marginNotes:notes,titledNotes:titled,warnings};
}
