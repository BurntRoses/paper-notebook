import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5183';
await mkdir('output/exploration',{recursive:true});
const reports=[];
for(const [engine,type]of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const open=async(name,id)=>{await page.goto(`${base}/downloads/${name}.html?demo`);await page.waitForFunction(()=>window.reader?.fontsCalibrated);await page.evaluate(id=>{reader.profile.motion='reduced';reader.profile.transition='none';const p=reader.d.notebook.chapters.flatMap(c=>c.pages).find(p=>p.blocks.some(b=>b.id===id));reader.goBlock(p.id,id);},id);await page.locator(`[data-block="${id}"] .exploration`).waitFor();};
  await open('compound-interest','growth-exploration');
  assert.deepEqual(await page.evaluate(()=>[reader.profile.paperStyle,reader.profile.font]),['ivory','hand']);
  const number=page.getByRole('spinbutton',{name:'每期增长率数值'});await number.fill('5');await number.press('Enter');
  assert.equal(await page.locator('.exploration-outputs dd').first().innerText(),'110.25 元');
  const before=await page.evaluate(()=>reader.pageIndex);await page.getByRole('slider',{name:'每期增长率',exact:true}).focus();await page.keyboard.press('ArrowRight');
  assert.equal(await number.inputValue(),'5.5');assert.equal(await page.evaluate(()=>reader.pageIndex),before);
  const focus = await page.getByRole('slider',{name:'每期增长率',exact:true}).evaluate(n=>({outline:getComputedStyle(n).outlineWidth,filter:getComputedStyle(n).filter}));
  assert.equal(focus.outline,'0px');assert.notEqual(focus.filter,'none');
  const rangeCSS=await page.locator('style').allTextContents();assert.ok(!/\.exploration-range:focus-visible::[^{}]+\{[^{}]*box-shadow:0 0 0 4px/.test(rangeCSS.join('\n')));
  await page.screenshot({path:`output/exploration/${engine}-plot.png`});
  await page.getByRole('button',{name:'重置',exact:true}).click();assert.equal(await number.inputValue(),'10');assert.ok(await page.getByRole('button',{name:'重置',exact:true}).isDisabled());
  await number.fill('5');await number.press('Enter');
  await page.evaluate(()=>reader.showExport());const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'下载离线 HTML',exact:true}).click();const file=await downloadEvent;const filePath=process.cwd()+`/output/exploration/${engine}-offline.html`;await file.saveAs(filePath);
  const offline=await context.newPage();const requests=[];offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await offline.route(/^https?:/,r=>r.abort());if(engine==='chromium')await context.setOffline(true);await offline.goto(pathToFileURL(filePath).href);await offline.waitForFunction(()=>window.reader?.fontsCalibrated);assert.equal(await offline.getByRole('spinbutton',{name:'每期增长率数值'}).inputValue(),'5');assert.equal(await offline.locator('.exploration-outputs dd').first().innerText(),'110.25 元');assert.deepEqual(requests,[]);await offline.getByRole('button',{name:'开始阅读',exact:true}).click();await context.setOffline(true);await offline.getByRole('spinbutton',{name:'每期增长率数值'}).fill('6');await offline.getByRole('spinbutton',{name:'每期增长率数值'}).press('Enter');assert.equal(await offline.locator('.exploration-outputs dd').first().innerText(),'112.36 元');await offline.close();await context.setOffline(false);
  await open('literature','literature-exploration');await page.getByRole('tab',{name:'颔联',exact:true}).click();assert.match(await page.locator('.exploration-panel:visible').innerText(),/感时花溅泪/);await page.getByRole('tab',{name:'颔联',exact:true}).press('End');assert.equal(await page.getByRole('tab',{name:'尾联',exact:true}).getAttribute('aria-selected'),'true');
  // Search into an inactive interpretation must open its tab and locate source text.
  await page.evaluate(()=>{const b=reader.d.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks).find(b=>b.id==='literature-exploration');const all=b.exploration.frames.flatMap(f=>[f.label,f.quote||'',f.text,...(f.facts||[]).map(v=>v.label+'：'+v.value)]).filter(Boolean).join('\n'),exact='交通阻隔',start=all.indexOf(exact);reader.goSelector('literature-lab',{blockId:b.id,start,end:start+exact.length,exact,prefix:'',suffix:''});});
  await page.waitForFunction(()=>document.querySelector('[aria-controls="explore-literature-exploration-spring-third-panel"]')?.getAttribute('aria-selected')==='true');assert.ok(await page.locator('.passage-located rect').count()>0);
  await page.evaluate(()=>reader.render(reader.anchor()));assert.equal(await page.getByRole('tab',{name:'颈联',exact:true}).getAttribute('aria-selected'),'true');
  await page.screenshot({path:`output/exploration/${engine}-reading.png`});
  await page.evaluate(()=>reader.preparePDF({orientation:'portrait',includeRecords:true}));assert.equal(await page.locator('#print-root .exploration-panel').count(),4);assert.equal(await page.locator('#print-root .exploration-panel[hidden]').count(),0);await page.evaluate(()=>reader.finishPrint());
  await open('programming','code-exploration');for(let i=0;i<2;i++)await page.getByRole('button',{name:'下一步',exact:true}).click();assert.match(await page.locator('.exploration-panel:visible').innerText(),/集合已经包含 A/);assert.equal(await page.evaluate(()=>reader.d.userState.explorations['code-exploration'].active),'set-repeat');await page.getByRole('button',{name:'重置',exact:true}).click();assert.ok(await page.getByRole('button',{name:'上一步',exact:true}).isDisabled());
  await open('business','business-exploration');assert.equal(await page.locator('.exploration-outputs dd').nth(1).innerText(),'100 件');await page.getByRole('spinbutton',{name:'固定成本数值'}).fill('6000');await page.getByRole('spinbutton',{name:'固定成本数值'}).press('Enter');assert.equal(await page.locator('.exploration-outputs dd').nth(1).innerText(),'200 件');
  await open('machine-learning','ml-exploration');assert.equal(await page.locator('.exploration-chart circle').count(),4);await page.getByRole('spinbutton',{name:'斜率 w数值'}).fill('1.5');await page.getByRole('spinbutton',{name:'斜率 w数值'}).press('Enter');assert.ok(await page.locator('.exploration-chart svg').count());
  for(const [width,height]of [[390,844],[820,620],[1440,1000]]){await page.setViewportSize({width,height});await page.waitForFunction(()=>reader.lastWidth===innerWidth&&reader.lastHeight===innerHeight);await page.evaluate(()=>{reader.profile.theme='paper-night';reader.profile.layout=innerWidth>1000?'spread':'single';reader.render(reader.anchor())});const result=await page.locator('.exploration').first().evaluate(n=>({width:n.getBoundingClientRect().width,scroll:n.scrollWidth,client:n.clientWidth,inputs:[...n.querySelectorAll('input')].every(i=>i.getBoundingClientRect().width>20)}));assert.ok(result.scroll<=result.client+2,JSON.stringify(result));assert.ok(result.inputs);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);}
  await page.screenshot({path:`output/exploration/${engine}-spread-night.png`});
  await page.goto(base);await page.locator('#read').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#read').count(),1);assert.equal(await page.locator('.learning-example-list [data-example]').count(),6);assert.equal(await page.locator('iframe').count(),1);
  await page.waitForFunction(()=>document.querySelector('.reader-preview')?.contentWindow.reader?.fontsCalibrated&&!document.querySelector('.reader-preview').hasAttribute('aria-busy'));
  const frame=page.frameLocator('.reader-preview'),activity=page.locator('#preview-open-activity');
  for(const [name,id]of [['machine-learning','ml-exploration'],['compound-interest','growth-exploration'],['concept','statistics-exploration'],['literature','literature-exploration'],['business','business-exploration'],['programming','code-exploration']]){
   await page.locator(`[data-example="${name}"]`).click();
   await page.waitForFunction(name=>{const f=document.querySelector('.reader-preview');return f.dataset.selectedExample===name&&!f.hasAttribute('aria-busy')},name);
   assert.equal(await page.locator('.reader-preview').evaluate(f=>f.contentWindow.reader.pageIndex),0);
   assert.equal(await page.locator('#preview-example-title').innerText(),await page.locator(`[data-example="${name}"]`).getAttribute('data-example-title'));
   await activity.click();await frame.locator(`[data-block="${id}"] .exploration`).waitFor();
  }
  await page.locator('[data-example=literature]').click();await page.waitForFunction(()=>document.querySelector('.reader-preview').dataset.selectedExample==='literature'&&!document.querySelector('.reader-preview').hasAttribute('aria-busy'));await activity.click();await frame.getByRole('tab',{name:'颔联',exact:true}).click();assert.match(await frame.locator('.exploration-panel:visible').innerText(),/花与鸟/);assert.equal(await page.locator('#preview-tour-status').innerText(),'');
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>{const w=document.querySelector('.reader-preview').contentWindow;return w.reader.lastWidth===w.innerWidth&&w.reader.lastHeight===w.innerHeight});await page.locator('#read').screenshot({path:`output/exploration/${engine}-home-mobile.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  assert.deepEqual(errors,[]);reports.push({engine,computation:true,keyboard:true,sourceSearch:true,reset:true,offlineRoundtrip:true,printAllFrames:true,responsive:[390,820,1440],night:true,homepageEntry:true,errors});console.log(engine+': activities, calculation, search, offline records, print and homepage passed');await context.close();
 }finally{await browser.close();}
}
await writeFile('output/exploration/report.json',JSON.stringify(reports,null,2));
