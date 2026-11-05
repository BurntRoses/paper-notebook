import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {unzipSync,strFromU8} from 'fflate';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5182';

for(const [engine,type] of Object.entries({chromium,webkit}).filter(([engine])=>!process.env.RUNTIME_ENGINE||engine===process.env.RUNTIME_ENGINE)){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // A slow response from an abandoned selection cannot replace the next book.
  let release,requested,count=0;
  const gate=new Promise(resolve=>release=resolve),request=new Promise(resolve=>requested=resolve);
  await page.route(/previews\/literature\.json/,async route=>{if(++count===1){requested();await gate;}await route.continue().catch(()=>{});});
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('#read').scrollIntoViewIfNeeded();
  const ready=id=>page.waitForFunction(id=>{const f=document.querySelector('.reader-preview');return f.contentWindow.reader?.d.notebook.id===id&&!f.hasAttribute('aria-busy');},id);
  await ready('notebook-ml-foundations');
  await page.locator('[data-example="literature"]').evaluate(b=>b.click());await request;
  await page.locator('[data-example="business"]').evaluate(b=>b.click());await ready('showcase-business');release();
  await page.locator('[data-example="literature"]').evaluate(b=>b.click());await ready('showcase-literature');assert.equal(count,2);
  assert.equal(await page.locator('[data-example][aria-pressed=true]').count(),1);

  await page.goto(base+'/downloads/machine-learning.html?demo');await page.waitForFunction(()=>window.reader?.fontsCalibrated);
  await page.evaluate(()=>{const r=window.reader;r.profile.layout='scroll';r.render();});await page.waitForTimeout(500);
  // A sustained burst stays bounded, while the last reading position is saved.
  const counts=await page.evaluate(async()=>{
   const r=window.reader,remember=r.remember.bind(r),update=r.updateProgress.bind(r),render=r.render.bind(r);let saves=0,progress=0,renders=0;
   r.remember=()=>{saves++;return remember();};r.updateProgress=()=>{progress++;return update();};r.render=(...a)=>{renders++;return render(...a);};
   for(let i=0;i<12;i++){dispatchEvent(new Event('scroll'));dispatchEvent(new Event('resize'));await new Promise(resolve=>requestAnimationFrame(resolve));}
   await new Promise(resolve=>setTimeout(resolve,220));return{saves,progress,renders,anchor:r.d.userState.readingAnchor};
  });
  assert.ok(counts.saves>0&&counts.saves<=2,JSON.stringify(counts));assert.equal(counts.progress,0);assert.equal(counts.renders,0);assert.ok(counts.anchor.pageId);
  await page.evaluate(()=>{const r=window.reader;r.goPage(Math.min(3,r.pages.length-1));});await page.waitForTimeout(450);
  assert.ok(await page.locator('.reader-stage .page-surface').count()>0);
  assert.deepEqual(errors,[]);await context.close();

  // A transient database-open error must not poison every subsequent save.
  const drafts=await browser.newContext({viewport:{width:1280,height:900}});
  await drafts.addInitScript(()=>{const open=indexedDB.open.bind(indexedDB);let first=!sessionStorage.getItem('runtime-database-error');indexedDB.open=(...args)=>{if(first){first=false;sessionStorage.setItem('runtime-database-error','1');throw new Error('Transient database failure');}return open(...args);};});
  const draft=await drafts.newPage();draft.on('pageerror',e=>errors.push(e.message));
  await draft.goto(base+'/downloads/blank-notebook.html');await draft.waitForFunction(()=>window.reader?.ready&&window.reader.fontsCalibrated);
  const rememberToken=async token=>{
   await draft.evaluate(token=>{const r=window.reader;r.d.userState.checks['runtime-recovery']=token;r.remember();},token);
   await draft.waitForTimeout(500);
   await draft.waitForFunction(token=>new Promise(resolve=>{const request=indexedDB.open('paper-notebook-v1',1);request.onerror=()=>resolve(false);request.onsuccess=()=>{const db=request.result,read=db.transaction('documents').objectStore('documents').get('notebook-blank');read.onsuccess=()=>{db.close();resolve(read.result?.userState.checks['runtime-recovery']===token);};};}),token);
  };
  await rememberToken(true);
  await draft.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase('paper-notebook-v1');request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error);}));
  await rememberToken(false);await draft.reload();await draft.waitForFunction(()=>window.reader?.ready&&window.reader.d.userState.checks['runtime-recovery']===false);
  assert.deepEqual(errors,[]);await drafts.close();

  const offline=await browser.newContext({acceptDownloads:true});await offline.route(/^https?:/,route=>route.abort());
  const copy=await offline.newPage();copy.on('pageerror',e=>errors.push(e.message));
  await copy.goto(pathToFileURL(resolve('output/site/downloads/machine-learning.html')).href+'?demo');await copy.waitForFunction(()=>window.reader?.fontsCalibrated);
  await copy.evaluate(()=>{window.reader.d.userState.checks['offline-zip']=true;window.reader.showExport();});await copy.locator('.export-advanced>summary').click();
  let downloads=0;copy.on('download',()=>downloads++);
  const download=copy.waitForEvent('download');await copy.getByRole('button',{name:'下载所选格式',exact:true}).evaluate(b=>{b.click();b.click();});
  const files=unzipSync(await readFile(await (await download).path())),html=Object.keys(files).find(name=>name.endsWith('.html'));
  assert.ok(html);assert.equal(JSON.parse(strFromU8(files['notebook.json'])).userState.checks['offline-zip'],true);
  assert.match(strFromU8(files[html]),/page-surface/);assert.equal(downloads,1);assert.deepEqual(errors,[]);await offline.close();

  const film=await browser.newContext({viewport:{width:1440,height:1000}});
  await film.addInitScript(()=>Object.defineProperty(navigator,'connection',{configurable:true,value:Object.assign(new EventTarget(),{effectiveType:'3g',downlink:.6,saveData:false})}));
  const player=await film.newPage();player.on('pageerror',e=>errors.push(e.message));let hdRequests=0,unblock,hdStarted;
  const firstHD=new Promise(resolve=>hdStarted=resolve),heldHD=new Promise(resolve=>unblock=resolve);
  await player.route(/paper-notebook-film-1080\.mp4/,async route=>{if(++hdRequests===1){hdStarted();await heldHD;}await route.continue().catch(()=>{});});
  await player.goto(base);await player.waitForFunction(()=>{const v=document.querySelector('video');return v.videoWidth===960&&v.buffered.length&&v.buffered.end(0)>10;});
  await player.evaluate(()=>{Object.assign(navigator.connection,{effectiveType:'4g',downlink:10});navigator.connection.dispatchEvent(new Event('change'));});await firstHD;
  await player.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await player.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await player.waitForFunction(()=>{const v=document.querySelector('video');return v.videoWidth===1920&&v.readyState>=2&&!v.hasAttribute('aria-busy');});unblock();
  assert.equal(hdRequests,2);assert.match(await player.locator('video').evaluate(v=>v.currentSrc),/^blob:/);assert.deepEqual(errors,[]);await film.close();
  console.log(`✓ ${engine}: cancelled example retry, bounded scroll work, unchanged-size resize, draft recovery, offline worker ZIP and suspended HD recovery`);
 }finally{await browser.close();}
}
