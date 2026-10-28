import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {importText,exportMarkdown} from '../src/io/markdown';
import {blankDocument,blocksOf,pagesOf,textOf,parameterText} from '../src/model/types';
import {parseDocument,resolveSelector} from '../src/model/document';
import {slimFonts,artifactStem} from '../src/io/packaging';
import {machineLearning} from '../src/machine-learning';
import {authoredAnnotations} from '../src/model/study';
import {checkStudyMarks} from '../src/model/study-quality';
import {examples} from '../src/examples';

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
test('default font catalog stays compact, keeps its verified slices and omits full Unicode sources',()=>{
 const catalog=JSON.parse(readFileSync('assets/fonts/reading/manifest.json','utf8'));
 const css=readFileSync('src/reader/fonts.css','utf8');
 assert.equal(catalog.coverage,8424);assert.equal(catalog.chunkGlyphs,64);assert.equal(catalog.outlineAndMetricsVerified,true);
 assert.ok(catalog.bytes<2_200_000);assert.doesNotMatch(css,/wenkai-reading-/);
 for(const file of catalog.files){
  const bytes=readFileSync(file.path);assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);
  assert.ok(file.path.endsWith('/core.woff2')||file.glyphs<=64);
  assert.ok(css.includes(file.path.replace('assets/','../../assets/')));
 }
});
test('artifact filenames are readable, versioned and safe on major desktop filesystems',()=>{
 assert.equal(artifactStem('线性回归 / 第一讲?',2),'线性回归-第一讲-v2');
 assert.equal(artifactStem('CON',1),'笔记-CON-v1');assert.equal(artifactStem('   ',1),'学习笔记-v1');
 assert.ok(!/[<>:"/\\|?*]/.test(artifactStem('A:B|C\\D',1)));
});
test('machine learning textbook validates, distinguishes examples and supplies reproducible numerical visuals',()=>{
 const {document,warnings}=parseDocument(machineLearning);assert.deepEqual(warnings,[]);
 assert.equal(document.notebook.chapters.length,4);assert.equal(pagesOf(document).length,12);
 const blocks=blocksOf(document);assert.equal(blocks.filter(b=>b.type==='exercise').length,0);
 assert.ok(blocks.filter(b=>b.type==='chart').length>=3);assert.ok(blocks.filter(b=>b.type==='example').every(b=>b.steps?.length&&b.result));
 const loss=blocks.find(b=>b.id==='ml-loss-curve')!;
 for(const point of loss.series![0].points)assert.equal(point.y,2.5*(point.x-2)**2);
 assert.equal(1-.1*(5*(1-2)),1.5);assert.equal(2.5*(1.5-2)**2,.625);
 for(const p of pagesOf(document))for(const cue of p.cues||[])assert.ok(p.blocks.some(b=>b.id===cue.blockId));
 const chart=blocks.find(b=>b.id==='ml-parameter-chart')!;
 for(const [i,s]of chart.series!.entries())for(const p of s.points)assert.equal(p.y,i===1?2*p.x+1:i===2?p.x+2:p.x+1);
 assert.equal(document.notebook.revision,3);assert.equal(document.extensions.baseRevision,2);
 assert.ok(blocks.filter(b=>b.type==='formula').every(b=>b.parameters?.every(p=>p.description.length>20)));
});
test('downloadable authored examples carry intentional anchored emphasis',()=>{
 for(const document of [...examples,machineLearning]){
  const report=checkStudyMarks(document);assert.ok(report.total>0,document.notebook.id);
  assert.ok(report.byKind.circle&&report.byKind.underline&&report.byKind.dots,document.notebook.id);
  for(const page of pagesOf(document))for(const annotation of authoredAnnotations(document,page.id)){
   for(const selector of annotation.selectors)assert.equal(resolveSelector(document,selector).status,'resolved');
  }
 }
 assert.equal(checkStudyMarks(machineLearning).unmarkedPages.length,0);
});
test('formula symbol rows validate and roundtrip with addressable explanations and compatible legacy text',()=>{
 const original=structuredClone(machineLearning),round=importText(exportMarkdown(original)).document;
 assert.deepEqual(round.notebook,original.notebook);
 const b=blocksOf(round).find(b=>b.id==='ml-linear')!,text=textOf(b),row=parameterText(b.parameters![2]),start=text.indexOf(row);
 assert.ok(start>b.text!.length);assert.deepEqual(resolveSelector(round,{blockId:b.id,start,end:start+row.length,exact:row,prefix:'',suffix:''}),{status:'resolved',start,end:start+row.length});
 const old=structuredClone(original);delete blocksOf(old).find(b=>b.id==='ml-linear')!.parameters;assert.doesNotThrow(()=>parseDocument(old));
 for(const field of ['symbol','name','description']as const){const invalid=structuredClone(original);blocksOf(invalid).find(b=>b.id==='ml-linear')!.parameters![0][field]='';assert.throws(()=>parseDocument(invalid));}
 const oldText='Legacy explanation';assert.equal(textOf({id:'old',type:'formula',latex:'x+y',text:oldText}),oldText);
 b.study!.marks=[{text:b.parameters![0].description,kind:'underline'}];
 const mark=authoredAnnotations(round,'ml-model')[0];assert.equal(mark.color,'#345d76');assert.equal(resolveSelector(round,mark.selectors[0]).status,'resolved');
});
