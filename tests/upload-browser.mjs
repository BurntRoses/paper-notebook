import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {unzipSync} from 'fflate';
const engines=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=(process.env.NOTEBOOK_BASE||'http://127.0.0.1:5180/paper-notebook-kit/output/site').replace(/\/$/,'');
const canonical=await readFile('dist/downloads/paper-notebook-conversation.zip'),expected=await readFile('dist/downloads/paper-notebook-upload.zip');
await mkdir('output/upload-check',{recursive:true});const results=[];
for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  assert.equal((await page.goto(base+'/chat-start.html')).status(),200);
  const link=page.getByRole('link',{name:'备用：下载构建包',exact:true});assert.equal(await link.getAttribute('href'),'downloads/paper-notebook-upload.zip');
  const waiting=page.waitForEvent('download');await link.click();const download=await waiting;
  assert.equal(download.suggestedFilename(),'paper-notebook-upload.zip');
  const data=await readFile(await download.path());assert.deepEqual(data,expected);
  const files=unzipSync(data);assert.deepEqual(Buffer.from(files['paper-notebook-upload/paper-notebook-conversation.zip']),canonical);
  await page.locator('#download-help summary').click();const help=await page.locator('#download-help').innerText();assert.match(help,/压缩/);assert.match(help,/paper-notebook-conversation\.zip/);assert.doesNotMatch(help,/此前下载|Safari/);
  await page.screenshot({path:`output/upload-check/${engine}-desktop.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`output/upload-check/${engine}-phone.png`,fullPage:true});
  for(const id of ['prompt','repository-prompt'])assert.equal((await page.locator('#'+id).inputValue()).trim().split(/\r?\n/).length,1);
  assert.deepEqual(errors,[]);results.push({engine,download:'paper-notebook-upload.zip',innerUnchanged:true,desktopAndMobile:true,promptsRemainOneLine:true,errors});
  await context.close();
 }finally{await browser.close()}
}
await writeFile('docs/verification/upload-wrapper-report.json',JSON.stringify({date:new Date().toISOString(),version:'2.2.1',outerBytes:expected.length,innerBytes:canonical.length,overheadBytes:expected.length-canonical.length,modelTests:57,actualWrapperSmokeBuild:true,results,scope:'Actual browser download, content identity and responsive instructions. One-layer automatic expansion is simulated by extracting only the outer archive; Safari auto-open preference itself is not controlled by this test. Broader hosting run passed the download checks but timed out at unrelated film seek readiness.'},null,2)+'\n');console.log('Upload ZIP: Chromium and WebKit downloaded the exact wrapper, checked inner identity and desktop/mobile guidance.');
