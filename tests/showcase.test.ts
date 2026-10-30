import test from 'node:test';
import assert from 'node:assert/strict';
import {showcaseNotebooks} from '../src/showcase';
import {introNotebook} from '../src/intro';
import {parseDocument} from '../src/model/document';
import {pagesOf,blocksOf} from '../src/model/types';
import {checkStudyMarks} from '../src/model/study-quality';
import {exportMarkdown,importText} from '../src/io/markdown';

test('subject lessons are independent, valid readers with complete marks and portable source',()=>{
 for(const [name,doc] of showcaseNotebooks){
  parseDocument(doc);
  assert.equal(doc.userState.lastPageId,pagesOf(doc)[0].id);
  assert.equal(doc.extensions.baseRevision,undefined);
  const report=checkStudyMarks(doc);
  assert.deepEqual(report.unmarkedPages,[],name);
  assert.deepEqual(report.typography.missingBoldPages,[],name);
  assert.deepEqual(report.typography.missingColorPages,[],name);
  assert.ok(blocksOf(doc).some(b=>b.figure?.annotations?.length),name);
  assert.deepEqual(importText(exportMarkdown(doc)).document.notebook,doc.notebook);
  const used=new Set(blocksOf(doc).flatMap(b=>b.assetId?[b.assetId]:[]));
  assert.ok(doc.assets.every(a=>used.has(a.id)));
 }
 assert.equal(introNotebook.notebook.revision,9);
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
