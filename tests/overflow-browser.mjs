import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
await mkdir('output/overflow',{recursive:true});
for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});
  await context.route(/^https?:/,route=>route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(resolve('dist/downloads/blank-notebook.html')).href+'?demo');
  await page.waitForFunction(()=>window.reader?.fontsCalibrated);
  assert.equal(await page.evaluate(()=>reader.profile.paperStyle),'ivory');
  await page.evaluate(()=>{
   const r=reader,notes='页边补充说明。'.repeat(120);
   r.d.notebook.chapters=[{id:'overflow-chapter',title:'长内容检查',pages:[
    {id:'code-page',title:'长代码',blocks:[{id:'long-code',type:'code',language:'python',text:Array.from({length:120},(_,i)=>`value_${i} = "${'x'.repeat(120)}"`).join('\n')}]},
    {id:'table-page',title:'宽表与续表',blocks:[{id:'wide-table',type:'comparison',columns:Array.from({length:16},(_,i)=>'列 '+i),rows:Array.from({length:28},(_,i)=>Array.from({length:16},(_,j)=>String(i*16+j)))}]},
    {id:'tall-page',title:'单行长表',blocks:[{id:'tall-table',type:'comparison',columns:['编号','说明'],rows:[['1','长表格内容。'.repeat(240)]]}]},
    {id:'margin-page',title:'长页边说明',summary:notes,blocks:[{id:'margin-text',type:'prose',text:'核心概念和适用条件。'}],cues:[{id:'long-cue',title:'补充定义',text:notes,blockId:'margin-text',anchor:'核心概念'}]}
   ]}];
   r.d.userState.notes=[{id:'long-note',pageId:'margin-page',title:'',text:notes,back:'',material:'transparent',seed:1,x:0,y:0,z:1,face:'front',attached:false,collapsed:false,surface:'page',region:'right',marginPosition:.2,sheet:0}];
   r.d.userState.lastPageId='code-page';r.invalidate();r.pageIndex=0;r.render();
  });
  const source=await page.evaluate(()=>JSON.stringify(reader.d.notebook));
  for(const [width,height,layout,margins] of [[1440,1000,'single',true],[1024,768,'single',false],[1440,1000,'spread',true],[820,1180,'spread',true],[390,844,'single',true]]){
   await page.setViewportSize({width,height});
   await page.waitForFunction(()=>reader.lastWidth===innerWidth&&reader.lastHeight===innerHeight);
   await page.evaluate(({layout,margins})=>{reader.profile.layout=layout;reader.rightSidebarOpen=margins;reader.profile.bottomNotes=margins;reader.render();reader.goPage(0,true);},{layout,margins});
   const integrity=await page.evaluate(()=>({code:reader.pages.flatMap(p=>p.blocks).filter(b=>b.id==='long-code').map(b=>b.text).join(''),rows:reader.pages.flatMap(p=>p.blocks).filter(b=>b.id==='wide-table').flatMap(b=>b.rows)}));
   const original=JSON.parse(source).chapters[0].pages;
   assert.equal(integrity.code,original[0].blocks[0].text);assert.deepEqual(integrity.rows,original[1].blocks[0].rows);
   const issues=await page.evaluate(async()=>{
    const issues=[];
    for(let i=0;i<reader.pages.length;i++){
     reader.goPage(i,true);await new Promise(resolve=>requestAnimationFrame(resolve));
     for(const paper of document.querySelectorAll('.reader-stage > .reader-page-wrap .page-surface')){
      if(paper.dataset.paperStyle!=='ivory')issues.push('paper default');
      const body=paper.querySelector('.reader-page-body').getBoundingClientRect();
      for(const node of paper.querySelectorAll('.reader-content,.paper-notes,.oversize-object')){
       const r=node.getBoundingClientRect();if(r.bottom>body.bottom+2||r.top<body.top-2)issues.push(node.className+' outside body');
       if(node.scrollHeight>node.clientHeight+2){
        if(!['auto','scroll'].includes(getComputedStyle(node).overflowY))issues.push(node.className+' inaccessible');
        node.scrollTop=node.scrollHeight;if(node.scrollTop<1)issues.push(node.className+' cannot scroll');node.scrollTop=0;
       }
      }
     }
    }
    return issues;
   });
   assert.deepEqual(issues,[],`${engine} ${width} ${layout} margins=${margins}`);
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.waitForFunction(()=>reader.lastWidth===innerWidth&&reader.lastHeight===innerHeight);
  await page.evaluate(()=>{reader.profile.layout='single';reader.rightSidebarOpen=true;reader.profile.bottomNotes=true;reader.render();reader.goPage(0,true);});
  await page.locator('.block-code pre').focus();await page.keyboard.press('PageDown');await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>reader.pageIndex),0);
  assert.ok(await page.locator('.block-code').evaluate(n=>n.scrollTop>0),'PageDown scrolls focused code');
  for(const selector of ['.block-code pre','.paper-notes','.paper-bottom']){
   await page.locator(selector).focus();assert.equal(await page.locator(selector).evaluate(n=>getComputedStyle(n).outlineStyle),'none');
  }
  await page.evaluate(()=>reader.goPage(reader.pages.findIndex(p=>p.id==='margin-page'),true));
  await page.locator('.cornell-cue').focus();assert.equal(await page.locator('.cornell-cue').evaluate(n=>getComputedStyle(n).outlineStyle),'none');
  await page.locator('.workspace-note textarea').focus();assert.equal(await page.locator('.workspace-note').evaluate(n=>getComputedStyle(n).outlineStyle),'none');
  await page.mouse.click(2,65);await page.screenshot({path:`output/overflow/${engine}-margins.png`});
  assert.equal(await page.evaluate(()=>JSON.stringify(reader.d.notebook)),source);
  assert.deepEqual(errors,[]);
  console.log(`✓ ${engine}: long code/tables/margins scroll within paper; all source content retained; single/spread/mobile and hidden margins fit; ivory default; keyboard scroll and quiet focus`);
 }finally{await browser.close();}
}
