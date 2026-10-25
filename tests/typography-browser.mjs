import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5180/paper-notebook-kit/dist',browser=await chromium.launch({headless:true}),checks=[],errors=[],layouts=[];
await mkdir('docs/screenshots/typography',{recursive:true});await mkdir('docs/verification',{recursive:true});
const check=name=>{checks.push(name);console.log('✓ '+name)};
const rulerGeometry=()=>{
 const paper=document.querySelector('.reader-stage .page-surface'),body=paper.querySelector('.reader-page-body'),base=body.getBoundingClientRect(),sy=base.height/body.clientHeight,sx=base.width/body.clientWidth;
 const issues=[],spans=[...body.querySelectorAll('.reader-content .ink-text')].filter(n=>!n.closest('[data-visual=blackboard],.block-formula,.block-code,.table-scroll,.figure-caption,.block-image,.oversize-object'));
 const rects=spans.flatMap(n=>{const r=document.createRange();r.selectNodeContents(n);return [...r.getClientRects()].filter(r=>r.width>.1&&r.height>1)});
 const lines=[...body.querySelectorAll('.text-ruling line')].map(n=>({x1:base.x+Number(n.getAttribute('x1'))*sx,x2:base.x+Number(n.getAttribute('x2'))*sx,y:base.y+Number(n.getAttribute('y1'))*sy,block:n.dataset.ruleFor}));
 for(const line of lines)for(const r of rects)if(line.x1<r.right-1&&line.x2>r.left+1&&line.y>r.top+.2&&line.y<r.bottom-.2)issues.push('line intersects text');
 for(const span of spans){const r=document.createRange();r.selectNodeContents(span);for(const rect of [...r.getClientRects()].filter(r=>r.width>.1&&r.height>1)){if(rect.bottom>base.bottom-3)continue;if(!lines.some(l=>Math.abs(l.y-rect.bottom-2*sy)<1.6*sy&&l.x1<rect.right&&l.x2>rect.left))issues.push('text line lacks aligned rule');}}
 return {issues,lines:lines.length,textLines:rects.length,background:getComputedStyle(body).backgroundImage};
};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/downloads/machine-learning.html?demo');await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>document.fonts.ready);
 for(const [width,height,font,spacing,theme]of [[1440,1000,'hand',1.85,'paper-light'],[1180,820,'serif',1.65,'paper-night'],[820,1180,'sans',2.05,'paper-light'],[390,844,'hand',1.85,'paper-night'],[390,844,'sans',2.05,'paper-light']]){
  await page.setViewportSize({width,height});await page.waitForTimeout(220);
  await page.evaluate(({font,spacing,theme})=>{const r=window.reader;r.profile.font=font;r.profile.lineSpacing=spacing;r.profile.theme=theme;r.profile.motion='reduced';r.zoom=1;r.render()}, {font,spacing,theme});await page.evaluate(()=>document.fonts.ready);
  const integrity=await page.evaluate(()=>{
   const r=window.reader,blocks=r.d.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks),problems=[];
   for(const b of blocks.filter(b=>b.parameters?.length)){
    const parts=r.pages.flatMap(p=>p.blocks.filter(n=>n.id===b.id));
    if(JSON.stringify(parts.flatMap(p=>p.parameters))!==JSON.stringify(b.parameters))problems.push(b.id+': missing or repeated parameters');
    if(parts.some(p=>p._oversize))problems.push(b.id+': scrolling formula');
   }
   if(r.pages.some(p=>p.blocks.some(b=>b.id==='ml-parameter-chart'&&b._oversize)))problems.push('function comparison chart scrolls');
   return problems;
  });assert.deepEqual(integrity,[]);
  for(const id of ['ml-linear','ml-mse','ml-update-rule']){
   const indices=await page.evaluate(id=>window.reader.pages.flatMap((p,i)=>p.blocks.some(b=>b.id===id)?[i]:[]),id);
   for(const index of indices){await page.evaluate(i=>window.reader.goPage(i),index);
    const details=await page.locator('.reader-stage .formula-explained').evaluateAll(nodes=>nodes.flatMap(n=>{
     const b=window.reader.d.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks).find(b=>b.id===n.dataset.block),source=[b.text||b.latex,...b.parameters.map(p=>p.name+'：'+p.description)].join('\n');
     return [...n.querySelectorAll('.ink-text')].map(s=>({text:s.textContent,expected:source.slice(Number(s.dataset.offset),Number(s.dataset.offset)+s.textContent.length)}));
    }));for(const d of details)assert.equal(d.text,d.expected);
    const rows=await page.locator('.reader-stage .formula-parameter').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect(),p=n.closest('.reader-page-body').getBoundingClientRect();return {top:r.top,bottom:r.bottom,limit:p.bottom}}));for(let i=0;i<rows.length;i++){assert.ok(rows[i].bottom<=rows[i].limit+1);if(i)assert.ok(rows[i].top>=rows[i-1].bottom+1)}
   }
  }
  await page.evaluate(()=>{const r=window.reader;r.goPage(r.pages.findIndex(p=>p.blocks.some(b=>b.id==='ml-observation')))});const geometry=await page.evaluate(rulerGeometry);assert.deepEqual(geometry.issues,[]);assert.ok(geometry.textLines>1);assert.ok(geometry.lines>1);assert.equal(geometry.background,'none');
  const name=`${width}-${font}-${theme}`;await page.screenshot({path:`docs/screenshots/typography/${name}-body.png`,fullPage:true});layouts.push({width,height,font,spacing,theme,...geometry});
  await page.evaluate(()=>{const r=window.reader;r.goPage(r.pages.findIndex(p=>p.blocks.some(b=>b.id==='ml-linear')))});await page.screenshot({path:`docs/screenshots/typography/${name}-formula.png`,fullPage:true});
 }
 check('symbol rows survive screen reflow intact with exact text anchors, separate rows and no formula scrollboxes');
 check('ruling stays below actual text across three fonts, spacing choices, both themes and desktop/tablet/phone viewports');
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(220);
 await page.evaluate(()=>{const r=window.reader;r.profile.font='hand';r.profile.theme='paper-light';r.profile.lineSpacing=1.85;r.render();r.goPage(r.pages.findIndex(p=>p.blocks.some(b=>b.id==='ml-linear')));
  const b=r.d.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks).find(b=>b.id==='ml-linear'),exact=b.parameters[3].name+'：'+b.parameters[3].description,start=b.text.length+1+b.parameters.slice(0,3).reduce((s,p)=>s+p.name.length+1+p.description.length+1,0);r.editor.mark('underline',[{pageId:'ml-model',selector:{blockId:b.id,start,end:start+exact.length,exact,prefix:'',suffix:''}}]);});
 assert.ok(await page.locator('.reader-stage [data-kind=underline]').count());
 await page.evaluate(()=>{const r=window.reader;r.zoom=1.5;r.fitPages();r.editor.paint()});assert.ok(await page.locator('.reader-stage [data-kind=underline]').count());
 check('new parameter explanations remain selectable and annotatable after zoom');
 await page.evaluate(()=>{const r=window.reader;r.zoom=1;r.goPage(r.pages.findIndex(p=>p.blocks.some(b=>b.id==='ml-parameter-chart')))});await page.screenshot({path:'docs/screenshots/typography/function-comparison.png',fullPage:true});
 assert.equal(await page.locator('.reader-stage [data-block=ml-parameter-chart].oversize-object').count(),0);
 for(const ruling of ['grid','dots','blank','lined']){
  await page.evaluate(ruling=>{const r=window.reader,p=r.d.notebook.chapters[0].pages[1];p.paper={ruling};r.invalidate();r.render();r.goPage(r.pages.findIndex(p=>p.id==='ml-vocabulary'))},ruling);
  if(ruling==='lined')assert.ok(await page.locator('.text-ruling').count());else assert.equal(await page.locator('.text-ruling').count(),0);
 }
 check('grid, dotted and blank paper retain their own settings while lined paper follows text');
 for(const orientation of ['portrait','landscape']){
  await page.evaluate(async orientation=>{await window.reader.preparePDF({orientation,includeRecords:true})},orientation);
  const mismatch=await page.evaluate(()=>{const problems=[],blocks=window.reader.d.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks);for(const b of blocks.filter(b=>b.parameters)){const nodes=[...document.querySelectorAll('#print-root [data-block="'+b.id+'"] .formula-parameter dd')];if(JSON.stringify(nodes.map(n=>n.textContent))!==JSON.stringify(b.parameters.map(p=>p.name+'：'+p.description)))problems.push(b.id);}return problems;});assert.deepEqual(mismatch,[]);assert.equal(await page.locator('#print-root .text-ruling').count(),0);
  await page.evaluate(()=>dispatchEvent(new Event('afterprint')));await page.waitForFunction(()=>!window.reader.printState);
 }
 check('portrait and landscape A4 projections retain every formula explanation once without screen ruling');
 assert.deepEqual(errors,[]);await writeFile('docs/verification/typography-report.json',JSON.stringify({date:new Date().toISOString(),checks,layouts,errors},null,2));
}finally{await browser.close()}
