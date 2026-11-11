import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5182';
await mkdir('output/content-quality',{recursive:true});
for(const [engine,type] of Object.entries({chromium,webkit}).filter(([name])=>!process.env.CONTENT_ENGINE||process.env.CONTENT_ENGINE===name)){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#read',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('.reader-preview')?.contentWindow.reader?.fontsCalibrated);
  const frame=page.frames().find(f=>f.url().includes('preview-reader.html'));
  for(const [subject,id] of [['machine-learning','notebook-ml-foundations'],['compound-interest','showcase-compound-interest'],['concept','notebook-observation'],['literature','showcase-literature'],['business','showcase-business'],['programming','showcase-programming']]){
   await page.locator(`[data-example="${subject}"]`).click();
   await frame.waitForFunction(id=>reader.d.notebook.id===id,id);
   const result=await frame.evaluate(async()=>{
    reader.profile.layout='single';reader.profile.motion='reduced';reader.render();
    const seen=new Set(),issues=[];let bold=0,color=0;
    for(let i=0;i<reader.pages.length;i++){
     reader.goPage(i,true);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
     for(const paper of document.querySelectorAll('.reader-stage .page-surface')){
      bold+=paper.querySelectorAll('.bold-ink').length;color+=paper.querySelectorAll('.red-ink').length;
      for(const note of paper.querySelectorAll('.cornell-cue')){
       seen.add(note.dataset.cueId);
       if(!note.querySelector('.cue-title')?.textContent||!note.querySelector('.cue-body')?.textContent)issues.push('missing title/body');
       const source=paper.querySelector(`[data-block="${note.dataset.cueBlock}"]`);
       if(!source)issues.push('missing source '+note.dataset.cueId);
       if(note.dataset.cueAnchor&&!source?.textContent.includes(note.dataset.cueAnchor))issues.push('anchor not on this sheet '+note.dataset.cueId);
      }
      for(const zone of paper.querySelectorAll('.paper-notes')){
       const notes=[...zone.querySelectorAll('.cornell-cue')];
       for(let j=1;j<notes.length;j++)if(notes[j].getBoundingClientRect().top<notes[j-1].getBoundingClientRect().bottom-1)issues.push('overlapping margin notes');
      }
     }
    }
    const expected=reader.d.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.cues||[]).map(c=>c.id);
    return {seen:[...seen].sort(),expected:expected.sort(),issues,bold,color};
   });
   assert.deepEqual(result.issues,[],subject);assert.deepEqual(result.seen,result.expected,subject);
   assert.ok(result.bold>0&&result.color>0,subject+' visible bold and color');
  }
  await page.goto(base+'/downloads/machine-learning.html?demo');await page.waitForFunction(()=>reader?.fontsCalibrated);
  await page.evaluate(()=>{reader.sidebarTab='highlights';reader.sidebarOpen=true;reader.render();});
  assert.equal(await page.locator('.key-passage').filter({hasText:/^模型参数$/}).count(),1);
  await page.evaluate(()=>{reader.sidebarOpen=false;reader.goPage(0,true);});
  const term=page.locator('.reader-stage .bold-ink').filter({hasText:'线性回归'}).first();
  assert.ok(Number(await term.evaluate(n=>getComputedStyle(n).fontWeight))>=700);
  for(const theme of ['paper-light','paper-night']){
   await page.evaluate(theme=>{reader.profile.theme=theme;reader.render();},theme);
   if(engine==='chromium')await page.screenshot({path:`output/content-quality/${theme}.png`,fullPage:false});
  }
  // The downloaded copy keeps the new explanatory margins and typography offline.
  await page.evaluate(()=>reader.showExport());const pending=page.waitForEvent('download');
  await page.getByRole('button',{name:'下载离线 HTML',exact:true}).click();
  const download=await pending,copyPath=resolve('output/content-quality/'+engine+'-notebook.html');await download.saveAs(copyPath);
  const offline=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await offline.route(/^https?:/,route=>route.abort());const copy=await offline.newPage();
  copy.on('pageerror',e=>errors.push(e.message));
  await copy.goto(pathToFileURL(copyPath).href+'?demo');await copy.waitForFunction(()=>reader?.fontsCalibrated);
  await copy.evaluate(async()=>{reader.goPage(reader.pages.findIndex(p=>p.blocks.some(b=>b.id==='ml-learning'&&(b.text||'').includes('模型参数包括斜率和截距'))),true);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  assert.ok(await copy.locator('.reader-stage .cue-title').count());assert.ok(await copy.locator('.reader-stage .bold-ink').count());
  if(engine==='chromium')await copy.screenshot({path:'output/content-quality/phone.png'});
  assert.deepEqual(errors,[]);await offline.close();await context.close();
  console.log(`✓ ${engine}: all six subjects retain anchored explanatory margins across sheets; bold/color render; key passages deduplicate; exported phone copy works offline`);
 }finally{await browser.close();}
}
