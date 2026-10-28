import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.NOTEBOOK_BASE || 'http://127.0.0.1:5178/paper-notebook-kit/output/site').replace(/\/$/, '') + '/';
const browser = await chromium.launch({ headless: true });
const checks = [], errors = [], links = new Set();
const out = process.cwd() + '/output/hosting';
await mkdir(out, { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  for (const [route,hash] of [['',''],['promo.html',''],['start.html','#read'],['promo-motion.html','#film'],['chat-start.html',null]]) {
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200, route);
    if(hash!==null)await page.waitForURL(url=>url.pathname===new URL(base).pathname&&url.hash===hash);
    assert.deepEqual(await page.locator('.site-header nav a').allTextContents(),['试读','制作笔记','GitHub ☆']);
    assert.equal(await page.locator('.site-trail,.site-support').count(),0);
    assert.equal(await page.locator('a[href$=".mp4"],a[href*="promo-source"],a[href*="film-script"],a[href*="docs/"]').count(),0);
    assert.doesNotMatch(await page.locator('body').innerText(),/64 秒|30 fps|原创配乐|分镜脚本|脚本与影片素材/);
    for (const url of await page.locator('a[href],img[src],iframe[src],video[src],script[src],link[rel=stylesheet]').evaluateAll(nodes => nodes.map(node => new URL(node.getAttribute('href') || node.getAttribute('src'), location.href).href))) {
      if (url.startsWith(base) && !url.includes('#')) links.add(url);
    }
    if (!route) {
      assert.match(await page.locator('h1').innerText(),/在纸页里，[\s]*把知识读明白。/);
      await page.locator('#read').scrollIntoViewIfNeeded();
      await page.frameLocator('.reader-preview').locator('.page-surface').waitFor();
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({ path: out + '/homepage.png' });
      checks.push('One product home embeds the actual reader; legacy pages redirect to the matching section');
    }
  }
  for(const route of ['docs/product-film-script.md','downloads/paper-notebook-promo-source.zip','downloads/machine-learning.json','promo/product-film-script.json','promo/product-film-music.wav'])assert.equal((await context.request.get(base+route)).status(),404,route);
  checks.push('Public deployment excludes production scripts, source bundles, source JSON and standalone music; navigation has three clear actions');
  for (const url of links) {
    const response = await context.request.head(url);
    assert.equal(response.status(), 200, url);
  }
  checks.push(`All ${links.size} same-site navigation, image, film and download targets return HTTP 200`);

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(base + 'chat-start.html');
  assert.equal(await page.locator('#chat .actions > :first-child').getAttribute('id'),'copy');
  const packageLink=page.getByRole('link',{name:'备用：下载构建包',exact:true});
  assert.equal(await packageLink.getAttribute('href'),'downloads/paper-notebook-conversation.zip');
  const packageDownload=page.waitForEvent('download');await packageLink.click();
  const uploadedPackage=await packageDownload;assert.equal(uploadedPackage.suggestedFilename(),'paper-notebook-conversation.zip');
  assert.equal((await readFile(await uploadedPackage.path())).subarray(0,2).toString(),'PK');
  checks.push('Conversation route offers a real ZIP as a manual fallback; copying instructions is the primary action');
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
  await page.screenshot({ path: out + '/copy-desktop.png', fullPage: true });
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

  await page.goto(base + 'promo-motion.html');
  await page.waitForURL(url=>url.hash==='#film');
  assert.equal(await page.getByRole('button',{name:'竖屏',exact:true}).count(),0);
  await page.locator('video').evaluate(v=>{v.preload='auto';v.load()});
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 1);
  assert.deepEqual(await page.locator('video').evaluate(v => [v.duration, v.videoWidth, v.videoHeight]), [64, 1920, 1080]);
  await page.waitForFunction(()=>{const v=document.querySelector('video');return v.seekable.length&&v.seekable.end(0)>40});
  await page.locator('video').evaluate(v=>new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=32}));
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(() => {const v=document.querySelector('video');return v.videoWidth===1080&&!v.seeking&&v.currentTime>=32});
  assert.equal(await page.locator('video').evaluate(v=>v.paused),true);
  await page.locator('video').evaluate(v=>v.play());
  await page.locator('video').evaluate(v=>{
    window.filmResumeRequests=[];
    const play=v.play.bind(v);
    v.play=()=>{window.filmResumeRequests.push({orientation:v.dataset.orientation,seeking:v.seeking,time:v.currentTime});return play()};
  });
  // Delayed media headers reproduce rotation while a new source is buffering.
  await page.route('**/*.mp4',async route=>{await new Promise(resolve=>setTimeout(resolve,250));await route.continue()});
  await page.setViewportSize({width:1180,height:820});
  await page.waitForFunction(()=>document.querySelector('video').getAttribute('aria-busy')==='true');
  assert.equal(await page.locator('.film-status').textContent(),'影片加载中…');
  await page.waitForFunction(()=>{const v=document.querySelector('video');return v.videoWidth===1920&&!v.paused&&v.currentTime>=32});
  assert.ok(await page.evaluate(()=>window.filmResumeRequests.some(r=>r.orientation==='landscape'&&r.seeking&&r.time>=32)),'Resume playback while the restored frame is still seeking');
  // Reverse two rotations while metadata is still loading.
  await page.setViewportSize({width:820,height:1180});
  await page.waitForFunction(()=>document.querySelector('video').dataset.orientation==='portrait');
  await page.setViewportSize({width:1180,height:820});
  await page.waitForFunction(()=>{const v=document.querySelector('video');return v.videoWidth===1920&&!v.paused&&!v.seeking&&v.currentTime>=32});
  await page.waitForFunction(()=>!document.querySelector('video').hasAttribute('aria-busy'));
  assert.equal(await page.locator('.film-status').textContent(),'');
  await page.unroute('**/*.mp4');
  await page.locator('video').evaluate(v=>v.pause());
  checks.push('Film follows screen ratio automatically; delayed media and rapid reversal preserve time/play state, resume during seek and clear loading feedback');
  for(const [width,height]of [[360,780],[390,844],[820,1180],[1180,820],[1440,1000]]){
    await page.setViewportSize({width,height});await page.goto(base);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}×${height}`);
    const expected=width>height?'landscape':'portrait';await page.waitForFunction(o=>document.querySelector('video')?.dataset.orientation===o,expected);
    if(width===390)await page.screenshot({path:out+'/home-phone.png',fullPage:true});
  }
  checks.push('Home and automatic film/poster selection fit phone, tablet and desktop viewports');

  const skill = await context.request.get(base + 'downloads/paper-notebook-skill.zip');
  assert.equal(skill.status(), 200);
  const body = await skill.body();
  assert.equal(body.subarray(0, 2).toString(), 'PK');
  const sha256 = createHash('sha256').update(body).digest('hex');
  checks.push('Portable Skill ZIP downloads successfully');
  const conversation = await context.request.get(base + 'downloads/paper-notebook-conversation.zip');
  assert.equal(conversation.status(), 200);
  assert.equal((await conversation.body()).subarray(0, 2).toString(), 'PK');
  checks.push('Portable conversation build package is publicly available');
  assert.deepEqual(errors, []);
  const report = { date: new Date().toISOString(), base, checks, errors, skillSHA256: sha256, scope: 'Chromium over HTTP(S); browser imports and HTML download, responsive films, legacy redirects, public exposure restrictions and all primary page links' };
  await writeFile(out + '/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
