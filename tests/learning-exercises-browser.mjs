import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5183';
const url=process.env.NOTEBOOK_READER_URL||base+'/downloads/paper-notebook.html?demo';
const out='output/learning-exercises';await mkdir(out,{recursive:true});const reports=[];
for(const [engine,type]of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.reader?.fontsCalibrated);
  await page.evaluate(()=>{
   const d=structuredClone(reader.d);d.notebook.id='exercise-regression-fixture';d.notebook.revision=1;d.notebook.title='练习交互检查';d.notebook.sources=[];d.assets=[];d.extensions={readerProfile:{layout:'single',transition:'none',marginNotes:false,bottomNotes:false}};
   const types=['single','multiple','truefalse','matching','subjective'];
   d.notebook.chapters=[{id:'exercise-check-chapter',title:'练习',pages:types.map(type=>({id:'exercise-page-'+type,title:type,layout:'reading',blocks:[{id:'exercise-'+type,type:'exercise',questionType:type,question:type==='subjective'?'结合诗句说明忧国与思家的关系。':'选择符合题意的条目。',...(type==='matching'?{pairs:[{id:'matching-r1',left:'花溅泪',right:'感时'},{id:'matching-r2',left:'鸟惊心',right:'恨别'}]}:type==='subjective'?{}:{options:[{id:type+'-a',text:'甲'},{id:type+'-b',text:'乙'},...(type==='truefalse'?[]:[{id:type+'-c',text:'丙'}])],solution:type==='multiple'?[type+'-a',type+'-c']:[type+'-a']}),explanation:type==='subjective'?'“感时”写对国事的忧虑，“恨别”写离散中的思亲，两种感情由花鸟意象联结。':'参考解析。'}]}))}];
   d.userState.answers={};d.userState.notes=[];d.userState.annotations=[];d.userState.doubts=[];d.userState.bookmarks=[];d.userState.checks={};d.userState.lastPageId='exercise-page-single';reader.openPreview(d);
  });
  const open=async(type)=>{await page.evaluate(type=>reader.goBlock('exercise-page-'+type,'exercise-'+type),type);return page.locator('[data-block="exercise-'+type+'"]');};
  for(const type of ['single','multiple','truefalse']){
   const q=await open(type);await q.getByRole('button',{name:'提交这一题',exact:true}).click();assert.equal(await page.evaluate(type=>reader.d.userState.answers['exercise-'+type].submitted,type),true);assert.match(await q.locator('.answer-feedback').innerText(),/参考答案/);
   await q.getByRole('button',{name:'重新作答',exact:true}).click();assert.equal(await q.locator('.answer-feedback').count(),0);
   const first=q.locator('input').first();await first.focus();await first.press('Space');assert.ok(await first.isChecked());assert.ok(await first.evaluate(n=>n===document.activeElement));
   if(type==='multiple'){await q.locator('input').last().check();assert.equal(await q.locator('input:checked').count(),2);}
   assert.equal(await page.evaluate(type=>reader.d.userState.answers['exercise-'+type].submitted,type),false);await q.getByRole('button',{name:'提交这一题',exact:true}).click();assert.match(await q.locator('.answer-feedback').innerText(),/答案正确/);assert.ok(await q.locator('input').first().isDisabled());assert.ok(await q.getByRole('button',{name:'重新作答',exact:true}).evaluate(n=>n===document.activeElement));
  }
  const matching=await open('matching');await matching.getByRole('button',{name:'提交这一题',exact:true}).click();assert.deepEqual(await matching.locator('.answer-reference-pairs li').allTextContents(),['花溅泪 → 感时','鸟惊心 → 恨别']);await matching.getByRole('button',{name:'重新作答',exact:true}).click();
  for(const [id,text]of [['matching-r1','感时'],['matching-r2','恨别']]){const row=matching.locator('.match-row').nth(id==='matching-r1'?0:1);await row.getByRole('combobox').click();await page.getByRole('option',{name:text,exact:true}).click();assert.ok(await row.getByRole('combobox').evaluate(n=>n===document.activeElement));assert.equal(await page.evaluate(id=>reader.d.userState.answers['exercise-matching'].matches[id],id),id);}
  await matching.getByRole('button',{name:'提交这一题',exact:true}).click();assert.match(await matching.locator('.answer-feedback').innerText(),/答案正确/);
  const subjective=await open('subjective'),answer='战乱使国事与家事同时进入诗人的感受，花鸟意象承接忧国和思亲。',area=subjective.locator('textarea');await area.evaluate(n=>n.dataset.sameDraftNode='true');await area.fill(answer);assert.equal(await page.evaluate(()=>reader.d.userState.answers['exercise-subjective'].text),answer);assert.equal(await area.getAttribute('data-same-draft-node'),'true');assert.ok(await area.evaluate(n=>n===document.activeElement));
  await subjective.getByRole('button',{name:'提交这一题',exact:true}).click();assert.equal(await page.evaluate(()=>reader.d.userState.answers['exercise-subjective'].submitted),true);assert.match(await subjective.locator('.answer-feedback').innerText(),/参考要点/);assert.ok(await subjective.locator('textarea').getAttribute('readonly')!==null);
  await subjective.getByRole('button',{name:'重新作答',exact:true}).click();assert.equal(await subjective.locator('textarea').inputValue(),answer);await subjective.locator('textarea').fill(answer+'诗句以“感时”“恨别”点明两种情感。');assert.ok(await subjective.locator('textarea').evaluate(n=>n===document.activeElement));await subjective.getByRole('button',{name:'提交这一题',exact:true}).click();assert.equal(await page.evaluate(()=>reader.d.userState.answers['exercise-subjective'].submitted),true);
  for(const [width,height]of [[820,620],[390,844]]){
   await page.setViewportSize({width,height});await page.waitForFunction(()=>reader.lastWidth===innerWidth&&reader.lastHeight===innerHeight);const q=await open('subjective');await q.getByRole('button',{name:'重新作答',exact:true}).click();const field=q.locator('textarea');await field.fill(answer+'窄屏记录。');await field.press('Tab');assert.ok(await q.getByRole('button',{name:'提交这一题',exact:true}).evaluate(n=>n===document.activeElement));await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>reader.d.userState.answers['exercise-subjective'].submitted),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  }
  const expectedAnswers=await page.evaluate(()=>structuredClone(reader.d.userState.answers));
  await page.evaluate(()=>reader.showExport());const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载离线 HTML',exact:true}).click();const file=process.cwd()+`/${out}/${engine}-exercises.html`;await(await download).saveAs(file);const offline=await context.newPage(),requests=[];offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});await offline.route(/^https?:/,r=>r.abort());await offline.goto(pathToFileURL(file).href+'?demo');await offline.waitForFunction(()=>window.reader?.fontsCalibrated);await offline.evaluate(()=>reader.goBlock('exercise-page-subjective','exercise-subjective'));assert.equal(await offline.locator('.answer-feedback').count(),1);assert.equal(await offline.evaluate(()=>reader.d.userState.answers['exercise-subjective'].submitted),true);assert.deepEqual(await offline.evaluate(()=>reader.d.userState.answers),expectedAnswers);assert.deepEqual(requests,[]);await offline.close();
  assert.deepEqual(errors,[]);reports.push({engine,types:5,draftWithoutRemount:true,firstClickSubmit:true,matchingReferences:true,emptySubmission:true,retry:true,narrowKeyboard:true,offlineRoundtrip:true,errors});console.log(engine+': all five exercise types, live drafts, first-click submit, retry and offline passed');
 }finally{await browser.close()}
}
await writeFile(out+'/report.json',JSON.stringify(reports,null,2));
