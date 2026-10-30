import {pagesOf,textOf,type NotebookDocument} from './types';

/** Inspect authored emphasis without inventing learning priorities or changing source. */
export function inspectStudyMarks(document:NotebookDocument,allowUnmarked=false){
 const byKind:Record<string,number>={},markedPages:string[]=[],unmarkedPages:string[]=[],invalidTargets:string[]=[],missingBoldPages:string[]=[],missingColorPages:string[]=[];
 let total=0,textBlocks=0;
 for(const page of pagesOf(document)){
  let pageMarks=0,hasText=false,bold=0,color=0;
  for(const block of page.blocks){
   const text=textOf(block);
   if(text.trim()){textBlocks++;hasText=true;}
   for(const mark of block.study?.marks||[]){
    if(!mark.text.trim()||!text.includes(mark.text)){invalidTargets.push(block.id+': '+mark.text);continue;}
    total++;pageMarks++;byKind[mark.kind]=(byKind[mark.kind]||0)+1;if(mark.kind==='bold')bold++;if(mark.kind==='red')color++;
   }
  }
  if(pageMarks)markedPages.push(page.id);else if(hasText)unmarkedPages.push(page.id);
  if(hasText&&!bold)missingBoldPages.push(page.id);if(hasText&&!color)missingColorPages.push(page.id);
 }
 const required=textBlocks>0&&!allowUnmarked;
 return {valid:invalidTargets.length===0&&(!required||total>0),required,total,byKind,markedPages,unmarkedPages,invalidTargets,typography:{bold:byKind.bold||0,coloredText:byKind.red||0,missingBoldPages,missingColorPages}};
}

export function checkStudyMarks(document:NotebookDocument,allowUnmarked=false){
 const report=inspectStudyMarks(document,allowUnmarked);
 if(report.invalidTargets.length)throw new Error('Authored study mark must match actual block text: '+report.invalidTargets.join('; '));
 if(!report.valid)throw new Error('No authored study marks in this tutorial. Add sparse study.marks anchored to exact source phrases before delivery. Use --allow-unmarked only when the user explicitly requested unmarked content.');
 return report;
}
