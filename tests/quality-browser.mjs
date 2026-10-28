import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const engines=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
await mkdir('output/quality-check',{recursive:true});
const fixture=JSON.parse(await readFile('dist/downloads/blank-notebook.json','utf8'));
fixture.notebook.id='quality-fixture';fixture.notebook.title='配图与排版检查';
fixture.userState.preferences.fontSize=24;fixture.extensions.readerProfile={layout:'single',sidebar:'collapsed',pageShape:'auto',motion:'reduced',transition:'none'};
fixture.assets=[{id:'square',name:'面积图',mime:'image/svg+xml',width:420,height:420,data:JSON.parse(await readFile('dist/downloads/paper-notebook.json','utf8')).assets[0].data}];
const dimensions=[['small','1:1'],['medium','4:3'],['wide','3:2'],['full','16:9'],['medium','3:4'],['wide','auto']];
const shapes=['rounded','rectangle','circle','ellipse','diamond','hexagon','pill','document','cylinder'];
fixture.notebook.chapters=[{id:'figures',title:'尺寸、比例、轮廓与数据',pages:dimensions.map(([size,ratio],i)=>({id:'figure-page-'+i,title:'配图 '+size+' · '+ratio,layout:'reading',blocks:[{id:'explain-'+i,type:'prose',text:'图形解释结构、面积与数量关系。标签、箭头与刻度应完整显示。',study:{marks:[{text:'数量关系',kind:'underline'}]}},i===0||i===4?{id:'figure-'+i,type:'image',assetId:'square',alt:'面积同比例分解',caption:'本金100、两个增长条各10、再次增长1。',figure:{size,ratio}}:i===2?{id:'figure-'+i,type:'chart',figure:{size,ratio},chartType:'line',xLabel:'期数',yLabel:'期末值',series:[{id:'data',label:'教学数据',points:[{x:0,y:100},{x:1,y:110},{x:2,y:121}]}],caption:'数值坐标和刻度保持准确。'}:{id:'figure-'+i,type:'diagram',figure:{size,ratio,style:i===1?'precise':'sketch'},arrangement:i===5?'column':'row',nodes:(i===5?shapes:shapes.slice(3,6)).map((shape,j)=>({id:'node-'+i+'-'+j,label:shape,shape})),edges:[],caption:'形状、文字和完整轮廓保留。'}]}))}];
fixture.notebook.chapters[0].pages.push({id:'alignment-page',title:'完整源表的对齐',layout:'reading',blocks:[{id:'alignment-table',type:'comparison',columns:['编号','测量','混合'],rows:Array.from({length:60},(_,i)=>[String(i+1),String((i+1)*2),i===59?'待测':String(i+1)])}]});
fixture.userState.lastPageId=fixture.notebook.chapters[0].pages[0].id;
await writeFile('output/quality-check/notebook.json',JSON.stringify(fixture));
execFileSync(process.execPath,['tools/notebook.mjs','build','output/quality-check/notebook.json','--out','output/quality-check/built']);
const report=JSON.parse(await readFile('output/quality-check/built/build-report.json','utf8'));
const url=pathToFileURL(resolve('output/quality-check/built',report.html)).href;
const results=[];
for(const engine of ['chromium','webkit']){
 const browser=await engines[engine].launch({headless:true});
 try{
  const context=await browser.newContext({offline:engine==='chromium',viewport:{width:1440,height:960},deviceScaleFactor:1,acceptDownloads:true});
  if(engine==='webkit')await context.route(/^https?:/,route=>route.abort());
  const page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url())});
  await page.goto(url+'?demo');await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>document.fonts.ready);
  const go=async id=>{await page.evaluate(id=>{const r=window.reader;const i=r.pages.findIndex(p=>p.blocks.some(b=>b.id===id));if(i<0)throw Error('Missing figure '+id);r.goPage(i)},id);await page.locator(`.reader-stage [data-block="${id}"] .lesson-figure`).first().waitFor();};
  const observed=[];
  for(let i=0;i<dimensions.length;i++){
   await go('figure-'+i);
   const result=await page.locator(`.reader-stage [data-block="figure-${i}"] .lesson-figure`).first().evaluate(n=>{const media=n.querySelector('.figure-media'),r=media.getBoundingClientRect(),img=n.querySelector('img'),svg=n.querySelector('svg');return{size:n.dataset.size,ratio:n.dataset.ratio,width:r.width,height:r.height,overflow:n.scrollWidth>n.clientWidth+1,imageWidth:Number(img?.getAttribute('width')),shapes:svg?.querySelectorAll('.diagram-node:not(.sketch-pencil)').length||0,pencils:svg?.querySelectorAll('.sketch-pencil').length||0}});
   assert.ok(result.width>0&&result.height>0);assert.equal(result.overflow,false);assert.equal(result.size,dimensions[i][0]);assert.equal(result.ratio,dimensions[i][1]);
   if(i!==5){const [w,h]=dimensions[i][1].split(':').map(Number);assert.ok(Math.abs(result.width/result.height-w/h)<.02,JSON.stringify(result));}
   if(i===1)assert.equal(result.pencils,0);if(i===5){assert.equal(result.shapes,9);assert.equal(result.pencils,9);}
   if(i===0)assert.equal(result.imageWidth,420);observed.push(result);
  }
  await go('figure-2');
  const points=await page.locator('.reader-stage .chart-point').evaluateAll(ns=>ns.map(n=>[Number(n.getAttribute('cx')),Number(n.getAttribute('cy'))]));
  assert.equal(points.length,3);assert.equal(points[0][0],88);assert.equal(points[2][0],686);assert.equal(points[2][1],58);
  await page.screenshot({path:`output/quality-check/${engine}-chart.png`});
  await go('figure-4');
  const image=page.locator('.reader-stage img').first();
  const before=await image.evaluate(n=>{const r=n.closest('figure').getBoundingClientRect();const data=n.src;n.removeAttribute('src');return{width:r.width,height:r.height,data}});
  await image.evaluate((n,data)=>n.src=data,before.data);await image.evaluate(n=>n.decode());
  const after=await image.evaluate(n=>{const r=n.closest('figure').getBoundingClientRect();return{width:r.width,height:r.height}});
  assert.equal(after.width,before.width);assert.equal(after.height,before.height);
  await page.screenshot({path:`output/quality-check/${engine}-area.png`});
  // Incremental enhancement must include a newly inserted select itself, and only one list may stay open.
  await page.evaluate(()=>{const wrap=document.createElement('div');wrap.id='quality-selects';wrap.innerHTML='<select aria-label="Check A"><option>A</option><option>B</option></select><select aria-label="Check B"><option>X</option><option>Y</option></select>';document.body.append(wrap)});
  const choices=page.locator('#quality-selects .paper-choice-trigger');await choices.first().waitFor();await choices.first().click();assert.equal(await page.locator('#quality-selects [aria-expanded=true]').count(),1);await choices.last().click();assert.equal(await page.locator('#quality-selects [aria-expanded=true]').count(),1);
  await page.getByRole('option',{name:'Y',exact:true}).click();assert.equal(await page.locator('#quality-selects select').last().inputValue(),'Y');
  await page.evaluate(()=>document.getElementById('quality-selects').remove());
  const print=await page.evaluate(async()=>{const r=window.reader,before=JSON.stringify(r.d.notebook);const root=await r.preparePDF({orientation:'portrait',includeRecords:false});const headers=[...root.querySelectorAll('[data-block=alignment-table] th')].map(n=>n.style.textAlign);const tables=root.querySelectorAll('[data-block=alignment-table]').length;const result={sheets:root.querySelectorAll('.print-sheet').length,tables,headers,sourcePreserved:before===JSON.stringify(r.d.notebook)};r.finishPrint();return result;});
  assert.ok(print.tables>1);assert.equal(print.sourcePreserved,true);for(let i=0;i<print.headers.length;i++)assert.equal(print.headers[i],i%3===2?'left':'center');await page.waitForFunction(()=>!window.reader.printState);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.reader-stage .page-surface')?.offsetWidth===792);
  await go('figure-1');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const mobile=await page.locator('.reader-stage .lesson-figure').first().evaluate(n=>({width:n.offsetWidth,column:n.parentElement.clientWidth-parseFloat(getComputedStyle(n.parentElement).paddingLeft)-parseFloat(getComputedStyle(n.parentElement).paddingRight)}));assert.ok(Math.abs(mobile.width-mobile.column)<=1);
  await page.screenshot({path:`output/quality-check/${engine}-mobile.png`});
  await go('figure-2');await page.screenshot({path:`output/quality-check/${engine}-mobile-chart.png`});
  const tickHeight=await page.locator('.reader-stage .chart-tick').first().evaluate(n=>n.getBoundingClientRect().height);assert.ok(tickHeight>=9,'Mobile tick labels remain readable');
  // Repeated render/pagination should preserve source and stabilize the physical sheet count.
  const stable=await page.evaluate(()=>{const r=window.reader,n=JSON.stringify(r.d.notebook),counts=[],times=[];for(let i=0;i<5;i++){const start=performance.now();r.invalidate();r.render();times.push(performance.now()-start);counts.push(r.pages.length);}return{same:n===JSON.stringify(r.d.notebook),counts,times}});
  assert.equal(stable.same,true);assert.equal(new Set(stable.counts).size,1);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  results.push({engine,offline:true,figures:observed,imageDecodeStable:true,oneOpenSelect:true,print,mobile,repagination:stable,externalRequests:external.length,errors});
  await page.setViewportSize({width:1440,height:960});await page.goto(pathToFileURL(resolve('dist/downloads/paper-notebook.html')).href+'?demo');await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>{window.reader.profile.motion='reduced';window.reader.goBlock('intro-capabilities','intro-area')});await page.locator('.reader-stage [data-block=intro-area] img').waitFor();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`output/quality-check/${engine}-published-example.png`});assert.deepEqual(errors,[]);
  await context.close();
 }finally{await browser.close()}
}
await mkdir('docs/verification',{recursive:true});await writeFile('docs/verification/quality-browser-report.json',JSON.stringify({date:new Date().toISOString(),results},null,2)+'\n');console.log(JSON.stringify(results,null,2));
