import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.NOTEBOOK_BASE || 'http://127.0.0.1:5182';
const scripts = Object.fromEntries(await Promise.all(['site-nav.js', 'responsive-film.js'].map(async name => [name, await readFile('public/' + name, 'utf8')])));

for (const [engine, type] of Object.entries({ chromium, webkit })) {
  const browser = await type.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    // Exercise source changes against the current reader build.
    for (const [name, body] of Object.entries(scripts)) await page.route(`**/${name}?*`, route => route.fulfill({ contentType: 'text/javascript', body }));
    let failBusiness = true, releaseLiterature, startedLiterature;
    const held = new Promise(resolve => releaseLiterature = resolve), started = new Promise(resolve => startedLiterature = resolve);
    await page.route('**/previews/business.json?*', route => failBusiness ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue());
    await page.route('**/previews/literature.json?*', async route => { startedLiterature(); await held; await route.continue().catch(() => {}); });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('#read').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const frame = document.querySelector('.reader-preview');
      return frame.contentWindow.reader?.fontsCalibrated && !frame.hasAttribute('aria-busy');
    });
    const example = name => page.locator(`[data-example="${name}"]`);
    await page.locator('.reader-preview').evaluate(frame => frame.contentWindow.reader.goPage(1, true));
    await example('business').evaluate(button => button.click());
    await page.waitForFunction(() => document.querySelector('#preview-tour-status').textContent.includes('加载失败'));
    assert.equal(await example('machine-learning').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-example][aria-pressed=true]').count(), 1);
    assert.match(await page.locator('#preview-open').getAttribute('href'), /machine-learning\.html/);
    assert.equal(await page.locator('.reader-preview').getAttribute('title'), '试读：机器学习入门');
    assert.equal(await page.locator('.reader-preview').evaluate(frame => frame.contentWindow.reader.pageIndex), 1);

    await example('literature').evaluate(button => button.click()); await started;
    await example('machine-learning').evaluate(button => button.click()); releaseLiterature();
    assert.equal(await page.locator('.reader-preview').evaluate(frame => frame.contentWindow.reader.pageIndex), 1);
    assert.equal(await page.locator('.reader-preview').getAttribute('aria-busy'), null);
    failBusiness = false;
    await example('business').evaluate(button => button.click());
    await page.waitForFunction(() => document.querySelector('.reader-preview').dataset.selectedExample === 'business');
    assert.equal(await example('business').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.reader-preview').evaluate(frame => frame.contentWindow.reader.d.notebook.id), 'showcase-business');
    assert.equal(await page.locator('#preview-tour-status').textContent(), '');

    const selector = page.locator('[data-film-quality]'), menu = page.locator('[data-film-quality-menu]');
    await selector.focus(); await page.keyboard.press('ArrowDown');
    assert.equal(await menu.isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.qualityChoice), 'auto');
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.qualityChoice), '540');
    await page.keyboard.press('Enter');
    assert.equal(await menu.isVisible(), false);
    assert.ok(await selector.evaluate(node => node === document.activeElement));
    await page.waitForFunction(() => document.querySelector('video').videoWidth === 960 && !document.querySelector('video').hasAttribute('aria-busy'));
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.qualityChoice), '540');
    await page.keyboard.press('Escape');
    assert.ok(await selector.evaluate(node => node === document.activeElement));
    await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
    assert.equal(await menu.isVisible(), false);
    assert.ok(await page.locator('[data-film-fullscreen]').evaluate(node => node === document.activeElement));
    await selector.click(); await example('business').focus();
    assert.equal(await menu.isVisible(), false);
    assert.equal(await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
      document.activeElement.dispatchEvent(event); return event.defaultPrevented;
    }), false);
    assert.deepEqual(errors, []);
    console.log(`✓ ${engine}: failed example restores matching controls; cancellation preserves page; retry succeeds; quality keyboard focus, Tab and Escape stay coherent`);
  } finally { await browser.close(); }
}
