import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5182';
const source=JSON.parse(await readFile('examples/business.json','utf8'));
const file=(name,title)=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...source,notebook:{...source.notebook,title}}))});
for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/downloads/machine-learning.html?demo');await page.waitForFunction(()=>window.reader?.fontsCalibrated);
  await page.evaluate(()=>{const text=File.prototype.text;File.prototype.text=async function(){if(this.name==='slow.json')await new Promise(resolve=>setTimeout(resolve,500));return text.call(this);};reader.showImport();});
  const chooser=page.getByLabel('选择教程文件',{exact:true}),area=page.getByLabel('教程源文本',{exact:true});
  await chooser.setInputFiles(file('slow.json','较早选择的文件'));
  await chooser.setInputFiles(file('fast.json','最后选择的文件'));
  await page.waitForTimeout(650);
  assert.match(await page.locator('.import-preview').innerText(),/最后选择的文件/);
  assert.equal(JSON.parse(await area.inputValue()).notebook.title,'最后选择的文件');
  assert.equal(await page.locator('.import-preview').getAttribute('aria-busy'),null);
  await chooser.setInputFiles(file('slow.json','不应覆盖编辑'));
  await area.fill('# 手动修改\n\n保留正在编辑的内容。');await page.waitForTimeout(650);
  assert.equal(await area.inputValue(),'# 手动修改\n\n保留正在编辑的内容。');
  assert.equal(await page.locator('.dialog-foot').getByRole('button',{name:'导入',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'预览导入',exact:true}).click();assert.match(await page.locator('.import-preview').innerText(),/手动修改/);
  await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});

  // Switching the lesson ends UI tied to the previous document.
  await page.evaluate(()=>{reader.startTour();reader.showExport();});
  await page.evaluate(d=>reader.openPreview(d),source);
  await page.waitForFunction(()=>!document.querySelector('dialog[open],.reader-tour,.tour-target'));
  assert.equal(await page.evaluate(()=>reader.d.notebook.id),source.notebook.id);
  assert.equal(await page.evaluate(()=>reader.pageIndex),0);

  // Demo pages share an origin with personal copies, but must not overwrite
  // the personal draft when a user opens the home page or another example.
  await page.goto(base+'/downloads/machine-learning.html');await page.waitForFunction(()=>reader?.ready&&reader.fontsCalibrated);
  await page.evaluate(()=>{reader.d.userState.checks['private-draft']=true;reader.remember();});
  const stored=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('paper-notebook-v1',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,r=db.transaction('documents').objectStore('documents').get(reader.d.notebook.id);r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>reject(r.error);};}));
  await page.waitForTimeout(500);assert.equal((await stored()).userState.checks['private-draft'],true);
  const demo=await context.newPage();await demo.goto(base+'/downloads/machine-learning.html?demo');await demo.waitForFunction(()=>reader?.fontsCalibrated);
  await demo.evaluate(()=>{reader.d.userState.checks['demo-only']=true;reader.remember();});await demo.waitForTimeout(500);await demo.close();
  const personal=await stored();assert.equal(personal.userState.checks['private-draft'],true);assert.equal(personal.userState.checks['demo-only'],undefined);
  await page.reload();await page.waitForFunction(()=>reader?.ready&&reader.d.userState.checks['private-draft']);

  // Actual write failures are visible, then clear when writing succeeds again.
  await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;window.__restorePut=()=>IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.put=function(){throw new DOMException('Full','QuotaExceededError');};reader.d.userState.checks['save-recovery']=true;reader.remember();});
  await page.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('本机保存失败'));
  await page.evaluate(()=>{window.__restorePut();reader.remember();});
  await page.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('本机保存已恢复'));
  assert.equal((await stored()).userState.checks['save-recovery'],true);

  // An immediate lesson import flushes the previous draft before changing IDs.
  await page.evaluate(()=>{reader.d.userState.checks['before-switch']=true;reader.remember();reader.showImport();});
  await page.getByLabel('教程源文本',{exact:true}).fill(JSON.stringify(source));await page.getByRole('button',{name:'预览导入',exact:true}).click();
  await page.locator('.dialog-foot').getByRole('button',{name:'导入',exact:true}).click();
  await page.waitForFunction(id=>reader.d.notebook.id===id,source.notebook.id);
  await page.goto(base+'/downloads/machine-learning.html');await page.waitForFunction(()=>reader?.ready&&reader.d.userState.checks['before-switch']);
  assert.deepEqual(errors,[]);await context.close();
  console.log(`✓ ${engine}: latest import wins, edits preserved, document UI cleanup, preview draft isolation, save failure/recovery and import flush`);
 }finally{await browser.close();}
}
