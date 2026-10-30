/** One optical grid for the reader chrome; no platform-dependent text glyphs. */
const paths = {
  contents:'M4 6h16M4 12h16M4 18h16',
  folder:'M3 7V5h6l2 2h10v12H3V7Z M3 10h18',
  sun:'M12 3V1m0 22v-2M3 12H1m22 0h-2M5.6 5.6 4.2 4.2m15.6 15.6-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4 M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z',
  moon:'M20.5 14.3A9 9 0 0 1 9.7 3.5 9 9 0 1 0 20.5 14.3Z',
  type:'m3 18 5-12 5 12M5 14h6M16 11h5m-5 0v7m5-7v7m-5-4h5',
  expand:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  workspace:'M3 4h18v16H3Z M15 4v16M7 9h4m-4 4h4m6-4h2m-2 4h2',
  portrait:'M6 2h12v20H6V2Z M9 6h6m-6 4h6m-6 4h6',
  landscape:'M2 6h20v12H2V6Z M6 10h12m-12 4h8',
  spread:'M2 4h8l2 2 2-2h8v16h-8l-2 2-2-2H2V4Z M12 6v16',
  star:'m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',
  bookmark:'M6 3h12v18l-6-4-6 4V3Z',
  close:'m6 6 12 12M18 6 6 18',
} as const;
export function icon(name:keyof typeof paths){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [key,value] of Object.entries({viewBox:'0 0 24 24',width:'20',height:'20',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(key,value);
  const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]);svg.append(path);return svg;
}
