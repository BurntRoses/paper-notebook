import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {blankDocument, blocksOf} from '../src/model/types';
import {parseDocument} from '../src/model/document';
import {reviewContent} from '../src/model/content-review';
import {tableAlignments} from '../src/ui/tables';
import {MarkHistory} from '../src/reader/mark-history';

test('writing review covers explanations and tables, protects quotations, literals and personal records',()=>{
 const d=blankDocument(),p=d.notebook.chapters[0].pages[0];
 p.blocks=[{id:'main',type:'prose',text:'被积函数可以为负；把握条件。若独立性不成立，结论可能失效。`赋能` $赋能$ https://example.com/赋能'},{id:'literal',type:'quote',text:'让我们一起赋能'},{id:'code',type:'code',text:'Let’s dive in'},{id:'table',type:'comparison',columns:['说明'],rows:[['进行分析']]},{id:'math',type:'formula',latex:'赋能',text:'Could potentially improve.',parameters:[{symbol:'x',name:'参数',description:'研究表明其稳定。'}]}];
 d.userState.notes=[{text:'显而易见'} as any];const before=JSON.stringify(d);
 const review=reviewContent(d),warnings=review.writing.warnings;
 assert.deepEqual(warnings.map(w=>w.rule),['nominalized-action','stacked-hedges','vague-authority']);
 assert.equal(warnings[0].location,'table.cells.1');assert.equal(review.automaticRewrite,false);assert.equal(JSON.stringify(d),before);
 const py=spawnSync('python3',['-c',"import sys,json;sys.path.insert(0,'skills/paper-notebook/scripts');from content_review import review_content;print(json.dumps(review_content(json.load(sys.stdin)),ensure_ascii=False))"],{input:JSON.stringify(d),encoding:'utf8'});
 assert.equal(py.status,0,py.stderr);assert.deepEqual(JSON.parse(py.stdout),review);
});

test('figure coverage separates tables and reports unused/large assets without deleting provenance',()=>{
 const d=blankDocument(),p=d.notebook.chapters[0].pages[0];p.blocks=[{id:'explain',type:'prose',text:'关系与条件。'.repeat(80)},{id:'table',type:'comparison',columns:['对象'],rows:[['A']]}];
 d.notebook.chapters[0].pages.push({...structuredClone(p),id:'p2'});d.assets=[{id:'original',name:'Original',mime:'image/png',data:'data:image/png;base64,'+'A'.repeat(500000)}];
 const result=reviewContent(d);assert.equal(result.visuals.figures,0);assert.equal(result.visuals.tables,2);assert.equal(result.visuals.warnings.length,3);assert.equal(d.assets.length,1);
 p.blocks.push({id:'fig',type:'diagram'});assert.equal(reviewContent(d).visuals.figures,1);
});

test('figure protocol roundtrips with existing documents and rejects invalid ratios/dimensions',()=>{
 const d=blankDocument(),p=d.notebook.chapters[0].pages[0];p.blocks=[{id:'fig',type:'diagram',nodes:[],edges:[],figure:{size:'medium',ratio:'3:4',align:'right',style:'precise'}}];
 assert.deepEqual(blocksOf(parseDocument(d).document)[0].figure,p.blocks[0].figure);
 p.blocks[0].figure!.ratio='20:1' as any;assert.throws(()=>parseDocument(d));
 p.blocks[0].figure!.ratio='auto';d.assets=[{id:'a',name:'test',mime:'image/png',data:'data:image/png;base64,AA==',width:0}];assert.throws(()=>parseDocument(d));
});

test('table column alignment uses the complete table including text on later sheets',()=>{
 const source={id:'table',type:'comparison',columns:['对象','数值','混合'],rows:[['A','12','12'],['B','−2.5','待测']]};
 assert.deepEqual(tableAlignments(source),['left','center','left']);assert.deepEqual(tableAlignments({...source,align:['right']}),['right','center','left']);
});

test('mark undo/redo preserves notes and answers changed after marking; caps history',()=>{
 const d=blankDocument(),history=new MarkHistory(2),s=d.userState;
 const add=(id:string)=>history.change(s,()=>s.dismissedStudyMarks=[...(s.dismissedStudyMarks||[]),id]);
 assert.equal(add('author-a'),true);assert.equal(history.change(s,()=>{}),false);add('author-b');add('author-c');
 s.answers.q={selected:['answer'],submitted:true};history.undo(s);history.undo(s);assert.deepEqual(s.dismissedStudyMarks,['author-a']);assert.equal(history.undo(s),false);
 history.redo(s);assert.deepEqual(s.dismissedStudyMarks,['author-a','author-b']);assert.deepEqual(s.answers.q.selected,['answer']);
 add('author-d');assert.equal(history.canRedo,false);history.reset();assert.equal(history.canUndo,false);
});
