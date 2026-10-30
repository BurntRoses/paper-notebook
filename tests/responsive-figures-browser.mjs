import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=resolve('output/responsive-figures');await mkdir(out,{recursive:true});const results=[];
for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true});const errors=[];
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(resolve('dist/downloads/machine-learning.html')).href+'?demo');await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>{const r=reader;r.profile.motion='reduced';r.d.assets.push(...[[600,3600,'tall'],[1800,380,'wide']].map(([width,height,name])=>({id:'fit-'+name,name,mime:'image/svg+xml',width,height,data:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="2" y="2" width="${width-4}" height="${height-4}" fill="#e6eddf" stroke="#426e85" stroke-width="4"/><text x="20" y="60" font-size="36">${name} · top</text><text x="20" y="${height-25}" font-size="36">bottom · complete</text></svg>`)})));r.d.notebook.chapters.push({id:'fit-test-chapter',title:'完整显示',pages:['tall','wide'].map(name=>({id:'fit-page-'+name,title:'完整图片与图注',layout:'cornell',blocks:[{id:'fit-image-'+name,type:'image',assetId:'fit-'+name,title:'自适应'+name,caption:'保留完整图像，图注仍然按照正文宽度排版。'.repeat(7),figure:{size:'wide',ratio:'auto',annotations:[{kind:'arrow',x:40,y:50,x2:60,y2:70}]}},{id:'fit-text-'+name,type:'prose',text:'图片之后的解释保持宽松行距。'}]}))});r.invalidate();r.render();});
 const source=await page.evaluate(()=>JSON.stringify(reader.d.notebook)),layouts=[];
 for(const [name,width,height,layout,shape]of [
 ['single',1440,1000,'single','auto'],['short',1180,700,'single','auto'],['wide-spread',2048,1228,'spread','auto'],['laptop-spread',1440,1000,'spread','auto'],['small-spread',1024,768,'spread','auto'],['stacked',820,1180,'spread','auto'],['phone-spread',390,844,'spread','auto'],['explicit-portrait',2048,1228,'spread','portrait']]){
  await page.setViewportSize({width,height});await page.waitForTimeout(190);await page.evaluate(({layout,shape})=>{reader.profile.layout=layout;reader.profile.pageShape=shape;reader.render();reader.goPage(0)},{layout,shape});
  const count=await page.evaluate(()=>reader.pages.length);let figures=0;
  for(let i=0;i<count;i+=layout==='spread'?2:1){
   await page.evaluate(i=>reader.goPage(i),i);
   const issues=await page.locator('.reader-stage > .reader-page-wrap .page-surface').evaluateAll(papers=>papers.flatMap(p=>{const body=p.querySelector('.reader-page-body'),br=body.getBoundingClientRect(),scale=br.width/body.clientWidth;return [...p.querySelectorAll('.content-block:has(.lesson-figure)')].map(n=>{const r=n.getBoundingClientRect(),media=n.querySelector('.figure-media'),m=media.getBoundingClientRect(),caption=n.querySelector('.figure-caption'),c=caption?.getBoundingClientRect();return{id:n.dataset.block,bottom:r.bottom,limit:br.bottom,mediaBottom:m.bottom,top:m.top,bodyTop:br.top,oversize:n.classList.contains('oversize-object'),scroll:n.scrollHeight-n.clientHeight,captionBottom:c?.bottom,scale};});}));
   figures+=issues.length;for(const g of issues){assert.ok(!g.oversize,JSON.stringify({engine,name,...g}));assert.ok(g.bottom<=g.limit+2&&g.mediaBottom<=g.limit+2&&g.top>=g.bodyTop-2,JSON.stringify({engine,name,...g}));assert.ok(g.scroll<=2,JSON.stringify({engine,name,...g}));}
  }
  assert.ok(figures>=10);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.evaluate(()=>reader.goPage(reader.pages.findIndex(p=>p.blocks.some(b=>b.id==='ml-fit-chart'))));
  if(layout==='spread'){
   const papers=await page.locator('.reader-stage > .reader-page-wrap .page-surface').all(),a=await papers[0].boundingBox(),b=await papers[1].boundingBox();
   const stacked=height>width,gap=stacked?b.y-a.y-a.height:b.x-a.x-a.width;assert.ok(Math.abs(gap-12)<2,JSON.stringify({name,gap}));
   if(shape==='auto'){const occupied=stacked?a.width/width:(a.width+b.width+gap)/width;assert.ok(occupied>.94,JSON.stringify({name,occupied}));assert.ok((stacked?b.y+b.height:a.y+a.height)<=height+1);}
  }
  layouts.push({name,figures,sheets:count});await page.screenshot({path:join(out,engine+'-'+name+'.png')});
 }
 // Dialog fits the actual available height after tools wrap or text entry appears.
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(190);await page.evaluate(()=>{reader.profile.layout='single';reader.profile.pageShape='auto';reader.render();reader.showVisualPage()});await page.getByRole('button',{name:'放大与批注图像',exact:true}).first().click();
 await page.getByRole('button',{name:'图像工具：文字',exact:true}).click();await page.getByLabel('图像文字说明').fill('短说明');
 const editor=await page.locator('.figure-editor').evaluate(d=>{const c=d.querySelector('.figure-editor-canvas').getBoundingClientRect(),foot=d.querySelector('.dialog-foot').getBoundingClientRect();return{scroll:d.scrollHeight-d.clientHeight,top:d.getBoundingClientRect().top,bottom:d.getBoundingClientRect().bottom,canvasBottom:c.bottom,footTop:foot.top};});assert.ok(editor.scroll<=2&&editor.top>=0&&editor.bottom<=390&&editor.canvasBottom<=editor.footTop+1,JSON.stringify(editor));
 const canvas=await page.locator('.figure-editor-canvas').boundingBox();await page.mouse.click(canvas.x+canvas.width*.4,canvas.y+canvas.height*.4);assert.equal(await page.evaluate(()=>reader.d.userState.figureMarks.length),1);await page.getByRole('button',{name:'撤销图像批注',exact:true}).click();assert.equal(await page.evaluate(()=>reader.d.userState.figureMarks.length),0);await page.getByRole('button',{name:'重做图像批注',exact:true}).click();assert.equal(await page.evaluate(()=>reader.d.userState.figureMarks.length),1);
 await page.screenshot({path:join(out,engine+'-compact-editor.png')});await page.getByRole('button',{name:'完成',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.stringify(reader.d.notebook)),source);
 assert.deepEqual(errors,[]);results.push({engine,layouts,completeFigures:true,spreadGutter:12,editorFits:true,undoRedo:true,sourceUnchanged:true,errors});
 }finally{await browser.close();}
}
await writeFile(join(out,'report.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
