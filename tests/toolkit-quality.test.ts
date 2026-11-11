import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {blankDocument} from '../src/model/types';
import {checkStudyMarks} from '../src/model/study-quality';
import {buildMetrics} from '../src/model/build-metrics';
import {reviewContent} from '../src/model/content-review';
import {diagramLayers} from '../src/model/diagram-layout';
import {reviewTemplate,checkDeliveryReview} from '../src/io/delivery-review';

const py=(script:string,input:unknown)=>{const result=spawnSync('python3',['-c',"import sys,json;sys.path.insert(0,'skills/paper-notebook/scripts');\n"+script],{encoding:'utf8',input:JSON.stringify(input)});assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);};
const lesson=()=>{const d=blankDocument();d.notebook.chapters[0].pages[0].blocks=[{id:'core',type:'prose',text:'复利按照每期期末余额计息。',study:{marks:[{kind:'bold',text:'期末余额'},{kind:'red',text:'期末余额',color:'#285f9e'}]}}];return d;};

test('a missing or incorrect cue anchor fails both author/build paths without altering source',()=>{
 const d=lesson(),p=d.notebook.chapters[0].pages[0];p.cues=[{id:'cue',text:'下一期的利息包含前期利息的增长。',blockId:'core'}];
 const before=JSON.stringify(d);assert.throws(()=>checkStudyMarks(d),/anchor: missing/);assert.equal(JSON.stringify(d),before);
 const result=py("from study_quality import check_study_marks\nd=json.load(sys.stdin)\ntry:check_study_marks(d)\nexcept ValueError as e:print(json.dumps(str(e)))",d);assert.match(result,/anchor: missing/);
 p.cues[0].anchor='期末余额';assert.deepEqual(checkStudyMarks(d).anchors,{declared:1,resolved:1,exact:1,blockLevel:0,degraded:0});
 p.cues[0].anchor='已经改掉的原句';assert.throws(()=>checkStudyMarks(d),/match source text/);
});

test('Python oneOf and author helpers reject malformed input with field locations',()=>{
 const result=py(`from build_reader import validate
from authoring import code,exercise,page,emphasize
errors=[]
for action in [lambda:validate([],{'oneOf':[{'type':'string'},{'type':'object'}]},{}),lambda:validate(1,{'oneOf':[{'type':'number'},{'type':'integer'}]},{}),lambda:code('x=1',id='code-x',explanations=[{'text':'x','note':'变量'}]*4),lambda:exercise('选择', ['甲','乙'],'c',id='q'),lambda:page('解释',[{'id':'b','type':'prose','text':'正文'}],cues=[{'blockId':'missing','text':'说明'}],id='p')]:
 try:action()
 except ValueError as e:errors.append(str(e))
print(json.dumps(errors,ensure_ascii=False))`,null);
 assert.equal(result.length,5);assert.match(result[0],/oneOf/);assert.match(result[1],/oneOf/);assert.match(result[2],/code-x.study.explanations/);assert.match(result[3],/q.answer/);assert.match(result[4],/p.cues.0.blockId/);
});

test('complete counts, capacity warning, font fallback and editorial distributions agree across runtimes',()=>{
 const d=lesson(),p=d.notebook.chapters[0].pages[0];p.blocks.push({id:'table',type:'comparison',columns:['对象','结果'],rows:[['甲','×2']]},{id:'example',type:'example',prompt:'起始余额①',steps:[{id:'step',text:'乘以增长因子→'}],result:'下一期余额'},{id:'formula',type:'formula',latex:'r',parameters:[{symbol:'r',name:'增长率',description:'本期增加额与期初余额之比'}]});
 const template='@font-face{font-family:StudyHand;unicode-range:U+20-7E}';
 assert.deepEqual(py("from build_metrics import build_metrics\nv=json.load(sys.stdin);print(json.dumps(build_metrics(v['d'],v['template']),ensure_ascii=False))",{d,template}),buildMetrics(d,template));
 assert.ok(buildMetrics(d,template).fonts.fallbackCharacters.some(c=>c.character==='①'));
 assert.deepEqual(py('from content_review import review_content\nprint(json.dumps(review_content(json.load(sys.stdin)),ensure_ascii=False))',d),reviewContent(d));
 const oversized=structuredClone(d);oversized.notebook.chapters[0].pages=Array.from({length:400},(_,i)=>({...p,id:'p'+i}));assert.equal(buildMetrics(oversized).capacity.warnings[0].used,400);
});

test('code and quote titles/explanations are reviewed while their literal text stays protected',()=>{
 const d=lesson();d.notebook.chapters[0].pages[0].blocks.push({id:'code',type:'code',title:'说白了',text:'说白了',study:{explanations:[{text:'说白了',note:'需要特别说明，变量保存计数。'}]}},{id:'quote',type:'quote',title:'敲黑板',text:'说白了'});
 const warnings=reviewContent(d).writing.warnings;assert.ok(warnings.some(w=>w.location==='code.title'));assert.ok(warnings.some(w=>w.location==='code.study.explanations.0'));assert.ok(warnings.some(w=>w.location==='quote.title'));assert.ok(!warnings.some(w=>['code.text','quote.text'].includes(w.location)));
});

test('diagram rank follows branches and merges, handles cycles and preserves explicit edges',()=>{
 const nodes=['a','b','c','d','e'].map(id=>({id,label:id})),edges=[{from:'a',to:'b'},{from:'a',to:'c'},{from:'b',to:'d'},{from:'c',to:'d'},{from:'d',to:'e'}],b={id:'graph',type:'diagram',nodes,edges};
 assert.deepEqual(diagramLayers(b).map(row=>row.map(n=>n.id)),[['a'],['b','c'],['d'],['e']]);assert.equal(b.edges.length,5);
 assert.deepEqual(diagramLayers({...b,edges:[...edges,{from:'d',to:'a'}]}).map(row=>row.map(n=>n.id)),[['a','b','c','d'],['e']]);
});

test('finalization rejects stale source, incomplete chapters, unreviewed findings and incomplete browser coverage',()=>{
 const d=lesson(),review=reviewTemplate(d,'source','rules');assert.throws(()=>checkDeliveryReview(d,review,'source','rules','artifact'),/actual editorial/);
 for(const entry of review.chapters)Object.assign(entry,{writing:'定义直接说明计息基数，未用虚设反驳。',teaching:'期末余额与下一期基数衔接完整。',facts:'此夹具未使用外部案例或数字。',brief:'夹具未提供学习简报。'});
 for(const decision of review.decisions)decision.decision='保留：这条说明对应实际术语定义。';review.browser.reason='此单元测试不启动浏览器；浏览器能力由集成检查覆盖。';
 assert.equal(checkDeliveryReview(d,review,'source','rules','artifact').deliveryReady,true);assert.throws(()=>checkDeliveryReview(d,review,'edited','rules','artifact'),/stale/);
 Object.assign(review.browser,{inspected:true,artifactSHA256:'artifact',sourceSHA256:'source',viewports:[{width:1440,height:1000}],issues:[],checkedSheets:2,expectedSheets:3});assert.throws(()=>checkDeliveryReview(d,review,'source','rules','artifact'),/incomplete/);
});

test('page patches preserve untouched pages, stable IDs and learning records, and reject stale pages',()=>{
 const d=lesson(),first=d.notebook.chapters[0].pages[0];d.notebook.chapters[0].pages.push({...structuredClone(first),id:'untouched'});
 const result=py(`from patch_pages import patch_pages,page_hash
from copy import deepcopy
d=json.load(sys.stdin);page=d['notebook']['chapters'][0]['pages'][0];replacement=deepcopy(page);replacement['title']='期末余额'
p=dict(notebookId=d['notebook']['id'],baseRevision=d['notebook']['revision'],pages=[dict(pageId=page['id'],baseSHA256=page_hash(page),page=replacement)])
r=patch_pages(d,p)
try:patch_pages(r,p)
except ValueError:stale=True
print(json.dumps(dict(result=r,stale=stale),ensure_ascii=False))`,d);
 assert.equal(result.stale,true);assert.deepEqual(result.result.notebook.chapters[0].pages[1],d.notebook.chapters[0].pages[1]);assert.deepEqual(result.result.userState.notes,d.userState.notes);assert.equal(first.title,d.notebook.chapters[0].pages[0].title);assert.equal(result.result.extensions.baseRevision,d.notebook.revision);
});
