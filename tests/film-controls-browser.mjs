import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5189',out='output/film-controls';await mkdir(out,{recursive:true});
const reports=[];
const ready=page=>page.waitForFunction(()=>{const v=document.querySelector('video');return v.readyState>=2&&!v.hasAttribute('aria-busy')});
for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});await ready(page);await page.locator('.film-screen').scrollIntoViewIfNeeded();
  assert.ok(await page.locator('.film-feedback').isHidden());assert.ok(await page.locator('.film-retry').isHidden());
  await page.locator('[data-film-mute]').click();await page.waitForFunction(()=>document.querySelector('video').muted&&document.querySelector('[data-film-mute]').getAttribute('aria-label')==='取消静音');
  await page.locator('[data-film-play]').click();await page.waitForFunction(()=>!document.querySelector('video').paused&&document.querySelector('[data-film-play]').getAttribute('aria-label')==='暂停');await page.locator('[data-film-play]').click();assert.ok(await page.locator('video').evaluate(v=>v.paused));
  await page.locator('video').evaluate(v=>{v.currentTime=12});await page.waitForFunction(()=>!document.querySelector('video').seeking);
  const progress=page.getByRole('slider',{name:'播放进度',exact:true});await progress.focus();await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>!document.querySelector('video').seeking&&Math.abs(document.querySelector('video').currentTime-17)<.1);
  await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>Math.abs(document.querySelector('video').currentTime-12)<.1&&!document.querySelector('video').seeking);
  assert.match(await progress.getAttribute('aria-valuetext'),/^0:12 \/ 1:0[34]$/);
  assert.notEqual(await page.locator('.film-buffered').evaluate(n=>getComputedStyle(n).backgroundImage),'none');
  const focus=await progress.evaluate(n=>({own:getComputedStyle(n).outlineWidth,parent:getComputedStyle(n.parentElement).outlineStyle}));assert.equal(focus.own,'0px');assert.equal(focus.parent,'none');
  for(const [width,height] of [[320,844],[390,844],[844,390],[1440,1000]]){
   await page.setViewportSize({width,height});await ready(page);await page.locator('.film-screen').scrollIntoViewIfNeeded();
   const bounds=await page.locator('.film-screen').evaluate(screen=>{const s=screen.getBoundingClientRect();return [...screen.querySelectorAll('.film-controls>button,.film-quality-trigger,.film-progress')].map(n=>{const r=n.getBoundingClientRect();return {name:n.getAttribute('aria-label'),x:r.x-s.x,right:r.right-s.x,y:r.y-s.y,bottom:r.bottom-s.y,width:r.width,height:r.height,screenWidth:s.width,screenHeight:s.height}})});
   assert.ok(bounds.every(r=>r.x>=-1&&r.right<=r.screenWidth+1&&r.y>=0&&r.bottom<=r.screenHeight+1),JSON.stringify({width,height,bounds}));
   assert.ok(bounds.filter(r=>r.name!=='播放进度').every(r=>r.height>=44));assert.ok(bounds.find(r=>r.name==='播放进度').width>170);
   await page.locator('[data-film-quality]').click();const menu=await page.locator('.film-quality-menu').evaluate(n=>{const a=n.getBoundingClientRect(),b=n.closest('.film-screen').getBoundingClientRect();return {top:a.top-b.top,bottom:a.bottom-b.top,height:b.height}});assert.ok(menu.top>=0&&menu.bottom<=menu.height+1,JSON.stringify(menu));
   if(width===320)await page.screenshot({path:`${out}/${engine}-phone.png`});await page.keyboard.press('Escape');assert.equal(await page.locator('[data-film-quality]').getAttribute('aria-expanded'),'false');
  }
  // A stalled manual source must stop waiting, retain quality/time and permit retry.
  await page.clock.install();let release;const gate=new Promise(resolve=>release=resolve),requested=page.waitForRequest(/paper-notebook-film\.mp4/);
  await page.route(/paper-notebook-film\.mp4/,async route=>{await gate;await route.continue().catch(()=>{})});
  await page.locator('[data-film-quality]').click();await page.locator('[data-quality-choice="720"]').click();await requested;
  assert.ok(await progress.isDisabled());await page.clock.fastForward(20001);
  await page.waitForFunction(()=>document.querySelector('.film-status').textContent.includes('超时'));
  assert.equal(await page.locator('video').getAttribute('aria-busy'),null);assert.equal(await page.locator('video').getAttribute('data-quality-mode'),'720');assert.ok(await page.locator('.film-retry').isVisible());
  assert.match(await progress.getAttribute('aria-valuetext'),/^0:12/);await page.screenshot({path:`${out}/${engine}-timeout.png`});
  const reselected=page.waitForRequest(/paper-notebook-film\.mp4/);await page.locator('[data-film-quality]').click();await page.locator('[data-quality-choice="720"]').click();await reselected;
  assert.equal(await page.locator('video').getAttribute('aria-busy'),'true');await page.clock.fastForward(20001);await page.locator('.film-retry').waitFor();
  release();await page.unroute(/paper-notebook-film\.mp4/);await page.clock.resume();await page.locator('.film-retry').click();await ready(page);
  const recovered=await page.locator('video').evaluate(v=>({width:v.videoWidth,time:v.currentTime,paused:v.paused}));assert.equal(recovered.width,1280);assert.ok(recovered.time>=12&&!recovered.paused,JSON.stringify(recovered));assert.ok(await page.locator('.film-feedback').isHidden());
  assert.deepEqual(errors,[]);reports.push({engine,keyboardSeek:true,bufferTrack:true,controlsFit320:true,menuFitsShortPlayer:true,timeoutKeepsQualityAndTime:true,retryResumes:true,errors});
 }finally{await browser.close()}
}
await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2)+'\n');console.log(JSON.stringify(reports));
