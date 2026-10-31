import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5189';
const reports=[];
const profile=async(context,value)=>context.addInitScript(value=>{Object.defineProperty(navigator,'connection',{configurable:true,value:Object.assign(new EventTarget(),value)});},value);
const ready=(page,width)=>page.waitForFunction(width=>{const v=document.querySelector('video');return v.videoWidth===width&&v.readyState>=2&&!v.hasAttribute('aria-busy');},width);
const play=async page=>{await page.locator('video').evaluate(async v=>{v.muted=true;await v.play()});};
const network=async(page,value)=>page.evaluate(value=>{Object.assign(navigator.connection,value);navigator.connection.dispatchEvent(new Event('change'));},value);
const choose=async(page,quality)=>{await page.locator('[data-film-quality]').click();await page.locator(`[data-quality-choice="${quality}"]`).click();};
const mode=page=>page.locator('video').getAttribute('data-quality-mode');
const slowProfile={effectiveType:'3g',downlink:.6,saveData:false};
const fastProfile={effectiveType:'4g',downlink:10,saveData:false};
{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await profile(context,slowProfile);
  const page=await context.newPage(),requests=[];page.on('request',r=>{if(/\.mp4/.test(r.url()))requests.push(r.url())});
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:120,downloadThroughput:80*1024,uploadThroughput:40*1024});
  await page.goto(base,{waitUntil:'domcontentloaded'});await ready(page,960);
  await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
  await page.waitForFunction(()=>{const v=document.querySelector('video');for(let i=0;i<v.buffered.length;i++)if(v.buffered.start(i)<=v.currentTime+.1)return v.buffered.end(i)-v.currentTime>4;return false;});
  const result=await page.locator('video').evaluate(async v=>{v.muted=true;let waits=0;v.addEventListener('waiting',()=>waits++);const start=performance.now();await v.play();await new Promise(resolve=>setTimeout(resolve,6000));return{played:v.currentTime,elapsed:(performance.now()-start)/1000,waits,width:v.videoWidth}});
  assert.ok(result.played>5,JSON.stringify(result));assert.equal(result.width,960);assert.ok(requests.every(u=>u.includes('-low.mp4')));
  reports.push({engine:'chromium-slow-network',slowNetworkKiBps:80,warmedBufferSeconds:4,playback:result,noCompetingHD:true});await context.close();
 }finally{await browser.close();}
}
for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  // Fast networks preload HD before the visitor reaches the player.
  const fast=await browser.newContext({viewport:{width:1440,height:1000}});await profile(fast,{effectiveType:'4g',downlink:10,saveData:false});
  const page=await fast.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\.mp4/.test(r.url()))requests.push(r.url())});
  await page.goto(base);await ready(page,1920);assert.equal(await page.locator('.film-feedback select').count(),0);assert.equal(await page.locator('.film-controls [data-film-quality]').count(),1);assert.ok(requests.length);assert.ok(requests.every(u=>!u.includes('-low')&&!u.includes('-portrait')));assert.equal(await page.locator('video').count(),1);
  await page.locator('video').evaluate(v=>{v.currentTime=24});await page.waitForFunction(()=>!document.querySelector('video').seeking&&document.querySelector('video').currentTime>=24);
  await page.setViewportSize({width:720,height:1280});await ready(page,1080);assert.ok(await page.locator('video').evaluate(v=>v.paused&&v.currentTime>=24));
  await play(page);await page.waitForFunction(()=>document.querySelector('video').currentTime>24.15);await page.setViewportSize({width:1440,height:1000});await ready(page,1920);assert.ok(await page.locator('video').evaluate(v=>!v.paused&&v.currentTime>=24));assert.deepEqual(errors,[]);await fast.close();
  reports.push({engine,fastPreloadsHD:true,rotationKeepsTimeAndPlayback:true});

  // Auto defaults to HD on unknown networks; manual choices survive network changes and rotation.
  const manual=await browser.newContext({viewport:{width:1440,height:1000}});await profile(manual,{});
  const mp=await manual.newPage(),manualRequests=[];mp.on('request',r=>{if(/\.mp4/.test(r.url()))manualRequests.push(r.url())});
  await mp.goto(base);await ready(mp,1920);const selector=mp.locator('[data-film-quality]');
  assert.equal(await mode(mp),'auto');assert.match(await selector.innerText(),/自动.*1080p/);
  await mp.locator('[data-film-fullscreen]').click();await mp.waitForFunction(()=>!!document.fullscreenElement);
  await choose(mp,'720');await ready(mp,1280);assert.ok(await mp.evaluate(()=>!!document.fullscreenElement),'quality control remains usable in fullscreen');
  await mp.evaluate(()=>document.exitFullscreen());await mp.waitForFunction(()=>!document.fullscreenElement);
  await choose(mp,'1080');await ready(mp,1920);
  await mp.locator('video').evaluate(v=>v.currentTime=12);await mp.waitForFunction(()=>!document.querySelector('video').seeking);
  await choose(mp,'540');await ready(mp,960);assert.ok(await mp.locator('video').evaluate(v=>v.paused&&v.currentTime>=12));
  const lowRequests=manualRequests.length;await network(mp,fastProfile);await play(mp);await mp.waitForFunction(()=>document.querySelector('video').currentTime>12.3);
  assert.equal(manualRequests.length,lowRequests);assert.equal(await mode(mp),'540');
  await choose(mp,'720');await ready(mp,1280);assert.ok(await mp.locator('video').evaluate(v=>!v.paused&&v.currentTime>=12));
  await choose(mp,'1080');await ready(mp,1920);assert.ok(await mp.locator('video').evaluate(v=>!v.paused&&v.currentTime>=12));
  await network(mp,slowProfile);assert.equal(await mode(mp),'1080');assert.equal(await mp.locator('video').getAttribute('data-quality'),'1080');
  await mp.locator('video').evaluate(v=>v.pause());await mp.setViewportSize({width:720,height:1280});await ready(mp,1080);assert.ok(await mp.locator('video').evaluate(v=>v.paused&&v.currentTime>=12));assert.equal(await mode(mp),'1080');
  await choose(mp,'auto');await ready(mp,540);assert.equal(await mode(mp),'auto');assert.match(await selector.innerText(),/自动.*540p/);
  await mp.setViewportSize({width:390,height:844});await ready(mp,540);await mp.locator('.film-feedback').scrollIntoViewIfNeeded();
  assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await mkdir('output/film-buffering',{recursive:true});await mp.screenshot({path:`output/film-buffering/quality-${engine}-phone.png`});
  await mp.setViewportSize({width:1440,height:1000});await ready(mp,960);await network(mp,fastProfile);await ready(mp,1920);
  await mp.locator('.film-feedback').scrollIntoViewIfNeeded();await mp.screenshot({path:`output/film-buffering/quality-${engine}-desktop.png`});await manual.close();
  reports.push({engine,autoDefaultsToHD:true,manualQualityKeepsTimeAndPlayback:true,manualChoiceSurvivesNetworkAndRotation:true,autoRestoresAdaptation:true,phoneFits:true});

  // A real stalled HD request falls back in auto mode without changing the selected mode.
  const stalled=await browser.newContext({viewport:{width:1440,height:1000}});await profile(stalled,{});const tp=await stalled.newPage();let releaseStall;
  const stalledGate=new Promise(resolve=>releaseStall=resolve);
  await tp.route(/paper-notebook-film-1080\.mp4/,async route=>{await stalledGate;await route.continue().catch(()=>{})});
  await tp.goto(base,{waitUntil:'domcontentloaded'});await ready(tp,1280);assert.equal(await mode(tp),'auto');
  await play(tp);await tp.waitForFunction(()=>document.querySelector('video').currentTime>.2);releaseStall();await stalled.close();
  reports.push({engine,autoFallsBackFromStalledHD:true});

  // When network conditions improve, low keeps playing until the separate HD copy is complete.
  const adaptive=await browser.newContext({viewport:{width:1440,height:1000}});await profile(adaptive,slowProfile);
  const ap=await adaptive.newPage();let releaseHD,requestedHD;const gate=new Promise(resolve=>releaseHD=resolve),requested=new Promise(resolve=>requestedHD=resolve);
  await ap.route(/paper-notebook-film-1080\.mp4/,async route=>{requestedHD();await gate;await route.continue().catch(()=>{})});
  await ap.goto(base);await ready(ap,960);await network(ap,fastProfile);await requested;
  await play(ap);await ap.waitForFunction(()=>document.querySelector('video').currentTime>.1);
  await ap.locator('video').evaluate(v=>v.currentTime=12);await ap.waitForFunction(()=>!document.querySelector('video').seeking&&document.querySelector('video').currentTime>=12);
  releaseHD();await ready(ap,1920);const upgraded=await ap.locator('video').evaluate(v=>({time:v.currentTime,paused:v.paused,src:v.currentSrc,quality:v.dataset.quality}));
  assert.ok(upgraded.time>=12&&!upgraded.paused,JSON.stringify(upgraded));assert.match(upgraded.src,/^blob:/);assert.equal(upgraded.quality,'1080');assert.equal(await ap.locator('.film-status').innerText(),'');
  await ap.locator('video').evaluate(v=>v.pause());await ap.setViewportSize({width:720,height:1280});await ready(ap,1080);assert.ok(await ap.locator('video').evaluate(v=>v.paused&&v.currentTime>=12));await adaptive.close();
  reports.push({engine,lowPlaysBeforeHDReady:true,upgradeUsesCompleteLocalCopy:true,upgradeKeepsTimeAndPlayback:true});

  // A failed background upgrade must leave the playing low stream intact.
  const failed=await browser.newContext({viewport:{width:1440,height:1000}});await profile(failed,slowProfile);const fp=await failed.newPage();let hdFailures=0;
  await fp.route(/paper-notebook-film-1080\.mp4/,async route=>{hdFailures++;await route.fulfill({status:503,body:'unavailable'})});
  await fp.goto(base);await ready(fp,960);await network(fp,fastProfile);await play(fp);await fp.waitForFunction(()=>document.querySelector('video').currentTime>1);
  assert.equal(hdFailures,1);assert.equal(await fp.locator('video').evaluate(v=>v.videoWidth),960);assert.equal(await fp.locator('.film-status').innerText(),'');
  await choose(fp,'1080');await fp.waitForFunction(()=>document.querySelector('.film-status').textContent.includes('加载失败'));assert.equal(await mode(fp),'1080');assert.equal(await fp.locator('video').getAttribute('data-quality'),'1080');
  await choose(fp,'540');await ready(fp,960);assert.ok(await fp.locator('video').evaluate(v=>v.currentTime>=1&&!v.paused));await failed.close();
  reports.push({engine,failedUpgradeKeepsLowPlayback:true,manualErrorKeepsChoiceAndRecoveryTime:true});

  // Data saver disables background HD transfers even on a nominally fast link.
  const saved=await browser.newContext({viewport:{width:1440,height:1000}});await profile(saved,{effectiveType:'4g',downlink:10,saveData:true});const sp=await saved.newPage(),savedRequests=[];
  sp.on('request',r=>{if(/\.mp4/.test(r.url()))savedRequests.push(r.url())});await sp.goto(base);await ready(sp,960);await play(sp);await sp.waitForFunction(()=>document.querySelector('video').currentTime>.7);assert.ok(savedRequests.every(u=>u.includes('-low.mp4')));await saved.close();
  reports.push({engine,dataSaverStaysLow:true});

 }finally{await browser.close();}
}
await mkdir('output/film-buffering',{recursive:true});await writeFile('output/film-buffering/report.json',JSON.stringify(reports,null,2)+'\n');console.log(JSON.stringify(reports,null,2));
