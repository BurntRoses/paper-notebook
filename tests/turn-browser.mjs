import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5180/paper-notebook-kit/dist',checks=[],errors=[];
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const check=s=>{checks.push(s);console.log('✓ '+s)};
await mkdir('output/turn',{recursive:true});
try{
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/downloads/machine-learning.html?demo');await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(100);
 await page.evaluate(()=>{const r=window.reader;r.profile.layout='single';r.profile.transition='turn';r.profile.motion='full';r.goPage(0);window.chromeBefore=[document.querySelector('.reader-header'),document.querySelector('.reader-sidebar'),document.querySelector('.reader-navigation')];window.paperBefore=document.querySelector('.page-surface');r.turn(1)});
 await page.waitForFunction(()=>document.querySelector('.page-transition')?.dataset.progress>'.1');
 const continuity=await page.evaluate(()=>({sameChrome:window.chromeBefore.every(n=>n.isConnected),samePaper:window.paperBefore.isConnected&&!!window.paperBefore.closest('.page-transition'),background:getComputedStyle(document.querySelector('.page-transition')).backgroundColor,live:document.querySelector('.reader-stage > .reader-page-wrap .page-surface').dataset.page,sceneFront:!!document.querySelector('.turn-front .reader-content'),noFilter:[...document.querySelectorAll('.page-transition *')].every(n=>getComputedStyle(n).filter==='none')}));
 assert.ok(continuity.sameChrome&&continuity.samePaper&&continuity.sceneFront&&continuity.noFilter);assert.equal(continuity.background,'rgba(0, 0, 0, 0)');
 await page.waitForFunction(()=>!document.querySelector('.page-transition'));check('Turning keeps chrome and the actual outgoing paper mounted; transparent scene has no full-page brightness filter');
 for(const theme of ['paper-light','paper-night']){
  await page.evaluate(theme=>{const r=window.reader;r.profile.theme=theme;r.render();r.goPage(0);r.turn(1);const t=r.turnView;t.play=()=>{};t.seek(.38)},theme);
  await page.screenshot({path:`output/turn/fold-${theme}.png`});await page.evaluate(()=>window.reader.cancelTurn());
 }
 check('Fold screenshots captured in both themes with a textured back and crease shadow');
 await page.evaluate(()=>{const r=window.reader;r.profile.theme='paper-light';r.profile.direction='horizontal';r.render();r.goPage(0)});
 let corner=await page.locator('.reader-stage > .reader-page-wrap [data-corner=right]').boundingBox();
 await page.mouse.move(corner.x+18,corner.y+18);await page.mouse.down();await page.mouse.move(corner.x-90,corner.y+5,{steps:5});
 assert.ok(Number(await page.locator('.page-transition').getAttribute('data-progress'))>0);assert.equal(await page.evaluate(()=>window.reader.pageIndex),0);
 await page.keyboard.press('Escape');await page.mouse.up();await page.waitForFunction(()=>!document.querySelector('.page-transition'));assert.equal(await page.locator('.page-surface').getAttribute('data-page'),await page.evaluate(()=>window.reader.page.id));
 corner=await page.locator('[data-corner=right]').boundingBox();await page.mouse.move(corner.x+18,corner.y+18);await page.mouse.down();await page.mouse.move(corner.x-300,corner.y,{steps:6});
 const dragged=Number(await page.locator('.page-transition').getAttribute('data-progress'));await page.mouse.up();assert.equal(await page.evaluate(()=>window.reader.pageIndex),1);assert.ok(Number(await page.locator('.page-transition').getAttribute('data-progress'))>=dragged);
 await page.waitForFunction(()=>!document.querySelector('.page-transition'));check('Drag directly controls the fold; Escape restores the original paper; release continues from the same fold');
 // Interrupt a rollback before it reaches zero. Cancellation must restore the
 // original live sheet, including when the next action is another drag/resize.
 corner=await page.locator('.reader-stage > .reader-page-wrap [data-corner=right]').boundingBox();
 await page.mouse.move(corner.x+18,corner.y+18);await page.mouse.down();await page.mouse.move(corner.x-80,corner.y,{steps:3});
 await page.evaluate(()=>{const r=window.reader;window.rollbackPaper=r.gesture.page;r.cancelGesture(true);r.cancelTurn()});await page.mouse.up();
 assert.equal(await page.evaluate(()=>window.rollbackPaper===document.querySelector('.reader-stage > .reader-page-wrap .page-surface')),true);
 assert.equal(await page.evaluate(()=>window.reader.pageIndex),1);
 corner=await page.locator('[data-corner=right]').boundingBox();await page.mouse.move(corner.x+18,corner.y+18);await page.mouse.down();await page.mouse.move(corner.x-80,corner.y,{steps:3});await page.keyboard.press('Escape');
 // The pointer remains down while the browser loses/cancels the first gesture.
 await page.mouse.up();await page.setViewportSize({width:1180,height:820});await page.waitForTimeout(220);
 assert.equal(await page.locator('.page-transition').count(),0);assert.equal(await page.locator('.page-surface').getAttribute('data-page'),await page.evaluate(()=>window.reader.page.id));
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(220);check('Interrupted rebound and resize retain the original sheet and keep its page number synchronized');
 await page.evaluate(()=>{const r=window.reader;r.turn(1);r.turn(1);r.turn(-1)});await page.waitForFunction(()=>!document.querySelector('.page-transition'));assert.equal(await page.evaluate(()=>window.reader.pageIndex),2);
 assert.equal(await page.locator('.reader-stage > .reader-page-wrap .page-surface').getAttribute('data-page'),await page.evaluate(()=>window.reader.page.id));
 await page.evaluate(()=>{const r=window.reader;r.profile.layout='spread';r.render();r.turn(1);r.turnView.play=()=>{};r.turnView.seek(.5)});
 assert.equal(await page.locator('.turn-printed-back').count(),1);assert.equal(await page.locator('.turn-still').count(),1);await page.screenshot({path:'output/turn/fold-spread.png'});await page.evaluate(()=>window.reader.cancelTurn());check('Rapid reversal reaches the newest page; spread uses one folding leaf and the printed reverse side');
 await page.evaluate(()=>{const r=window.reader,index=r.pages.findIndex((p,i)=>i>=2&&p.blocks.some(b=>b.type==='diagram'));r.profile.motion='reduced';r.goPage(index-2);r.profile.motion='full';r.turn(1);r.turnView.play=()=>{};r.turnView.seek(.5)});
 const refs=await page.locator('.turn-back-content [marker-end]').evaluateAll(ns=>ns.map(n=>{const id=n.getAttribute('marker-end').match(/url\(#([^)]+)\)/)?.[1];return !!id&&!!n.closest('.turn-back-content').querySelector('[id="'+id+'"]')}));
 assert.ok(refs.length>0&&refs.every(Boolean));await page.evaluate(()=>window.reader.cancelTurn());
 // A sidebar jump may leave an odd spread start. Backward dragging must clamp
 // to the first page, and returning the pointer must flatten the whole fold.
 await page.evaluate(()=>{const r=window.reader;r.profile.motion='reduced';r.goPage(1);r.profile.motion='full'});
 corner=await page.locator('.reader-stage > .reader-page-wrap [data-corner=left]').first().boundingBox();
 await page.mouse.move(corner.x+14,corner.y+14);await page.mouse.down();await page.mouse.move(corner.x+230,corner.y+14,{steps:4});
 assert.equal(await page.evaluate(()=>window.reader.gesture.target),0);
 await page.mouse.move(corner.x+14,corner.y+14,{steps:4});assert.equal(Number(await page.locator('.page-transition').getAttribute('data-progress')),0);
 await page.mouse.move(corner.x+230,corner.y+14,{steps:4});await page.mouse.up();await page.waitForFunction(()=>!document.querySelector('.page-transition'));assert.equal(await page.evaluate(()=>window.reader.pageIndex),0);
 await page.locator('.reader-stage > .reader-page-wrap [data-corner=left]').first().click();assert.equal(await page.locator('.page-transition').count(),0);
 await page.evaluate(()=>{const r=window.reader;r.profile.motion='reduced';r.goPage(r.pages.length-1);r.profile.motion='full'});await page.locator('.reader-stage > .reader-page-wrap [data-corner=right]').last().click();assert.equal(await page.locator('.page-transition').count(),0);
 check('Spread boundary drags clamp to a valid page and returning the pointer fully flattens the fold');
 for(const [width,height,direction] of [[820,1180,'vertical'],[390,844,'horizontal']]){
  await page.setViewportSize({width,height});await page.waitForTimeout(220);await page.evaluate(direction=>{const r=window.reader;r.profile.layout='single';r.profile.direction=direction;r.profile.theme='paper-night';r.render();r.goPage(0)},direction);
  corner=await page.locator('.reader-stage > .reader-page-wrap [data-corner=right]').boundingBox();
  await page.mouse.move(corner.x+14,corner.y+14);await page.mouse.down();await page.mouse.move(corner.x+14-(direction==='horizontal'?160:0),corner.y+14-(direction==='vertical'?250:0),{steps:5});
  assert.ok(Number(await page.locator('.page-transition').getAttribute('data-progress'))>.18);await page.screenshot({path:`output/turn/fold-${width}.png`});await page.mouse.up();await page.waitForFunction(()=>!document.querySelector('.page-transition'));
  assert.equal(await page.evaluate(()=>window.reader.pageIndex),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('.reader-stage > .reader-page-wrap [data-corner=left]').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>!document.querySelector('.page-transition'));assert.equal(await page.evaluate(()=>window.reader.pageIndex),0);
 }
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(220);await page.evaluate(()=>{const r=window.reader;r.profile.theme='paper-light';r.profile.direction='horizontal';r.render()});check('Portrait/tablet and phone folds support both axes and keyboard corner activation without overflow; printed SVG references stay local');
 await page.getByRole('button',{name:'阅读设置',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('dialog')),true);
 const quiet=await page.locator('dialog').evaluate(d=>{const c=d.querySelector('.close-dialog');return {closeBorder:getComputedStyle(c).borderWidth,closeOutline:getComputedStyle(c).outlineStyle,headBorder:getComputedStyle(d.querySelector('.dialog-head')).borderBottomWidth,selectBorder:getComputedStyle(d.querySelector('.paper-choice-trigger')).borderWidth,svg:!!c.querySelector('svg')}});
 assert.equal(quiet.closeBorder,'0px');assert.equal(quiet.closeOutline,'none');assert.equal(quiet.headBorder,'0px');assert.equal(quiet.selectBorder,'0px');assert.ok(quiet.svg);
 await page.screenshot({path:'output/turn/settings-quiet.png'});await page.keyboard.press('Tab');assert.equal(await page.locator('.close-dialog').evaluate(n=>n.matches(':focus-visible')),true);assert.equal(await page.locator('.close-dialog').evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'阅读设置',exact:true}).click();await page.locator('.close-dialog').click();assert.equal(await page.locator('dialog[open]').count(),0);check('Settings opens without an automatic close-button rectangle; borderless controls retain keyboard focus and pointer close');
 await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('PageDown');assert.equal(await page.locator('.page-transition').count(),0);assert.deepEqual(errors,[]);
 await writeFile('docs/verification/turn-report.json',JSON.stringify({date:new Date().toISOString(),checks,errors,scope:'Chromium desktop, portrait tablet and phone viewports; real devices not exercised; references: https://nodlik.github.io/StPageFlip/'},null,2));
}finally{await browser.close()}
