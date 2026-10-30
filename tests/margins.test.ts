import test from 'node:test';
import assert from 'node:assert/strict';
import { blankDocument, parameterText, textOf, type Note } from '../src/model/types';
import { cueSelector,cuesForSheet,summaryForSheet,notesForSheet } from '../src/reader/margins';
import {parseDocument} from '../src/model/document';
import type { SurfacePage } from '../src/reader/surface';
test('cues follow their first block fragment and section summaries appear once',()=>{
 const d=blankDocument(),p=d.notebook.chapters[0].pages[0];p.summary='仅本节的结论';p.cues=[{id:'c1',text:'第一点',blockId:'a'},{id:'c2',text:'第二点',blockId:'b'},{id:'c3',text:'总览'}];
 const first:SurfacePage={...p,blocks:[{id:'a',type:'prose',text:'前半'}],part:0,totalParts:3};
 const middle:SurfacePage={...p,blocks:[{id:'a',type:'prose',text:'后半',_offset:2},{id:'b',type:'prose',text:'第二点'}],part:1,totalParts:3};
 const last:SurfacePage={...p,blocks:[],part:2,totalParts:3};
 assert.deepEqual(cuesForSheet(first).map(c=>c.id),['c1','c3']);assert.deepEqual(cuesForSheet(middle).map(c=>c.id),['c2']);assert.equal(cuesForSheet(last).length,0);
 assert.equal(summaryForSheet(d,first),'');assert.equal(summaryForSheet(d,middle),'');assert.equal(summaryForSheet(d,last),p.summary);
 d.notebook.chapters[0].pages.push({...p,id:'next-page'});assert.equal(summaryForSheet(d,{...last,id:'next-page'}),'');
});
test('a cue follows its exact formula parameter or prose passage onto a continuation',()=>{
 const d=blankDocument(),p=d.notebook.chapters[0].pages[0];
 const parameters=[{symbol:'x',name:'输入',description:'随样本改变。'},{symbol:'b',name:'截距',description:'整条直线向上平移。'}];
 const formula={id:'formula',type:'formula',latex:'y=wx+b',text:'固定参数',parameters};
 p.blocks=[formula,{id:'prose',type:'prose',text:'定义在前。\n\n异常值影响在后。'}];
 p.cues=[{id:'legacy',text:'参数',blockId:'formula'},{id:'parameter',text:'平移方向？',blockId:'formula',anchor:'整条直线向上平移'},{id:'prose-cue',text:'哪种影响？',blockId:'prose',anchor:'异常值影响'}];
 const start=(formula.text.length+1),sheets:SurfacePage[]=[
  {...p,blocks:[{...formula,parameters:parameters.slice(0,1),text:undefined,_parameterOffset:start}],part:0,totalParts:3},
  {...p,blocks:[{...formula,parameters:parameters.slice(1),_formulaContinuation:true,_parameterOffset:start+parameterText(parameters[0]).length+1},{id:'prose',type:'prose',text:'定义在前。\n\n'}],part:1,totalParts:3},
  {...p,blocks:[{id:'prose',type:'prose',text:'异常值影响在后。',_offset:7}],part:2,totalParts:3}
 ];
 assert.deepEqual(sheets.map(s=>cuesForSheet(s,d).map(c=>c.id)),[['legacy'],['parameter'],['prose-cue']]);
 const selector=cueSelector(d,p.id,p.cues[1])!;assert.equal(textOf(formula).slice(selector.start,selector.end),'整条直线向上平移');
 assert.doesNotThrow(()=>parseDocument(d));const invalid=structuredClone(d);invalid.notebook.chapters[0].pages[0].cues![1].anchor='原文未解释';assert.throws(()=>parseDocument(invalid),/anchor/);
});
test('free bottom notes stay on their sheet and linked right notes follow repagination',()=>{
 const d=blankDocument(),p=d.notebook.chapters[0].pages[0],sheet:SurfacePage={...p,blocks:[],part:1,totalParts:2};
 const base:Note={id:'free',pageId:p.id,title:'',text:'批注',back:'',material:'transparent',seed:1,x:0,y:0,z:1,face:'front',attached:false,collapsed:true,surface:'page',sheet:1,region:'bottom'};
 const linked:Note={...base,id:'linked',region:undefined,selector:{blockId:'b',start:30,end:32,exact:'原文',prefix:'',suffix:''}};
 assert.deepEqual(notesForSheet([base,linked],sheet,7,()=>7,'bottom').map(n=>n.id),['free']);assert.deepEqual(notesForSheet([base,linked],sheet,7,()=>7,'right').map(n=>n.id),['linked']);assert.equal(notesForSheet([linked],sheet,7,()=>8,'right').length,0);
});
