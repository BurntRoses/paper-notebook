import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.NOTEBOOK_READER_URL||`${process.env.NOTEBOOK_BASE||'http://127.0.0.1:5183'}/downloads/paper-notebook.html?demo`;
const skipOffline=process.env.MUSE_SKIP_OFFLINE==='1';
await mkdir('output/muse-annotations',{recursive:true});
const reports=[];
for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.reader?.fontsCalibrated);
  const source=await page.evaluate(engine=>{
   const r=reader;r.profile.layout='single';r.profile.pageShape='landscape';r.profile.motion='reduced';r.profile.marginNotes=true;r.profile.bottomNotes=true;r.rightSidebarOpen=true;
   r.d.notebook.id='muse-annotations-'+engine;r.d.notebook.revision=1;r.d.notebook.title='复利计算与批注';delete r.d.extensions.baseRevision;
   r.d.notebook.chapters=[{id:'muse-annotation-chapter',title:'复利',pages:[{id:'muse-annotation-page',title:'金额与期数',layout:'cornell',blocks:[{id:'muse-annotation-prose',type:'prose',text:'本金为100元，每年按固定利率计息。\n第一年末的金额用于第二年计息。\n逐期累计后，金额同时取决于利率和期数。',study:{marks:[{text:'逐期累计',kind:'red',color:'#285f9e'}]}},{id:'muse-annotation-figure',type:'diagram',title:'累计过程',nodes:[{id:'principal',label:'本金'},{id:'amount',label:'期末金额'}],edges:[{from:'principal',to:'amount'}],figure:{size:'small',ratio:'16:9',annotations:[{kind:'text',x:10,y:90,text:'逐期计算'}]}}],cues:[{id:'muse-annotation-cue',title:'累计金额',blockId:'muse-annotation-prose',anchor:'金额同时取决于',text:'金额的变化由本金、每期利率和计息期数共同决定。'}]}]}];
   r.d.userState.annotations=[];r.d.userState.figureMarks=[];r.d.userState.notes=[];r.d.userState.dismissedStudyMarks=[];r.d.userState.bookmarks=[];r.d.userState.answers={};r.d.userState.doubts=[];r.d.userState.checks={};r.d.userState.explorations={};r.invalidate();r.render();r.goPage(0);return JSON.stringify(r.d.notebook);
  },engine);
  await page.locator('[data-block="muse-annotation-prose"] .ink-text').first().evaluate(span=>{const text=document.createTreeWalker(span,NodeFilter.SHOW_TEXT).nextNode(),range=document.createRange();range.setStart(text,0);range.setEnd(text,2);getSelection().removeAllRanges();getSelection().addRange(range)});
  await page.locator('.reader-selection-toolbar').waitFor();await page.getByRole('button',{name:'加粗',exact:true}).click();
  assert.equal(await page.locator('[data-block="muse-annotation-prose"] .bold-ink').innerText(),'本金');
  assert.equal(await page.evaluate(()=>reader.d.userState.annotations.find(a=>a.kind==='bold').selectors[0].exact),'本金');

  const cue=page.locator('[data-cue-id="muse-annotation-cue"]'),cueBefore=await cue.evaluate(n=>n.getBoundingClientRect().top);
  await page.locator('.reader-stage .paper-bottom').dblclick({position:{x:40,y:20}});
  const bottom=page.locator('.paper-bottom .workspace-note');await bottom.locator('textarea').fill('用相同期间核算利率。');
  await bottom.getByRole('button',{name:'便条颜色：黄色',exact:true}).click();assert.equal(await bottom.getAttribute('data-material'),'butter');
  await bottom.getByRole('button',{name:'便条颜色：透明',exact:true}).click();assert.equal(await bottom.getAttribute('data-material'),'transparent');assert.equal(await bottom.getByRole('button',{name:'便条颜色：透明',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>reader.d.userState.notes.find(n=>n.region==='bottom').text),'用相同期间核算利率。');
  await page.locator('.reader-stage .paper-notes').dblclick({position:{x:30,y:8}});
  await page.waitForFunction(()=>document.activeElement?.matches('.paper-notes .workspace-note textarea'));
  const right=page.locator('.paper-notes .workspace-note');await right.locator('textarea').fill('每期利率使用相同单位。\n'.repeat(9));
  await page.getByRole('button',{name:'阅读设置',exact:true}).focus();
  await page.waitForFunction(before=>document.querySelector('[data-cue-id="muse-annotation-cue"]').getBoundingClientRect().top>before+20,cueBefore);
  const flow=await right.evaluate(n=>({bottom:n.getBoundingClientRect().bottom,cue:document.querySelector('[data-cue-id="muse-annotation-cue"]').getBoundingClientRect().top}));assert.ok(flow.cue>=flow.bottom-1,JSON.stringify(flow));
  assert.equal(await right.getAttribute('data-collapsed'),'true');

  await page.locator('[data-block="muse-annotation-figure"] .figure-edit-entry').click();
  const canvas=page.locator('.figure-editor-canvas');
  const drag=async(from,to)=>{const box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*from[0],box.y+box.height*from[1]);await page.mouse.down();await page.mouse.move(box.x+box.width*to[0],box.y+box.height*to[1],{steps:8});await page.mouse.up()};
  await page.getByRole('button',{name:'图像工具：圈注',exact:true}).click();await drag([.2,.2],[.45,.4]);
  await page.getByRole('button',{name:'图像工具：箭头',exact:true}).click();await page.getByRole('button',{name:'图像笔色：蓝色',exact:true}).click();await drag([.35,.6],[.7,.35]);
  await page.getByRole('button',{name:'图像工具：文字',exact:true}).click();await page.getByRole('textbox',{name:'图像文字说明',exact:true}).fill('按期累计');
  const box=await canvas.boundingBox();await page.mouse.click(box.x+box.width*.6,box.y+box.height*.75);
  const marks=await page.evaluate(()=>structuredClone(reader.d.userState.figureMarks));assert.deepEqual(marks.map(m=>m.kind),['circle','arrow','text']);assert.equal(marks[1].color,'#285f9e');assert.equal(marks[2].text,'按期累计');
  assert.ok(marks.every(m=>m.x>=0&&m.x<=100&&m.y>=0&&m.y<=100));
  await page.locator('.figure-editor').getByRole('button',{name:'完成',exact:true}).click();
  assert.equal(await page.locator('[data-block="muse-annotation-figure"] [data-figure-mark=circle]').count(),1);assert.equal(await page.locator('[data-block="muse-annotation-figure"] [data-figure-mark=arrow]').count(),1);assert.ok(await page.locator('[data-block="muse-annotation-figure"] [data-figure-mark=text]').filter({hasText:'按期累计'}).count());
  assert.equal(await page.evaluate(()=>JSON.stringify(reader.d.notebook)),source);
  await page.screenshot({path:`output/muse-annotations/${engine}-annotations.png`});
  let offlineRoundtrip=false;
  if(!skipOffline){
   const expected=await page.evaluate(()=>JSON.parse(JSON.stringify({figureMarks:reader.d.userState.figureMarks,notes:reader.d.userState.notes,annotations:reader.d.userState.annotations})));
   await page.evaluate(()=>reader.showExport());const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'下载离线 HTML',exact:true}).click();const file=resolve(`output/muse-annotations/${engine}-offline.html`);await(await downloaded).saveAs(file);
   const offline=await context.newPage(),requests=[];offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});await offline.route(/^https?:/,r=>r.abort());
   await offline.goto(pathToFileURL(file).href+'?demo');await offline.waitForFunction(()=>window.reader?.fontsCalibrated);
   const actual=await offline.evaluate(()=>({figureMarks:reader.d.userState.figureMarks,notes:reader.d.userState.notes,annotations:reader.d.userState.annotations}));assert.deepEqual(actual,expected);assert.deepEqual(requests,[]);
   assert.equal(await offline.locator('[data-block="muse-annotation-prose"] .bold-ink').innerText(),'本金');
   await offline.locator('[data-block="muse-annotation-figure"] .figure-edit-entry').click();assert.equal(await offline.locator('.figure-editor [data-figure-mark=circle]').count(),1);assert.equal(await offline.locator('.figure-editor [data-figure-mark=arrow]').count(),1);assert.ok(await offline.locator('.figure-editor [data-figure-mark=text]').filter({hasText:'按期累计'}).count());await offline.close();offlineRoundtrip=true;
  }
  assert.deepEqual(errors,[]);reports.push({engine,boldSelection:true,bottomDoubleClick:true,transparentNote:true,notePushesCue:true,figureCircle:true,figureArrow:true,figureText:true,sourcePreserved:true,offlineRoundtrip,errors});console.log(engine+': selection bold, bottom/transparent note, margin flow, figure circle/arrow/text'+(offlineRoundtrip?' and offline restore':' (offline pending build)')+' passed');await context.close();
 }finally{await browser.close()}
}
await writeFile('output/muse-annotations/report.json',JSON.stringify(reports,null,2));
