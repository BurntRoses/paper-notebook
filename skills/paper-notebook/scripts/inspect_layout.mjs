#!/usr/bin/env node
/** Measure every physical sheet; Playwright is optional and is never reported as run when absent. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const args=process.argv.slice(2),artifact=args[0],option=name=>args[args.indexOf(name)+1];
if(!artifact||!args.includes('--source'))throw new Error('Usage: node scripts/inspect_layout.mjs tutorial.html --source notebook.json --out layout-report.json');
const hash=b=>createHash('sha256').update(b).digest('hex'),source=await readFile(option('--source')),html=await readFile(artifact),out=args.includes('--out')?resolve(option('--out')):resolve(artifact+'.layout.json');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true}),report={inspected:true,artifactSHA256:hash(html),sourceSHA256:hash(source),viewports:[{width:1440,height:1000},{width:820,height:1180},{width:390,height:844}],expectedSheets:0,checkedSheets:0,issues:[],sheets:[]};
try{
 for(const viewport of report.viewports){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});await context.route(/^https?:/,r=>r.abort());const page=await context.newPage();page.on('pageerror',e=>report.issues.push({viewport,error:e.message}));
  await page.goto(pathToFileURL(resolve(artifact)).href+'?demo',{waitUntil:'load'});await page.waitForFunction(()=>window.reader?.fontsCalibrated);await page.evaluate(()=>document.fonts.ready);
  const expected=JSON.parse(source);assert.deepEqual(await page.evaluate(()=>reader.d.notebook),expected.notebook,'Inspected artifact must contain the supplied source');
  const count=await page.evaluate(()=>{reader.profile.layout='single';reader.profile.motion='reduced';reader.render();return reader.pages.length;});report.expectedSheets+=count;
  for(let i=0;i<count;i++){
   await page.evaluate(i=>reader.goPage(i,true),i);await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.reader-stage img')].map(im=>im.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(r));});
   const sheet=await page.evaluate(()=>{const paper=document.querySelector('.reader-stage > .reader-page-wrap .page-surface');if(!paper)return {issues:['No visible paper']};const issues=[],box=paper.getBoundingClientRect(),body=paper.querySelector('.reader-page-body').getBoundingClientRect();for(const n of paper.querySelectorAll('.reader-content,.paper-notes,.paper-bottom,.table-scroll,.figure-layout')){const r=n.getBoundingClientRect(),style=getComputedStyle(n);if(n.matches('.reader-content,.paper-notes')&&(r.bottom>body.bottom+2||r.top<body.top-2))issues.push(n.className+' outside body');if(n.matches('.paper-bottom')&&r.bottom>box.bottom+2)issues.push('bottom margin outside paper');if(n.matches('.reader-content,.paper-notes,.paper-bottom')&&n.scrollHeight>n.clientHeight+2&&!['auto','scroll'].includes(style.overflowY))issues.push(n.className+' clipped vertically');}for(const image of paper.querySelectorAll('img'))if(!image.naturalWidth)issues.push('image failed to decode');return {pageId:paper.dataset.page,part:paper.dataset.part,issues,tables:[...paper.querySelectorAll('.table-scroll')].map(n=>({width:n.clientWidth,contentWidth:n.scrollWidth})),images:[...paper.querySelectorAll('img')].map(n=>({width:n.clientWidth,height:n.clientHeight,naturalWidth:n.naturalWidth,naturalHeight:n.naturalHeight}))};});
   report.checkedSheets++;report.sheets.push({viewport,index:i,...sheet});for(const issue of sheet.issues)report.issues.push({viewport,index:i,pageId:sheet.pageId,issue});
  }
  await context.close();
 }
}finally{await browser.close();}
await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify({report:out,checkedSheets:report.checkedSheets,issues:report.issues.length}));if(report.issues.length)process.exitCode=1;
