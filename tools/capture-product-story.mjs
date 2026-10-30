/** Capture complete logical pages, including every naturally paginated sheet. */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const {default:sharp}=await import(process.env.SHARP_MODULE||'sharp');
const root=fileURLToPath(new URL('../',import.meta.url)),out=root+'production/promo/story/';
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5178/paper-notebook-kit/dist';
const ids=['product-pain','product-idea','product-structure','product-marks','product-subjects','product-fit','product-focus','product-start'];
const browser=await chromium.launch({headless:true}),errors=[];let sheets=0;
try{
 await mkdir(out,{recursive:true});
 for(const [orientation,width,height]of[['landscape',1920,1080],['portrait',1080,1920]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/downloads/paper-notebook-product.html?demo&poster');await page.waitForFunction(()=>window.reader?.fontsCalibrated);await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:'.ink-overlay{opacity:0!important}'});
  await page.evaluate(()=>{window.reader.profile.motion='reduced';window.reader.render()});
  const entries=[];
  for(const [n,id]of ids.entries()){
   const indices=await page.evaluate(id=>window.reader.pages.flatMap((p,i)=>p.id===id?[i]:[]),id);
   let top=0,rasterWidth=0;const captures=[],blocks=[],paths=[],fragments=[];let first;
   for(const index of indices){
    await page.evaluate(i=>window.reader.goPage(i),index);await page.locator('.page-transition').waitFor({state:'detached'});
    const item=await page.locator('.page-surface').evaluate(p=>{
     const r=p.getBoundingClientRect(),box=n=>{if(!n)return;const b=n.getBoundingClientRect();return{x:b.x-r.x,y:b.y-r.y,width:b.width,height:b.height}};
     const body=p.querySelector('.reader-page-body').getBoundingClientRect(),content=p.querySelector('.reader-content').getBoundingClientRect(),ink=p.querySelector('.ink-overlay'),fragments=[];
     const code=p.querySelector('[data-block="pain-fragments"] code');
     if(code){
      const walker=document.createTreeWalker(code,NodeFilter.SHOW_TEXT),nodes=[];let n,length=0;while(n=walker.nextNode()){nodes.push({n,start:length,end:length+n.length});length+=n.length;}
      const lines=code.textContent.split('\n');let offset=0;
      for(let i=0;i<lines.length;i+=2){const start=offset,end=start+lines.slice(i,i+2).join('\n').length,a=nodes.find(n=>n.end>start),z=nodes.find(n=>n.end>=end),range=document.createRange();range.setStart(a.n,start-a.start);range.setEnd(z.n,end-z.start);const rb=range.getBoundingClientRect(),pre=code.closest('pre').getBoundingClientRect();fragments.push({x:pre.x-r.x,y:rb.y-r.y-7,width:pre.width,height:rb.height+14});offset=end+1;}
     }
     return{pageId:p.dataset.page,part:p.dataset.part,width:r.width,height:r.height,header:box(p.querySelector('.reader-page-heading')),heading:box(p.querySelector('h1')),blocks:[...p.querySelectorAll('[data-block]')].map(n=>({id:n.dataset.block,...box(n)})),fragments,viewBox:ink.getAttribute('viewBox'),paths:[...ink.children].map(n=>({xml:n.outerHTML,kind:n.dataset.kind||'leader'})),overflow:content.bottom>body.bottom+2};
    });
    assert.equal(item.pageId,id);assert.equal(item.overflow,false,orientation+' '+id+' part '+item.part);
    const png=await page.locator('.page-surface').screenshot({animations:'disabled'}),dim=await sharp(png).metadata(),sx=dim.width/item.width,sy=dim.height/item.height;
    rasterWidth=dim.width;const scale=b=>({...b,x:b.x*sx,y:b.y*sy+top,width:b.width*sx,height:b.height*sy});
    if(!first)first={header:scale(item.header),heading:scale(item.heading)};
    blocks.push(...item.blocks.map(scale));fragments.push(...item.fragments.map(scale));
    const vb=item.viewBox.split(/\s+/).map(Number);
    paths.push(...item.paths.map(p=>({...p,transform:`translate(0 ${top}) scale(${dim.width/vb[2]} ${dim.height/vb[3]})`})));
    captures.push({input:png,left:0,top});top+=dim.height;sheets++;
   }
   assert.equal(new Set(blocks.map(b=>b.id)).size,blocks.length,'Film blocks must remain intact');
   const expected=await page.evaluate(id=>window.reader.d.notebook.chapters.flatMap(c=>c.pages).find(p=>p.id===id).blocks.map(b=>b.id),id);
   assert.deepEqual(blocks.map(b=>b.id),expected);
   if(n===0)assert.equal(fragments.length,3,'Six opening lines form three pairs');
   await sharp({create:{width:rasterWidth,height:top,channels:4,background:'#fbf9f1'}}).composite(captures).png().toFile(out+orientation+'-'+(n+1)+'.png');
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${rasterWidth}" height="${top}" viewBox="0 0 ${rasterWidth} ${top}">${paths.map(p=>`<g transform="${p.transform}">${p.xml}</g>`).join('')}</svg>`;
   await writeFile(out+orientation+'-'+(n+1)+'.svg',svg);
   entries.push({pageId:id,index:n+1,orientation,width:rasterWidth,height:top,coordinateSpace:'raster-pixels',sheets:indices.length,...first,blocks,fragments,paths,overflow:false});
  }
  await writeFile(out+orientation+'.json',JSON.stringify(entries,null,2));
  const blank=await page.addStyleTag({content:'.reader-content,.reader-page-heading,.cornell-cues,.paper-notes,.cornell-summary,.reader-page-footer,.ink-overlay{visibility:hidden!important}'});
  await page.locator('.page-surface').screenshot({path:out+'blank-'+orientation+'.png'});await blank.evaluate(n=>n.remove());
  await page.goto(base+'/downloads/machine-learning.html?demo');await page.waitForFunction(()=>window.reader?.fontsCalibrated);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{const r=window.reader;r.profile.motion='reduced';r.profile.transition='none';r.profile.layout='spread';r.profile.pageShape=innerWidth>innerHeight?'portrait':'landscape';r.profile.theme=innerWidth>innerHeight?'paper-light':'paper-night';r.rightSidebarOpen=true;r.profile.bottomNotes=true;r.render();r.goPage(r.pages.findIndex(p=>p.blocks.some(b=>b.id==='ml-residual-detail')));r.addMarginNote(r.page,'right',.5);});
  await page.getByLabel('便条内容',{exact:true}).fill('同一输入下，沿纵轴比较预测值与标签。');await page.getByRole('button',{name:'便条颜色：黄色',exact:true}).click();
  await page.evaluate(()=>reader.addMarginNote(reader.page,'bottom',.12));await page.locator('[data-note-region=bottom] textarea').fill('残差 = 预测值 − 标签；本例为 −1。');
  await page.mouse.click(5,height-5);await page.locator('[data-note-region=right] .workspace-note').hover();
  assert.equal(await page.locator('.reader-stage .page-surface').count(),2);
  assert.equal(await page.locator('.reader-stage .reader-page-heading>.sketch-frame,.reader-stage .paper-notes>.sketch-frame,.reader-stage .paper-bottom>.sketch-frame').count(),0);
  await page.screenshot({path:out+'ui-'+orientation+'.png',animations:'disabled'});
  await page.locator('.reader-stage [data-block=ml-residual-detail] .lesson-figure').click();await page.locator('.figure-editor').waitFor();
  await page.getByRole('button',{name:'图像工具：箭头',exact:true}).click();assert.ok(await page.locator('.figure-editor-canvas').isVisible());
  await page.screenshot({path:out+'editor-'+orientation+'.png',animations:'disabled'});
  console.log(orientation+': 8 complete logical pages, no overflow, current spread/notes/figure UI '+width+'×'+height);await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(root+'docs/verification/product-pages.json',JSON.stringify({logicalPages:16,physicalSheets:sheets,allBlocksCaptured:true,errors,source:'production reader, Chromium headless, CSS geometry and raster in the same viewport',readerSha256:createHash('sha256').update(await readFile(root+'dist/index.html')).digest('hex'),uiSource:'downloads/machine-learning.html; landscape/portrait spreads, right/bottom notes, figure annotation tools',physicalDevices:false},null,2));
}finally{await browser.close();}
