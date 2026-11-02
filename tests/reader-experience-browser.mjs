import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5190',out='output/reader-experience';await mkdir(out,{recursive:true});
const reports=[];
for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/downloads/machine-learning.html?demo');await page.waitForFunction(()=>window.reader?.fontsCalibrated);
  assert.equal(await page.evaluate(()=>window.reader.profile.transition),'cover');
  // Reproduce the former failure after reading, marking and entering immersive mode.
  await page.evaluate(()=>{const r=window.reader;r.turn(1)});await page.waitForFunction(()=>!document.querySelector('.page-transition'));
  await page.evaluate(()=>{const r=window.reader,b=r.page.blocks.find(b=>b.text?.length>=2);if(b)r.editor.mark('underline',[{pageId:r.page.id,selector:{blockId:b.id,start:0,end:2,exact:b.text.slice(0,2),prefix:'',suffix:b.text.slice(2,18)}}]);r.setImmersive(true)});
  for(const [width,height] of [[1440,1000],[1024,768],[390,844]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(220);
   for(const immersive of [false,true]){
    await page.evaluate(value=>window.reader.setImmersive(value),immersive);
    const geometry=await page.evaluate(()=>{
     const r=window.reader,paper=document.querySelector('.reader-stage > .reader-page-wrap .page-surface'),stage=document.querySelector('.reader-stage'),before=stage.getBoundingClientRect(),start=performance.now();
     r.toggleSidebar(true);const drawer=document.querySelector('.reader-sidebar'),box=drawer.getBoundingClientRect(),after=stage.getBoundingClientRect();
     return {position:getComputedStyle(drawer).position,width:box.width,top:box.top,bottom:box.bottom,viewport:innerHeight,samePaper:paper.isConnected,unchangedStage:before.top===after.top&&before.width===after.width,elapsedMs:performance.now()-start};
    });
    assert.equal(geometry.position,'fixed');assert.ok(geometry.width<=340&&geometry.top>=60&&geometry.bottom<=height);assert.ok(geometry.samePaper&&geometry.unchangedStage,JSON.stringify(geometry));
    if(immersive&&width===1440)await page.screenshot({path:`${out}/${engine}-contents.png`});
    await page.locator('.reader-sidebar').getByRole('button',{name:'重点',exact:true}).click();await page.locator('.reader-sidebar').getByRole('button',{name:'目录',exact:true}).click();
    await page.keyboard.press('Escape');assert.equal(await page.locator('.reader-sidebar').count(),0);assert.equal(await page.evaluate(()=>window.reader.immersive),immersive);
   }
  }
  await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(220);await page.evaluate(()=>window.reader.setImmersive(false));
  const timings=await page.evaluate(()=>{
   const r=window.reader,paper=document.querySelector('.reader-stage > .reader-page-wrap .page-surface'),measure=fn=>{const start=performance.now();fn();return performance.now()-start;};
   let renders=0,paginations=0;const render=r.render.bind(r),paginate=r.paginate.bind(r);r.render=(...args)=>{renders++;return render(...args)};r.paginate=(...args)=>{paginations++;return paginate(...args)};
   const drawerMs=measure(()=>{for(let i=0;i<8;i++){r.toggleSidebar(true);r.toggleSidebar(false)}});
   const appearanceMs=measure(()=>{for(const style of ['white','mist','inkwash','cotton']){r.profile.paperStyle=style;r.profile.theme=r.profile.theme==='paper-night'?'paper-light':'paper-night';r.refreshAppearance()}});
   r.profile.theme='paper-light';r.refreshAppearance();
   return {drawerMs,appearanceMs,renders,paginations,samePaper:paper.isConnected};
  });
  assert.equal(timings.renders,0);assert.equal(timings.paginations,0);assert.ok(timings.samePaper);
  await page.getByRole('button',{name:'阅读设置',exact:true}).click();
  await page.getByRole('combobox',{name:'纸张样式',exact:true}).click();await page.getByRole('option',{name:'素白纸',exact:true}).click();
  assert.equal(await page.locator('.reader-stage > .reader-page-wrap .page-surface').getAttribute('data-paper-style'),'white');
  assert.equal(await page.evaluate(()=>window.reader.profile.paperStyle),'white');await page.getByRole('button',{name:'完成',exact:true}).click();
  const geometry=await page.locator('.reader-stage > .reader-page-wrap .page-surface').evaluate(p=>({width:p.offsetWidth,height:p.offsetHeight,blocks:[...p.querySelectorAll('[data-block]')].map(b=>b.dataset.block)}));
  for(const style of ['white','ivory','cotton','mist','sage','inkwash']){
   await page.evaluate(style=>{const r=window.reader;r.profile.paperStyle=style;r.profile.theme='paper-light';r.refreshAppearance()},style);
   assert.deepEqual(await page.locator('.reader-stage > .reader-page-wrap .page-surface').evaluate(p=>({width:p.offsetWidth,height:p.offsetHeight,blocks:[...p.querySelectorAll('[data-block]')].map(b=>b.dataset.block)})),geometry);
   await page.screenshot({path:`${out}/${engine}-${style}.png`});
  }
  await page.evaluate(()=>{const r=window.reader;r.profile.theme='paper-night';r.refreshAppearance()});await page.screenshot({path:`${out}/${engine}-night.png`});
  const night=await page.locator('.page-surface').first().evaluate(p=>({background:getComputedStyle(p).backgroundColor,ink:getComputedStyle(p).color}));assert.notEqual(night.background,night.ink);
  // Coverage mode creates no folding/back-page layers; page navigation keeps chrome mounted.
  await page.evaluate(()=>{const r=window.reader;r.profile.theme='paper-light';r.profile.transition='cover';r.profile.layout='spread';r.render();r.goPage(0);window.beforeHeader=document.querySelector('.reader-header');r.turn(1);r.turnView.play=()=>{};r.turnView.seek(.4)});
  assert.equal(await page.locator('.page-transition').getAttribute('data-mode'),'cover');assert.equal(await page.locator('.turn-back,.turn-shadow').count(),0);assert.ok(await page.evaluate(()=>window.beforeHeader.isConnected));
  await page.screenshot({path:`${out}/${engine}-cover.png`});await page.evaluate(()=>window.reader.cancelTurn());
  // Saved HTML carries the selected material and reader; all paper assets work offline.
  await page.evaluate(()=>{const r=window.reader;r.profile.paperStyle='sage';r.profile.layout='single';r.render();r.showExport()});
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'下载离线 HTML',exact:true}).click();const download=await pending,file=resolve(`${out}/${engine}-saved.html`);await download.saveAs(file);
  const offline=await browser.newContext();await offline.route(/^https?:/,r=>r.abort());const op=await offline.newPage();op.on('pageerror',e=>errors.push(e.message));
  await op.goto(pathToFileURL(file).href+'?demo');await op.waitForFunction(()=>window.reader?.fontsCalibrated);assert.equal(await op.locator('.page-surface').first().getAttribute('data-paper-style'),'sage');assert.equal(await op.evaluate(()=>window.reader.profile.transition),'cover');
  await op.goto(pathToFileURL(resolve('output/site/downloads/blank-notebook.html')).href+'?demo');await op.waitForFunction(()=>window.reader?.fontsCalibrated);assert.equal(await op.evaluate(()=>window.reader.profile.transition),'cover');await offline.close();
  assert.deepEqual(errors,[]);reports.push({engine,drawerStableAcrossModesAndViewports:true,localUpdates:timings,sixMaterialsPreserveLayout:true,manualChoiceAndOfflineSave:true,coverHasNoFoldLayers:true,noPageErrors:true});await context.close();
 }finally{await browser.close()}
}
await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2)+'\n');console.log(JSON.stringify(reports,null,2));
