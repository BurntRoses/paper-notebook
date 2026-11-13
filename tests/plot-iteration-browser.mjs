import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
const {chromium, webkit} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.NOTEBOOK_BASE || 'http://127.0.0.1:5183';
await mkdir('output/plot-iteration', {recursive: true});
const reports = [];
for (const [engine, type] of Object.entries({chromium, webkit})) {
 const browser = await type.launch({headless: true});
 try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/downloads/compound-interest.html?demo');
  await page.waitForFunction(() => window.reader?.fontsCalibrated);
  await page.evaluate(() => {
   const p = reader.d.notebook.chapters.flatMap(c => c.pages).find(p => p.blocks.some(b => b.id === 'growth-exploration'));
   reader.profile.transition = 'none'; reader.goBlock(p.id, 'growth-exploration');
  });
  const root = page.locator('.reader-stage [data-block=growth-exploration] .exploration');
  const chart = root.locator('.exploration-chart svg');
  const initial = await chart.getAttribute('data-y-max');
  const identity = await page.evaluate(async () => {
   const root = document.querySelector('.reader-stage [data-block=growth-exploration] .exploration');
   const graph = root.querySelector('.exploration-chart svg'), curve = graph.querySelector('polyline');
   const slider = root.querySelector('input[aria-label="每期增长率"]');
   for (const value of ['9', '8', '5']) {slider.value = value; slider.dispatchEvent(new Event('input', {bubbles: true}));}
   const savedImmediately = reader.d.userState.explorations['growth-exploration'].values.rate;
   await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
   return {savedImmediately, svgSame: graph === root.querySelector('.exploration-chart svg'), curveSame: curve === graph.querySelector('polyline')};
  });
  assert.deepEqual(identity, {savedImmediately: 5, svgSame: true, curveSame: true});
  assert.equal(await chart.getAttribute('data-y-max'), initial);
  assert.equal(await page.locator('.paper-notes [data-metric=output-0] dd').innerText(), '110.25 元');
  const index = await page.evaluate(() => reader.pageIndex);
  await chart.focus(); await chart.press('Home');
  assert.match(await root.locator('.exploration-probe-domain').innerText(), /0$/);
  assert.deepEqual(await root.locator('.exploration-probe-value strong').allTextContents(), ['100', '100']);
  await chart.press('End');
  assert.deepEqual(await root.locator('.exploration-probe-value strong').allTextContents(), ['265.33', '200']);
  assert.equal(await page.evaluate(() => reader.pageIndex), index);
  const rate = root.getByRole('spinbutton', {name: '每期增长率数值'});
  await rate.fill('15'); await rate.press('Enter');
  assert.ok(Number(await chart.getAttribute('data-y-max')) > Number(initial));
  await rate.fill('10'); await rate.press('Enter');
  assert.equal(await root.getByRole('button', {name: '重置', exact: true}).isDisabled(), false);
  await root.getByRole('button', {name: '重置', exact: true}).click();
  assert.equal(await chart.getAttribute('data-y-max'), initial);
  assert.equal(await root.getByRole('button', {name: '重置', exact: true}).isDisabled(), true);
  await chart.evaluate(svg => {
   const ctm = svg.getScreenCTM(), point = new DOMPoint(64, 100).matrixTransform(ctm);
   svg.dispatchEvent(new PointerEvent('pointermove', {clientX: point.x, clientY: point.y, bubbles: true}));
  });
  assert.deepEqual(await root.locator('.exploration-probe-value strong').allTextContents(), ['100', '100']);
  await page.setViewportSize({width: 390, height: 844});
  await page.waitForFunction(() => reader.lastWidth === innerWidth);
  await page.evaluate(() => {
   const p = reader.d.notebook.chapters.flatMap(c => c.pages).find(p => p.blocks.some(b => b.id === 'growth-exploration'));
   reader.goBlock(p.id, 'growth-exploration');
  });
  assert.ok(await root.evaluate(n => n.scrollWidth <= n.clientWidth + 2));
  await root.screenshot({path: 'output/plot-iteration/' + engine + '-mobile.png'});
  await page.evaluate(() => {
   const b = reader.d.notebook.chapters.flatMap(c => c.pages).flatMap(p => p.blocks).find(b => b.id === 'growth-exploration');
   b.exploration.series[0].expression = {op: 'div', args: [1, {op: 'sub', args: ['rate', 10]}]};
   reader.invalidate(); reader.render(reader.anchor());
  });
  assert.equal(await root.locator('.exploration-chart > .exploration-error').isVisible(), true);
  await root.getByRole('spinbutton', {name: '每期增长率数值'}).fill('6');
  await root.getByRole('spinbutton', {name: '每期增长率数值'}).press('Enter');
  assert.equal(await root.locator('.exploration-chart > .exploration-error').isVisible(), false);
  assert.equal(await root.locator('.exploration-chart svg').isVisible(), true);
  assert.deepEqual(errors, []);
  reports.push({engine, synchronousSave: true, stableSVG: true, stableScale: true, expansionAndReset: true, exactProbe: true, keyboard: true, mobile: true, errors});
  console.log(engine + ': stable plot nodes, synchronous records, scale, probe and keyboard passed');
 } finally {await browser.close();}
}
await writeFile('output/plot-iteration/report.json', JSON.stringify(reports, null, 2));
