import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5178/paper-notebook-kit/dist';
const browser=await chromium.launch({headless:true}),checks=[],errors=[],temp=await mkdtemp(join(tmpdir(),'paper-experience-'));
await mkdir('output/pdf',{recursive:true});await mkdir('docs/verification',{recursive:true});await mkdir('docs/screenshots',{recursive:true});
const check=name=>{checks.push(name);console.log('✓ '+name)};
const fileAction=async(page,name)=>{await page.locator('.reader-files summary').click();await page.locator('.reader-file-menu').getByRole('button',{name,exact:true}).click()};
const open=async(page,name)=>{await page.goto(base+'/downloads/'+name+'.html?demo');await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>document.fonts.ready)};
// DOM bounds alone miss SVG glyphs painted at the wrong scale. Compare actual
// pixels with/without labels and require every changed pixel to match a label.
const checkFigurePainting=async page=>{
 const boxes=await page.locator('.reader-stage .diagram text,.reader-stage .notebook-chart text').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x-4,y:r.y-4,right:r.right+4,bottom:r.bottom+4}}));assert.ok(boxes.length);
 const visible=await page.screenshot({animations:'disabled'});
 const style=await page.addStyleTag({content:'.reader-stage .diagram text,.reader-stage .notebook-chart text{visibility:hidden!important}'});
 let hidden;try{hidden=await page.screenshot({animations:'disabled'})}finally{await style.evaluate(n=>n.remove())}
 const diff=await page.evaluate(async({visible,hidden,boxes})=>{
  const pixels=async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const c=canvas.getContext('2d');c.drawImage(img,0,0);return {data:c.getImageData(0,0,img.width,img.height).data,width:img.width}};
  const a=await pixels(visible),b=await pixels(hidden);let changed=0,outside=0;
  for(let i=0;i<a.data.length;i+=4){if(Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2])<24)continue;changed++;const x=(i/4)%a.width,y=Math.floor(i/4/a.width);if(!boxes.some(r=>x>=r.x&&x<=r.right&&y>=r.y&&y<=r.bottom))outside++;}
  return {changed,outside};
 },{visible:visible.toString('base64'),hidden:hidden.toString('base64'),boxes});
 assert.ok(diff.changed>20,'Figure labels must be visible');assert.equal(diff.outside,0,'Painted SVG labels must stay at their measured positions');
};
// Composite translucent backgrounds, then measure the actual foreground against the visible surface.
const contrast=()=>{
 const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number),lum=c=>{const v=c.slice(0,3).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return v[0]*.2126+v[1]*.7152+v[2]*.0722};
 const issues=[];
 for(const n of document.querySelectorAll('.reader-app-root *,dialog[open] *,.paper-choice-list:popover-open *')){
  if(![...n.childNodes].some(t=>t.nodeType===3&&t.textContent.trim())||!n.checkVisibility()||n.closest('svg,[disabled],.page-transition'))continue;
  const c=getComputedStyle(n);let bg=[255,255,255],chain=[],p=n;
  while(p){chain.push(p);p=p.parentElement}
  for(const item of chain.reverse()){const css=getComputedStyle(item),v=rgb(css.backgroundColor),a=v[3]??1;if(v.length>=3)bg=v.slice(0,3).map((x,i)=>x*a+bg[i]*(1-a));if(item.matches('[data-visual=blackboard]'))bg=[41,72,63];}
  const fg=rgb(c.color),a=lum(fg),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  if(ratio<4.5)issues.push({class:n.className,text:n.textContent.slice(0,36),ratio:+ratio.toFixed(2),color:c.color,bg});
 }
 return issues;
};
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await open(page,'paper-notebook');
 await page.evaluate(()=>{const r=window.reader;r.profile.theme='paper-night';r.profile.motion='reduced';r.sidebarOpen=true;r.render()});
 const dims=await page.locator('.reader-control,.reader-files summary').evaluateAll(ns=>ns.filter(n=>n.checkVisibility()).map(n=>{const r=n.getBoundingClientRect(),s=n.querySelector('svg').getBoundingClientRect();return {w:r.width,h:r.height,y:r.y,sw:s.width,sh:s.height,cy:s.y+s.height/2}}));
 assert.ok(dims.length>=5);for(const d of dims){assert.equal(d.w,44);assert.equal(d.h,44);assert.equal(d.sw,20);assert.equal(d.sh,20);assert.ok(Math.abs(d.cy-dims[0].cy)<.2)}
 const darkIssues=[];for(let i=0;i<await page.evaluate(()=>window.reader.pages.length);i++){await page.evaluate(i=>window.reader.goPage(i),i);darkIssues.push(...await page.evaluate(contrast))}
 assert.deepEqual([...new Map(darkIssues.map(n=>[n.class,n])).values()],[]);
 await page.evaluate(()=>window.reader.goPage(0));await page.screenshot({path:'docs/screenshots/paper-night.png',fullPage:true});
 await page.locator('.reader-brand').click();assert.equal(await page.locator('.project-links a').count(),4);assert.ok((await page.locator('.project-links').innerText()).includes('Star'));assert.deepEqual(await page.evaluate(contrast),[]);await page.getByRole('button',{name:'继续阅读',exact:true}).click();assert.equal(await page.locator('.reader-brand').evaluate(n=>n===document.activeElement),true);assert.equal(await page.evaluate(()=>window.reader.pageIndex),0);
 await fileAction(page,'下载');assert.equal(await page.locator('.export-advanced[open]').count(),0);assert.deepEqual(await page.evaluate(contrast),[]);await page.screenshot({path:'docs/screenshots/paper-night-download.png'});await page.getByRole('button',{name:'关闭 / Close',exact:true}).click();
 await fileAction(page,'导出 PDF');assert.deepEqual(await page.evaluate(contrast),[]);await page.screenshot({path:'docs/screenshots/paper-night-pdf.png'});await page.getByRole('button',{name:'返回阅读',exact:true}).click();
 await page.getByRole('button',{name:'阅读设置',exact:true}).click();await page.getByRole('combobox',{name:'正文字体',exact:true}).click();assert.deepEqual(await page.evaluate(contrast),[]);await page.keyboard.press('Escape');await page.getByRole('button',{name:'完成',exact:true}).click();
 check('night paper, sidebar, all lesson components, dialogs and font menu reach 4.5:1; header SVGs align; logo restores focus');

 // A new personal note, answer and anchored mark must survive two offline saves.
 await page.evaluate(()=>{const r=window.reader,p=r.d.notebook.chapters[0].pages[0],b=p.blocks.find(b=>b.text);r.d.userState.notes.push({id:'qa-note',pageId:p.id,title:'复习记录',text:'新笔记：𠮷、龘，Unicode Ω ∂ 😀',back:'明天复习',material:'sage',seed:12,x:20,y:20,z:1,face:'front',attached:false,collapsed:false,surface:'desk'});r.editor.mark('underline',[{pageId:p.id,selector:{blockId:b.id,start:0,end:4,exact:b.text.slice(0,4),prefix:'',suffix:b.text.slice(4,20)}}]);r.d.userState.answers['intro-templates']={selected:['intro-answer-c'],submitted:true};r.remember()});
 const record=await page.evaluate(()=>structuredClone(window.reader.d.userState)),downloads=[];page.on('download',d=>downloads.push(d.suggestedFilename()));await fileAction(page,'下载');let wait=page.waitForEvent('download');await page.getByRole('button',{name:'下载离线 HTML',exact:true}).click();let dl=await wait;assert.match(dl.suggestedFilename(),/-v\d+\.html$/);const offlinePath=join(temp,'personal.html');await dl.saveAs(offlinePath);assert.equal(downloads.length,1);
 const offContext=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:1280,height:900}}),off=await offContext.newPage(),requests=[];off.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});off.on('pageerror',e=>errors.push(e.message));await off.goto(pathToFileURL(offlinePath).href+'?demo');await off.waitForFunction(()=>!!window.reader);assert.deepEqual(await off.evaluate(()=>window.reader.d.userState.notes),record.notes);assert.deepEqual(await off.evaluate(()=>window.reader.d.userState.annotations),record.annotations);assert.deepEqual(await off.evaluate(()=>window.reader.d.userState.answers),record.answers);await fileAction(off,'下载');wait=off.waitForEvent('download');await off.getByRole('button',{name:'下载离线 HTML',exact:true}).click();dl=await wait;const saved=await readFile(await dl.path(),'utf8');assert.ok(saved.includes('qa-note'));assert.deepEqual(requests,[]);await offContext.close();check('one versioned HTML download embeds notes, marks and answers and can be saved again with networking disabled');

 await open(page,'machine-learning');await page.evaluate(()=>{const r=window.reader;r.profile.theme='paper-night';r.profile.motion='reduced';r.render()});
 for(let i=0;i<await page.evaluate(()=>window.reader.pages.length);i++){
  await page.evaluate(i=>window.reader.goPage(i),i);
  assert.deepEqual(await page.evaluate(contrast),[]);
  for(const board of await page.locator('.page-surface [data-visual=blackboard]').all()){
   assert.equal(await board.getAttribute('data-frame'),'plain');
   assert.ok(await board.evaluate(n=>getComputedStyle(n).backgroundImage.includes('rgb(40, 68, 61)')),'The chalk background must remain opaque beneath light formulas');
  }
 }
 for(const [width,height,font] of [[1440,1000,'hand'],[1180,820,'serif'],[820,1180,'sans'],[390,844,'hand']]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  for(const theme of ['paper-light','paper-night']){
   await page.evaluate(({theme,font})=>{const r=window.reader;r.profile.theme=theme;r.profile.font=font;r.zoom=1;r.render();r.goPage(0)},{theme,font});await page.evaluate(()=>document.fonts.ready);
   await checkFigurePainting(page);
   await page.evaluate(()=>{const r=window.reader;r.goPage(r.pages.findIndex(p=>p.blocks.some(b=>b.id==='ml-fit-chart')))});await checkFigurePainting(page);
  }
 }
 await page.evaluate(()=>{const r=window.reader;r.zoom=1.5;r.fitPages()});await checkFigurePainting(page);
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(250);await page.evaluate(()=>{const r=window.reader;r.profile.font='hand';r.render()});
 check('actual SVG label pixels stay aligned with nodes and chart axes in both themes, four viewport sizes, font changes and reading zoom');
 await page.evaluate(()=>{const r=window.reader;r.zoom=1.5;r.goPage(3)});const before=await page.evaluate(()=>({index:window.reader.pageIndex,zoom:window.reader.zoom,profile:JSON.stringify(window.reader.profile)}));
 for(const orientation of ['portrait','landscape']){
  const info=await page.evaluate(async orientation=>{const r=window.reader;await r.preparePDF({orientation,includeRecords:true});return {pages:document.querySelector('#print-root').children.length,missing:r.d.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks).filter(b=>!document.querySelector('#print-root [data-block="'+b.id+'"]')).map(b=>b.id),width:document.querySelector('#print-root .print-sheet').offsetWidth,height:document.querySelector('#print-root .print-sheet').offsetHeight,font:getComputedStyle(document.querySelector('#print-root .reader-content')).fontSize,overflows:[...document.querySelectorAll('#print-root .print-sheet')].flatMap(p=>{const body=p.querySelector('.reader-page-body').getBoundingClientRect();return [...p.querySelector('.reader-content').children].filter(n=>n.getBoundingClientRect().bottom>body.bottom+2).map(n=>n.dataset.block)})}},orientation);
  assert.deepEqual(info.missing,[]);assert.deepEqual(info.overflows,[]);assert.equal(info.font,'16px');assert.ok(Math.abs(info.width-(orientation==='portrait'?794:1123))<=1);assert.ok(Math.abs(info.height-(orientation==='portrait'?1123:794))<=1);
  const chartGaps=await page.locator('#print-root .notebook-chart').evaluateAll(charts=>charts.map(chart=>{const axis=chart.querySelector('.chart-axis-label').getBBox(),legends=[...chart.querySelectorAll('.chart-legend')].map(n=>n.getBBox());return Math.min(...legends.map(r=>r.y))-axis.y-axis.height}));
  assert.ok(chartGaps.every(gap=>gap>=10),'Chart legends must stay clear of the horizontal axis title');
  await page.emulateMedia({media:'print'});await page.pdf({path:`output/pdf/machine-learning-A4-${orientation}.pdf`,preferCSSPageSize:true,printBackground:true});await page.emulateMedia({media:'screen'});
  await page.waitForFunction(()=>!window.reader.printState);assert.equal(await page.locator('#print-root').count(),0);
  assert.deepEqual(await page.evaluate(()=>({index:window.reader.pageIndex,zoom:window.reader.zoom,profile:JSON.stringify(window.reader.profile)})),before);
 }
 check('actual portrait and landscape A4 PDFs include every source block, 12pt body and unclipped content; printing restores reader state');

 await page.evaluate(()=>{const r=window.reader;r.zoom=1;r.profile.layout='scroll';r.render();r.goPage(5)});await page.waitForTimeout(300);await page.evaluate(()=>scrollBy(0,180));await page.waitForTimeout(100);
 const scrollBefore=await page.evaluate(()=>({index:window.reader.pageIndex,y:scrollY,anchor:window.reader.anchor()}));
 for(const cancel of [false,true]){
  await page.evaluate(()=>window.reader.preparePDF({orientation:'portrait',includeRecords:false}).then(()=>null));
  if(cancel){await page.evaluate(()=>{scrollTo(0,0);dispatchEvent(new Event('afterprint'))})}
  else{await page.emulateMedia({media:'print'});await page.pdf({preferCSSPageSize:true});await page.emulateMedia({media:'screen'})}
  await page.waitForFunction(()=>!window.reader.printState);
  const after=await page.evaluate(()=>({index:window.reader.pageIndex,y:scrollY,anchor:window.reader.anchor()}));
  assert.equal(after.index,scrollBefore.index);assert.ok(Math.abs(after.y-scrollBefore.y)<2);assert.equal(after.anchor.blockId,scrollBefore.anchor.blockId);assert.ok(Math.abs(after.anchor.top-scrollBefore.anchor.top)<2);
 }
 await page.evaluate(()=>{const r=window.reader;r.profile.layout='single';r.render();r.goPage(0)});
 check('continuous reading restores the same page, passage and scroll position after completed and cancelled printing');

 // Stress the reflow engine independently of the current screen paper size.
 await page.evaluate(()=>{const r=window.reader,steps=Array.from({length:18},(_,i)=>({id:'step-'+i,text:`步骤 ${i+1}：计算参数与误差，验证本步条件。`.repeat(4)}));r.d.notebook.chapters.push({id:'print-qa',title:'打印压力验证',pages:[{id:'print-qa-page',title:'长表格、代码与分步推导',layout:'reading',blocks:[{id:'qa-table',type:'comparison',columns:['样本','数值','解释'],rows:Array.from({length:60},(_,i)=>['样本'+(i+1),String(i/10),'保留表头并完整续页'])},{id:'qa-code',type:'code',language:'python',text:Array.from({length:95},(_,i)=>`value_${i} = ${i}  # 中文注释，完整保留每一行`).join('\n')},{id:'qa-example',type:'example',keepTogether:true,prompt:'按步骤推导，并保持连续编号。',steps,result:'推导结束，核对第 18 步。'},{id:'qa-equation',type:'formula',latex:String.raw`J(w) = `+Array.from({length:25},(_,i)=>`(w x_{${i}}-y_{${i}})^2`).join('+')},{id:'qa-tall-row',type:'comparison',columns:['长行','解释'],rows:[['超长单元格','保持完整。'.repeat(600)],['短行','下一行保持完整']]},{id:'qa-photo',type:'image',assetId:'qa-image',alt:'原色插图',caption:'内嵌图像必须完整。'}]}]});r.d.assets.push({id:'qa-image',name:'原色插图',mime:'image/svg+xml',data:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="#ff9800"/><circle cx="200" cy="100" r="80" fill="#2070ff"/></svg>')});r.d.userState.notes.push({id:'qa-print-note',pageId:'ml-task',title:'打印附录记录',text:'这条笔记必须保留。',back:'',material:'sage',seed:1,x:0,y:0,z:1,face:'front',attached:false,collapsed:false,surface:'desk'});const p=r.pages[0];r.d.userState.annotations.push({id:'qa-freehand',pageId:p.id,sheet:p.part,kind:'freehand',selectors:[],points:[[.2,.3,.5],[.4,.45,.5]],coordinateSpace:'normalized-page',sourceSize:{width:1200,height:800},color:'#a5453a',width:3,seed:1});r.invalidate();r.render()});
 for(const orientation of ['portrait','landscape']){
  await page.evaluate(async orientation=>window.reader.preparePDF({orientation,includeRecords:true}).then(()=>null),orientation);
  const stress=await page.evaluate(()=>{const root=document.querySelector('#print-root'),blocks=id=>[...root.querySelectorAll('[data-block="'+id+'"]')];return {tableRows:blocks('qa-table').reduce((n,b)=>n+b.querySelectorAll('tbody tr').length,0),tableHeads:blocks('qa-table').every(b=>b.querySelectorAll('thead th').length===3),code:blocks('qa-code').map(b=>b.querySelector('code').textContent).join('\n'),steps:blocks('qa-example').flatMap(b=>[...b.querySelectorAll('li')].map((n,i)=>({text:n.textContent,number:b.querySelector('ol').start+i}))),ink:!!root.querySelector('.ink-appendix .print-original [data-ink="qa-freehand"]'),note:root.textContent.includes('打印附录记录'),formula:blocks('qa-equation').map(b=>{const f=b.querySelector('.formula');return f.querySelector('.katex-html').getBoundingClientRect().width<=f.getBoundingClientRect().width+2}),overflows:[...root.querySelectorAll('.print-sheet:not(.ink-appendix)')].flatMap(p=>{const body=p.querySelector('.reader-page-body').getBoundingClientRect();return [...p.querySelector('.reader-content').children].filter(n=>n.getBoundingClientRect().bottom>body.bottom+2||n.scrollWidth>n.clientWidth+3).map(n=>({id:n.dataset.block,overflow:n.scrollWidth-n.clientWidth}))}),image:[...root.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0)}});
  assert.equal(stress.tableRows,60);assert.equal(stress.tableHeads,true);assert.equal(stress.code,await page.evaluate(()=>window.reader.d.notebook.chapters.at(-1).pages[0].blocks.find(b=>b.id==='qa-code').text));assert.deepEqual(stress.steps.map(s=>s.number),Array.from({length:18},(_,i)=>i+1));assert.ok(stress.ink);assert.ok(stress.note);assert.deepEqual(stress.formula,[true]);assert.deepEqual(stress.overflows,[]);assert.ok(stress.image);
  if(orientation==='portrait'){
   await page.emulateMedia({media:'print'});
   await page.pdf({path:join(temp,'stress.pdf'),preferCSSPageSize:true,printBackground:true});
   await page.emulateMedia({media:'screen'});
   console.log('Stress PDF for visual QA: '+join(temp,'stress.pdf'));
  }else await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
  await page.waitForFunction(()=>!window.reader.printState);
 }
 await page.evaluate(()=>window.reader.preparePDF({orientation:'portrait',includeRecords:false}).then(()=>null));assert.equal(await page.locator('#print-root .ink-appendix').count(),0);assert.equal(await page.locator('#print-root').innerText().then(t=>t.includes('打印附录记录')),false);await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await page.waitForFunction(()=>!window.reader.printState);
 check('long tables repeat headers, code preserves every line, 18 derivation steps keep their numbering, wide formulas fit, original ink and notes append separately');

 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);await page.evaluate(()=>window.reader.preparePDF({orientation:'portrait',includeRecords:false}).then(()=>null));assert.equal(await page.locator('#print-root .print-sheet').first().evaluate(n=>n.offsetWidth),794);await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await page.waitForFunction(()=>!window.reader.printState);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'docs/screenshots/paper-night-phone.png'});
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(250);await page.evaluate(()=>{const r=window.reader;r.profile.direction='vertical';r.profile.motion='full';r.profile.layout='single';r.zoom=1;r.goPage(0)});
 let corner=await page.locator('.reader-stage > .reader-page-wrap [data-corner=right]').boundingBox();await page.mouse.move(corner.x+15,corner.y+15);await page.mouse.down();await page.mouse.move(corner.x+15,corner.y-250,{steps:6});await page.mouse.up();assert.equal(await page.evaluate(()=>window.reader.pageIndex),1);
 corner=await page.locator('.reader-stage > .reader-page-wrap [data-corner=right]').boundingBox();await page.mouse.move(corner.x+15,corner.y+15);await page.mouse.down();await page.mouse.move(corner.x+15,corner.y-100);await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await page.evaluate(()=>window.reader.pageIndex),1);assert.equal(await page.locator('[data-drag-side]').count(),0);
 await page.evaluate(()=>{const r=window.reader;r.profile.layout='spread';r.profile.direction='horizontal';r.render();r.turn(1);r.turn(1);r.turn(-1)});await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.reader.pageIndex),3);assert.equal(await page.locator('.page-transition,[data-drag-side]').count(),0);
 await page.evaluate(()=>window.reader.turn(1));await page.setViewportSize({width:820,height:1180});await page.waitForTimeout(350);assert.equal(await page.locator('.page-transition,[data-drag-side]').count(),0);await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('PageDown');assert.equal(await page.locator('.page-transition').count(),0);
 check('phone print dimensions stay A4; vertical drag, Escape cancellation, rapid reverse spread turns, rotation and reduced motion leave no stale animation');
 assert.deepEqual(errors,[]);await writeFile('docs/verification/experience-report.json',JSON.stringify({date:new Date().toISOString(),checks,errors,scope:'Headless Chromium, screen emulation, real Chromium PDF output; native OS print UI and physical devices not exercised'},null,2));
}finally{await browser.close()}
