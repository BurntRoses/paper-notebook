import type { FigureMark } from '../model/types';
import { circleStroke } from '../reader/circle';
const NS='http://www.w3.org/2000/svg';
export function figureMarks(marks:FigureMark[],ratio=4/3){
 const width=1000,height=width/ratio;
 const svg=document.createElementNS(NS,'svg');svg.classList.add('figure-annotations');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-label','图像批注');
 for(const mark of marks){
  const x=mark.x*width/100,y=mark.y*height/100,x2=(mark.x2??mark.x+8)*width/100,y2=(mark.y2??mark.y+8)*height/100;
  let node:SVGElement;const make=(tag:string,attrs:Record<string,string|number>)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
  if(mark.kind==='text'){node=make('text',{x,y,'font-size':24,'font-family':'StudyHand,serif',fill:mark.color||'#b1483d',stroke:'none'});node.textContent=mark.text||'';}
  else if(mark.kind==='circle')node=make('path',{d:circleStroke(Math.min(x,x2),Math.min(y,y2),Math.max(6,Math.abs(x2-x)),Math.max(6,Math.abs(y2-y)),Math.round(x+y+37))});
  else if(mark.kind==='check')node=make('path',{d:`M ${x-8} ${y} l 8 8 17 -24`});
  else if(mark.kind==='pen')node=make('path',{d:(mark.points||[]).map((p,i)=>`${i?'L':'M'} ${p[0]*width/100} ${p[1]*height/100}`).join(' ')});
  else {const a=Math.atan2(y2-y,x2-x),l=18;node=make('path',{d:`M ${x} ${y} Q ${(x+x2)/2+2} ${(y+y2)/2-2} ${x2} ${y2} M ${x2-l*Math.cos(a-.5)} ${y2-l*Math.sin(a-.5)} L ${x2} ${y2} L ${x2-l*Math.cos(a+.5)} ${y2-l*Math.sin(a+.5)}`});}
  if(mark.kind!=='text'){node.setAttribute('fill','none');node.setAttribute('stroke',mark.color||'#b1483d');node.setAttribute('stroke-width','3');node.setAttribute('stroke-linecap','round');node.setAttribute('stroke-linejoin','round');}
  node.dataset.figureMark=mark.kind;svg.append(node);
 }return svg;
}
