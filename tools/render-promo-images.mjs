import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../',import.meta.url));
const base=process.env.PROMO_BASE||pathToFileURL(root+'dist/downloads/paper-notebook.html').href;
await mkdir(root+'public/promo',{recursive:true});const browser=await chromium.launch({headless:true}),manifest=[];
try{for(const [name,width,height] of [['landscape',1920,1080],['portrait',1080,1920]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});await page.goto(base+'?demo&poster');await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>document.fonts.ready);
 const ids=await page.evaluate(()=>window.reader.d.notebook.chapters.flatMap(c=>c.pages.map(p=>p.id)));for(let i=0;i<ids.length;i++){
  await page.evaluate(i=>{const r=window.reader;r.profile.motion='reduced';r.goPage(r.pages.findIndex(p=>p.id===r.d.notebook.chapters.flatMap(c=>c.pages)[i].id));},i);await page.waitForTimeout(100);
  const prefix=`paper-${name}-${i+1}`,url=await page.evaluate(()=>window.reader.pageImage());await writeFile(root+`public/promo/${prefix}.png`,Buffer.from(url.split(',')[1],'base64'));
  await page.screenshot({path:root+`public/promo/poster-${name}-${i+1}.png`});manifest.push({page:i+1,pageId:ids[i],orientation:name,paper:`${prefix}.png`,composition:`poster-${name}-${i+1}.png`,width,height});
 }
 await page.evaluate(()=>window.reader.goPage(0));await page.screenshot({path:root+`public/promo/reader-${name}.png`});await page.close();
}}finally{await browser.close();}await writeFile(root+'public/promo/poster-manifest.json',JSON.stringify({source:'examples/paper-notebook.json',renderer:'PageSurface + native SVG ink',outputs:manifest},null,2));console.log(JSON.stringify(manifest,null,2));
