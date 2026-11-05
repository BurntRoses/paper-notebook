import katex from 'katex';

// Pagination measures the same formulas repeatedly, including every parameter.
// Cache strings only: each mounted formula still has its own DOM and geometry.
const formulas = new Map<string, string>();
export function formulaHTML(latex: string, displayMode: boolean) {
  const key = `${displayMode ? 'display' : 'inline'}:${latex}`;
  const saved = formulas.get(key);
  if (saved !== undefined) return saved;
  const html = katex.renderToString(latex, { displayMode, throwOnError: false, trust: false, strict: 'warn', output: 'htmlAndMathml' });
  if (formulas.size >= 128) formulas.delete(formulas.keys().next().value!);
  formulas.set(key, html);
  return html;
}
