import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
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
  for (const route of ['', 'promo.html', 'start.html', 'chat-start.html', 'promo-motion.html']) {
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200, route);
    for (const url of await page.locator('a[href],img[src],iframe[src],video[src]').evaluateAll(nodes => nodes.map(node => new URL(node.getAttribute('href') || node.getAttribute('src'), location.href).href))) {
      if (url.startsWith(base) && !url.includes('#')) links.add(url);
    }
    if (!route) {
      assert.equal(await page.getByRole('heading', { name: 'Paper Notebook', exact: true }).count(), 1);
      await page.frameLocator('.reader-preview').locator('.page-surface').waitFor();
      await page.screenshot({ path: out + '/homepage.png' });
      checks.push('Product home embeds the actual working reader');
    }
  }
  for (const url of links) {
    const response = await context.request.head(url);
    assert.equal(response.status(), 200, url);
  }
  checks.push(`All ${links.size} same-site navigation, image, film and download targets return HTTP 200`);

  await page.goto(base + 'chat-start.html');
  const prompt = await page.getByLabel('通用生成指令', { exact: true }).inputValue();
  assert.ok(prompt.includes('DeepSeek'));
  const repositoryPrompt = await page.getByLabel('仓库 Skill 调用语句', { exact: true }).inputValue();
  assert.ok(repositoryPrompt.includes('https://github.com/BurntRoses/paper-notebook'));
  assert.ok(repositoryPrompt.includes('skills/paper-notebook/SKILL.md'));
  await page.getByRole('button', { name: '复制仓库调用语句', exact: true }).click();
  await page.waitForFunction(() => /已复制|已选中/.test(document.querySelector('#repository-status').textContent));
  await page.getByRole('button', { name: '复制通用指令', exact: true }).click();
  await page.waitForFunction(() => /已复制|已选中/.test(document.querySelector('#status').textContent));
  checks.push('Copyable repository Skill prompt names the real repository and confirms text-only fallback');
  checks.push('Generic generation prompt works or offers a selection fallback');

  await page.goto(base + 'downloads/blank-notebook.html?demo');
  await page.waitForFunction(() => !!window.reader);
  await page.locator('.reader-files summary').click();
  await page.locator('.reader-file-menu').getByRole('button', { name: '导入', exact: true }).click();
  await page.getByLabel('教程源文本', { exact: true }).fill(prompt.slice(prompt.indexOf('# 复利的增长基础')));
  await page.getByRole('button', { name: '预览导入', exact: true }).click();
  await page.locator('.dialog-foot').getByRole('button', { name: '导入', exact: true }).click();
  assert.equal(await page.locator('[data-block=growth-formula]').count(), 1);
  assert.ok(await page.locator('[data-kind=circle]').count());
  await page.locator('.reader-files summary').click();
  await page.locator('.reader-file-menu').getByRole('button', { name: '下载', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.locator('.dialog-foot').getByRole('button', { name: '下载', exact: true }).click();
  const file = await downloaded;
  await file.saveAs(out + '/imported-notebook.html');
  checks.push('Text-only chat example imports with a real formula and circle, then downloads as HTML');

  await page.goto(base + 'promo-motion.html');
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 1);
  assert.deepEqual(await page.locator('video').evaluate(v => [v.duration, v.videoWidth, v.videoHeight]), [64, 1920, 1080]);
  await page.getByRole('button', { name: '竖屏', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('video')?.videoWidth === 1080);
  assert.deepEqual(await page.locator('video').evaluate(v => [v.duration, v.videoWidth, v.videoHeight]), [64, 1080, 1920]);
  await page.getByRole('button', { name: '00:32 公式、原文与代码', exact: true }).click();
  await page.waitForFunction(() => { const v = document.querySelector('video'); return !v.seeking && v.currentTime >= 32; });
  await page.locator('video').evaluate(v => v.pause());
  checks.push('Both film formats load at full resolution and chapter seek works');

  const skill = await context.request.get(base + 'downloads/paper-notebook-skill.zip');
  assert.equal(skill.status(), 200);
  const body = await skill.body();
  assert.equal(body.subarray(0, 2).toString(), 'PK');
  const sha256 = createHash('sha256').update(body).digest('hex');
  checks.push('Portable Skill ZIP downloads successfully');
  assert.deepEqual(errors, []);
  const report = { date: new Date().toISOString(), base, checks, errors, skillSHA256: sha256, scope: 'Chromium over HTTP(S); browser imports and HTML download, both films and all primary page links' };
  await writeFile(out + '/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
