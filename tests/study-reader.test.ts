import test from 'node:test';
import assert from 'node:assert/strict';
import {introNotebook} from '../src/intro';
import {parseDocument} from '../src/model/document';
import {pagesOf,textOf,type Selector} from '../src/model/types';
import {authoredAnnotations} from '../src/model/study';
import {addAnnotation,readerCopy} from '../src/reader/records';
import {exportMarkdown,importText} from '../src/io/markdown';
const selection=(blockId:string,text:string,start:number,end:number):Selector=>({blockId,start,end,exact:text.slice(start,end),prefix:text.slice(Math.max(0,start-24),start),suffix:text.slice(end,end+24)});
test('authored study marks target actual text, keep deterministic seeds and stay on their source page',()=>{
 const d=parseDocument(introNotebook).document;
 for(const page of pagesOf(d)){
  const marks=authoredAnnotations(d,page.id);assert.equal(marks.length,page.blocks.reduce((n,b)=>n+(b.study?.marks?.length||0),0));
  for(const a of marks){assert.equal(a.pageId,page.id);for(const s of a.selectors){const b=page.blocks.find(b=>b.id===s.blockId)!;assert.equal(textOf(b).slice(s.start,s.end),s.exact);}}
  for(const b of page.blocks)for(const e of b.study?.explanations||[])assert.ok(textOf(b).includes(e.text),`${b.id}: explanation target must occur in source`);
  assert.deepEqual(marks,authoredAnnotations(d,page.id));
 }
 assert.ok(pagesOf(d).some(p=>p.subject==='literature'));assert.ok(pagesOf(d).some(p=>p.subject==='business'));assert.ok(pagesOf(d).some(p=>p.subject==='code'));
});
test('same-range marks toggle, overlapping marks merge, authored dismissals remain private and exportable',()=>{
 const d=structuredClone(introNotebook),page=pagesOf(d)[0],block=page.blocks[0],text=textOf(block),source=JSON.stringify(d.notebook);
 const part=(a:number,b:number)=>[{pageId:page.id,selector:selection(block.id,text,a,b)}];
 addAnnotation(d,part(0,7),'underline');addAnnotation(d,part(4,12),'underline');assert.equal(d.userState.annotations.length,1);assert.equal(d.userState.annotations[0].selectors[0].exact,text.slice(0,12));
 addAnnotation(d,part(0,12),'underline');assert.equal(d.userState.annotations.length,0);
 const author=authoredAnnotations(d,page.id)[0];addAnnotation(d,author.selectors.map(selector=>({pageId:page.id,selector})),'highlight');assert.ok(d.userState.dismissedStudyMarks?.includes(author.id));assert.equal(d.userState.annotations.length,0);assert.equal(JSON.stringify(d.notebook),source);
 const full=readerCopy(d,{marks:true,questions:true,answers:true,legacy:true});assert.deepEqual(parseDocument(full).document.userState.dismissedStudyMarks,d.userState.dismissedStudyMarks);
 const publicCopy=readerCopy(d,{marks:false,questions:false,answers:false,legacy:false});assert.equal(publicCopy.userState.dismissedStudyMarks,undefined);assert.deepEqual(publicCopy.notebook,d.notebook);
});
test('new visual metadata, material fidelity, comparison selectors and all emphasis types survive Markdown',()=>{
 const d=structuredClone(introNotebook);d.notebook.brief={goal:'只读题库第1章',level:'基础代数',minutes:25,materials:['题库.pdf'],exercises:true,language:'中文',route:'review',imagePolicy:'original',materialFidelity:'strict',languageStyle:'简洁直述',difficulty:'进阶',horizon:'short',termPolicy:'保留原术语'};
 const table=pagesOf(d)[0].blocks.find(b=>b.type==='comparison')!;assert.equal(textOf(table),[...table.columns!,...table.rows!.flat()].join('\n'));
 const roundtrip=importText(exportMarkdown(d)).document;assert.deepEqual(roundtrip.notebook,d.notebook);
 const invalid=structuredClone(d);invalid.notebook.chapters[0].pages[0].blocks[0].study!.visual='invalid' as any;assert.throws(()=>parseDocument(invalid));
});
