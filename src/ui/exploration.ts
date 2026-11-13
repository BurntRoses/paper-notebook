import { type Block, type ExplorationState, type NotebookDocument, frameText } from '../model/types';
import { evaluate, explorationState, isInteractive, regressionAnalysis, leastSquares } from '../model/exploration';
import { el, button } from './dom';
import { projection } from './projection';
import { codeTokens } from './code';
import { renderTrace } from './exploration-trace';
import { fillExplorationResults, renderExplorationResults } from './exploration-results';

const fallbackColors = ['#285f9e', '#b1483d', '#63784b', '#9a6c27'];
const seriesColor = (i: number) => `var(--exploration-series-${i % 4},${fallbackColors[i % 4]})`;
const format = (n: number, digits = 2) => n.toLocaleString('zh-CN', {maximumFractionDigits: digits});
const NS = 'http://www.w3.org/2000/svg';
const LEFT = 64, RIGHT = 656, TOP = 32, BOTTOM = 216, SAMPLES = 80;

export function renderExploration(b: Block, d: NotebookDocument, save: (state: ExplorationState) => void, staticView = false) {
 const activity = b.exploration!;
 if (!staticView && activity.kind === 'sequence' && activity.trace) return renderTrace(b, d, save);
 staticView = staticView || !isInteractive(activity);
 const root = el('div', 'exploration');
 root.dataset.kind = activity.kind;
 let state = explorationState(activity, d.userState.explorations?.[b.id]);
 const header = el('div', 'exploration-toolbar');
 const label = el('span', 'exploration-kind', activity.kind === 'plot' ? '参数计算' : activity.kind === 'reading' ? '原文批读' : '过程分步');
 const reset = button('重置', () => {
  state = explorationState(activity);
  if (activity.kind === 'plot') {
   scale = {...referenceScale};
   probeIndex = SAMPLES;
   flush();
  }
 }, 'exploration-reset');
 header.append(label);
 if (!staticView) header.append(reset);
 root.append(header);

 if (staticView && activity.kind !== 'plot') {
  root.classList.add('exploration-static');
  if (activity.trace && (!b._explorationFrame || b._explorationFrame === activity.frames[0].id)) {
   const code = el('pre', 'trace-code');
   code.append(...codeTokens(activity.trace.code.join('\n'), activity.trace.language).map(token => el('span', 'code-token token-' + token.kind, token.text)));
   root.append(code);
  }
  let offset = 0;
  for (const frame of activity.frames) {
   const parts = frameText(frame);
   if (!b._explorationFrame || b._explorationFrame === frame.id) {
    const panel = el('div', 'exploration-panel');
    parts.forEach((text, i) => {
     const tag = i === 0 ? 'h4' : frame.quote && i === 1 ? 'blockquote' : 'p';
     const node = el(tag, tag === 'blockquote' ? 'exploration-quote' : '');
     projection(node, text, offset);
     offset += text.length + 1;
     panel.append(node);
    });
    root.append(panel);
   } else offset += parts.join('\n').length + 1;
  }
  return root;
 }
 if (activity.kind !== 'plot') return root;
 const a = activity;
 const parameterOffsets: number[] = [];
 let sourceOffset = 0;
 for (const p of a.parameters) {
  parameterOffsets.push(sourceOffset);
  sourceOffset += p.label.length + 1;
 }
 const domainOffset = sourceOffset, yLabelOffset = domainOffset + a.domain.label.length + 1;
 sourceOffset = yLabelOffset + a.yLabel.length + 1;
 const seriesOffsets = a.series.map(series => {
  const start = sourceOffset;
  sourceOffset += series.label.length + 1;
  return start;
 });
 const controls = el('div', 'exploration-controls');
 const inputs: {range: HTMLInputElement; number: HTMLInputElement}[] = [];
 const chart = el('div', 'exploration-chart');
 const legend = el('div', 'exploration-legend');
 const results = renderExplorationResults(b, d);
 const status = el('p', 'exploration-status');
 status.setAttribute('role', 'status');
 status.setAttribute('aria-live', 'polite');
 let pending = 0, probeIndex = SAMPLES;

 a.parameters.forEach((p, i) => {
  const row = el('div', 'exploration-parameter'), name = el('label');
  projection(name, p.label, parameterOffsets[i]);
  if (p.unit) name.append(document.createTextNode('（' + p.unit + '）'));
  const range = el('input', 'exploration-range'), number = el('input', 'exploration-number');
  range.type = 'range'; number.type = 'number';
  range.min = number.min = String(p.min);
  range.max = number.max = String(p.max);
  range.step = number.step = String(p.step);
  range.id = `explore-${b.id}-${p.id}`;
  number.id = range.id + '-number';
  name.htmlFor = range.id;
  range.setAttribute('aria-label', p.label);
  number.setAttribute('aria-label', p.label + '数值');
  number.inputMode = 'decimal';
  range.addEventListener('input', () => {
   state = explorationState(a, {values: {...state.values, [p.id]: range.valueAsNumber}});
   syncInputs();
   save(structuredClone(state));
   schedule();
  });
  range.addEventListener('change', () => {flush(); announce();});
  number.addEventListener('input', () => number.setCustomValidity(number.validity.badInput ? '请输入数值。' : ''));
  number.addEventListener('change', () => {
   if (!Number.isFinite(number.valueAsNumber)) {number.value = String(state.values![p.id]); return;}
   state = explorationState(a, {values: {...state.values, [p.id]: number.valueAsNumber}});
   flush(); announce();
  });
  number.addEventListener('keydown', event => {
   if (event.key === 'Enter') {event.preventDefault(); number.dispatchEvent(new Event('change'));}
  });
  inputs.push({range, number});
  row.append(name, range, number);
  controls.append(row);
 });
 a.series.forEach((series, i) => {
  const item = el('span'), dot = el('i');
  item.dataset.series = String(i);
  item.style.setProperty('--series-color', seriesColor(i));
  projection(item, series.label, seriesOffsets[i]);
  dot.style.background = seriesColor(i);
  dot.setAttribute('aria-hidden', 'true');
  item.prepend(dot);
  legend.append(item);
 });
 if (a.regression && !staticView) {
  const best = leastSquares(a);
  const fit = button('计算拟合参数', () => {
   state = explorationState(a, {values: {...state.values, [a.regression!.slope]: best.slope, [a.regression!.intercept]: best.intercept}});
   flush(); announce();
  }, 'exploration-fit');
  fit.disabled = a.parameters.some(p => p.id === a.regression!.slope && (best.slope < p.min || best.slope > p.max) || p.id === a.regression!.intercept && (best.intercept < p.min || best.intercept > p.max));
  if (fit.disabled) fit.title = '最小二乘参数超出调节范围';
  header.insertBefore(fit, reset);
 }

 // Keep one SVG tree while values change: selections, focus and pointer mapping
 // remain attached to the same graph rather than restarting for every input.
 const svg = document.createElementNS(NS, 'svg');
 svg.setAttribute('viewBox', '0 0 680 260');
 svg.setAttribute('role', 'img');
 svg.setAttribute('aria-label', (b.title || '参数曲线') + '；' + a.domain.label + '，' + a.yLabel);
 const make = (tag: string, attrs: Record<string, string | number>, text?: string) => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  svg.append(node);
  return node;
 };
 const description = make('desc', {});
 const ticks = Array.from({length: 5}, (_, i) => ({
  grid: make('path', {class: 'exploration-grid'}),
  label: make('text', {x: 56, 'text-anchor': 'end', class: 'exploration-axis'}),
  x: a.domain.min + (a.domain.max - a.domain.min) * i / 4,
 }));
 make('path', {d: `M${LEFT} 26V${BOTTOM}H${RIGHT}`, class: 'exploration-axis-line'});
 for (const tick of ticks) make('text', {x: X(tick.x), y: 238, 'text-anchor': 'middle', class: 'exploration-axis'}, format(tick.x, 1));
 make('text', {x: LEFT, y: 17, class: 'exploration-axis ink-text', 'data-offset': yLabelOffset}, a.yLabel);
 make('text', {x: RIGHT, y: 257, 'text-anchor': 'end', class: 'exploration-axis ink-text', 'data-offset': domainOffset}, a.domain.label);
 const residuals = a.regression ? (a.observations || []).map(() => ({
  line: make('path', {class: 'exploration-residual'}),
  point: make('circle', {r: 3, fill: seriesColor(0)}),
  label: make('text', {class: 'exploration-residual-label'}),
 })) : [];
 const observations = (a.observations || []).map(point => ({
  point: make('circle', {r: 4, fill: 'var(--ink)'}),
  label: point.label ? make('text', {class: 'exploration-axis'}, point.label) : undefined,
 }));
 const curves = a.series.map((_, i) => ({
  line: make('polyline', {fill: 'none', stroke: seriesColor(i), 'stroke-width': 2.7, 'stroke-linejoin': 'round', 'data-series': i}),
  endpoint: make('circle', {r: 4.2, fill: seriesColor(i), 'data-series': i}),
 }));
 const guide = make('path', {class: 'exploration-probe-guide'});
 const probePoints = a.series.map((_, i) => make('circle', {r: 4.2, fill: 'var(--paper)', stroke: seriesColor(i), 'stroke-width': 2, 'data-series': i}));
 const probe = el('div', 'exploration-probe');
 probe.id = `exploration-probe-${b.id}`;
 const probeDomain = el('span', 'exploration-probe-domain');
 const probeValues = a.series.map((series, i) => {
  const output = el('span', 'exploration-probe-value');
  output.dataset.series = String(i);
  output.style.setProperty('--series-color', seriesColor(i));
  const value = el('strong');
  output.append(document.createTextNode(series.label + ' '), value);
  return {output, value};
 });
 probe.append(probeDomain, ...probeValues.map(item => item.output));
 const scaleNote = el('span', 'exploration-scale-note');
 const error = el('p', 'exploration-error');
 error.hidden = true;
 chart.append(svg, probe, scaleNote, error);
 if (!staticView) {
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('aria-describedby', probe.id);
  description.textContent = '指针查看图上数值；聚焦图表后，左右方向键移动读数，Home 和 End 查看两端。';
  const inspectPoint = (event: PointerEvent) => {
   const matrix = svg.getScreenCTM();
   if (!matrix) return;
   const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
   const next = Math.round(Math.min(1, Math.max(0, (point.x - LEFT) / (RIGHT - LEFT))) * SAMPLES);
   if (next !== probeIndex) {probeIndex = next; updateProbe();}
  };
  svg.addEventListener('pointermove', inspectPoint);
  svg.addEventListener('pointerdown', inspectPoint);
  svg.addEventListener('keydown', event => {
   if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
   event.preventDefault(); event.stopPropagation();
   probeIndex = event.key === 'Home' ? 0 : event.key === 'End' ? SAMPLES : Math.min(SAMPLES, Math.max(0, probeIndex + (event.key === 'ArrowLeft' ? -1 : 1)));
   updateProbe(); status.textContent = probe.textContent;
  });
 }
 const referenceScale = initialScale();
 let scale = {...referenceScale};
 root.append(controls, chart, legend, results, status);
 syncPlot();
 if (staticView) {
  root.classList.add('exploration-static');
  inputs.forEach(({range, number}) => {range.disabled = true; number.readOnly = true;});
  guide.setAttribute('visibility', 'hidden');
  probePoints.forEach(point => point.setAttribute('visibility', 'hidden'));
 }
 return root;

 function X(x: number) {return LEFT + (x - a.domain.min) / (a.domain.max - a.domain.min) * (RIGHT - LEFT);}
 function Y(y: number) {return BOTTOM - (y - scale.min) / (scale.max - scale.min) * (BOTTOM - TOP);}
 function samples(values: Record<string, number>) {
  return a.series.map(series => Array.from({length: SAMPLES + 1}, (_, i) => {
   const x = a.domain.min + (a.domain.max - a.domain.min) * i / SAMPLES;
   return {x, y: evaluate(series.expression, {...values, x})};
  }));
 }
 function bounds(values: number[]) {
  const low = Math.min(0, ...values), high = Math.max(0, ...values), span = high - low || 1;
  return {min: low >= 0 ? 0 : low - span * .06, max: high + span * .08};
 }
 function initialScale() {
  try {
   const initial = samples(explorationState(a).values!).flatMap(curve => curve.map(point => point.y));
   return bounds([...initial, ...(a.observations || []).map(point => point.y)]);
  } catch {return {min: 0, max: 1};}
 }
 function syncInputs() {
  a.parameters.forEach((p, i) => {
   const value = state.values![p.id];
   inputs[i].range.value = inputs[i].number.value = String(value);
   inputs[i].range.style.setProperty('--exploration-fill', `${100 * (value - p.min) / (p.max - p.min)}%`);
   inputs[i].range.setAttribute('aria-valuetext', format(value, 6) + (p.unit ? ' ' + p.unit : ''));
  });
  reset.disabled = a.parameters.every(p => state.values![p.id] === p.value) && scale.min === referenceScale.min && scale.max === referenceScale.max;
 }
 function announce() {status.textContent = [...results.querySelectorAll('dl>div')].map(value => value.textContent).join('；');}
 function schedule() {
  if (pending) return;
  pending = requestAnimationFrame(() => {pending = 0; if (root.isConnected) syncPlot();});
 }
 function flush() {
  if (pending) {cancelAnimationFrame(pending); pending = 0;}
  syncPlot();
  save(structuredClone(state));
 }
 function updateProbe() {
  if (error.hidden === false) return;
  const x = a.domain.min + (a.domain.max - a.domain.min) * probeIndex / SAMPLES;
  try {
   const values = a.series.map(series => evaluate(series.expression, {...state.values, x}));
   probeDomain.textContent = a.domain.label + ' ' + format(x, 2);
   guide.removeAttribute('visibility');
   guide.setAttribute('d', `M${X(x)} ${TOP}V${BOTTOM}`);
   values.forEach((y, i) => {
    probePoints[i].removeAttribute('visibility');
    probePoints[i].setAttribute('cx', String(X(x)));
    probePoints[i].setAttribute('cy', String(Y(y)));
    probeValues[i].value.textContent = format(y, 3);
   });
  } catch {
   guide.setAttribute('visibility', 'hidden');
   probePoints.forEach(point => point.setAttribute('visibility', 'hidden'));
   probeValues.forEach(item => item.value.textContent = '—');
  }
 }
 function syncPlot() {
  syncInputs();
  try {
   const nextCurves = samples(state.values!);
   const values = [...nextCurves.flatMap(curve => curve.map(point => point.y)), ...(a.observations || []).map(point => point.y)];
   // Retain the initial scale while comparing parameters. Expand only when a
   // curve would leave the graph; reset restores the original reference range.
   const low = Math.min(...values), high = Math.max(...values);
   if (low < scale.min || high > scale.max) {
    const expanded = bounds(values);
    scale = {min: Math.min(scale.min, expanded.min), max: Math.max(scale.max, expanded.max)};
   }
   svg.dataset.yMin = String(scale.min); svg.dataset.yMax = String(scale.max);
   reset.disabled = a.parameters.every(p => state.values![p.id] === p.value) && scale.min === referenceScale.min && scale.max === referenceScale.max;
   ticks.forEach((tick, i) => {
    const y = scale.min + (scale.max - scale.min) * i / 4;
    tick.grid.setAttribute('d', `M${LEFT} ${Y(y)}H${RIGHT}`);
    tick.label.setAttribute('y', String(Y(y) + 4));
    tick.label.textContent = format(y, Math.abs(y) > 100 ? 0 : 2);
   });
   if (a.regression) regressionAnalysis(a, state).rows.forEach((point, i) => {
    const nodes = residuals[i];
    nodes.line.setAttribute('d', `M${X(point.x)} ${Y(point.y)}V${Y(point.predicted)}`);
    nodes.point.setAttribute('cx', String(X(point.x))); nodes.point.setAttribute('cy', String(Y(point.predicted)));
    nodes.label.setAttribute('x', String(Math.min(RIGHT - 46, X(point.x) + 9)));
    nodes.label.setAttribute('y', String((Y(point.y) + Y(point.predicted)) / 2 + 5));
    nodes.label.textContent = 'e=' + format(point.residual, 2);
   });
   (a.observations || []).forEach((point, i) => {
    const nodes = observations[i];
    nodes.point.setAttribute('cx', String(X(point.x))); nodes.point.setAttribute('cy', String(Y(point.y)));
    nodes.label?.setAttribute('x', String(Math.min(RIGHT - 12, X(point.x) + 8)));
    nodes.label?.setAttribute('y', String(Y(point.y) - 7));
   });
   nextCurves.forEach((curve, i) => {
    curves[i].line.setAttribute('points', curve.map(point => `${X(point.x)},${Y(point.y)}`).join(' '));
    const last = curve.at(-1)!;
    curves[i].endpoint.setAttribute('cx', String(X(last.x))); curves[i].endpoint.setAttribute('cy', String(Y(last.y)));
   });
   svg.removeAttribute('hidden'); probe.hidden = scaleNote.hidden = false;
   error.hidden = true;
   scaleNote.textContent = '纵轴 ' + format(scale.min, 2) + '–' + format(scale.max, 2);
   updateProbe();
   fillExplorationResults(results, b, state);
   status.textContent = '';
  } catch (exception) {
   svg.setAttribute('hidden', ''); probe.hidden = scaleNote.hidden = true;
   error.hidden = false;
   error.textContent = exception instanceof Error ? exception.message : String(exception);
   fillExplorationResults(results, b, state);
   status.textContent = '调整参数后重新计算。';
  }
 }
}

/** Search and saved quotations can target an inactive passage. Reveal it before measuring ink. */
export function revealExploration(root: HTMLElement, offset: number) {
 const panel = [...root.querySelectorAll<HTMLElement>('.exploration-panel')].find(p => offset >= Number(p.dataset.start) && offset < Number(p.dataset.end));
 if (panel?.hidden) {
  const range = root.querySelector<HTMLInputElement>('.exploration-step-range');
  if (range) {
   const panels = [...root.querySelectorAll('.exploration-panel')];
   range.value = String(panels.indexOf(panel));
   range.dispatchEvent(new Event('input'));
  }
 }
}
