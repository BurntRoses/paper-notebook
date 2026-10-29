import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,mkdtemp,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const engines=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const temporary=await mkdtemp(join(tmpdir(),'paper-workspace-'));
await mkdir('output/workspace-check',{recursive:true});
const results=[];
const selectPassage=async page=>{
 await page.locator('.reader-stage [data-block="workspace-passage"] .ink-text').first().evaluate(span=>{
  const range=document.createRange();const walk=document.createTreeWalker(span,NodeFilter.SHOW_TEXT);let end,left=12;while(end=walk.nextNode()){if(left<=end.textContent.length)break;left-=end.textContent.length}range.setStart(span,0);range.setEnd(end,left);
  getSelection().removeAllRanges();getSelection().addRange(range);
 });
 await page.locator('.reader-selection-toolbar').waitFor({state:'visible'});
};
const promptData=async page=>JSON.parse((await page.getByLabel('续学提示预览').inputValue()).split('\n\n').slice(1).join('\n\n'));
for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{
  const context=await browser.newContext({offline:engine==='chromium',viewport:{width:1180,height:820},acceptDownloads:true});
  const page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url())});
  await page.route(/^https?:/,r=>r.abort());
  // Open an isolated file, without adjacent assets or a server.
  const original=join(temporary,engine+'-original.html');
  await copyFile(resolve('dist/downloads/machine-learning.html'),original);
  await page.goto(pathToFileURL(original).href);await page.waitForFunction(()=>!!window.reader);
  await page.getByRole('button',{name:'开始阅读',exact:true}).click();
  await page.locator('.reader-guide').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>window.reader.d.userState.preferences.fontSize),18,'opening preserves authored font preference');
  await page.evaluate(()=>document.fonts.ready);
  await page.reload();await page.waitForFunction(()=>!!window.reader);
  assert.equal(await page.locator('.reader-guide').count(),0,'guide does not repeat after completion');
  await page.evaluate(()=>{
   const r=window.reader;r.profile.motion='reduced';r.profile.font='sans';r.sidebarOpen=false;
   r.d.notebook.chapters.unshift({id:'workspace-check',title:'交互检查',pages:[{id:'workspace-page',title:'阅读与批注',layout:'reading',blocks:[{id:'workspace-passage',type:'prose',text:'选中的内容需要进一步解释。保留原文、上下文和稳定锚点。'.repeat(400)}]}]});
   r.invalidate();r.render();r.goPage(0);
  });
  const dimensions=()=>page.evaluate(()=>{const p=document.querySelector('.reader-stage .page-surface'),text=document.querySelector('.reader-stage .reader-content');return{font:getComputedStyle(text).fontSize,scale:p.getBoundingClientRect().width/p.offsetWidth,characters:text.textContent.length,pages:window.reader.pages.length}});
  const small=await dimensions();await page.setViewportSize({width:1920,height:1080});
  await page.waitForFunction(()=>document.querySelector('.reader-stage .page-surface')?.offsetHeight===1004);
  await page.evaluate(()=>window.reader.goPage(0));const large=await dimensions();
  assert.equal(small.font,large.font);assert.equal(large.font,'18px');assert.ok(Math.abs(small.scale-1)<.001);assert.ok(Math.abs(large.scale-1)<.001);
  assert.ok(large.characters>small.characters,'larger windows display more content');assert.ok(large.pages<small.pages);
  for(const shape of ['portrait','landscape'])for(const layout of ['single','spread']){
   await page.evaluate(({shape,layout})=>{const r=window.reader;r.profile.pageShape=shape;r.profile.layout=layout;r.render()},{shape,layout});
   assert.ok((await dimensions()).scale<=1.001);
  }
  await page.evaluate(()=>{const r=window.reader;r.profile.layout='single';r.profile.pageShape='auto';r.zoom=1.5;r.render()});
  assert.ok((await dimensions()).scale>1.45,'manual zoom remains available');
  await page.evaluate(()=>{const r=window.reader;r.zoom=1;r.render();r.setImmersive(true)});
  assert.equal((await dimensions()).font,'18px');assert.ok((await dimensions()).scale<=1.001);
  assert.ok(await page.locator('.reader-header').isVisible());
  await page.getByRole('button',{name:'目录',exact:true}).first().click();assert.ok(await page.locator('.reader-sidebar').isVisible());
  await page.getByRole('button',{name:'便签与记录',exact:true}).click();assert.ok(await page.locator('.reader-workspace-sidebar').isVisible());
  await page.getByRole('button',{name:'关闭工作台',exact:true}).click();
  await page.keyboard.press('Escape');await page.evaluate(()=>{window.reader.toggleSidebar(false);window.reader.goPage(0)});
  assert.equal(await page.locator('.continued-label,.reader-tool-toggle').count(),0);
  const bounds=await page.locator('.reader-stage [data-block="workspace-passage"] .ink-text').first().evaluate(span=>{const range=document.createRange();range.setStart(span.firstChild,0);range.setEnd(span.firstChild,8);return [...range.getClientRects()].map(r=>({x:r.x,y:r.y,width:r.width,height:r.height}))[0]});
  await page.mouse.move(bounds.x+1,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width-1,bounds.y+bounds.height/2,{steps:12});await page.mouse.up();
  await page.locator('.reader-selection-toolbar').waitFor({state:'visible'});
  assert.ok((await page.evaluate(()=>getSelection().toString())).length>=7);
  await page.getByRole('button',{name:'文字颜色：蓝色',exact:true}).click();
  assert.ok(await page.locator('.red-ink').count());assert.ok(await page.evaluate(()=>window.reader.d.userState.annotations.some(a=>a.color==='#285f9e')));
  await page.keyboard.press('ControlOrMeta+z');assert.equal(await page.locator('.red-ink').count(),0);
  await page.keyboard.press('ControlOrMeta+Shift+z');assert.ok(await page.locator('.red-ink').count());
  await selectPassage(page);await page.mouse.click(1918,2);assert.equal(await page.locator('.reader-selection-toolbar').count(),0);
  await page.evaluate(()=>getSelection().removeAllRanges());
  await page.locator('.reader-stage .page-surface').click({button:'right',position:{x:30,y:150}});
  await page.getByRole('menu',{name:'纸页菜单'}).waitFor();await page.mouse.click(1918,2);assert.equal(await page.getByRole('menu',{name:'纸页菜单'}).count(),0);
  for(const [key,index] of [['ArrowRight',1],['ArrowLeft',0],['Space',1],['Shift+Space',0],['Enter',1]]){
   await page.locator('.reader-stage').focus();await page.keyboard.press(key);assert.equal(await page.evaluate(()=>window.reader.pageIndex),index);
  }
  await page.evaluate(()=>window.reader.goPage(0));await selectPassage(page);
  const toolbar=await page.locator('.reader-selection-toolbar').boundingBox();
  assert.ok(toolbar.x>=0&&toolbar.x+toolbar.width<=1920&&toolbar.y>=0&&toolbar.y+toolbar.height<=1080);
  await page.getByRole('button',{name:'圈注',exact:true}).click();assert.ok(await page.locator('[data-origin=reader][data-kind=circle]').count());
  await selectPassage(page);
  await page.getByRole('button',{name:'添加便签',exact:true}).click();
  assert.equal(await page.locator('dialog[open]').count(),0);
  await page.getByLabel('便签标题',{exact:true}).fill('关联批注');await page.getByLabel('便签内容',{exact:true}).fill('这里需要补充一个例子。');
  const index=await page.evaluate(()=>window.reader.pageIndex);await page.getByLabel('便签内容',{exact:true}).press('Enter');assert.equal(await page.evaluate(()=>window.reader.pageIndex),index);
  assert.equal(await page.locator('.workspace-note').count(),1);
  await page.getByRole('button',{name:'新建独立便签',exact:true}).click();await page.getByLabel('便签标题',{exact:true}).last().fill('独立思考');await page.getByLabel('便签内容',{exact:true}).last().fill('复习前先回顾定义。');
  const notes=await page.evaluate(()=>JSON.parse(JSON.stringify(window.reader.d.userState.notes)));
  assert.ok(notes[0].attached&&notes[0].selector&&notes[0].anchors.length);assert.ok(!notes[1].attached&&!notes[1].selector);
  await page.getByRole('button',{name:'关闭工作台',exact:true}).click();
  await selectPassage(page);await page.getByRole('button',{name:'加入书签',exact:true}).click();assert.equal(await page.locator('.text-bookmark-ink').count(),1);
  await page.getByRole('button',{name:'便签与记录',exact:true}).click();await page.getByRole('button',{name:'为当前页加书签',exact:true}).click();assert.equal(await page.locator('.page-bookmark-ink').count(),1);
  await page.getByRole('button',{name:'目录',exact:true}).first().click();assert.ok(await page.locator('.index-bookmark').count());
  await page.getByRole('button',{name:'关闭工作台',exact:true}).click();
  await selectPassage(page);await page.getByRole('button',{name:'展开讲解',exact:true}).click();await page.getByRole('button',{name:'保存到续学清单',exact:true}).click();
  await page.evaluate(()=>{const r=window.reader,paper=document.querySelector('.reader-stage .page-surface');r.d.userState.annotations.push({id:'workspace-ink',pageId:'workspace-page',sheet:0,kind:'freehand',selectors:[],points:[[.2,.3,.5],[.3,.35,.5]],coordinateSpace:'normalized-page',sourceSize:{width:paper.offsetWidth,height:paper.offsetHeight},color:'#345d76',width:2,seed:1});r.remember()});
  await page.getByRole('button',{name:'导出续学提示',exact:true}).last().click();
  const included=await promptData(page);assert.equal(included.notes.length,2);assert.equal(included.bookmarks.length,2);assert.equal(included.doubtLinks.length,1);assert.equal(included.notes[0].anchor.status,'resolved');
  assert.equal(included.doubtLinks[0].context.status,'resolved');assert.match(included.doubtLinks[0].context.context,/选中的内容/);
  assert.ok(included.annotations.some(a=>a.kind==='circle'));assert.ok(included.annotations.every(a=>a.kind!=='freehand'));
  await page.getByLabel('附带自由笔迹',{exact:true}).check();assert.ok((await promptData(page)).annotations.some(a=>a.kind==='freehand'));assert.match((await promptData(page)).inkNotice,/坐标/);
  await page.getByLabel('附带阅读标记',{exact:true}).uncheck();assert.ok((await promptData(page)).annotations.every(a=>a.kind==='freehand'));await page.getByLabel('附带阅读标记',{exact:true}).check();
  await page.getByLabel('附带便签',{exact:true}).uncheck();await page.getByLabel('附带书签',{exact:true}).uncheck();
  assert.deepEqual((await promptData(page)).notes,[]);assert.deepEqual((await promptData(page)).bookmarks,[]);
  await page.getByLabel('附带便签',{exact:true}).check();await page.getByLabel('附带书签',{exact:true}).check();
  const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'下载所选记录 HTML',exact:true}).click();
  const downloaded=await waiting,saved=join(temporary,engine+'-saved.html');await downloaded.saveAs(saved);
  const source=await page.evaluate(()=>structuredClone(window.reader.d.notebook));
  await page.goto(pathToFileURL(saved).href+'?demo');await page.waitForFunction(()=>!!window.reader);
  assert.deepEqual(await page.evaluate(()=>window.reader.d.notebook),source);
  assert.deepEqual(await page.evaluate(()=>window.reader.d.userState.notes),notes);
  assert.equal(await page.evaluate(()=>window.reader.d.userState.bookmarks.length),2);
  assert.equal(await page.evaluate(()=>window.reader.d.userState.doubts.length),1);
  assert.ok(await page.evaluate(()=>window.reader.d.userState.annotations.some(a=>a.id==='workspace-ink')));
  if(!await page.locator('.reader-workspace-sidebar').count())await page.getByRole('button',{name:'便签与记录',exact:true}).click();
  await page.locator('.workspace-bookmark .workspace-quote').first().click();assert.equal(await page.locator('.text-bookmark-ink').count(),1);
  await page.locator('.passage-located rect').first().waitFor();assert.ok(await page.locator('.passage-located rect').first().evaluate(n=>n.getBBox().width<300),'source navigation highlights only the short quote');
  const remove=await page.getByRole('button',{name:'移除书签',exact:true}).first().boundingBox();assert.ok(remove.width>=44&&remove.height>=44);
  await page.screenshot({path:`output/workspace-check/${engine}-desktop.png`});
  await page.getByRole('button',{name:'关闭工作台',exact:true}).click();await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.querySelector('.reader-stage .page-surface')?.offsetWidth===792);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await selectPassage(page);const mobile=await page.locator('.reader-selection-toolbar').boundingBox();assert.ok(mobile.x>=0&&mobile.x+mobile.width<=391&&mobile.y>=0&&mobile.y+mobile.height<=845);
  await page.screenshot({path:`output/workspace-check/${engine}-phone.png`});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  results.push({engine,smallWindow:small,maximized:large,guide:true,keyboard:true,selectionToolbar:true,realMouseSelectionAndTextColor:true,contextMenu:true,immersiveSidebars:true,inlineLinkedAndFreeNotes:true,pageAndTextBookmarks:true,followupChoices:true,offlineSaveAndReopen:true,mobileToolbar:true,externalRequests:external,errors});
  await context.close();
 }finally{await browser.close();}
}
await writeFile('docs/verification/workspace-report.json',JSON.stringify({date:new Date().toISOString(),results,scope:'Chromium and WebKit, isolated file HTML, blocked network, desktop window sizes and emulated phone; physical touch devices not exercised.'},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
