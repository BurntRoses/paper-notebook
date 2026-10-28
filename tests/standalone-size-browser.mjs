import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile,mkdtemp,readdir,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const engines=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const results=[];
await mkdir('output/authored-marks',{recursive:true});
for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{
  // WebKit's network-offline emulation can reject file:// itself. Block every
  // non-embedded dependency instead; Chromium also has offline mode enabled.
  const context=await browser.newContext({offline:engine==='chromium',viewport:{width:1440,height:1000},acceptDownloads:true});
  for(const runtime of ['output','node-output']){
   const report=JSON.parse(await readFile(`output/conversation-package-check/paper-notebook/${runtime}/build-report.json`,'utf8'));
   const directory=await mkdtemp(join(tmpdir(),'paper-standalone-')),target=join(directory,'教程.html');
   await copyFile(`output/conversation-package-check/paper-notebook/${runtime}/${report.html}`,target);
   assert.deepEqual(await readdir(directory),['教程.html']);
   const url=pathToFileURL(target).href,page=await context.newPage(),errors=[],dependencies=[];let allowedURL=url;
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(!r.url().startsWith('data:')&&!r.url().startsWith('blob:')&&r.url().split('?')[0]!==allowedURL)dependencies.push(r.url())});
   await page.route('**/*',route=>route.request().url().split('?')[0]===allowedURL?route.continue():route.abort());
   await page.goto(url+'?demo');await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>document.fonts.ready);
   assert.ok((await page.locator('.reader-content').innerText()).includes('先上传材料'));
   assert.ok(await page.locator('[data-kind=circle]').count());
   const authoredSource=await page.evaluate(()=>structuredClone(window.reader.d.notebook));
   await page.evaluate(()=>{window.reader.profile.motion='reduced';window.reader.goBlock('product-marks','marks-examples')});
   for(const kind of ['dots','check'])await page.locator('[data-kind='+kind+']').first().waitFor();
   await page.screenshot({path:`output/authored-marks/${engine}-${runtime}.png`});
   await page.locator('.reader-files summary').click();await page.locator('.reader-file-menu').getByRole('button',{name:'下载',exact:true}).click();
   const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'下载离线 HTML',exact:true}).click();
   const saved=await waiting,savedPath=join(directory,'再保存.html');await saved.saveAs(savedPath);
   const savedHTML=await readFile(savedPath,'utf8');assert.ok(savedHTML.includes('paper-notebook-product-story'));
   const embedded=JSON.parse(savedHTML.match(/<script\b[^>]*\bid=["']notebook-data["'][^>]*>([\s\S]*?)<\/script>/)[1]);
   assert.deepEqual(embedded.notebook,authoredSource);
   allowedURL=pathToFileURL(savedPath).href;await page.goto(allowedURL+'?demo');await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>document.fonts.ready);
   await page.evaluate(()=>{window.reader.profile.motion='reduced';window.reader.goBlock('product-marks','marks-examples')});
   for(const kind of ['dots','check'])await page.locator('[data-kind='+kind+']').first().waitFor();
   await page.evaluate(()=>window.reader.goBlock('product-marks','marks-select'));await page.locator('[data-kind=circle]').first().waitFor();
   assert.deepEqual(errors,[]);assert.deepEqual(dependencies,[]);
   results.push({engine,runtime,isolatedHTML:true,visibleLesson:true,annotation:true,authoredKindsVisible:['circle','dots','check'],authoredSourcePreserved:true,marksVisibleAfterOfflineReopen:true,exportHTML:true,externalDependencies:dependencies,errors});
   await page.close();
  }
  await context.close();
 }finally{await browser.close();}
}
await writeFile('docs/verification/standalone-size-report.json',JSON.stringify({date:new Date().toISOString(),results,scope:'Chromium network-offline and WebKit with every non-embedded dependency blocked. Each HTML is copied by itself to a new directory; no adjacent fonts/scripts/images, source JSON, archive or server. This does not diagnose a user file that has not been provided.'},null,2)+'\n');
console.log('Standalone Node/Python HTML: Chromium and WebKit opened isolated files, rendered, annotated and exported with no external dependency requests.');
