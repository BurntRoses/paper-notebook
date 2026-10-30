import test from 'node:test';
import assert from 'node:assert/strict';
import { blankDocument, parameterText, textOf, type Block, type Selector } from '../src/model/types';
import { parseDocument, mergeUpdate } from '../src/model/document';
import { indexForBookmark, indexForReadingAnchor } from '../src/reader/anchors';
import { bookmarkFor, questionPrompt, readerCopy, setTextColor } from '../src/reader/records';
import {authoredAnnotations} from '../src/model/study';

test('resetting an authored font colour edits only the selected passage and keeps source untouched',()=>{
 const d=blankDocument(),page=d.notebook.chapters[0].pages[0];page.blocks=[{id:'colour-source',type:'prose',text:'关键概念与实际条件',study:{marks:[{text:'关键概念与实际条件',kind:'red',color:'#285f9e'}]}}];
 const source=JSON.stringify(d.notebook),selector={blockId:'colour-source',start:0,end:4,exact:'关键概念',prefix:'',suffix:'与实际条件'};
 setTextColor(d,[{pageId:page.id,selector}]);assert.equal(authoredAnnotations(d,page.id).length,0);
 assert.equal(d.userState.annotations.length,1);assert.equal(d.userState.annotations[0].selectors[0].exact,'与实际条件');assert.equal(d.userState.annotations[0].color,'#285f9e');
 assert.equal(JSON.stringify(d.notebook),source);
});

test('passage and page bookmarks follow source offsets through repagination',()=>{
  const d=blankDocument(),p=d.notebook.chapters[0].pages[0];
  const b:Block={id:'long-passage',type:'prose',text:'甲'.repeat(500)+'需要继续讲解的原文'+'乙'.repeat(500)};p.blocks=[b];
  const exact='需要继续讲解的原文',s:Selector={blockId:b.id,start:500,end:500+exact.length,exact,prefix:'甲'.repeat(24),suffix:'乙'.repeat(24)};
  const sheets=(cuts:number[])=>cuts.slice(0,-1).map((start,i)=>({...p,part:i,blocks:[{...b,text:b.text!.slice(start,cuts[i+1]),_offset:start}]}));
  const bookmark={id:'page-bookmark',kind:'page' as const,pageId:p.id,blockId:b.id,sheet:2,selector:s};
  assert.equal(indexForReadingAnchor(sheets([0,250,500,1010]),{pageId:p.id,blockId:b.id,textOffset:500}),2);
  assert.equal(indexForBookmark(sheets([0,400,800,1010]),d,bookmark),1);
  b.text='新增前言。'+b.text;
  assert.equal(indexForBookmark(sheets([0,503,800,1016]),d,bookmark),1,'exact quote resolves after a source edit');
});

test('table rows and formula parameters locate the correct continuation sheet',()=>{
  const page={id:'page',title:'定位'};
  const table:Block={id:'table',type:'comparison',columns:['项','值'],rows:[['甲','10'],['乙','20']]};
  const rowOffset=table.rows![0].reduce((sum,c)=>sum+c.length+1,0),head=table.columns!.reduce((sum,c)=>sum+c.length+1,0);
  const tablePages=[{...page,part:0,blocks:[{...table,rows:table.rows!.slice(0,1)}]},{...page,part:1,blocks:[{...table,rows:table.rows!.slice(1),_rowOffset:rowOffset}]}];
  assert.equal(indexForReadingAnchor(tablePages,{pageId:page.id,blockId:table.id,textOffset:head+rowOffset}),1);
  const parameters=[{symbol:'x',name:'输入',description:'观测值'},{symbol:'y',name:'输出',description:'预测值'}];
  const formula:Block={id:'formula',type:'formula',latex:'y=x',parameters};
  const offset=formula.latex!.length+1+parameterText(parameters[0]).length+1;
  const formulaPages=[{...page,part:0,blocks:[{...formula,parameters:parameters.slice(0,1)}]},{...page,part:1,blocks:[{...formula,parameters:parameters.slice(1),_parameterOffset:offset}]}];
  assert.equal(indexForReadingAnchor(formulaPages,{pageId:page.id,blockId:formula.id,textOffset:offset}),1);
});

test('linked and free notes, bookmarks and next-session choices survive save and update',()=>{
  const d=blankDocument(),p=d.notebook.chapters[0].pages[0];p.blocks=[{id:'passage',type:'prose',text:'此处是需要解释的原文。'}];
  const s:Selector={blockId:'passage',start:0,end:2,exact:'此处',prefix:'',suffix:'是需要解释的原文。'},parts=[{pageId:p.id,selector:s}];
  d.userState.notes=[{id:'linked-note',pageId:p.id,title:'关联',text:'解释边界条件',back:'明天复习',material:'sage',seed:1,x:0,y:0,z:1,face:'front',attached:true,collapsed:false,surface:'desk',selector:s,anchors:parts},{id:'free-note',pageId:p.id,title:'独立',text:'回顾目标',back:'',material:'rose',seed:2,x:0,y:0,z:2,face:'front',attached:false,collapsed:false,surface:'desk'}];
  d.userState.bookmarks=bookmarkFor(parts);
  d.userState.doubts=[{id:'followup',pageId:p.id,selector:s,anchors:parts,question:'请展开讲解',status:'open'}];
  d.userState.annotations=[{id:'ink',pageId:p.id,kind:'freehand',selectors:[],points:[[.2,.3,.5],[.4,.5,.5]],coordinateSpace:'normalized-page',color:'#345d76',width:2,seed:1}];
  const full=readerCopy(d,{marks:true,questions:true,answers:false,legacy:false,notes:true,bookmarks:true,ink:true});
  const saved=parseDocument(JSON.parse(JSON.stringify(full))).document;
  assert.deepEqual(saved.userState.notes,d.userState.notes);assert.deepEqual(saved.userState.bookmarks,JSON.parse(JSON.stringify(d.userState.bookmarks)));
  const prompt=JSON.parse(questionPrompt(saved).split('\n\n').slice(1).join('\n\n'));
  assert.equal(prompt.doubtLinks[0].anchors[0].context,textOf(p.blocks[0]));assert.equal(prompt.notes[0].anchor.status,'resolved');assert.equal(prompt.bookmarks[0].anchor.status,'resolved');assert.match(prompt.inkNotice,/坐标/);
  const privateOff=readerCopy(d,{marks:false,questions:false,answers:false,legacy:false,notes:false,bookmarks:false,ink:false});
  assert.deepEqual(privateOff.userState.notes,[]);assert.deepEqual(privateOff.userState.bookmarks,[]);assert.deepEqual(privateOff.userState.doubts,[]);assert.deepEqual(privateOff.userState.annotations,[]);
  const incoming=structuredClone(d);incoming.extensions.baseRevision=d.notebook.revision;incoming.notebook.chapters[0].pages[0].blocks[0].text='补充背景。'+p.blocks[0].text;
  const updated=mergeUpdate(d,incoming);assert.deepEqual(updated.document.userState.notes,d.userState.notes);assert.deepEqual(updated.warnings,[]);
});


test('text recolouring splits old ranges, resets locally and survives a document roundtrip',()=>{
 const d=blankDocument(),p=d.notebook.chapters[0].pages[0],text='甲乙丙丁戊己庚辛壬癸';p.blocks=[{id:'colour-passage',type:'prose',text}];
 const part=(start:number,end:number)=>[{pageId:p.id,selector:{blockId:'colour-passage',start,end,exact:text.slice(start,end),prefix:text.slice(0,start),suffix:text.slice(end)}}];
 setTextColor(d,part(1,9),'#285f9e');setTextColor(d,part(3,6),'#357344');
 const ranges=()=>d.userState.annotations.flatMap(a=>a.selectors.map(s=>[s.start,s.end,a.color]));
 assert.deepEqual(ranges(),[[1,3,'#285f9e'],[6,9,'#285f9e'],[3,6,'#357344']]);
 setTextColor(d,part(4,8));assert.deepEqual(ranges(),[[1,3,'#285f9e'],[8,9,'#285f9e'],[3,4,'#357344']]);
 const saved=parseDocument(JSON.parse(JSON.stringify(readerCopy(d,{marks:true,questions:false,answers:false,legacy:false})))).document;
 assert.deepEqual(saved.userState.annotations,d.userState.annotations);assert.equal(saved.notebook.chapters[0].pages[0].blocks[0].text,text);
 setTextColor(d,part(0,10));assert.deepEqual(d.userState.annotations,[]);
});

test('transparent bottom notes and image annotations survive export and source updates',()=>{
 const d=blankDocument(),p=d.notebook.chapters[0].pages[0];p.blocks=[{id:'visual',type:'diagram',nodes:[{id:'n',label:'边界'}],edges:[],figure:{annotations:[{kind:'circle',x:20,y:30,x2:50,y2:60},{kind:'text',x:52,y:20,text:'边界条件'}]}}];
 d.userState.notes=[{id:'bottom-note',pageId:p.id,title:'',text:'自己的概括',back:'',material:'transparent',region:'bottom',marginPosition:.2,seed:1,x:0,y:0,z:1,face:'front',attached:false,collapsed:true,surface:'page',sheet:0}];
 d.userState.figureMarks=[{id:'figure-mark',pageId:p.id,blockId:'visual',kind:'arrow',x:70,y:30,x2:50,y2:50},{id:'figure-pen',pageId:p.id,blockId:'visual',kind:'pen',x:10,y:10,points:[[10,10],[20,20]]}];
 const saved=parseDocument(readerCopy(d,{marks:true,questions:true,answers:false,legacy:false,notes:true,ink:true})).document;
 assert.deepEqual(saved.userState.figureMarks,d.userState.figureMarks);assert.deepEqual(saved.userState.notes,d.userState.notes);
 const withoutInk=readerCopy(d,{marks:true,questions:false,answers:false,legacy:false,ink:false});assert.equal(withoutInk.userState.figureMarks!.length,1);
 const withoutPersonal=readerCopy(d,{marks:false,questions:false,answers:false,legacy:false,notes:false,ink:false});assert.deepEqual(withoutPersonal.userState.figureMarks,[]);assert.equal(withoutPersonal.notebook.chapters[0].pages[0].blocks[0].figure!.annotations!.length,2);
 const next=structuredClone(d);next.notebook.revision++;next.extensions.baseRevision=d.notebook.revision;const merged=mergeUpdate(d,next).document;assert.deepEqual(merged.userState.figureMarks,d.userState.figureMarks);
 const bad=structuredClone(d);bad.userState.figureMarks![0].x=101;assert.throws(()=>parseDocument(bad));
});
