import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5183';
const reports=[];await mkdir('output/prescription-ui',{recursive:true});
for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(()=>{window.copies=[];window.holdCopy=true;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copies.push(text);if(window.holdCopy)await new Promise(r=>window.releaseCopy=r);}}});});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  const menu=page.locator('.site-menu-toggle');await menu.focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'制作笔记');
  await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'功能演示');await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert.ok(await menu.evaluate(n=>n===document.activeElement));
  const contrast=()=>page.evaluate(()=>{
   const style=getComputedStyle(document.documentElement),luma=name=>{const hex=style.getPropertyValue(name).trim().replace('#',''),v=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
   return [['--site-ink','--site-bg'],['--site-muted','--site-surface'],['--site-on-accent','--site-accent'],['--site-ink','--site-selected']].map(([f,b])=>({pair:[f,b],ratio:(Math.max(luma(f),luma(b))+.05)/(Math.min(luma(f),luma(b))+.05)}));
  });
  const lightContrast=await contrast();assert.ok(lightContrast.every(c=>c.ratio>=4.5),JSON.stringify(lightContrast));
  await page.getByRole('button',{name:'切换明暗模式',exact:true}).click();assert.equal(await page.locator('html').getAttribute('data-site-theme'),'dark');
  const darkContrast=await contrast();assert.ok(darkContrast.every(c=>c.ratio>=4.5),JSON.stringify(darkContrast));
  await page.screenshot({path:`output/prescription-ui/${engine}-home-dark.png`});await page.getByRole('button',{name:'切换明暗模式',exact:true}).click();
  await page.locator('#create').scrollIntoViewIfNeeded();const copy=page.locator('#copy-repository'),before=await copy.boundingBox();await copy.click();assert.equal(await copy.getAttribute('aria-busy'),'true');await page.evaluate(()=>{window.holdCopy=false;window.releaseCopy();});
  await page.waitForFunction(()=>document.querySelector('#copy-repository').dataset.state==='success');const after=await copy.boundingBox();assert.ok(Math.abs(before.width-after.width)<1);assert.ok(Math.abs(before.height-after.height)<1);assert.equal(await page.evaluate(()=>copies.length),1);
  await page.screenshot({path:`output/prescription-ui/${engine}-copy-success.png`});await copy.click();await page.waitForFunction(()=>copies.length===2&&document.querySelector('#copy-repository').dataset.state==='success');
  // Clipboard denial falls back to selected text and an actual manual result.
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}});document.execCommand=()=>false;});
  await page.locator('#copy').click();await page.waitForFunction(()=>document.querySelector('#copy').dataset.state==='manual');assert.ok(await page.locator('#chat-instructions').evaluate(n=>n.open));assert.equal(await page.locator('#prompt').evaluate(n=>n.selectionEnd-n.selectionStart),await page.locator('#prompt').evaluate(n=>n.value.length));
  await page.locator('#read').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('iframe').contentWindow.reader?.fontsCalibrated&&!document.querySelector('iframe').hasAttribute('aria-busy'));
  // An aborted lesson fetch shows a recoverable failure without replacing the reader.
  await page.route('**/previews/business.json*',r=>r.abort());await page.locator('[data-example=business]').click();await page.locator('.preview-retry').waitFor();assert.match(await page.locator('#preview-tour-status').innerText(),/失败/);
  await page.unroute('**/previews/business.json*');await page.locator('.preview-retry').click();await page.waitForFunction(()=>document.querySelector('iframe').contentWindow.reader?.d.notebook.id==='showcase-business'&&!document.querySelector('iframe').hasAttribute('aria-busy'));
  // A connection that stays open without delivering a response must also recover.
  await page.clock.install();let releaseRequest;const heldRequest=new Promise(resolve=>releaseRequest=resolve);
  const stalledRequest=page.waitForRequest('**/previews/literature.json*');
  await page.route('**/previews/literature.json*',async route=>{await heldRequest;await route.abort().catch(()=>{});});
  await page.locator('[data-example=literature]').click();await stalledRequest;await page.clock.fastForward(20001);
  await page.locator('.preview-retry').waitFor();assert.equal(await page.locator('iframe').getAttribute('aria-busy'),null);assert.equal(await page.locator('[data-example=business]').getAttribute('aria-pressed'),'true');
  releaseRequest();await page.unroute('**/previews/literature.json*');await page.clock.resume();await page.locator('.preview-retry').click();
  await page.waitForFunction(()=>document.querySelector('iframe').contentWindow.reader?.d.notebook.id==='showcase-literature'&&!document.querySelector('iframe').hasAttribute('aria-busy'));
  await page.locator('[data-example=machine-learning]').focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('iframe').contentWindow.reader?.d.notebook.id==='showcase-compound-interest');assert.equal(await page.locator('[data-example=compound-interest]').getAttribute('tabindex'),'0');assert.equal(await page.locator('[data-example=machine-learning]').getAttribute('tabindex'),'-1');
  const frame=page.frameLocator('iframe');const defaults=await page.locator('iframe').evaluate(f=>{const r=f.contentWindow.reader;return {font:r.profile.font,paper:r.profile.paperStyle}});assert.deepEqual(defaults,{font:'hand',paper:'ivory'});
  await frame.getByRole('button',{name:'阅读设置',exact:true}).click();await frame.getByRole('radio',{name:'象牙纸',exact:true}).focus();const pageIndex=await page.locator('iframe').evaluate(f=>f.contentWindow.reader.pageIndex);await page.keyboard.press('ArrowRight');assert.equal(await frame.getByRole('radio',{name:'棉纹纸',exact:true}).getAttribute('aria-checked'),'true');assert.equal(await page.locator('iframe').evaluate(f=>f.contentWindow.reader.pageIndex),pageIndex);
  const selected=await frame.getByRole('radio',{name:'棉纹纸',exact:true}).evaluate(n=>({border:getComputedStyle(n).borderWidth,shadow:getComputedStyle(n).boxShadow,check:getComputedStyle(n,':after').content}));assert.equal(selected.border,'0px');assert.equal(selected.shadow,'none');assert.match(selected.check,/✓/);
  await frame.getByRole('radio',{name:'象牙纸',exact:true}).click();
  for(const [width,height] of [[1440,1000],[900,650],[390,844],[320,640],[1180,650]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(180);const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(layout.scroll<=layout.width+1,JSON.stringify(layout));
   const bounds=await frame.locator('.reader-settings').evaluate(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,right:r.right,left:r.left,w:innerWidth,h:innerHeight}});assert.ok(bounds.left>=0&&bounds.right<=bounds.w+1&&bounds.top>=0&&bounds.bottom<=bounds.h+1,JSON.stringify(bounds));
   if(width===390)await page.screenshot({path:`output/prescription-ui/${engine}-phone-settings.png`});
  }
  await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(180);await frame.getByRole('button',{name:'完成',exact:true}).click();
  const files=frame.getByLabel('文件与工具',{exact:true});await files.focus();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('iframe').evaluate(f=>f.contentDocument.activeElement.textContent),'导入');await page.keyboard.press('End');assert.equal(await page.locator('iframe').evaluate(f=>f.contentDocument.activeElement.textContent),'功能介绍');await page.keyboard.press('Escape');assert.ok(await files.evaluate(n=>n===n.ownerDocument.activeElement));assert.equal(await page.locator('iframe').evaluate(f=>f.contentWindow.reader.pageIndex),pageIndex);
  await page.locator('iframe').evaluate(f=>{const before=f.contentWindow.reader.pageIndex;f.contentDocument.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true}));if(f.contentWindow.reader.pageIndex!==before)throw Error('IME changed reading page');});
  // Initial shell failures also provide a retry, independent of lesson fetches.
  const recovery=await context.newPage();await recovery.route('**/preview-reader.html*',r=>r.fulfill({contentType:'text/html',body:'<p>unavailable</p>'}));await recovery.goto(base);await recovery.locator('#read').scrollIntoViewIfNeeded();await recovery.locator('.preview-retry').waitFor();await recovery.unroute('**/preview-reader.html*');await recovery.locator('.preview-retry').click();await recovery.waitForFunction(()=>document.querySelector('iframe').contentWindow.reader?.fontsCalibrated&&!document.querySelector('iframe').hasAttribute('aria-busy'));await recovery.close();
  const animation=await page.locator('.star-glyph').evaluate(n=>getComputedStyle(n).animationName);assert.equal(animation,'none');assert.deepEqual(errors,[]);
  reports.push({engine,menus:true,copySuccessAndDenied:true,noActionLayoutShift:true,retry:true,stalledResponseRetry:true,rovingExamples:true,defaultIvoryAndWenKai:true,paperSingleBoundary:true,responsiveSettings:true,reducedMotion:true,initialShellRetry:true,lightContrast,darkContrast,errors});await context.close();
 }finally{await browser.close()}
}
await writeFile('output/prescription-ui/report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
