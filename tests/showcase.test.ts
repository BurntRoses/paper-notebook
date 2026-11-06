import test from 'node:test';
import assert from 'node:assert/strict';
import {showcaseNotebooks} from '../src/showcase';
import {introNotebook} from '../src/intro';
import {parseDocument} from '../src/model/document';
import {pagesOf,blocksOf,textOf} from '../src/model/types';
import {checkStudyMarks} from '../src/model/study-quality';
import {exportMarkdown,importText} from '../src/io/markdown';

test('subject lessons are independent, valid readers with complete marks and portable source',()=>{
 for(const [name,doc] of showcaseNotebooks){
  parseDocument(doc);
  assert.equal(doc.userState.lastPageId,pagesOf(doc)[0].id);
  assert.equal(doc.extensions.baseRevision,doc.notebook.revision-1);
  const report=checkStudyMarks(doc);
  assert.deepEqual(report.unmarkedPages,[],name);
  const sourceIds=new Set(doc.notebook.sources.map(s=>s.id));
  for(const p of pagesOf(doc)){
   assert.equal(p.subtitle,undefined);
   for(const cue of p.cues||[]){
    const block=p.blocks.find(b=>b.id===cue.blockId);assert.ok(block,name+': '+cue.id);
    if(cue.anchor)assert.ok(textOf(block).includes(cue.anchor),cue.id);
   }
   for(const block of p.blocks)for(const ref of block.sourceRefs||[])assert.ok(sourceIds.has(ref.sourceId),ref.sourceId);
  }
  assert.deepEqual(report.typography.missingBoldPages,[],name);
  assert.deepEqual(report.typography.missingColorPages,[],name);
  assert.ok(blocksOf(doc).some(b=>b.figure?.annotations?.length),name);
  assert.deepEqual(importText(exportMarkdown(doc)).document.notebook,doc.notebook);
  const used=new Set(blocksOf(doc).flatMap(b=>b.assetId?[b.assetId]:[]));
  assert.ok(doc.assets.every(a=>used.has(a.id)));
 }
 assert.equal(introNotebook.extensions.baseRevision,introNotebook.notebook.revision-1);
 assert.equal(blocksOf(introNotebook).some(b=>b.id==='business-breakeven-chart'),false);
});

test('business graph and worked calculation use the same cost and price',()=>{
 const doc=showcaseNotebooks.find(([name])=>name==='business')![1];
 const graph=blocksOf(doc).find(b=>b.id==='business-breakeven-chart')!;
 for(const series of graph.series!)for(const p of series.points){
  assert.equal(p.y,series.id==='business-revenue'?80*p.x:3000+50*p.x);
 }
 assert.equal(3000/(80-50),100);
});

test('gradient update contracts the distance and squared loss for the worked quadratic',()=>{
 const loss=(w:number)=>2.5*(w-2)**2;
 for(const eta of [.1,.2,.3]){
  const next=1-eta*5*(1-2);
  assert.ok(Math.abs((next-2)-(1-5*eta)*(1-2))<1e-12);
  assert.ok(loss(next)<loss(1));
 }
 assert.ok(loss(1-.5*5*(1-2))>loss(1));
});
