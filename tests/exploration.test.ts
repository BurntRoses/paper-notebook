import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {evaluate, explorationState, validateExploration} from '../src/model/exploration';
import {growthActivity,businessActivity,regressionActivity,readingActivity,sequenceActivity} from '../src/learning-activities';
import {introNotebook} from '../src/intro';
import {machineLearning} from '../src/machine-learning';
import {showcaseNotebooks} from '../src/showcase';
import {parseDocument,mergeUpdate} from '../src/model/document';
import {textOf,explorationText, type Exploration, type Expression} from '../src/model/types';
import {exportMarkdown,importText} from '../src/io/markdown';
import {readerCopy} from '../src/reader/records';
const activities=[growthActivity,businessActivity,regressionActivity,readingActivity,sequenceActivity];
test('all teaching activities use validated native declarations',()=>{activities.forEach(b=>validateExploration(b.exploration!,b.id));parseDocument(introNotebook);parseDocument(machineLearning);for(const [,d]of showcaseNotebooks)parseDocument(d);});
test('compound, break-even and regression compute actual results',()=>{
 const output=(b:typeof growthActivity,index:number,values?:Record<string,number>)=>{const a=b.exploration!;assert.equal(a.kind,'plot');if(a.kind!=='plot')throw Error();return evaluate(a.outputs[index].expression,{...explorationState(a).values,...values,x:a.domain.max});};
 assert.equal(output(growthActivity,0),121.00000000000001);assert.ok(Math.abs(output(growthActivity,1)-672.7499949325611)<1e-8);assert.equal(output(growthActivity,0,{rate:0}),100);
 assert.equal(output(businessActivity,0),30);assert.equal(output(businessActivity,1),100);assert.equal(output(businessActivity,2),600);assert.equal(output(businessActivity,2,{fixed:6000}),-2400);
 assert.equal(output(regressionActivity,0),4);assert.equal(output(regressionActivity,1),2/3);assert.ok(output(regressionActivity,1,{slope:1.5,intercept:2/3})<.056);
});
test('state clamps saved parameters and restores missing frames',()=>{
 assert.deepEqual(explorationState(growthActivity.exploration!,{values:{principal:Infinity,rate:50,unknown:2}}),{values:{principal:100,rate:15}});
 assert.deepEqual(explorationState(sequenceActivity.exploration!,{active:'removed'}),{active:'set-empty'});
});
test('invalid expressions fail with field location in both runtimes',()=>{
 const clone=()=>structuredClone(growthActivity.exploration!) as Extract<Exploration,{kind:'plot'}>;
 for(const mutation of [(a:ReturnType<typeof clone>)=>a.parameters[1].id='principal',(a:ReturnType<typeof clone>)=>a.outputs[0].expression='missing',(a:ReturnType<typeof clone>)=>a.outputs[0].expression={op:'div',args:[1,0]},(a:ReturnType<typeof clone>)=>a.outputs[0].expression={op:'pow',args:[2]}]){const a=clone();mutation(a);assert.throws(()=>validateExploration(a,'test-block'),/test-block.exploration/);const py=spawnSync('python3',['-c',"import json,sys;sys.path.insert(0,'skills/paper-notebook/scripts');from exploration import validate_exploration;validate_exploration(json.load(sys.stdin),'test-block')"],{input:JSON.stringify(a),encoding:'utf8'});assert.notEqual(py.status,0);assert.match(py.stderr,/test-block.exploration/);}
 let deep:Expression=1;for(let i=0;i<18;i++)deep={op:'abs',args:[deep]};assert.throws(()=>evaluate(deep,{}),/16/);
});
test('canonical activity text, authoring statistics and source anchors agree',()=>{
 for(const b of activities){const py=spawnSync('python3',['-c',"import json,sys;sys.path.insert(0,'skills/paper-notebook/scripts');from study_quality import block_text;print(json.dumps(block_text(json.load(sys.stdin)),ensure_ascii=False))"],{input:JSON.stringify(b),encoding:'utf8'});assert.equal(py.status,0,py.stderr);assert.equal(JSON.parse(py.stdout),textOf(b));assert.equal(textOf(b),explorationText(b.exploration!));}
});
test('interactive state survives source updates, Markdown and selected-record export',()=>{
 const d=structuredClone(introNotebook);d.userState.explorations={'growth-exploration':{values:{principal:200,rate:5}},'literature-exploration':{active:'spring-third'}};
 assert.deepEqual(importText(exportMarkdown(d)).document.userState.explorations,d.userState.explorations);
 const next=structuredClone(d);next.extensions.baseRevision=d.notebook.revision;next.notebook.revision++;
 assert.deepEqual(mergeUpdate(d,next).document.userState.explorations,d.userState.explorations);
 assert.deepEqual(readerCopy(d,{answers:true,marks:false,questions:false,legacy:false}).userState.explorations,d.userState.explorations);
 assert.equal(readerCopy(d,{answers:false,marks:false,questions:false,legacy:false}).userState.explorations,undefined);
});
