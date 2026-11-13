import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5183';
await mkdir('output/code-iteration',{recursive:true});
const reports=[];
for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const open=async(name,id)=>{await page.goto(`${base}/downloads/${name}.html?demo`);await page.waitForFunction(()=>window.reader?.fontsCalibrated);await page.evaluate(id=>{const p=reader.d.notebook.chapters.flatMap(c=>c.pages).find(p=>p.blocks.some(b=>b.id===id));reader.goBlock(p.id,id);},id);};
  await open('concept','obs-sql');
  const code=page.locator('.reader-stage [data-block=obs-sql] pre code');
  const source=await page.evaluate(()=>reader.d.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks).find(b=>b.id==='obs-sql').text);
  assert.equal(await code.textContent(),source);
  for(const theme of ['paper-light','paper-night']){
   await page.evaluate(theme=>{reader.profile.theme=theme;reader.refreshAppearance();},theme);
   const colors=await code.evaluate(node=>{
    const rgb=value=>value.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);
    const luminance=value=>{const c=rgb(value);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
    const bg=luminance(getComputedStyle(node.closest('pre')).backgroundColor);
    return ['keyword','property','type','builtin','string','operator'].map(kind=>{const color=getComputedStyle(node.querySelector('.token-'+kind)).color,l=luminance(color);return {kind,color,contrast:(Math.max(bg,l)+.05)/(Math.min(bg,l)+.05)};});
   });
   assert.equal(new Set(colors.map(c=>c.color)).size,6);
   for(const result of colors)assert.ok(result.contrast>=4.5,JSON.stringify({engine,theme,...result}));
   await page.screenshot({path:`output/code-iteration/${engine}-${theme}.png`});
  }
  await page.evaluate(()=>{reader.profile.theme='paper-light';reader.refreshAppearance();Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.testCopiedCode=text;}}});});
  await page.getByRole('button',{name:'复制代码',exact:true}).click();await page.getByRole('button',{name:'已复制',exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.testCopiedCode),source);
  await page.evaluate(()=>{const p=reader.d.notebook.chapters.flatMap(c=>c.pages).find(p=>p.blocks.some(b=>b.id==='obs-sql')),b=p.blocks.find(b=>b.id==='obs-sql'),exact='COUNT(DISTINCT customer_id)',start=b.text.indexOf(exact),selector={blockId:b.id,start,end:start+exact.length,exact,prefix:'',suffix:''};reader.editor.change(()=>{for(const kind of ['bold','red'])reader.d.userState.annotations.push({id:'code-format-'+kind,pageId:p.id,kind,selectors:[selector],color:'#b1483d',width:2,seed:1});});});
  assert.equal(await code.textContent(),source);
  const annotation=await code.evaluate(n=>{const mark=n.querySelector('.red-ink');return {text:mark.textContent,color:getComputedStyle(mark).color,children:[...mark.querySelectorAll('.code-token')].map(n=>getComputedStyle(n).color),bold:!!n.querySelector('.bold-ink')};});
  assert.equal(annotation.text,'COUNT(DISTINCT customer_id)');assert.ok(annotation.bold);assert.ok(annotation.children.every(c=>c===annotation.color));
  await page.evaluate(()=>reader.showExport());const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'下载离线 HTML',exact:true}).click();const file=process.cwd()+`/output/code-iteration/${engine}-offline.html`;await(await downloading).saveAs(file);
  const offline=await context.newPage(),requests=[];await offline.route(/^https?:/,r=>r.abort());offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await offline.goto(pathToFileURL(file).href+'?demo');await offline.waitForFunction(()=>window.reader?.fontsCalibrated);
  assert.equal(await offline.locator('.reader-stage [data-block=obs-sql] pre code').textContent(),source);assert.ok(await offline.locator('.reader-stage .red-ink').count());assert.deepEqual(requests,[]);await offline.close();
  const navigated=await context.newPage();await navigated.route(/^https?:/,r=>r.abort());
  await navigated.addInitScript(()=>{const actual=document.fonts.ready,gate=new Promise(resolve=>{window.releaseFontCalibration=resolve;});Object.defineProperty(document.fonts,'ready',{get:()=>actual.then(()=>gate)});});
  await navigated.goto(pathToFileURL(file).href+'?demo');await navigated.waitForFunction(()=>window.reader&&!reader.fontsCalibrated);
  await navigated.evaluate(()=>reader.goBlock('observation-1','obs-opening'));assert.equal(await navigated.locator('.reader-stage [data-block=obs-opening]').count(),1);
  await navigated.evaluate(()=>window.releaseFontCalibration());await navigated.waitForFunction(()=>reader.fontsCalibrated);
  assert.equal(await navigated.evaluate(()=>reader.page.id),'observation-1');assert.equal(await navigated.locator('.reader-stage [data-block=obs-opening]').count(),1);await navigated.close();
  await open('machine-learning','ml-exploration');
  const details=page.locator('.paper-notes .exploration-residuals');await details.locator('summary').click();await details.locator('summary').focus();
  const stable=await page.evaluate(()=>{
   const report=document.querySelector('.paper-notes .exploration-results'),details=report.querySelector('details'),cell=details.querySelector('tbody td'),metric=report.querySelector('[data-metric=mse] dd'),focus=document.activeElement;
   const input=document.querySelector('.reader-stage input[aria-label="斜率 w数值"]');input.value='1.5';input.dispatchEvent(new Event('change',{bubbles:true}));
   return {sameDetails:details===report.querySelector('details'),sameCell:cell===report.querySelector('tbody td'),sameMetric:metric===report.querySelector('[data-metric=mse] dd'),open:details.open,focus:focus===document.activeElement};
  });assert.deepEqual(stable,{sameDetails:true,sameCell:true,sameMetric:true,open:true,focus:true});
  await page.getByRole('button',{name:'计算拟合参数',exact:true}).click();assert.equal(await page.locator('.paper-notes [data-metric=mse] dd').innerText(),'0.0556');
  assert.deepEqual(errors,[]);reports.push({engine,exactSource:true,semanticColors:true,contrast:true,personalMarksOverride:true,copyFeedback:true,offlineRoundtrip:true,navigationDuringFontLoad:true,keyedResults:true,errors});
  await context.close();console.log(engine+': code fields, source, marks, copy, offline and stable results passed');
 }finally{await browser.close();}
}
await writeFile('output/code-iteration/report.json',JSON.stringify(reports,null,2));
