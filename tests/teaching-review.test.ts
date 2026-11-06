import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {blankDocument, type Annotation} from '../src/model/types';
import {parseDocument} from '../src/model/document';
import {reviewContent} from '../src/model/content-review';
import {distinctPassages} from '../src/model/study';

test('margin titles roundtrip and observable teaching defects agree across Node and Python',()=>{
 const d=blankDocument(),p=d.notebook.chapters[0].pages[0];
 p.blocks=[{id:'loss',type:'prose',text:'均方误差先将每个样本的误差平方，再求平均。较大误差对目标函数贡献更大。'.repeat(2),study:{marks:[{text:'均方误差',kind:'bold'},{text:'均方误差',kind:'bold'}]}}];
 p.cues=[{id:'copy',title:'平方惩罚',text:'均方误差先将每个样本的误差平方，再求平均。',blockId:'loss'},
  {id:'duplicate',text:'均方误差先将每个样本的误差平方，再求平均。',blockId:'loss',anchor:'均方误差'},
  {id:'useful',title:'尺度变化',text:'所有误差放大 k 倍，平方损失放大 k² 倍。',blockId:'loss',anchor:'误差平方'}];
 assert.equal(parseDocument(d).document.notebook.chapters[0].pages[0].cues![0].title,'平方惩罚');
 const before=JSON.stringify(d),report=reviewContent(d);
 assert.deepEqual(report.teaching.warnings.map(w=>w.rule),['margin-anchor','margin-copy','margin-copy','margin-repeat','emphasis-color','emphasis-repeat']);
 assert.equal(report.teaching.marginNotes,3);assert.equal(report.teaching.titledNotes,2);
 const py=spawnSync('python3',['-c',"import sys,json;sys.path.insert(0,'skills/paper-notebook/scripts');from content_review import review_content;print(json.dumps(review_content(json.load(sys.stdin)),ensure_ascii=False))"],{input:JSON.stringify(d),encoding:'utf8'});
 assert.equal(py.status,0,py.stderr);assert.deepEqual(JSON.parse(py.stdout),report);
 assert.equal(JSON.stringify(d),before);
});

test('the key-passage list combines styles on one range and keeps separate occurrences',()=>{
 const selector={blockId:'loss',start:0,end:4,exact:'均方误差',prefix:'',suffix:''};
 const mark=(id:string,kind:Annotation['kind'],start=0):Annotation=>({id,kind,pageId:'lesson',selectors:[{...selector,start,end:start+4}],color:'#285f9e',width:2,seed:1});
 const marks=[mark('bold','bold'),mark('color','red'),mark('circle','circle'),mark('later','bold',40),{...mark('another','bold'),pageId:'other-page'}];
 assert.deepEqual(distinctPassages(marks).map(m=>m.id),['bold','later','another']);
 assert.equal(marks.length,5);
});
