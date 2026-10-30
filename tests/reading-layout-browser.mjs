import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=resolve('output/reading-layout');await mkdir(out,{recursive:true});const saved=await mkdtemp(join(tmpdir(),'notebook-margins-'));
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5189',reports=[];
const choose=async(page,name)=>{let b=page.getByRole('button',{name,exact:true});if(!await b.isVisible())await page.getByRole('button',{name:name.startsWith('文字颜色：')?'文字颜色':'更多编辑工具',exact:true}).click();await b.click();};
const select=async page=>{await page.locator('.reader-stage [data-block=layout-text] .ink-text').first().evaluate(span=>{const walk=document.createTreeWalker(span,NodeFilter.SHOW_TEXT);let n;while((n=walk.nextNode())&&!n.length){}const r=document.createRange();r.setStart(n,0);r.setEnd(n,Math.min(n.length,8));getSelection().removeAllRanges();getSelection().addRange(r)});await page.locator('.reader-selection-toolbar').waitFor();};
const blankNote=async(page,region,percent=.75)=>{const zone=page.locator(`.reader-stage [data-note-region=${region}]`);await zone.evaluate(n=>n.scrollTop=0);const r=await zone.boundingBox();await page.mouse.dblclick(r.x+r.width*.6,r.y+r.height*percent);await page.locator(`[data-note-region=${region}] .workspace-note textarea`).last().waitFor();};
const cueLayout=page=>page.locator('.reader-stage > .reader-page-wrap .page-surface').evaluateAll(papers=>papers.flatMap(paper=>{
 const textOf=b=>b.type==='comparison'?[...(b.columns||[]),...(b.rows||[]).flat()].join('\n'):[b.text||b.question||b.prompt||b.latex||'',...(b.items||b.steps||[]).map(i=>i.text),b.result||'',...(b.parameters||[]).map(p=>p.name+'：'+p.description)].filter(Boolean).join('\n');
 const source=reader.d.notebook.chapters.flatMap(c=>c.pages).find(p=>p.id===paper.dataset.page),zone=paper.querySelector('.paper-notes'),scale=paper.getBoundingClientRect().height/paper.offsetHeight;
 return [...paper.querySelectorAll('.cornell-cue')].map(cue=>{
  const block=paper.querySelector(`.reader-content [data-block="${cue.dataset.cueBlock}"]`),b=source.blocks.find(b=>b.id===cue.dataset.cueBlock);let target=block?.getBoundingClientRect();
  if(cue.dataset.cueAnchor){const start=textOf(b).indexOf(cue.dataset.cueAnchor);target=undefined;
   for(const span of block?.querySelectorAll('.ink-text')||[]){const offset=Number(span.dataset.offset||0),index=start-offset;if(index<0||index>=span.textContent.length)continue;const walk=document.createTreeWalker(span,NodeFilter.SHOW_TEXT);let n,at=0;while(n=walk.nextNode()){if(at+n.length>index){const range=document.createRange();range.setStart(n,index-at);range.setEnd(n,Math.min(n.length,index-at+1));target=range.getBoundingClientRect();break;}at+=n.length;}if(target)break;}
  }
  return {id:cue.dataset.cueId,hasTarget:!!target,delta:target?(cue.getBoundingClientRect().top-target.top)/scale:null,source:cue.dataset.cueBlock,scroll:zone.scrollHeight-zone.clientHeight};
 });
}));
const checkEditorialLayout=async page=>{
 const expected=await page.evaluate(()=>reader.d.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.cues||[]).map(c=>c.id)),seen=[];
 await page.evaluate(()=>{reader.profile.layout='single';reader.profile.pageShape='auto';reader.render()});const count=await page.evaluate(()=>reader.pages.length);
 for(let i=0;i<count;i++){await page.evaluate(i=>reader.goPage(i),i);const cues=await cueLayout(page);for(const cue of cues){assert.ok(cue.hasTarget&&Math.abs(cue.delta)<3,JSON.stringify(cue));seen.push(cue.id);}const frames=await page.locator('.reader-stage .sketch-frame').evaluateAll(ns=>ns.map(n=>{const a=n.getBoundingClientRect(),b=n.parentElement.getBoundingClientRect();return{left:a.left-b.left,top:a.top-b.top,width:a.width-b.width,height:a.height-b.height}}));assert.ok(frames.every(f=>Object.values(f).every(v=>Math.abs(v)<2)),JSON.stringify(frames));}
 assert.deepEqual(seen.sort(),expected.sort(),'every cue appears once beside its source');
 for(const [width,height,layout]of [[1180,700,'single'],[1440,1000,'spread'],[820,1180,'spread'],[390,844,'single']]){
  await page.setViewportSize({width,height});await page.waitForTimeout(190);await page.evaluate(layout=>{reader.profile.layout=layout;reader.profile.pageShape='auto';reader.render();reader.goPage(reader.pages.findIndex(p=>p.blocks.some(b=>b.parameters?.some(p=>p.symbol==='w')&&b.id==='ml-linear')))},layout);
  for(const cue of await cueLayout(page))assert.ok(cue.hasTarget&&cue.delta>=-2,JSON.stringify({width,height,...cue}));
 }
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(190);await page.evaluate(()=>{reader.profile.layout='single';reader.profile.pageShape='auto';reader.render();reader.goPage(reader.pages.findIndex(p=>p.blocks.some(b=>b.id==='ml-loss-outliers')))});
 const note=page.locator('.reader-stage [data-block=ml-loss-outliers]');await note.waitFor();assert.equal(await note.locator('.callout-label,.role-label').count(),0);assert.ok(await note.locator('.block-title').isVisible());
 assert.ok(await page.locator('.reader-stage [data-block=ml-mse]').count(),'the formula and its first explanations should use the space after the definition and note');
 const hierarchy=await note.evaluate(n=>({size:parseFloat(getComputedStyle(n).fontSize),bodySize:parseFloat(getComputedStyle(n.closest('.reader-content')).fontSize),sketch:n.dataset.sketch,pencilPaths:n.querySelectorAll(':scope > .sketch-frame path').length}));assert.ok(hierarchy.size<hierarchy.bodySize&&hierarchy.sketch==='panel'&&hierarchy.pencilPaths>1,JSON.stringify(hierarchy));
 await page.screenshot({path:join(out,'callout-hierarchy.png')});
 const cue=page.locator('.reader-stage [data-cue-block=ml-loss-outliers]');await cue.click();await page.locator('.passage-located').waitFor();assert.ok(await page.locator('.reader-stage [data-block=ml-loss-outliers]').isVisible());
 await page.evaluate(()=>reader.goPage(reader.pages.findIndex(p=>p.blocks.some(b=>b.id==='ml-learning'))));assert.equal(await page.locator('.reader-stage [data-block=ml-learning] > p').count(),2);
 const paragraph=await page.locator('.reader-stage [data-block=ml-learning] > p').last().locator('.ink-text').getAttribute('data-offset');assert.ok(Number(paragraph)>0);
 return {cues:seen.length,exactSourceAlignment:true,formulaContinuation:true,paragraphs:true,calloutHierarchy:hierarchy};
};
for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true});const errors=[],external=[];
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,route=>{external.push(route.request().url());route.abort();});
 await page.goto(pathToFileURL(resolve('dist/downloads/machine-learning.html')).href+'?demo');await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>{reader.profile.motion='reduced';reader.showVisualPage()});
 assert.ok(await page.locator('.reader-stage .figure-annotations [data-figure-mark=text]').count());
 const original=await page.evaluate(()=>JSON.stringify(reader.d.notebook));
 await page.getByRole('button',{name:'放大与批注图像',exact:true}).first().click();
 const canvas=page.locator('.figure-editor-canvas'),box=await canvas.boundingBox();
 const drag=async(x1,y1,x2,y2)=>{await page.mouse.move(box.x+box.width*x1,box.y+box.height*y1);await page.mouse.down();await page.mouse.move(box.x+box.width*x2,box.y+box.height*y2,{steps:12});await page.mouse.up();};
 await page.getByRole('button',{name:'图像工具：圈注',exact:true}).click();await drag(.3,.3,.42,.46);
 await page.getByRole('button',{name:'图像工具：箭头',exact:true}).click();await drag(.6,.5,.44,.4);
 await page.getByRole('button',{name:'图像工具：文字',exact:true}).click();await page.getByLabel('图像文字说明',{exact:true}).fill('观察这里');await page.mouse.click(box.x+box.width*.52,box.y+box.height*.64);
 assert.equal(await page.evaluate(()=>reader.d.userState.figureMarks.length),3);assert.equal(await page.evaluate(()=>JSON.stringify(reader.d.notebook)),original);
 await page.screenshot({path:join(out,engine+'-image-annotations.png')});await page.getByRole('button',{name:'完成',exact:true}).click();assert.ok(await page.locator('.reader-stage .figure-annotations [data-figure-mark=circle]').count());
 const editorial=await checkEditorialLayout(page);await page.screenshot({path:join(out,engine+'-aligned-cues.png')});
 await page.evaluate(()=>{const r=reader;r.rightSidebarOpen=true;r.profile.bottomNotes=true;r.d.notebook.chapters.unshift({id:'layout-chapter',title:'纸边批注检查',pages:[{id:'layout-page',title:'在右栏和底栏写下思考',layout:'cornell',summary:'这一部分只出现一次的总结。',cues:[{id:'layout-cue',text:'第一段的条件？',blockId:'layout-text'},{id:'layout-general',text:'第二个回忆线索'}],blocks:[{id:'layout-text',type:'prose',text:'关键概念与实际条件需要同时说明。原文锚点跟随纸页重排。'.repeat(200),study:{marks:[{text:'关键概念',kind:'bold'},{text:'关键概念',kind:'red',color:'#285f9e'}]}}]}]});r.invalidate();r.render();r.goPage(0)});
 const source=await page.evaluate(()=>JSON.stringify(reader.d.notebook));
 assert.equal(await page.locator('.reader-stage .cornell-cues,.workspace-tabs').count(),0);assert.equal(await page.locator('.reader-stage .paper-notes .margin-preset').count(),2);assert.equal(await page.locator('.reader-stage .paper-bottom .margin-preset').count(),0);
 const paper=await page.locator('.page-surface').boundingBox(),content=await page.locator('.reader-content').boundingBox(),right=await page.locator('.paper-notes').boundingBox();assert.ok(content.x<right.x&&right.x+right.width<=paper.x+paper.width);
 await blankNote(page,'right',.14);let field=page.locator('[data-note-region=right] textarea').last();await field.fill('边读边想：适用条件是什么？\n'.repeat(30));await page.getByRole('button',{name:'便条颜色：黄色',exact:true}).click();assert.equal(await page.locator('.workspace-note').first().getAttribute('data-material'),'butter');
 await page.getByRole('button',{name:'便条颜色：透明',exact:true}).click();assert.equal(await page.locator('.workspace-note').first().getAttribute('data-material'),'transparent');
 await page.mouse.click(3,64);assert.equal(await page.locator('.workspace-note').first().getAttribute('data-collapsed'),'true');await page.getByRole('button',{name:'展开便条',exact:true}).click();assert.equal(await page.locator('.workspace-note').first().getAttribute('data-collapsed'),'false');await page.getByRole('button',{name:'收起便条',exact:true}).click();
 const flow=await page.locator('.paper-notes .margin-stream').evaluate(n=>[...n.children].map(x=>({top:x.offsetTop,bottom:x.offsetTop+x.offsetHeight})));assert.ok(flow.every((x,i)=>i===0||x.top>=flow[i-1].bottom),'notes and presets must never overlap');
 await blankNote(page,'bottom',.5);await page.locator('[data-note-region=bottom] textarea').fill('底部的个人概括。');await page.locator('[data-note-region=bottom] textarea').press('Enter');assert.equal(await page.evaluate(()=>reader.pageIndex),0);
 await page.screenshot({path:join(out,engine+'-simple-margins.png')});
 await page.evaluate(()=>reader.goPage(1));assert.equal(await page.locator('.page-surface h1').count(),0);assert.equal(await page.locator('.margin-preset').count(),0);assert.equal(await page.locator('.workspace-note').count(),0);
 await page.evaluate(()=>reader.goPage(reader.pages.findLastIndex(p=>p.id==='layout-page')));assert.equal(await page.locator('.paper-bottom .margin-preset').innerText(),'这一部分只出现一次的总结。');
 await page.evaluate(()=>reader.goPage(0));await select(page);await choose(page,'加粗');assert.ok(await page.locator('.reader-selection-toolbar').isVisible());await choose(page,'文字颜色：紫色');assert.ok(await page.locator('.reader-selection-toolbar').isVisible());await choose(page,'加入书签');
 await page.mouse.click(3,64);await select(page);await choose(page,'提出疑问');await page.getByRole('button',{name:'保存到续学清单',exact:true}).click();
 await page.locator('dialog').waitFor({state:'detached'});await page.getByRole('button',{name:'书签与疑问',exact:true}).click();assert.equal(await page.locator('.reader-collection .workspace-bookmark').count(),1);assert.equal(await page.locator('.reader-collection .workspace-question').count(),1);await page.getByRole('button',{name:'完成',exact:true}).click();
 await page.getByLabel('显示批注栏',{exact:true}).click();await page.getByLabel('底栏',{exact:true}).uncheck();assert.equal(await page.locator('.paper-bottom').count(),0);
 await page.getByLabel('显示批注栏',{exact:true}).click();await page.getByLabel('右侧栏',{exact:true}).uncheck();assert.equal(await page.locator('.paper-notes').count(),0);
 await page.getByLabel('显示批注栏',{exact:true}).click();await page.getByLabel('底栏',{exact:true}).check();await page.getByLabel('显示批注栏',{exact:true}).click();await page.getByLabel('右侧栏',{exact:true}).check();assert.equal(await page.locator('.workspace-note').count(),2);
 await page.getByRole('button',{name:'切换横竖版',exact:true}).click();assert.equal(await page.evaluate(()=>reader.shape),'portrait');await page.getByRole('button',{name:'双页阅读',exact:true}).click();assert.equal(await page.locator('.reader-stage .page-surface').count(),2);
 await page.setViewportSize({width:820,height:1180});await page.waitForFunction(()=>document.querySelector('.reader-app-root').dataset.spreadAxis==='vertical');const pair=await page.locator('.reader-stage .page-surface').all();const top=await pair[0].boundingBox(),bottom=await pair[1].boundingBox();assert.ok(bottom.y>=top.y+top.height-1);
 await page.evaluate(()=>{reader.profile.layout='single';reader.profile.pageShape='auto';reader.render();reader.goPage(0)});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>reader.sheetSize.width===792);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:join(out,engine+'-phone.png')});await page.evaluate(()=>reader.showExport());const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载离线 HTML',exact:true}).click();const file=join(saved,engine+'.html');await (await download).saveAs(file);
 await page.goto(pathToFileURL(file).href);await page.waitForFunction(()=>!!window.reader);await page.locator('.reader-guide').waitFor();assert.ok(await page.getByRole('button',{name:'操作教程',exact:true}).isVisible());await page.getByRole('button',{name:'开始阅读',exact:true}).click();
 assert.equal(await page.evaluate(()=>JSON.stringify(reader.d.notebook)),source);assert.equal(await page.evaluate(()=>reader.d.userState.notes.length),2);assert.equal(await page.evaluate(()=>reader.d.userState.figureMarks.length),3);
 await page.evaluate(()=>reader.startTour());await page.locator('.reader-tour').waitFor();assert.ok(await page.locator('.reader-stage .lesson-figure').count());await page.getByRole('button',{name:'下一步',exact:true}).click();assert.ok(await page.locator('.paper-notes.tour-target').count());await page.getByRole('button',{name:'结束教程',exact:true}).click();
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 await page.unroute(/^https?:/);if(engine==='chromium'){
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/');await page.locator('#read').scrollIntoViewIfNeeded();const frame=page.frameLocator('.reader-preview');await frame.locator('.reader-stage .block-image').waitFor();await page.getByRole('button',{name:'操作教程',exact:true}).click();await frame.locator('.reader-tour').waitFor();await page.screenshot({path:join(out,'homepage-interactive-tutorial.png')});await frame.getByRole('button',{name:'结束教程',exact:true}).click();
 }
 reports.push({engine,editorial,simpleRightAndBottomMargins:true,cuesMovedRight:true,noRepeatedFooters:true,notesFlowAndCollapse:true,transparentColorDots:true,collection:true,independentMarginToggles:true,imageAnnotations:true,persistentSelectionToolbar:true,spreads:true,mobileFits:true,offlineGuideAndRecords:true,interactiveTutorial:true,externalRequests:external,errors});
 }finally{await browser.close();}
}
await writeFile(join(out,'report.json'),JSON.stringify(reports,null,2)+'\n');console.log(JSON.stringify(reports,null,2));
