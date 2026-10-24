import type { Block } from '../model/types';

/** Measured data only: hand-drawn frame, exact coordinates and live labels. */
export function chartSVG(b:Block){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 const make=(tag:string,attrs:Record<string,string|number>,value?:string)=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(value)n.textContent=value;return n;};
 const series=b.series||[],points=series.flatMap(s=>s.points),xs=points.map(p=>p.x),ys=points.map(p=>p.y);
 let xmin=Math.min(0,...xs),xmax=Math.max(1,...xs),ymin=Math.min(0,...ys),ymax=Math.max(1,...ys);if(xmin===xmax)xmax++;if(ymin===ymax)ymax++;
 const left=88,right=686,top=58,bottom=344,x=(n:number)=>left+(n-xmin)/(xmax-xmin)*(right-left),y=(n:number)=>bottom-(n-ymin)/(ymax-ymin)*(bottom-top),fmt=(n:number)=>Number(n.toPrecision(3)).toString();
 svg.setAttribute('viewBox','0 0 760 440');svg.setAttribute('width','760');svg.setAttribute('height','440');svg.classList.add('notebook-chart');svg.setAttribute('role','img');svg.setAttribute('aria-label',b.title||'数据图');
 svg.append(make('title',{},b.title||'数据图'),make('desc',{},series.map(s=>s.label+': '+s.points.map(p=>`(${p.x}, ${p.y})`).join(', ')).join('; ')));
 for(let i=0;i<=4;i++){const vx=xmin+(xmax-xmin)*i/4,vy=ymin+(ymax-ymin)*i/4;
  svg.append(make('path',{d:`M ${left} ${y(vy)} H ${right}`,class:'chart-grid'}),make('text',{x:left-15,y:y(vy)+5,'text-anchor':'end',class:'chart-tick'},fmt(vy)),make('text',{x:x(vx),y:bottom+25,'text-anchor':'middle',class:'chart-tick'},fmt(vx)));}
 svg.append(make('path',{d:`M ${left-1} ${top} Q ${left+1} ${(top+bottom)/2} ${left} ${bottom} Q ${(left+right)/2} ${bottom-1} ${right+8} ${bottom}`,class:'chart-axis'}));
 svg.append(make('text',{x:(left+right)/2,y:bottom+55,'text-anchor':'middle',class:'chart-axis-label'},b.xLabel||'x'),make('text',{x:18,y:top-20,class:'chart-axis-label'},b.yLabel||'y'));
 series.forEach((s,i)=>{const group=make('g',{class:`chart-series chart-series-${i%4}`});
  if(b.chartType==='line'&&s.points.length)group.append(make('path',{d:s.points.map((p,j)=>`${j?'L':'M'} ${x(p.x)} ${y(p.y)}`).join(' '),class:'chart-line'}));
  for(const p of s.points){if(b.chartType==='bar'){const w=Math.min(48,(right-left)/Math.max(1,s.points.length*series.length*1.7));group.append(make('rect',{x:x(p.x)-w/2+i*w/series.length,y:Math.min(y(p.y),y(0)),width:w/series.length,height:Math.abs(y(p.y)-y(0)),rx:2,class:'chart-bar'}));}else group.append(make('circle',{cx:x(p.x),cy:y(p.y),r:5.5,class:'chart-point'}));if(p.label)group.append(make('text',{x:x(p.x)+9,y:y(p.y)-10,class:'chart-point-label'},p.label));}
  const lx=left+(i%3)*205,ly=series.length>3&&i>=3?432:412;group.append(make('path',{d:`M ${lx} ${ly-5} h 19`,class:'chart-line'}),make('text',{x:lx+26,y:ly,class:'chart-legend'},s.label));svg.append(group);
 });return svg;
}
