import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5189';
const out='output/showcase-browser';await mkdir(out,{recursive:true});
const examples=[['machine-learning','notebook-ml-foundations','ml-task'],['compound-interest','showcase-compound-interest','intro-capabilities'],['concept','notebook-observation','observation-1'],['literature','showcase-literature','subject-literature'],['business','showcase-business','subject-business'],['programming','showcase-programming','subject-code']];
const reports=[];
const ready=(page,name,id)=>page.waitForFunction(({name,id})=>{
 const f=document.querySelector('.reader-preview');try{const r=f.contentWindow.reader;return f.src.includes(`/downloads/${name}.html?`)&&r?.d.notebook.id===id&&r.ready&&r.fontsCalibrated&&!f.hasAttribute('aria-busy');}catch{return false;}
},{name,id});
for(const [engine,type] of Object.entries({chromium,webkit}).filter(([name])=>!process.env.SHOWCASE_ENGINE||name===process.env.SHOWCASE_ENGINE)){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/downloads\/.*\.html/.test(r.url()))requests.push(r.url())});
  await page.goto(base,{waitUntil:'domcontentloaded'});assert.equal(requests.length,0,'Unselected examples must not download on entry');
  await page.locator('#read').scrollIntoViewIfNeeded();await ready(page,...examples[0].slice(0,2));
  for(const [name,id,first] of examples){
   const button=page.locator(`[data-example="${name}"]`);await button.click();await ready(page,name,id);
   assert.equal(await page.locator('[data-example][aria-pressed=true]').count(),1);assert.equal(await button.getAttribute('aria-pressed'),'true');
   const info=await page.locator('.reader-preview').evaluate(f=>{const r=f.contentWindow.reader;return {id:r.page.id,index:r.pageIndex,first:r.d.userState.lastPageId,images:[...f.contentDocument.images].every(i=>i.complete&&i.naturalWidth>0)}});
   assert.equal(info.id,first);assert.equal(info.index,0);assert.ok(info.images);
   assert.match(await page.locator('#preview-open').getAttribute('href'),new RegExp(`downloads/${name}\\.html\\?demo`));
   assert.equal(await page.locator('.reader-preview').getAttribute('title'),`试读：${await button.getAttribute('data-example-title')}`);
   await page.locator('.reader-preview').evaluate(f=>f.contentWindow.reader.turn(1));
  }
  // Switching back and reloading both start at the first page, regardless of local draft progress.
  await page.locator('[data-example="compound-interest"]').click();await ready(page,...examples[1].slice(0,2));
  assert.equal(await page.locator('.reader-preview').evaluate(f=>f.contentWindow.reader.pageIndex),0);
  const open=await context.newPage();await open.goto(new URL(await page.locator('#preview-open').getAttribute('href'),base).href);await open.waitForFunction(()=>window.reader?.fontsCalibrated);assert.equal(await open.evaluate(()=>window.reader.pageIndex),0);await open.close();
  // The actual exercise stays usable in the selected lesson.
  await page.locator('.reader-preview').evaluate(f=>{const r=f.contentWindow.reader;r.goPage(r.pages.findIndex(p=>p.blocks.some(b=>b.id==='intro-templates')),true)});
  const frame=page.frameLocator('.reader-preview'),quiz=frame.locator('[data-block="intro-templates"]');await quiz.getByText('220.5',{exact:true}).click();await quiz.getByRole('button',{name:'提交这一题',exact:true}).click();
  assert.ok(await page.locator('.reader-preview').evaluate(f=>f.contentWindow.reader.d.userState.answers['intro-templates'].submitted));
  await page.getByRole('button',{name:'切换明暗模式',exact:true}).click();
  await page.locator('[data-example="business"]').click();await ready(page,...examples[4].slice(0,2));assert.equal(await page.locator('.reader-preview').evaluate(f=>f.contentWindow.reader.profile.theme),'paper-night');
  // Rapid switches and the tutorial refer to the latest selected book.
  await page.locator('[data-example="literature"]').click();await page.locator('[data-example="programming"]').click();await ready(page,...examples[5].slice(0,2));
  await page.locator('#start-reader-tour').click();await frame.locator('.reader-tour').waitFor();assert.equal(await page.locator('.reader-preview').evaluate(f=>f.contentWindow.reader.d.notebook.id),'showcase-programming');
  await page.locator('.reader-preview').scrollIntoViewIfNeeded();
  await frame.getByRole('button',{name:'结束教程',exact:true}).click();
  await page.getByRole('button',{name:'切换明暗模式',exact:true}).click();
  await page.locator('[data-example="compound-interest"]').click();await ready(page,...examples[1].slice(0,2));await page.screenshot({path:`${out}/${engine}-desktop.png`});
  await page.setViewportSize({width:390,height:844});await page.locator('.preview-controls').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(const button of await page.locator('[data-example]').all()){const b=await button.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=390);}
  await page.screenshot({path:`${out}/${engine}-phone.png`});
  await page.reload();await page.locator('#read').scrollIntoViewIfNeeded();await ready(page,...examples[0].slice(0,2));assert.equal(await page.locator('.reader-preview').evaluate(f=>f.contentWindow.reader.pageIndex),0);
  assert.deepEqual(errors,[]);await context.close();
  const offline=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  // WebKit's offline flag also blocks file:// navigation. Block every external request explicitly.
  await offline.route(/^https?:/,route=>route.abort());
  await offline.addInitScript(()=>{try{localStorage.setItem('paper-notebook-guide-v4','1')}catch{}});
  const op=await offline.newPage();op.on('pageerror',e=>errors.push(e.message));
  for(const name of ['compound-interest','literature','business','programming']){
   await op.goto(pathToFileURL(resolve(`output/site/downloads/${name}.html`)).href+'?demo');await op.waitForFunction(()=>window.reader?.fontsCalibrated);
   assert.equal(await op.evaluate(()=>window.reader.pageIndex),0);
   await op.evaluate(()=>{const r=window.reader;r.goPage(r.pages.findIndex(p=>p.blocks.some(b=>b.figure?.annotations?.length)),true)});
   await op.locator('.figure-annotations').first().waitFor();
   assert.ok(await op.locator('.reader-stage img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)));
   await op.screenshot({path:`${out}/${engine}-${name}-offline.png`});
  }
  await op.goto(pathToFileURL(resolve('output/site/downloads/compound-interest.html')).href+'?demo');await op.waitForFunction(()=>window.reader?.fontsCalibrated);
  const markId=await op.evaluate(()=>{const r=window.reader;r.editor.mark('underline',[{pageId:r.page.id,selector:{blockId:'intro-lead',start:0,end:2,exact:'复利',prefix:'',suffix:'：每一期的增长'}}]);r.showExport();return r.d.userState.annotations.at(-1).id});
  const waitDownload=op.waitForEvent('download');await op.getByRole('button',{name:'下载离线 HTML',exact:true}).click();
  const download=await waitDownload,copy=resolve(`${out}/${engine}-compound-records.html`);await download.saveAs(copy);
  await op.goto(pathToFileURL(copy).href+'?demo');await op.waitForFunction(()=>window.reader?.fontsCalibrated);assert.ok(await op.evaluate(id=>window.reader.d.userState.annotations.some(a=>a.id===id),markId));
  assert.deepEqual(errors,[]);await offline.close();
  reports.push({engine,allSixStartAtFirstPage:true,selectedLinkAndTitle:true,onlySelectedLoads:true,themeAndTutorialFollowSelection:true,compoundExerciseWorks:true,phoneFits:true,fourLessonsOpenOffline:true,personalHTMLRetainsMarks:true,noPageErrors:true});
 }finally{await browser.close();}
}
await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2)+'\n');console.log(JSON.stringify(reports,null,2));
