import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5183';
await mkdir('output/trace-iteration',{recursive:true});
const reports=[];
for(const [engine,type]of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}${process.env.NOTEBOOK_READER||'/downloads/programming.html?demo'}`);await page.waitForFunction(()=>window.reader?.fontsCalibrated);
  if(process.env.NOTEBOOK_DEV)await page.evaluate(async()=>{const {showcaseNotebooks}=await import('/src/showcase.ts');reader.openPreview(showcaseNotebooks.find(([name])=>name==='programming')[1]);});
  await page.evaluate(()=>{reader.profile.motion='reduced';reader.profile.transition='none';reader.goBlock('code-lab','code-exploration');});
  const trace=page.locator('.reader-stage .exploration-trace');await trace.waitFor();
  const source=await page.evaluate(()=>reader.d.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks).find(b=>b.id==='code-exploration').exploration.trace.code);
  assert.deepEqual(await trace.locator('.trace-source').allTextContents(),source);
  assert.ok(await trace.locator('.token-keyword').count());assert.ok(await trace.locator('.token-string').count());
  const mapping=await trace.locator('.code-token[data-variable=seen]').first().getAttribute('data-variable-color');
  assert.equal(mapping,await trace.locator('.trace-collection[data-variable=seen]').getAttribute('data-variable-color'));
  assert.equal(mapping,await page.locator('.paper-notes .trace-variable[data-variable=seen]').getAttribute('data-variable-color'));
  await trace.locator('.trace-collection[data-variable=records] .trace-value').first().evaluate(n=>window.retainedInputCell=n);
  await trace.getByRole('button',{name:'下一步',exact:true}).click();await trace.getByRole('button',{name:'下一步',exact:true}).click();
  assert.equal(await trace.locator('.trace-collection[data-variable=records] .trace-value').first().evaluate(n=>n===window.retainedInputCell),true);
  assert.equal(await trace.locator('.trace-value[aria-current=true]').innerText(),'"A"');
  assert.equal(await trace.locator('.trace-collection[data-variable=seen] .trace-value[data-added=true]').innerText(),'"A"');
  await trace.locator('.trace-collection[data-variable=seen] .trace-value').evaluate(n=>window.retainedSetCell=n);
  await trace.getByRole('button',{name:'下一步',exact:true}).click();
  assert.equal(await trace.locator('.trace-collection[data-variable=seen] .trace-value').evaluate(n=>n===window.retainedSetCell),true);
  assert.equal(await trace.locator('.trace-collection[data-variable=seen] .trace-value[data-added=true]').count(),0);
  assert.match(await trace.locator('.trace-status').textContent(),/步骤 4 \/ 8.*已执行第 3 行/);
  assert.equal(await trace.evaluate(n=>n.getAnimations({subtree:true}).length),0);
  const pageIndex=await page.evaluate(()=>reader.pageIndex);
  await trace.getByRole('slider',{name:'执行步骤',exact:true}).focus();await page.keyboard.press('End');
  assert.equal(await page.evaluate(()=>reader.pageIndex),pageIndex);assert.equal(await trace.locator('.trace-line[data-active=true]').getAttribute('data-line'),'5');
  assert.ok(await trace.getByRole('button',{name:'下一步',exact:true}).isDisabled());
  await page.keyboard.press('Home');assert.ok(await trace.getByRole('button',{name:'上一步',exact:true}).isDisabled());
  // A real long program and complete variable snapshots exercise internal scroll.
  await page.evaluate(()=>{
   const doc=structuredClone(reader.d),block=doc.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks).find(b=>b.id==='code-exploration');
   doc.notebook.id='trace-scroll-regression';doc.notebook.chapters=[{id:'trace-chapter',title:'执行过程',pages:[{id:'trace-page',title:'逐行执行',layout:'reading',blocks:[block]}]}];doc.userState.explorations={};doc.userState.lastPageId='trace-page';doc.userState.annotations=[];doc.userState.doubts=[];doc.userState.bookmarks=[];doc.userState.notes=[];delete block.study;
   block.exploration.trace={language:'Python',input:'records',code:['records = ["A", "B"]','message = """多行说明','return seen 仍在字符串内','end"""',...Array.from({length:22},(_,i)=>`count = ${i}`)]};
   block.exploration.frames=[{id:'begin',label:'初始化',text:'准备逐行执行。',line:1,variables:[{name:'records',value:['A','B']}]},{id:'end',label:'末行结果',text:'最后一次赋值保存 21。',line:26,cursor:1,variables:[{name:'records',value:['A','B']},{name:'count',value:21}]}];
   reader.openPreview(doc);reader.goBlock('trace-page',block.id);
  });
  const long=page.locator('.reader-stage .exploration-trace');await long.waitFor();
  assert.equal(await long.locator('.trace-line[data-line="3"] .token-string').innerText(),'return seen 仍在字符串内');
  assert.equal(await long.locator('.trace-line[data-line="3"] [data-variable]').count(),0);
  const initialScroll=await page.evaluate(()=>({x:scrollX,y:scrollY,index:reader.pageIndex}));
  await long.getByRole('button',{name:'下一步',exact:true}).click();
  await page.waitForFunction(()=>{const code=document.querySelector('.reader-stage .trace-code'),row=code?.querySelector('[data-active=true]');if(!row)return false;const r=row.getBoundingClientRect(),box=code.getBoundingClientRect();return r.top>=box.top&&r.bottom<=box.bottom;});
  assert.deepEqual(await page.evaluate(()=>({x:scrollX,y:scrollY,index:reader.pageIndex})),initialScroll);
  assert.ok(await long.locator('.trace-code').evaluate(n=>n.scrollTop>0));
  for(let i=0;i<8;i++){await long.getByRole('button',{name:'重置',exact:true}).click();await long.getByRole('button',{name:'下一步',exact:true}).click();}
  assert.equal(await long.locator('.trace-line[data-active=true]').getAttribute('data-line'),'26');
  assert.equal(await long.locator('.trace-status').innerText(),'步骤 2 / 2，末行结果；已执行第 26 行。');
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>reader.lastWidth===innerWidth&&reader.lastHeight===innerHeight);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await page.screenshot({path:`output/trace-iteration/${engine}-phone.png`});
  assert.deepEqual(errors,[]);reports.push({engine,sourceExact:true,multilineTokens:true,stableInputCells:true,stableSetCells:true,variableColorMapping:true,keyboard:true,internalCodeScroll:true,rapidReverse:true,reducedMotion:true,errors});
  await context.close();console.log(engine+': source colors, stable cells, variable mapping, internal scroll and keyboard passed');
 }finally{await browser.close();}
}
await writeFile('output/trace-iteration/report.json',JSON.stringify(reports,null,2));
