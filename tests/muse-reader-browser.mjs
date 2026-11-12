import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {zipSync,strToU8} from 'fflate';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.NOTEBOOK_READER_URL||`${process.env.NOTEBOOK_BASE||'http://127.0.0.1:5183'}/downloads/paper-notebook.html?demo`;
await mkdir('output/muse-reader',{recursive:true});
const results=[];
for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.reader?.fontsCalibrated);
  const fixture=await page.evaluate(()=>{
   const r=reader;r.profile.layout='single';r.profile.motion='reduced';r.profile.marginNotes=true;r.profile.bottomNotes=true;
   const text='期末金额等于本金乘以各期增长因子的乘积。',cue='侧栏完整内容：每一期均在上期金额的基础上计算增长。'.repeat(60),summary='底栏完整内容：核算时使用相同的计息期间和利率单位。'.repeat(48),note='私人长便条：逐期核对累计金额。'.repeat(90);
   r.d.notebook.chapters=[{id:'muse-print-chapter',title:'复利',pages:[{id:'muse-print-page',title:'复利核算',layout:'cornell',blocks:[{id:'muse-print-prose',type:'prose',text,study:{marks:[{text:'期末金额',kind:'bold'},{text:'增长因子',kind:'circle'}]}},{id:'muse-print-figure',type:'diagram',title:'累计过程',nodes:[{id:'principal',label:'本金'},{id:'amount',label:'期末金额'}],edges:[{from:'principal',to:'amount'}],figure:{annotations:[{kind:'text',x:20,y:80,text:'作者图注'}]}}],cues:[{id:'muse-print-cue',title:'逐期计算',blockId:'muse-print-prose',anchor:'增长因子',text:cue}],summary}]}];
   r.d.userState.annotations=[{id:'muse-private-mark',pageId:'muse-print-page',kind:'underline',selectors:[{blockId:'muse-print-prose',start:0,end:4,exact:'期末金额',prefix:'',suffix:''}],color:'#285f9e',width:2,seed:3,status:'resolved'}];
   r.d.userState.dismissedStudyMarks=['author-muse-print-prose-1'];
   r.d.userState.figureMarks=[{id:'muse-private-figure',pageId:'muse-print-page',blockId:'muse-print-figure',kind:'text',x:50,y:40,text:'私人图注'}];
   r.d.userState.bookmarks=[{id:'muse-private-bookmark',pageId:'muse-print-page',kind:'page'}];
   r.d.userState.notes=[{id:'muse-private-note',pageId:'muse-print-page',title:'私人长便条',text:note,back:'',material:'transparent',seed:1,x:0,y:0,z:1,face:'front',attached:true,collapsed:true,surface:'page',region:'right'}];
   r.d.userState.doubts=[];r.d.userState.answers={};r.d.userState.checks={};r.d.userState.explorations={};r.invalidate();r.render();r.goPage(0);
   return {text,cue,summary,note,source:JSON.stringify(r.d.notebook),records:JSON.stringify({annotations:r.d.userState.annotations,figureMarks:r.d.userState.figureMarks,bookmarks:r.d.userState.bookmarks,notes:r.d.userState.notes,dismissed:r.d.userState.dismissedStudyMarks})};
  });
  for(const orientation of ['portrait','landscape']){
   for(const includeRecords of [true,false]){
    await page.evaluate(options=>reader.preparePDF(options).then(()=>null),{orientation,includeRecords});
    const info=await page.evaluate(()=>{
     const root=document.querySelector('#print-root'),papers=[...root.querySelectorAll(':scope > .print-sheet')];
     return {text:root.textContent,figures:[...root.querySelectorAll('.figure-annotations text')].map(n=>n.textContent),bookmarks:root.querySelectorAll('[data-bookmark]').length,authored:root.querySelectorAll('[data-ink="author-muse-print-prose-1"]').length,privateMarks:root.querySelectorAll('[data-ink="muse-private-mark"]').length,continuation:root.querySelectorAll('.print-margin-continuation').length,marginText:[...root.querySelectorAll('.print-margin-continuation .content-block .ink-text')].map(n=>n.dataset.sourceText??n.textContent).join(''),notes:[...root.querySelectorAll('[data-block="print-note-muse-private-note"] .ink-text')].map(n=>n.dataset.sourceText??n.textContent).join(''),sizes:papers.map(n=>({width:n.offsetWidth,height:n.offsetHeight})),fonts:papers.map(n=>getComputedStyle(n.querySelector('.reader-content')).fontSize),overflows:papers.flatMap(p=>{const body=p.querySelector('.reader-page-body').getBoundingClientRect(),box=p.getBoundingClientRect();return [...p.querySelectorAll(':scope > .reader-page-body > .reader-content > .content-block')].filter(n=>n.getBoundingClientRect().bottom>body.bottom+2).map(n=>n.dataset.block).concat([...p.querySelectorAll('.paper-notes,.paper-bottom')].filter(n=>n.scrollHeight>n.clientHeight+2).map(n=>n.className),body.left-box.left<45?'left margin':[],box.right-body.right<45?'right margin':[])}),source:JSON.stringify(reader.d.notebook),records:JSON.stringify({annotations:reader.d.userState.annotations,figureMarks:reader.d.userState.figureMarks,bookmarks:reader.d.userState.bookmarks,notes:reader.d.userState.notes,dismissed:reader.d.userState.dismissedStudyMarks})};
    });
    assert.equal(info.source,fixture.source);assert.equal(info.records,fixture.records);assert.deepEqual(info.overflows,[]);assert.ok(info.fonts.every(f=>f==='16px'));assert.ok(info.sizes.every(s=>Math.abs(s.width-(orientation==='portrait'?794:1123))<=1&&Math.abs(s.height-(orientation==='portrait'?1123:794))<=1));
    assert.ok(info.continuation>1);assert.equal(info.marginText,fixture.cue+fixture.summary);assert.ok(info.figures.includes('作者图注'));
    if(includeRecords){assert.ok(info.notes.endsWith(fixture.note));assert.ok(info.figures.includes('私人图注'));assert.ok(info.bookmarks>0);assert.ok(info.privateMarks>0);assert.equal(info.authored,0);}
    else{assert.equal(info.notes,'');assert.ok(!info.text.includes('私人'));assert.ok(!info.figures.includes('私人图注'));assert.equal(info.bookmarks,0);assert.equal(info.privateMarks,0);assert.ok(info.authored>0);}
    await page.evaluate(()=>reader.finishPrint());await page.waitForFunction(()=>!reader.printState);
   }
  }
  await page.evaluate(()=>{reader.d.notebook.chapters[0].pages[0].cues[0].text='每期金额乘以增长因子。';reader.d.notebook.chapters[0].pages[0].summary='各期利率采用相同单位。';return reader.preparePDF({orientation:'portrait',includeRecords:false}).then(()=>null)});
  assert.equal(await page.locator('#print-root .print-margin-continuation').count(),0,'Short margins retain their original layout');
  await page.evaluate(()=>reader.finishPrint());await page.waitForFunction(()=>!reader.printState);
  const imported=await page.evaluate(engine=>{const d=structuredClone(reader.d);d.notebook.id='muse-zip-'+engine;delete d.extensions.baseRevision;d.extensions.importPadding='校验'.repeat(120000);return d},engine);
  const archive=zipSync({'materials/notebook.json':strToU8(JSON.stringify(imported))});
  await page.route(/^https?:/,route=>route.abort());await page.evaluate(()=>reader.showImport());
  await page.getByLabel('选择教程文件',{exact:true}).setInputFiles({name:'notebook.zip',mimeType:'application/zip',buffer:Buffer.from(archive)});
  await page.locator('.import-preview strong').waitFor();await page.locator('dialog[open] .dialog-foot').getByRole('button',{name:'导入',exact:true}).click();
  await page.waitForFunction(id=>reader.d.notebook.id===id,imported.notebook.id);assert.equal(await page.locator('.import-error').count(),0);
  assert.deepEqual(errors,[]);results.push({engine,publicPDF:true,privatePDF:true,portrait:true,landscape:true,longMarginsComplete:true,longNotesComplete:true,shortMarginsUnchanged:true,sourceAndRecordsPreserved:true,offlineZipWorker:true,errors});console.log(engine+': public/private PDF, full margin continuations, 12pt A4, preserved source and offline ZIP passed');
 }finally{await browser.close()}
}
await writeFile('output/muse-reader/report.json',JSON.stringify(results,null,2));
