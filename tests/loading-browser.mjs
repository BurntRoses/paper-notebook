import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const{chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5184',out='output/loading';await mkdir(out,{recursive:true});const reports=[];
for(const[engine,type]of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage(),requests=[],errors=[];
  page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#read',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.reader-preview')?.contentWindow.reader?.fontsCalibrated&&!document.querySelector('.reader-preview').hasAttribute('aria-busy'));
  assert.equal(requests.filter(url=>/\.mp4/.test(url)).length,0);assert.equal(requests.filter(url=>/\/reader\.html/.test(url)).length,0);
  const frame=page.frameLocator('.reader-preview'),resources=await page.locator('.reader-preview').evaluate(f=>f.contentWindow.performance.getEntriesByType('resource').map(r=>({name:r.name,encoded:r.encodedBodySize,transfer:r.transferSize})));
  assert.ok(resources.reduce((s,r)=>s+r.encoded,0)<1_200_000,JSON.stringify(resources));
  const fonts=resources.filter(r=>r.name.endsWith('.woff2'));assert.ok(fonts.length>0&&fonts.length<30,JSON.stringify(fonts));
  const initialScriptRequests=requests.filter(url=>/reader-assets\/.*\.js/.test(url)).length;assert.equal(initialScriptRequests,1);
  const switchTo=async name=>{await page.locator(`[data-example=${name}]`).click();await page.waitForFunction(name=>document.querySelector('.reader-preview').dataset.selectedExample===name&&!document.querySelector('.reader-preview').hasAttribute('aria-busy'),name);};
  await switchTo('literature');await switchTo('programming');await switchTo('machine-learning');assert.equal(requests.filter(url=>/reader-assets\/.*\.js/.test(url)).length,1);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.reader-preview')?.contentWindow.reader?.fontsCalibrated&&!document.querySelector('.reader-preview').hasAttribute('aria-busy'));
  const cached=await page.locator('.reader-preview').evaluate(f=>f.contentWindow.performance.getEntriesByType('resource').filter(r=>/reader-assets\//.test(r.name)).map(r=>({name:r.name,transfer:r.transferSize})));assert.ok(cached.length>=3,JSON.stringify(cached));assert.ok(cached.every(r=>r.transfer===0),JSON.stringify(cached));
  await switchTo('programming');await page.locator('#preview-open-activity').click();await frame.getByRole('slider',{name:'执行步骤',exact:true}).press('End');
  await page.route('**/reader.html?*',route=>route.fulfill({status:503,body:'unavailable'}));await page.locator('.reader-preview').evaluate(f=>f.contentWindow.reader.showExport());const save=frame.getByRole('button',{name:'下载离线 HTML',exact:true});await save.click();await frame.locator('.export-status').filter({hasText:'离线模板加载失败'}).waitFor();assert.ok(await save.isEnabled());await page.unroute('**/reader.html?*');
  const download=page.waitForEvent('download');await save.click();const file=process.cwd()+`/${out}/${engine}-hosted-export.html`;await(await download).saveAs(file);
  const html=await readFile(file,'utf8');assert.ok(!/<meta\b[^>]*name=["']paper-notebook-template["']/i.test(html));assert.ok(!html.includes('reader-assets/'));assert.ok(html.includes('data:font/woff2;base64,'));
  const offline=await context.newPage();const remote=[];offline.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url())});await offline.route(/^https?:/,r=>r.abort());await offline.goto(pathToFileURL(file).href+'?demo');await offline.waitForFunction(()=>reader?.fontsCalibrated);assert.equal(await offline.locator('.paper-notes [data-variable=count] dd').innerText(),'2');assert.equal(await offline.locator('.trace-line[data-active=true]').getAttribute('data-line'),'5');assert.deepEqual(remote,[]);await offline.close();
  await page.locator('#film').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('video').readyState>=2&&!document.querySelector('video').hasAttribute('aria-busy'));assert.ok(requests.some(url=>/\.mp4/.test(url)));assert.deepEqual(errors,[]);
  reports.push({engine,fontsRequested:fonts.length,encodedReaderResources:resources.reduce((s,r)=>s+r.encoded,0),noEarlyVideo:true,oneReaderRuntime:true,cachedAssets:true,templateFailureRetry:true,offlineExport:true,offlineRequests:0,videoLoadsNearViewport:true});console.log(engine+': demand fonts, cached assets and offline export passed');await context.close();
 }finally{await browser.close()}
}
await writeFile(out+'/browser-report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
