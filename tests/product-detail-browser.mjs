import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5189';
const readerURL=process.env.NOTEBOOK_READER||'/';
const fixture=JSON.parse(await readFile('examples/blank-notebook.json','utf8'));
fixture.notebook.id='product-detail-fixture';fixture.notebook.title='阅读定位';
fixture.notebook.chapters[0].pages[0].title='长文与代码';
fixture.notebook.chapters[0].pages[0].blocks=[
 {id:'long',type:'prose',text:Array.from({length:65},(_,i)=>`检索条目 ${i+1}：说明参数与样本之间的关系，比较误差随数据变化的情况。${i===60?'尾段定位关键词。':''}`).join('\n\n')},
 {id:'code',type:'code',language:'text',text:Array.from({length:160},(_,i)=>`${i+1}: ${'a'.repeat(250)}${i===150?'远端代码目标':'内容'}`).join('\n')}
];
await mkdir('output/product-detail',{recursive:true});
for(const [engine,type]of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+readerURL+'?demo');await page.waitForFunction(()=>window.reader?.fontsCalibrated);
  assert.deepEqual(await page.evaluate(()=>({font:reader.profile.font,paper:reader.profile.paperStyle})),{font:'hand',paper:'ivory'});
  await page.evaluate(d=>{reader.openPreview(d);reader.toggleSidebar(true)},fixture);
  const query=page.getByRole('searchbox',{name:'搜索正文',exact:true});
  await query.fill(' 尾段定位关键词 ');await page.locator('.search-count').filter({hasText:'1 处匹配'}).waitFor();
  assert.equal(await page.locator('.search-match').innerText(),'尾段定位关键词');
  await query.dispatchEvent('keydown',{key:'Enter',isComposing:true});assert.equal(await page.evaluate(()=>reader.pageIndex),0);
  await query.press('Enter');
  await page.waitForFunction(()=>{const b=reader.d.notebook.chapters[0].pages[0].blocks[0];return reader.pageIndex===reader.indexForAnchor({pageId:reader.pages[0].id,blockId:'long',textOffset:b.text.indexOf('尾段定位关键词')})&&reader.pageIndex>0});
  await page.locator('.passage-located rect').first().waitFor();
  await page.evaluate(()=>reader.toggleSidebar(true));await query.fill('检索条目');await page.locator('.search-count').filter({hasText:'65 处匹配'}).waitFor();
  assert.equal(await page.locator('.sidebar-result').count(),40);await query.press('ArrowDown');assert.equal(await page.locator('.sidebar-result').first().evaluate(n=>n===document.activeElement),true);
  await page.keyboard.press('ArrowDown');assert.equal(await page.locator('.sidebar-result').nth(1).evaluate(n=>n===document.activeElement),true);
  await page.keyboard.press('Home');await page.keyboard.press('ArrowUp');assert.ok(await query.evaluate(n=>n===document.activeElement));
  await page.getByRole('button',{name:'下一组',exact:true}).click();assert.equal(await page.locator('.sidebar-result').count(),25);assert.equal(await page.getByRole('button',{name:'下一组',exact:true}).isDisabled(),true);
  await page.screenshot({path:`output/product-detail/${engine}-search.png`});
  await query.fill('远端代码目标');await query.press('Enter');
  await page.waitForFunction(()=>document.querySelector('.passage-located rect'));
  const visible=await page.evaluate(()=>{const paper=document.querySelector('.reader-stage .page-surface'),r=paper.querySelector('.passage-located rect').getBoundingClientRect(),code=paper.querySelector('[data-block=code]').getBoundingClientRect(),pre=paper.querySelector('pre').getBoundingClientRect();return {code:{top:code.top,bottom:code.bottom},r:{top:r.top,bottom:r.bottom,left:r.left,right:r.right},pre:{top:pre.top,bottom:pre.bottom,left:pre.left,right:pre.right},x:paper.querySelector('pre').scrollLeft};});
  assert.ok(visible.r.top>=visible.code.top-1&&visible.r.bottom<=visible.code.bottom+1,JSON.stringify(visible));
  assert.ok(visible.r.left>=visible.pre.left-1&&visible.r.right<=visible.pre.right+1,JSON.stringify(visible));assert.ok(visible.x>0);
  await page.evaluate(()=>reader.goPage(0,true));
  await page.locator('.paper-notes').first().dblclick({position:{x:40,y:100}});
  const note=page.getByRole('textbox',{name:'便条内容',exact:true});await page.waitForFunction(()=>document.activeElement?.matches('textarea[aria-label=便条内容]'));await note.fill(Array.from({length:18},(_,i)=>`第 ${i+1} 行便条内容`).join('\n'));
  await page.getByRole('button',{name:'阅读设置',exact:true}).focus();
  await page.getByRole('button',{name:'展开便条',exact:true}).click();
  await page.getByRole('button',{name:'阅读设置',exact:true}).focus();assert.equal(await page.locator('.workspace-note').getAttribute('data-collapsed'),'false');
  await page.getByRole('button',{name:'便条颜色：绿色',exact:true}).click();assert.equal(await page.locator('.workspace-note').getAttribute('data-material'),'sage');
  await page.getByRole('button',{name:'删除便条',exact:true}).click();assert.equal(await page.evaluate(()=>reader.d.userState.notes.length),0);
  await page.getByRole('button',{name:'撤销删除便条',exact:true}).click();assert.equal(await page.evaluate(()=>reader.d.userState.notes.length),1);assert.match(await note.inputValue(),/第 18 行/);
  await page.evaluate(()=>{const p=reader.d.notebook.chapters[0].pages[0],text=p.blocks[0].text;reader.editor.mark('underline',[{pageId:p.id,selector:{blockId:'long',start:0,end:4,exact:text.slice(0,4),prefix:'',suffix:''}}]);reader.editor.selected=reader.d.userState.annotations.map(a=>a.id);});
  const markCount=await page.evaluate(()=>reader.d.userState.annotations.length);
  await page.locator('body').dispatchEvent('keydown',{key:'Delete',isComposing:true});assert.equal(await page.evaluate(()=>reader.d.userState.annotations.length),markCount);
  await page.locator('body').dispatchEvent('keydown',{key:'Backspace',keyCode:229});assert.equal(await page.evaluate(()=>reader.d.userState.annotations.length),markCount);
  await page.evaluate(()=>{const field=document.createElement('div');field.contentEditable='true';document.body.append(field);field.dispatchEvent(new KeyboardEvent('keydown',{key:'Delete',bubbles:true}));field.remove();});assert.equal(await page.evaluate(()=>reader.d.userState.annotations.length),markCount);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>reader.lastWidth===innerWidth&&reader.lastHeight===innerHeight);
  await page.evaluate(()=>{reader.toggleSidebar(true)});await query.fill('尾段定位关键词');await page.locator('.search-count').filter({hasText:'1 处匹配'}).waitFor();
  assert.ok(await page.locator('.reader-sidebar').evaluate(n=>n.getBoundingClientRect().right<=innerWidth));await page.screenshot({path:`output/product-detail/${engine}-phone-search.png`});
  assert.deepEqual(errors,[]);await context.close();

  const savedContext=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await savedContext.addInitScript(()=>{const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');Object.defineProperty(IDBTransaction.prototype,'oncomplete',{configurable:true,get:descriptor.get,set(fn){descriptor.set.call(this,fn&&function(e){if(this.mode==='readonly')setTimeout(()=>fn.call(this,e),900);else fn.call(this,e)})}})});
  const saved=await savedContext.newPage();await saved.goto(base+readerURL);await saved.waitForFunction(()=>window.reader?.ready&&reader.fontsCalibrated);
  await saved.evaluate(async()=>{reader.d.userState.checks['stored-record']=true;reader.d.userState.updatedAt='2099-01-01T00:00:00Z';const db=await new Promise((r,j)=>{const q=indexedDB.open('paper-notebook-v1',1);q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});await new Promise((r,j)=>{const t=db.transaction('documents','readwrite');t.objectStore('documents').put(reader.d);t.oncomplete=r;t.onerror=()=>j(t.error)});db.close()});
  await saved.reload({waitUntil:'domcontentloaded'});await saved.locator('.reader-startup').waitFor();assert.equal(await saved.locator('.paper-notes').count(),0);
  await saved.waitForFunction(()=>window.reader?.ready&&reader.d.userState.checks['stored-record']&&reader.fontsCalibrated);
  await saved.locator('.paper-notes').first().dblclick({position:{x:40,y:100}});await saved.waitForFunction(()=>document.activeElement?.matches('textarea[aria-label=便条内容]'));await saved.getByRole('textbox',{name:'便条内容',exact:true}).last().fill('恢复完成后输入的便条');
  await saved.waitForTimeout(500);await saved.reload();await saved.waitForFunction(()=>window.reader?.ready&&reader.d.userState.notes.some(n=>n.text==='恢复完成后输入的便条'));
  assert.equal(await saved.evaluate(()=>reader.d.userState.checks['stored-record']),true);await savedContext.close();
  const unavailable=await browser.newContext();await unavailable.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get(){throw new DOMException('denied','SecurityError')}})});
  const denied=await unavailable.newPage();await denied.goto(base+readerURL);await denied.waitForFunction(()=>window.reader?.ready);assert.match(await denied.locator('#toast').innerText(),/本机草稿不可用/);await unavailable.close();
  console.log(`✓ ${engine}: exact search, scroll-to-code, capped results, keyboard/IME, note expansion/delete undo, delayed draft startup and storage denial`);
 }finally{await browser.close()}
}
