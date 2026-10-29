import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true}),root=process.cwd(),errors=[],checks=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const report=JSON.parse(await readFile(root+'/output/conversation-package-check/paper-notebook/output/build-report.json','utf8'));const offline=root+'/output/conversation-package-check/paper-notebook/output/'+report.html;
 await context.setOffline(true);
 await page.goto(pathToFileURL(root+'/dist/chat-start.html').href);
 const genericPrompt=await page.getByLabel('对话模型提示词',{exact:true}).inputValue();assert.equal(genericPrompt,await readFile('public/paper-notebook-prompt.txt','utf8'));assert.ok(genericPrompt.includes('可下载的单文件离线 HTML'));assert.doesNotMatch(genericPrompt,/Codex|ChatGPT|DeepSeek|WorkBuddy|Markdown\/TXT/i);assert.ok(genericPrompt.length<1200);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));await page.getByRole('button',{name:'复制给对话模型',exact:true}).click();await page.waitForFunction(()=>/已复制|已选中/.test(document.querySelector('#status').textContent));assert.equal(await page.locator('#prompt').evaluate(f=>f.selectionEnd-f.selectionStart),genericPrompt.length);checks.push('Offline start page embeds the concise provider-neutral prompt and supports the copy fallback');
 await page.goto(pathToFileURL(offline).href);await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('.page-surface').getAttribute('data-page'),'product-pain');assert.ok((await page.locator('.reader-content').innerText()).includes('先上传材料'));
 assert.equal(await page.locator('[data-kind=circle]').count(),1);const first=await page.locator('[data-kind=circle]').getAttribute('d');
 await page.evaluate(()=>{const r=window.reader;r.goPage(r.pages.findIndex(p=>p.id==='product-idea'))});await page.locator('.page-transition').waitFor({state:'detached'});assert.equal(await page.locator('.page-surface').getAttribute('data-page'),'product-idea');
 await page.evaluate(()=>window.reader.goPage(0));await page.locator('.page-transition').waitFor({state:'detached'});assert.equal(await page.locator('[data-kind=circle]').getAttribute('d'),first);
 await page.screenshot({path:root+'/docs/screenshots/product-offline-circle.png'});checks.push('Portable Python-built HTML opens offline, preserves source and deterministic circle on return');
 await page.locator('.reader-files summary').click();await page.locator('.reader-file-menu').getByRole('button',{name:'导入',exact:true}).click();await page.getByRole('button',{name:'生成前问答',exact:true}).click();
 await page.getByLabel('学习目标',{exact:true}).fill('复习材料中的重点');
 const prompt=await page.getByLabel('生成提示预览',{exact:true}).inputValue();assert.ok(prompt.startsWith(genericPrompt.trim()));assert.ok(prompt.includes('复习材料中的重点'));
 await page.getByRole('combobox',{name:'使用平台',exact:true}).click();await page.locator('.paper-choice-list:popover-open').getByRole('option',{name:'编程智能体：在工作区生成 HTML',exact:true}).click();
 const workspacePrompt=await page.getByLabel('生成提示预览',{exact:true}).inputValue();assert.ok(workspacePrompt.startsWith((await readFile('skills/paper-notebook/prompts/coding-agent.txt','utf8')).trim()));assert.ok(workspacePrompt.includes('复习材料中的重点'));assert.doesNotMatch(workspacePrompt,/交付 Markdown|只输出.*Markdown/);
 await page.getByRole('combobox',{name:'使用平台',exact:true}).click();await page.locator('.paper-choice-list:popover-open').getByRole('option',{name:'对话环境：下载 HTML 附件',exact:true}).click();assert.equal(await page.getByLabel('生成提示预览',{exact:true}).inputValue(),prompt);
 await page.getByRole('button',{name:'关闭',exact:true}).click();checks.push('Reader brief defaults to a downloadable HTML, switches to workspace delivery and retains every answer');
 // Text-only sample enters the same blank reader through its import UI.
 await page.goto(pathToFileURL(root+'/dist/downloads/blank-notebook.html').href);await page.waitForFunction(()=>!!window.reader);
 await page.locator('.reader-files summary').click();await page.locator('.reader-file-menu').getByRole('button',{name:'导入',exact:true}).click();
 await page.getByLabel('教程源文本',{exact:true}).fill(await readFile('skills/paper-notebook/assets/example.md','utf8'));await page.getByRole('button',{name:'预览导入',exact:true}).click();
 await page.locator('.dialog-foot').getByRole('button',{name:'导入',exact:true}).click();assert.ok(await page.evaluate(()=>window.reader.pages.some(p=>p.blocks.some(b=>b.id==='growth-formula'))));assert.ok(await page.locator('[data-kind=circle]').count());checks.push('A shared tutorial source imports through the offline UI with a blackboard formula, worked example and text mark');
 await page.locator('.reader-files summary').click();await page.locator('.reader-file-menu').getByRole('button',{name:'下载',exact:true}).click();const download=page.waitForEvent('download');await page.locator('.dialog-foot').getByRole('button',{name:'下载离线 HTML',exact:true}).click();const exported=await download,importedPath=root+'/output/conversation-package-check/paper-notebook/output/text-import.html';await exported.saveAs(importedPath);
 await page.goto(pathToFileURL(importedPath).href);await page.waitForFunction(()=>!!window.reader);await page.evaluate(()=>{const r=window.reader;r.goPage(r.pages.findIndex(p=>p.blocks.some(b=>b.id==='growth-formula')))});await page.locator('.page-transition').waitFor({state:'detached'});assert.equal(await page.locator('[data-block=growth-formula]').count(),1);await page.evaluate(()=>{const r=window.reader;r.goPage(r.pages.findIndex(p=>p.blocks.some(b=>b.id==='growth-diagram')))});await page.locator('.page-transition').waitFor({state:'detached'});assert.equal(await page.locator('[data-block=growth-diagram]').count(),1);checks.push('An actual HTML file reopens fully offline with native diagrams');
 await context.setOffline(false);await context.close();
 const pc=await browser.newContext({viewport:{width:1440,height:1000}}),promo=await pc.newPage();promo.on('pageerror',e=>errors.push(e.message));
 await promo.goto(pathToFileURL(root+'/dist/promo.html').href);
 await promo.waitForFunction(()=>document.querySelector('#film-player')?.readyState>=1);
 let spec=await promo.locator('#film-player').evaluate(v=>({duration:v.duration,w:v.videoWidth,h:v.videoHeight}));assert.deepEqual([spec.duration,spec.w,spec.h],[64,1920,1080]);
 await promo.locator('#film-player').evaluate(v=>new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=35.5}));
 await promo.setViewportSize({width:1080,height:1920});await promo.waitForFunction(()=>{const v=document.querySelector('#film-player');return v.videoWidth===1080&&!v.seeking&&v.currentTime>=35.5});
 assert.equal(await promo.locator('#film-player').evaluate(v=>v.paused),true);
 await promo.setViewportSize({width:1440,height:1000});await promo.waitForFunction(()=>{const v=document.querySelector('#film-player');return v.videoWidth===1920&&!v.seeking&&v.currentTime>=35.5});
 await promo.locator('#film-player').scrollIntoViewIfNeeded();
 // Wait for an actually presented frame, rather than capturing the native
 // loading spinner between seek completion and the compositor update.
 await promo.locator('#film-player').evaluate(async v=>{const frame=new Promise(resolve=>v.requestVideoFrameCallback(resolve));await v.play();await frame;v.pause()});
 await promo.screenshot({path:root+'/docs/screenshots/product-film-player.png'});checks.push('The file:// homepage film automatically follows rotation while preserving playback position and pause state');
 assert.deepEqual(errors,[]);await mkdir('docs/verification',{recursive:true});await writeFile('docs/verification/product-delivery-report.json',JSON.stringify({date:new Date().toISOString(),checks,errors,scope:'Chromium, including file:// offline Python-built HTML and text import/export; no remote ChatGPT or DeepSeek account session or physical devices used'},null,2));console.log(checks.join('\n'));
}finally{await browser.close();}
