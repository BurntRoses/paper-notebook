import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch({headless:true});
try{
 await mkdir(root+'public/promo',{recursive:true});
 for(const [orientation,width,height] of [['landscape',1920,1080],['portrait',1080,1920]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  await page.route(/^https?:/,r=>r.abort());
  await page.goto(pathToFileURL(root+'dist/downloads/machine-learning.html').href+'?demo&poster');
  await page.waitForFunction(()=>reader?.fontsCalibrated);
  await page.evaluate(async orientation=>{
   await document.fonts.ready;
   reader.profile={...reader.profile,layout:orientation==='landscape'?'spread':'single',pageShape:'portrait',paperStyle:'ivory',theme:'paper-light',motion:'reduced'};
   reader.render();
   const i=reader.pages.findIndex(p=>p.blocks.some(b=>b.id==='ml-residual-detail'));
   if(i<0)throw new Error('Missing residual figure');
   reader.goPage(i,true);
   await Promise.all([...document.querySelectorAll('.reader-stage img')].map(i=>i.decode()));
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  },orientation);
  await page.screenshot({path:root+`public/promo/paper-${orientation}-3.jpg`,type:'jpeg',quality:94,animations:'disabled'});
  console.log(`Updated ${orientation} homepage preview`);
  await page.close();
 }
}finally{await browser.close();}
