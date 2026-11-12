import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
await mkdir('output/inline-math',{recursive:true});
const d=JSON.parse(await readFile('dist/downloads/blank-notebook.json','utf8'));
const body=String.raw`每期增长率固定为 \(r=0.1\)，复利余额为 \(P_n=P_0(1+r)^n\)。本金100元，两期后为 $100(1.1)^2=121$ 元。`;
const long=Array.from({length:50},(_,i)=>`第${i+1}期，`+String.raw`余额满足 \(P_{n+1}=P_n(1+r)\)。相同增长率作用于逐期扩大的本金。`).join('\n\n');
d.notebook={...d.notebook,id:'test-inline-math',title:'复利的递推关系',sources:[],chapters:[{id:'inline-chapter',title:'复利',pages:[{id:'inline-page',title:'逐期增长',layout:'reading',subject:'stem',blocks:[{id:'inline-body',type:'prose',text:body,study:{marks:[{text:'每期增长率',kind:'bold'},{text:'每期增长率',kind:'red',color:'#285f9e'},{text:String.raw`\(P_n=P_0(1+r)^n\)`,kind:'bold'},{text:String.raw`\(P_n=P_0(1+r)^n\)`,kind:'red',color:'#285f9e'}]}},{id:'inline-code',type:'code',language:'python',text:'value = "$x$"'},{id:'inline-exercise',type:'exercise',questionType:'single',question:String.raw`当 \(r=0\) 时，增长因子为多少？`,options:[{id:'inline-a',text:'$1+r=1$'},{id:'inline-b',text:'$1+r=0$'}],solution:['inline-a'],explanation:String.raw`代入 \(r=0\)，得到 \(1+r=1\)。`,points:1}]},{id:'long-page',title:'连续增长',layout:'reading',subject:'stem',blocks:[{id:'long-body',type:'prose',text:long}]}]}]};d.userState.lastPageId='inline-page';d.extensions={readerProfile:{font:'hand',paperStyle:'ivory',layout:'single',transition:'none'}};
const source='output/inline-math/notebook.json';await writeFile(source,JSON.stringify(d,null,2));
const built=spawnSync(process.execPath,['tools/notebook.mjs','build',source,'--out','output/inline-math/build'],{encoding:'utf8'});assert.equal(built.status,0,built.stderr);
const file=process.cwd()+'/output/inline-math/build/复利的递推关系-v1.html';
const reports=[];
for(const [engine,type]of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});try{
 const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage(),requests=[],errors=[];
 page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.goto(pathToFileURL(file).href+'?demo');await page.waitForFunction(()=>reader?.fontsCalibrated);
 assert.equal(await page.locator('[data-block=inline-body] .inline-math').count(),3);assert.equal(await page.locator('.katex-error').count(),0);assert.equal(await page.locator('[data-block=inline-code] code').innerText(),'value = "$x$"');
 const selected=await page.evaluate(()=>{const p=document.querySelector('[data-block=inline-body] p'),range=document.createRange();range.selectNodeContents(p);getSelection().removeAllRanges();getSelection().addRange(range);reader.editor.cacheSelection();return reader.editor.selection.map(p=>p.selector.exact).join('')});assert.equal(selected,body);
 const copied=await page.evaluate(()=>{const clipboardData=new DataTransfer();document.dispatchEvent(new ClipboardEvent('copy',{clipboardData,cancelable:true}));return clipboardData.getData('text/plain')});assert.equal(copied,body);
 await page.evaluate(()=>reader.editor.mark('underline'));assert.equal(await page.locator('[data-block=inline-body] .inline-math[data-ink-bold]').count(),1);
 const selectors=await page.evaluate(()=>reader.d.userState.annotations[0].selectors);assert.equal(selectors.map(s=>s.exact).join(''),body);
 await page.evaluate(()=>reader.editor.undo());assert.equal(await page.evaluate(()=>reader.d.userState.annotations.length),0);await page.evaluate(()=>reader.editor.redo());assert.equal(await page.evaluate(()=>reader.d.userState.annotations.length),1);
 await page.screenshot({path:`output/inline-math/${engine}-desktop.png`});
 for(const [width,height]of [[820,620],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForFunction(()=>reader.lastWidth===innerWidth&&reader.lastHeight===innerHeight);
  const result=await page.evaluate(()=>{reader.goBlock('inline-page','inline-body');const source=reader.d.notebook.chapters[0].pages[1].blocks[0].text,parts=reader.pages.filter(p=>p.id==='long-page').flatMap(p=>p.blocks).map(b=>b.text||'');return{roundtrip:parts.join('')===source,intact:parts.every(p=>(p.match(/\\\(/g)||[]).length===(p.match(/\\\)/g)||[]).length),overflow:document.documentElement.scrollWidth>innerWidth+2}});assert.deepEqual(result,{roundtrip:true,intact:true,overflow:false});
 }
 await page.evaluate(()=>reader.showExport());const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载离线 HTML',exact:true}).click();const saved=process.cwd()+`/output/inline-math/${engine}-saved.html`;await(await download).saveAs(saved);
 const offline=await context.newPage();await offline.route(/^https?:/,r=>r.abort());await offline.goto(pathToFileURL(saved).href+'?demo');await offline.waitForFunction(()=>reader?.fontsCalibrated);await offline.evaluate(()=>reader.goBlock('inline-page','inline-body'));assert.equal(await offline.locator('[data-block=inline-body] .inline-math').count(),3);assert.deepEqual(await offline.evaluate(()=>reader.d.userState.annotations[0].selectors),selectors);
 await offline.evaluate(()=>reader.preparePDF({orientation:'portrait',includeRecords:true}));assert.equal(await offline.locator('#print-root .katex-error').count(),0);assert.ok(await offline.locator('#print-root .inline-math').count()>50);await offline.evaluate(()=>reader.finishPrint());
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);reports.push({engine,sourceOffsets:true,sourceCopy:true,marksUndoRedo:true,formulaIntegrity:true,offline:true,print:true,requests,errors});console.log(engine+': inline formulas, source selection/copy, marks, pagination, offline and print passed');await context.close();
 }finally{await browser.close()}
}
await writeFile('output/inline-math/report.json',JSON.stringify(reports,null,2));
