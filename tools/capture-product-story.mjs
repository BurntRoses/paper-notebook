/** Capture the shared reader at deterministic pixel dimensions for the film. */
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),out=root+'production/promo/story/';
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5178/paper-notebook-kit/dist';
const ids=['product-pain','product-idea','product-structure','product-marks','product-subjects','product-fit','product-focus','product-start'];
const browser=await chromium.launch({headless:true});const errors=[];
try{
 await mkdir(out,{recursive:true});
 for(const [orientation,width,height]of[['landscape',1920,1080],['portrait',1080,1920]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/downloads/paper-notebook-product.html?demo&poster');await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'.ink-overlay{opacity:0!important}'});
  await page.waitForFunction(()=>document.querySelector('.page-surface')?.dataset.shape=== (innerWidth>innerHeight?'landscape':'portrait'));
  const entries=[];
  for(let n=0;n<8;n++){
   if(n){await page.keyboard.press('ArrowRight');await page.locator('.page-transition').waitFor({state:'detached'});}
   const item=await page.locator('.page-surface').evaluate(p=>{
    const r=p.getBoundingClientRect(),box=n=>{const b=n.getBoundingClientRect();return{x:b.x-r.x,y:b.y-r.y,width:b.width,height:b.height}},ink=p.querySelector('.ink-overlay');
    const body=p.querySelector('.reader-page-body').getBoundingClientRect(),content=p.querySelector('.reader-content').getBoundingClientRect();
    const fragments=[];
    if(p.dataset.page==='product-pain'){
     const code=p.querySelector('[data-block="pain-fragments"] code'),walker=document.createTreeWalker(code,NodeFilter.SHOW_TEXT),nodes=[];let n,length=0;while(n=walker.nextNode()){nodes.push({n,start:length,end:length+n.length});length+=n.length;}
     const lines=code.textContent.split('\n');let offset=0;
     for(let i=0;i<lines.length;i+=2){const start=offset,end=start+lines.slice(i,i+2).join('\n').length,a=nodes.find(n=>n.end>start),z=nodes.find(n=>n.end>=end),range=document.createRange();range.setStart(a.n,start-a.start);range.setEnd(z.n,end-z.start);const rb=range.getBoundingClientRect(),pre=code.closest('pre').getBoundingClientRect();fragments.push({x:pre.x-r.x,y:rb.y-r.y-7,width:pre.width,height:rb.height+14});offset=end+1;}
    }
    return{pageId:p.dataset.page,part:p.dataset.part,width:r.width,height:r.height,clip:{x:r.x,y:r.y,width:r.width,height:r.height},header:box(p.querySelector('.reader-page-heading')),heading:box(p.querySelector('h1')),blocks:[...p.querySelectorAll('[data-block]')].map(n=>({id:n.dataset.block,...box(n)})),fragments,svg:ink.outerHTML,paths:[...ink.children].map(n=>({xml:n.outerHTML,kind:n.dataset.kind||'leader'})),overflow:content.bottom>body.bottom+2};
   });
   assert.equal(item.pageId,ids[n]);assert.equal(item.part,'0');assert.equal(item.overflow,false,orientation+' '+ids[n]);
   await page.locator('.page-surface').screenshot({path:out+orientation+'-'+(n+1)+'.png',animations:'disabled'});
   await writeFile(out+orientation+'-'+(n+1)+'.svg',item.svg);delete item.svg;entries.push({...item,index:n+1,orientation});
  }
  await writeFile(out+orientation+'.json',JSON.stringify(entries,null,2));
  await page.goto(base+'/downloads/paper-notebook-product.html?demo');await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>document.fonts.ready);
  for(let i=0;i<6;i++){await page.keyboard.press('ArrowRight');await page.locator('.page-transition').waitFor({state:'detached'});}
  assert.equal(await page.locator('.page-surface').getAttribute('data-page'),'product-focus');
  await page.screenshot({path:out+'ui-'+orientation+'.png'});console.log(orientation+': 8 source pages, no overflow, UI '+width+'×'+height);await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(root+'docs/verification/product-pages.json',JSON.stringify({pages:16,errors,source:'production reader, Chromium headless, CSS geometry and raster in the same viewport',physicalDevices:false},null,2));
}finally{await browser.close();}
