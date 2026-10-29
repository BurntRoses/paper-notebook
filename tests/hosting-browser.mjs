import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {unzipSync} from 'fflate';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.NOTEBOOK_BASE || 'http://127.0.0.1:5178/paper-notebook-kit/output/site').replace(/\/$/, '') + '/';
const browser = await chromium.launch({ headless: true });
const checks = [], errors = [], links = new Set();
const out = process.cwd() + '/output/hosting';
await mkdir(out, { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  for (const [route,hash] of [['',''],['promo.html',''],['start.html','#read'],['promo-motion.html','#film'],['chat-start.html','#create'],['chat-start.html#agent','#agent'],['chat-start.html#chat','#chat']]) {
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200, route);
    if(hash!==null)await page.waitForURL(url=>url.pathname===new URL(base).pathname&&url.hash===hash);
    assert.deepEqual(await page.locator('.site-header nav a').allTextContents(),['制作我的笔记','试读一本','观看演示','GitHub ☆']);
    assert.equal(await page.locator('#site-menu').isVisible(),false);
    assert.equal(await page.locator('.read-next,a[href="downloads/blank-notebook.html"]').count(),0);
    assert.doesNotMatch(await page.locator('body').innerText(),/笔记生成后，在这里阅读|聊天附件预览不等于/);
    assert.equal(await page.locator('.site-trail,.site-support').count(),0);
    assert.equal(await page.locator('a[href$=".mp4"],a[href*="promo-source"],a[href*="film-script"],a[href*="docs/"]').count(),0);
    assert.doesNotMatch(await page.locator('body').innerText(),/64 秒|30 fps|原创配乐|分镜脚本|脚本与影片素材/);
    for (const url of await page.locator('a[href],img[src],iframe[src],video[src],script[src],link[rel=stylesheet]').evaluateAll(nodes => nodes.map(node => new URL(node.getAttribute('href') || node.getAttribute('src'), location.href).href))) {
      if (url.startsWith(base) && !url.includes('#')) links.add(url);
    }
    if (!route) {
      assert.match(await page.locator('h1').innerText(),/你的材料，[\s]*你的学习笔记。/);
      await page.locator('#read').scrollIntoViewIfNeeded();
      const preview=page.frameLocator('.reader-preview');await preview.locator('.page-surface').waitFor();
      const passage=preview.locator('.reader-stage .ink-text').first();
      await passage.evaluate(()=>document.fonts.ready);const outer=await page.locator('.reader-preview').boundingBox();const box=await passage.evaluate(s=>{const range=document.createRange();range.setStart(s.firstChild,0);range.setEnd(s.firstChild,8);const r=range.getClientRects()[0];return{x:r.x,y:r.y,width:r.width,height:r.height}});await page.mouse.move(outer.x+box.x+2,outer.y+box.y+box.height/2);await page.mouse.down();await page.mouse.move(outer.x+box.x+box.width-1,outer.y+box.y+box.height/2,{steps:12});await page.mouse.up();
      await preview.locator('.reader-selection-toolbar').waitFor();await preview.getByRole('button',{name:'文字颜色：紫色',exact:true}).click();assert.ok(await preview.locator('.red-ink').count());
      await preview.locator('.reader-stage .page-surface').click({button:'right',position:{x:30,y:150}});await preview.getByRole('menu',{name:'纸页菜单'}).waitFor();await preview.getByRole('button',{name:'打开右边栏',exact:true}).click();assert.ok(await preview.locator('.reader-workspace-sidebar').isVisible());
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({ path: out + '/homepage.png' });
      checks.push('One product home embeds the actual reader; legacy pages redirect to the matching section');
    }
  }
  for(const route of ['docs/product-film-script.md','downloads/paper-notebook-promo-source.zip','downloads/machine-learning.json','promo/product-film-script.json','promo/product-film-music.wav'])assert.equal((await context.request.get(base+route)).status(),404,route);
  checks.push('Public deployment excludes production scripts, source bundles, source JSON and standalone music; navigation is consolidated in a single quick-access menu');
  for (const url of links) {
    const response = await context.request.head(url);
    assert.equal(response.status(), 200, url);
  }
  checks.push(`All ${links.size} same-site navigation, image, film and download targets return HTTP 200`);

  const toggle=page.getByRole('button',{name:'快速开始 ＋',exact:true});
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  await page.screenshot({path:out+'/quick-menu.png'});
  await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.ok(await toggle.evaluate(b=>b===document.activeElement));
  await toggle.click();await page.locator('h1').click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await toggle.click();await page.locator('#site-menu').getByRole('link',{name:'制作我的笔记',exact:true}).click();
  assert.equal(new URL(page.url()).hash,'#create');assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await toggle.focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'制作我的笔记');await page.keyboard.press('Escape');
  checks.push('Quick menu opens with click/keyboard, closes on Escape/outside/link and restores keyboard focus');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(base + 'chat-start.html');
  assert.equal(await page.locator('#chat .actions > :first-child').getAttribute('id'),'copy');
  const packageLink=page.getByRole('link',{name:'备用：下载构建包',exact:true});
  assert.equal(await packageLink.getAttribute('href'),'downloads/paper-notebook-upload.zip');
  const packageDownload=page.waitForEvent('download');await packageLink.click();
  const uploadedPackage=await packageDownload;assert.equal(uploadedPackage.suggestedFilename(),'paper-notebook-upload.zip');
  const wrapper=await readFile(await uploadedPackage.path());assert.equal(wrapper.subarray(0,2).toString(),'PK');const inner=unzipSync(wrapper)['paper-notebook-upload/paper-notebook-conversation.zip'];assert.deepEqual(Buffer.from(inner),await readFile('dist/downloads/paper-notebook-conversation.zip'));
  checks.push('Conversation route downloads a wrapper containing the unchanged runtime ZIP; copying instructions remains the primary action');
  await page.locator('#download-help summary').click();
  assert.match(await page.locator('#download-help').innerText(),/paper-notebook[\s\S]*压缩[\s\S]*无需重新下载/);
  assert.match(await page.locator('#download-help').innerText(),/paper-notebook-upload[\s\S]*paper-notebook-conversation\.zip/);
  assert.match(await page.locator('#download-help').innerText(),/Safari[\s\S]*安全的/);
  checks.push('Auto-expanded downloads have a folder-recompression recovery path and optional Safari setting instructions');
  const prompt = await page.getByLabel('对话模型提示词', { exact: true }).inputValue();
  assert.equal(prompt, await readFile('skills/paper-notebook/prompts/conversation-model.txt', 'utf8'));
  const repositoryPrompt = await page.getByLabel('编程智能体提示词', { exact: true }).inputValue();
  assert.equal(repositoryPrompt, await readFile('skills/paper-notebook/prompts/coding-agent.txt', 'utf8'));
  for(const text of [prompt,repositoryPrompt]){
    assert.ok(text.trim().length < 160, `Prompt should stay concise (${text.length} chars)`);
    assert.equal(text.trim().split(/\r?\n/).length,1);
    assert.ok(text.includes('https://github.com/BurntRoses/paper-notebook'));
    assert.doesNotMatch(text,/Codex|ChatGPT|DeepSeek|WorkBuddy/i);
    assert.doesNotMatch(text,/只输出.*Markdown|交付 Markdown|输出完整.*Markdown/);
    assert.match(text,/HTML/);
  }
  checks.push('Short provider-neutral prompts route by available tools and require HTML file delivery');
  assert.ok(repositoryPrompt.includes('工作区'));
  assert.ok(prompt.includes('可下载的单文件离线 HTML'));
  await page.getByRole('button', { name: '复制给编程智能体', exact: true }).click();
  await page.waitForFunction(() => /已复制|已选中/.test(document.querySelector('#repository-status').textContent));
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), repositoryPrompt);
  await page.getByRole('button', { name: '复制给对话模型', exact: true }).click();
  await page.waitForFunction(() => /已复制|已选中/.test(document.querySelector('#status').textContent));
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), prompt);
  checks.push('Both copy buttons put the complete concise instructions on the clipboard');

  const fallback = await context.newPage();
  await fallback.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Clipboard unavailable'); } } });
    document.execCommand = () => false;
  });
  await fallback.goto(base + 'chat-start.html');
  for (const [button, field, status] of [['复制给编程智能体', '#repository-prompt', '#repository-status'], ['复制给对话模型', '#prompt', '#status']]) {
    await fallback.getByRole('button', { name: button, exact: true }).click();
    await fallback.waitForFunction(selector => document.querySelector(selector).textContent.includes('已选中完整指令'), status);
    assert.ok(await fallback.locator(field).isVisible());
    assert.equal(await fallback.locator(field).evaluate(el => el.selectionEnd - el.selectionStart), (await fallback.locator(field).inputValue()).length);
  }
  await fallback.close();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + 'chat-start.html');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: out + '/copy-phone.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#create').scrollIntoViewIfNeeded();
  await page.screenshot({ path: out + '/copy-desktop.png' });
  checks.push('Clipboard-denied fallback reveals and selects each complete prompt; mobile layout fits the viewport');

  await page.goto(base + 'downloads/blank-notebook.html?demo');
  await page.waitForFunction(() => !!window.reader);
  await page.locator('.reader-files summary').click();
  await page.locator('.reader-file-menu').getByRole('button', { name: '导入', exact: true }).click();
  await page.getByLabel('教程源文本', { exact: true }).fill(await readFile('skills/paper-notebook/assets/example.md', 'utf8'));
  await page.getByRole('button', { name: '预览导入', exact: true }).click();
  await page.locator('.dialog-foot').getByRole('button', { name: '导入', exact: true }).click();
  assert.equal(await page.locator('[data-block=growth-formula]').count(), 1);
  assert.ok(await page.locator('[data-kind=circle]').count());
  await page.locator('.reader-files summary').click();
  await page.locator('.reader-file-menu').getByRole('button', { name: '下载', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.locator('.dialog-foot').getByRole('button', { name: '下载离线 HTML', exact: true }).click();
  const file = await downloaded;
  await file.saveAs(out + '/imported-notebook.html');
  checks.push('Reader can import an existing structured source and export it as HTML');

  const mediaRequests=[];
  const filmContext=await browser.newContext({viewport:{width:1440,height:1000}}),film=await filmContext.newPage();
  film.on('pageerror',error=>errors.push(error.message));
  film.on('request',r=>{if(/\.mp4(?:\?|$)/.test(r.url()))mediaRequests.push(r.url())});
  await film.goto(base);
  await film.waitForFunction(()=>[...document.querySelectorAll('video')].length===1&&document.querySelector('video').readyState>=2&&document.querySelector('video').preload==='auto');
  assert.ok(mediaRequests.some(url=>url.includes('/paper-notebook-film.mp4')));
  assert.ok(mediaRequests.every(url=>!url.includes('-portrait.mp4')),'only the current orientation downloads initially');
  assert.equal(await film.locator('video:visible').count(),1);
  await film.waitForFunction(()=>[...document.querySelectorAll('video')].every(v=>v.buffered.length&&v.buffered.end(v.buffered.length-1)>8));
  assert.deepEqual(await film.locator('#film-player').evaluate(v=>[v.duration,v.videoWidth,v.videoHeight]),[64,1280,720]);
  await film.locator('#film-player').evaluate(v=>new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=5}));
  await film.setViewportSize({width:390,height:844});
  await film.waitForFunction(()=>{const v=document.querySelector('#film-player');return v.videoWidth===720&&!v.seeking&&v.currentTime>=5&&!v.hasAttribute('aria-busy')});
  assert.equal(await film.locator('#film-player').evaluate(v=>v.paused),true);
  await film.locator('#film-player').evaluate(v=>v.play());
  await film.waitForFunction(()=>document.querySelector('#film-player').currentTime>5.2);
  await film.setViewportSize({width:1180,height:820});
  await film.waitForFunction(()=>{const v=document.querySelector('#film-player');return v.videoWidth===1280&&!v.paused&&!v.seeking&&v.currentTime>=5});
  await film.setViewportSize({width:820,height:1180});
  await film.setViewportSize({width:1180,height:820});
  await film.waitForFunction(()=>{const v=document.querySelector('#film-player');return v.videoWidth===1280&&!v.paused&&!v.seeking&&v.currentTime>=5&&!v.hasAttribute('aria-busy')});
  assert.equal(await film.locator('.film-status').textContent(),'');
  assert.ok(mediaRequests.some(url=>url.includes('-portrait.mp4')));assert.equal(await film.locator('video').count(),1);
  await film.locator('#film-player').scrollIntoViewIfNeeded();
  await film.screenshot({path:out+'/film-player.png'});
  await filmContext.close();
  checks.push('The current orientation buffers before interaction without a competing hidden film; rotation and rapid reversal retain time/play state');
  for(const [width,height]of [[360,780],[390,844],[820,1180],[1180,820],[1440,1000]]){
    await page.setViewportSize({width,height});await page.goto(base);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}×${height}`);
    const expected=width>height?'landscape':'portrait';await page.waitForFunction(o=>document.querySelector('#film-player')?.dataset.orientation===o,expected);
    if(width===390)await page.screenshot({path:out+'/home-phone.png',fullPage:true});
  }
  checks.push('Home and automatic film/poster selection fit phone, tablet and desktop viewports');

  // Rotate before media headers arrive, then seek beyond the initial buffer.
  const cold=await context.newPage();
  cold.on('pageerror',error=>errors.push(error.message));
  await cold.route(/\.mp4(?:\?|$)/,async route=>{await new Promise(resolve=>setTimeout(resolve,600));await route.continue()});
  await cold.goto(base,{waitUntil:'domcontentloaded'});
  await cold.setViewportSize({width:390,height:844});
  await cold.setViewportSize({width:1440,height:1000});
  await cold.waitForFunction(()=>{const v=document.querySelector('#film-player');return v?.videoWidth===1280&&v.readyState>=2&&!v.hasAttribute('aria-busy')});
  await cold.locator('#film-player').evaluate(async v=>{v.currentTime=32;await v.play()});
  await cold.waitForFunction(()=>document.querySelector('#film-player').currentTime>32.1);
  await cold.setViewportSize({width:390,height:844});
  await cold.waitForFunction(()=>{const v=document.querySelector('#film-player');return v.videoWidth===720&&!v.paused&&!v.seeking&&v.currentTime>=32&&!v.hasAttribute('aria-busy')});
  await cold.close();
  checks.push('Cold media headers and a seek beyond the initial buffer preserve playback through rotation');

  const slowContext=await browser.newContext({viewport:{width:1440,height:1000}}),slow=await slowContext.newPage();
  const network=await slowContext.newCDPSession(slow);await network.send('Network.enable');await network.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:180*1024,uploadThroughput:60*1024});
  await slow.goto(base,{waitUntil:'domcontentloaded'});await slow.waitForFunction(()=>document.querySelector('#film-player')?.readyState>=2,{},{timeout:45000});
  const playback=await slow.locator('#film-player').evaluate(async v=>{let waits=0;v.addEventListener('waiting',()=>waits++);const began=performance.now();await v.play();await new Promise(resolve=>setTimeout(resolve,8000));return{elapsed:(performance.now()-began)/1000,played:v.currentTime,waits,width:v.videoWidth}});
  assert.ok(playback.played>6,JSON.stringify(playback));assert.equal(playback.width,1280);await slowContext.close();
  checks.push(`At 180 KiB/s download and 150 ms latency, playback advances ${playback.played.toFixed(1)} seconds during ${playback.elapsed.toFixed(1)} seconds (${playback.waits} waiting events)`);

  const safari=await webkit.launch({headless:true});
  try{
    const sc=await safari.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),sp=await sc.newPage();
    sp.on('pageerror',error=>errors.push(error.message));
    await sp.goto(base+'chat-start.html#chat');await sp.waitForURL(url=>url.hash==='#chat'&&url.pathname===new URL(base).pathname);
    await sp.getByRole('button',{name:'快速开始 ＋',exact:true}).click();
    assert.ok(await sp.locator('#site-menu').isVisible());await sp.keyboard.press('Escape');assert.equal(await sp.locator('#site-menu').isVisible(),false);
    await sp.getByRole('button',{name:'复制给对话模型',exact:true}).click();
    await sp.waitForFunction(()=>/已复制|已选中/.test(document.querySelector('#status').textContent));
    await sp.waitForFunction(()=>[...document.querySelectorAll('video')].every(v=>v.readyState>=2&&v.preload==='auto'));
    await sp.locator('#film-player').evaluate(v=>new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=32}));
    await sp.setViewportSize({width:390,height:844});
    await sp.waitForFunction(()=>{const v=document.querySelector('#film-player');return v.videoWidth===720&&!v.seeking&&v.currentTime>=32&&!v.hasAttribute('aria-busy')});
    assert.equal(await sp.locator('#film-player').evaluate(v=>v.paused),true);
    await sp.locator('#film-player').evaluate(v=>v.play());
    await sp.setViewportSize({width:1440,height:1000});
    await sp.waitForFunction(()=>{const v=document.querySelector('#film-player');return v.videoWidth===1280&&!v.paused&&!v.seeking&&v.currentTime>=32&&!v.hasAttribute('aria-busy')});
    await sp.setViewportSize({width:390,height:844});
    await sp.locator('#create').scrollIntoViewIfNeeded();
    assert.ok(await sp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await sp.screenshot({path:out+'/safari-create-phone.png'});
    await sc.close();
  }finally{await safari.close()}
  checks.push('WebKit also passes merged legacy entry, menu, copy, mobile layout and paused/playing rotation at 32 seconds');

  const skill = await context.request.get(base + 'downloads/paper-notebook-skill.zip');
  assert.equal(skill.status(), 200);
  const body = await skill.body();
  assert.equal(body.subarray(0, 2).toString(), 'PK');
  const sha256 = createHash('sha256').update(body).digest('hex');
  checks.push('Portable Skill ZIP downloads successfully');
  const conversation = await context.request.get(base + 'downloads/paper-notebook-conversation.zip');
  assert.equal(conversation.status(), 200);
  assert.equal((await conversation.body()).subarray(0, 2).toString(), 'PK');
  const upload = await context.request.get(base + 'downloads/paper-notebook-upload.zip');
  assert.equal(upload.status(), 200);assert.equal((await upload.body()).subarray(0, 2).toString(), 'PK');
  checks.push('Portable conversation build package and browser-safe upload wrapper are publicly available');
  assert.deepEqual(errors, []);
  const report = { date: new Date().toISOString(), base, checks, errors, skillSHA256: sha256, scope: 'Chromium and WebKit over HTTP(S); browser imports and HTML download, responsive films, legacy redirects, public exposure restrictions and all primary page links' };
  await writeFile(out + '/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
