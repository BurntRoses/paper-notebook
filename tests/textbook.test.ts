import test from 'node:test';
import assert from 'node:assert/strict';
import {importText,exportMarkdown} from '../src/io/markdown';
import {blankDocument,blocksOf,pagesOf} from '../src/model/types';
import {parseDocument} from '../src/model/document';
import {slimFonts,artifactStem} from '../src/io/packaging';
import {machineLearning} from '../src/machine-learning';

test('page directives bind Cornell cues and charts to the correct source page and survive export',()=>{
 const input='# 教材\n## 数据\n### 关系\n```notebook-page\n'+JSON.stringify({id:'data-page',layout:'cornell',summary:'两个观测值。',cues:[{id:'data-cue',text:'图上有几个点？',blockId:'observed'}]})+'\n```\n```notebook-block\n'+JSON.stringify({id:'observed',type:'chart',chartType:'scatter',xLabel:'输入',yLabel:'结果',series:[{id:'s',label:'观测',points:[{x:1,y:3},{x:2,y:5}]}],keepTogether:true,study:{role:'evidence',frame:'pencil'}})+'\n```';
 const d=importText(input).document,round=importText(exportMarkdown(d)).document;
 assert.deepEqual(round.notebook,d.notebook);assert.equal(pagesOf(d)[0].layout,'cornell');
 assert.equal(pagesOf(d)[0].cues![0].blockId,blocksOf(d)[0].id);
 const invalid=structuredClone(d);blocksOf(invalid)[0].series![0].points[0].y=NaN;
 assert.throws(()=>parseDocument(invalid));
});
test('Unicode font trimming keeps every used range, core UI, and complete blank import fonts',()=>{
 const core='@font-face{font-family:StudyHand;src:url(core);unicode-range:U+20-7E,U+4E00}',cjk='@font-face{font-family:StudyHand;src:url(cjk);unicode-range:U+4E01-4EFF}',rare='@font-face{font-family:StudyHand;src:url(rare);unicode-range:U+20000-2FFFF}',math='@font-face{font-family:KaTeX_Main;src:url(math)}';
 const html=core+cjk+rare+math,d=blankDocument();assert.equal(slimFonts(html,d),html);
 d.notebook.title='Book';d.notebook.chapters[0].title='Chapter';d.notebook.chapters[0].pages[0].title='Page';d.notebook.chapters[0].pages[0].blocks=[{id:'word',type:'prose',text:'丁'}];
 assert.equal(slimFonts(html,d),core+cjk+math);
 d.notebook.chapters[0].pages[0].blocks[0].text='𠀀';
 assert.equal(slimFonts(html,d),core+rare+math);
});
test('artifact filenames are readable, versioned and safe on major desktop filesystems',()=>{
 assert.equal(artifactStem('线性回归 / 第一讲?',2),'线性回归-第一讲-v2');
 assert.equal(artifactStem('CON',1),'笔记-CON-v1');assert.equal(artifactStem('   ',1),'学习笔记-v1');
 assert.ok(!/[<>:"/\\|?*]/.test(artifactStem('A:B|C\\D',1)));
});
test('machine learning textbook validates, distinguishes examples and supplies reproducible numerical visuals',()=>{
 const {document,warnings}=parseDocument(machineLearning);assert.deepEqual(warnings,[]);
 assert.equal(document.notebook.chapters.length,4);assert.equal(pagesOf(document).length,11);
 const blocks=blocksOf(document);assert.equal(blocks.filter(b=>b.type==='exercise').length,0);
 assert.ok(blocks.filter(b=>b.type==='chart').length>=3);assert.ok(blocks.filter(b=>b.type==='example').every(b=>b.steps?.length&&b.result));
 const loss=blocks.find(b=>b.id==='ml-loss-curve')!;
 for(const point of loss.series![0].points)assert.equal(point.y,2.5*(point.x-2)**2);
 assert.equal(1-.1*(5*(1-2)),1.5);assert.equal(2.5*(1.5-2)**2,.625);
 for(const p of pagesOf(document))for(const cue of p.cues||[])assert.ok(p.blocks.some(b=>b.id===cue.blockId));
});
