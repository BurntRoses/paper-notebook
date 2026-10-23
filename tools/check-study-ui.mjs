import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../',import.meta.url)),browser=await chromium.launch({headless:true}),report=[];
await mkdir(root+'docs/screenshots/study',{recursive:true});
try{
 for(const [name,width,height]of [['desktop',1440,1000],['portrait',820,1180],['phone',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});await page.goto(pathToFileURL(root+'dist/downloads/paper-notebook.html').href+'?demo');await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>document.fonts.ready);
  const count=await page.evaluate(()=>window.reader.pages.length);let marks=0;
  for(let i=0;i<count;i++){
   await page.evaluate(i=>{window.reader.profile.motion='reduced';window.reader.goPage(i)},i);
   const geometry=await page.locator('.ink-overlay [data-kind=star],.ink-overlay [data-kind=box]').evaluateAll(ns=>ns.map(n=>{const b=n.getBBox();return {kind:n.dataset.kind,rect:n.dataset.rect.split(',').map(Number),box:{x:b.x,y:b.y,width:b.width,height:b.height}}}));
   for(const g of geometry){const [x,y,w,h]=g.rect,b=g.box;if(g.kind==='star'){assert.ok(b.y+b.height<=y+2,'star overlaps the middle of text');assert.ok(b.x+b.width/2>=x+w-6,'star should sit at the upper-right text edge')}else{assert.ok(b.x<=x-4&&b.x+b.width>=x+w+4,'box needs horizontal breathing room');assert.ok(b.y<=y-3&&b.y+b.height>=y+h+3,'box needs vertical breathing room')}marks++;}
   await page.screenshot({path:root+`docs/screenshots/study/${name}-${i+1}.png`});
  }
  await page.evaluate(()=>window.reader.goPage(window.reader.pages.findIndex(p=>p.blocks.some(b=>b.id==='code-example'))));
  const code=await page.locator('[data-block=code-example] code').textContent(),source=await page.evaluate(()=>window.reader.d.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks).find(b=>b.id==='code-example').text);assert.equal(code,source);assert.ok(await page.locator('.token-builtin').count());assert.equal(await page.locator('[data-block=code-example] [data-explain-target]').count(),2);assert.equal(await page.locator('.explanation-leader').count(),2);
  await page.evaluate(()=>window.reader.showBriefInterview());await page.getByRole('combobox',{name:'材料遵循程度',exact:true}).click();const choice=await page.locator('.paper-choice-list:popover-open').boundingBox();assert.ok(choice.x>=11&&choice.x+choice.width<=width-11);await page.screenshot({path:root+`docs/screenshots/study/${name}-brief.png`});await page.keyboard.press('Escape');await page.getByRole('button',{name:'关闭',exact:true}).click();
  report.push({viewport:name,width,height,physicalSheets:count,markGeometryChecks:marks,codeTextExact:true,anchoredExplanations:2,choiceFits:true});await page.close();
 }
}finally{await browser.close()}
await writeFile(root+'docs/verification/study-ui.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
