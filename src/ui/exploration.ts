import { type Block, type ExplorationState, type NotebookDocument, frameText } from '../model/types';
import { evaluate, explorationState, isInteractive, regressionAnalysis, leastSquares } from '../model/exploration';
import { el, button } from './dom';
import { projection } from './projection';
import { renderTrace } from './exploration-trace';
import { fillExplorationResults, renderExplorationResults } from './exploration-results';

const palette=['#285f9e','#b1483d','#63784b','#9a6c27'];
const format=(n:number,digits=2)=>n.toLocaleString('zh-CN',{maximumFractionDigits:digits});
export function renderExploration(b:Block,d:NotebookDocument,save:(state:ExplorationState)=>void,staticView=false){
 const a=b.exploration!;if(!staticView&&a.kind==='sequence'&&a.trace)return renderTrace(b,d,save);
 staticView=staticView||!isInteractive(a);const root=el('div','exploration');root.dataset.kind=a.kind;
 let state=explorationState(a,d.userState.explorations?.[b.id]);
 const header=el('div','exploration-toolbar'),label=el('span','exploration-kind',a.kind==='plot'?'参数计算':a.kind==='reading'?'原文批读':'过程分步');
 const reset=button('重置',()=>{state=explorationState(a);if(a.kind==='plot')syncPlot();save(state);},'exploration-reset');header.append(label);if(!staticView)header.append(reset);root.append(header);
 const notify=()=>save(structuredClone(state));
 if(staticView&&a.kind!=='plot'){root.classList.add('exploration-static');
  if(a.trace&&(!b._explorationFrame||b._explorationFrame===a.frames[0].id))root.append(el('pre','trace-code',a.trace.code.join('\n')));
  let offset=0;for(const frame of a.frames){const parts=frameText(frame);if(!b._explorationFrame||b._explorationFrame===frame.id){const panel=el('div','exploration-panel');parts.forEach((text,i)=>{const tag=i===0?'h4':frame.quote&&i===1?'blockquote':'p';const n=el(tag,tag==='blockquote'?'exploration-quote':'');projection(n,text,offset);offset+=text.length+1;panel.append(n);});root.append(panel);}else offset+=parts.join('\n').length+1;}
  return root;
 }
 if(a.kind!=='plot')return root;
 const parameterOffsets:number[]=[];let sourceOffset=0;for(const p of a.parameters){parameterOffsets.push(sourceOffset);sourceOffset+=p.label.length+1;}const domainOffset=sourceOffset,yLabelOffset=domainOffset+a.domain.label.length+1;sourceOffset=yLabelOffset+a.yLabel.length+1;const seriesOffsets=a.series.map(s=>{const start=sourceOffset;sourceOffset+=s.label.length+1;return start;});
 const controls=el('div','exploration-controls'),inputs:{range:HTMLInputElement;number:HTMLInputElement}[]=[];
 const chart=el('div','exploration-chart'),legend=el('div','exploration-legend'),results=renderExplorationResults(b,d),status=el('p','exploration-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 a.parameters.forEach((p,i)=>{
  const row=el('div','exploration-parameter'),name=el('label');projection(name,p.label,parameterOffsets[i]);if(p.unit)name.append(document.createTextNode('（'+p.unit+'）'));
  const range=el('input','exploration-range'),number=el('input','exploration-number');range.type='range';number.type='number';range.min=number.min=String(p.min);range.max=number.max=String(p.max);range.step=number.step=String(p.step);range.id=`explore-${b.id}-${p.id}`;number.id=range.id+'-number';name.htmlFor=range.id;range.setAttribute('aria-label',p.label);number.setAttribute('aria-label',p.label+'数值');number.inputMode='decimal';
  const change=(v:number)=>{state=explorationState(a,{values:{...state.values,[p.id]:v}});syncPlot();notify();};
  range.addEventListener('input',()=>change(range.valueAsNumber));range.addEventListener('change',()=>announce());
  number.addEventListener('input',()=>{number.setCustomValidity(number.validity.badInput?'请输入数值。':'');});
  number.addEventListener('change',()=>{if(!Number.isFinite(number.valueAsNumber)){number.value=String(state.values![p.id]);return;}change(number.valueAsNumber);announce();});
  number.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();number.dispatchEvent(new Event('change'));}});
  inputs.push({range,number});row.append(name,range,number);controls.append(row);
 });
 a.series.forEach((s,i)=>{const item=el('span'),dot=el('i');projection(item,s.label,seriesOffsets[i]);dot.style.background=palette[i];dot.setAttribute('aria-hidden','true');item.prepend(dot);legend.append(item);});
 if(a.regression&&!staticView){const fit=button('计算拟合参数',()=>{const best=leastSquares(a);state=explorationState(a,{values:{...state.values,[a.regression!.slope]:best.slope,[a.regression!.intercept]:best.intercept}});syncPlot();notify();announce();},'exploration-fit');const best=leastSquares(a);fit.disabled=a.parameters.some(p=>p.id===a.regression!.slope&&(best.slope<p.min||best.slope>p.max)||p.id===a.regression!.intercept&&(best.intercept<p.min||best.intercept>p.max));if(fit.disabled)fit.title='最小二乘参数超出调节范围';header.insertBefore(fit,reset);}
 root.append(controls,chart,legend,results,status);syncPlot();
 if(staticView){root.classList.add('exploration-static');inputs.forEach(({range,number})=>{range.disabled=true;number.readOnly=true;});}
 return root;

 function announce(){status.textContent=[...results.querySelectorAll('dl>div')].map(v=>v.textContent).join('；');}
 function syncPlot(){if(a.kind!=='plot')return;
  a.parameters.forEach((p,i)=>{const value=state.values![p.id];inputs[i].range.value=inputs[i].number.value=String(value);inputs[i].range.style.setProperty('--exploration-fill',`${100*(value-p.min)/(p.max-p.min)}%`);});
  reset.disabled=a.parameters.every(p=>state.values![p.id]===p.value);
  const vars={...state.values,x:a.domain.max},svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 680 260');svg.setAttribute('role','img');svg.setAttribute('aria-label',(b.title||'参数曲线')+'；'+a.domain.label+'，'+a.yLabel);
  const make=(tag:string,attrs:Record<string,string|number>,text?:string)=>{const n=document.createElementNS(svg.namespaceURI,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;svg.append(n);return n;};
  try{
   const curves=a.series.map(s=>Array.from({length:81},(_,i)=>{const x=a.domain.min+(a.domain.max-a.domain.min)*i/80;return {x,y:evaluate(s.expression,{...vars,x})};}));
   const ys=[...curves.flatMap(c=>c.map(p=>p.y)),...(a.observations||[]).map(p=>p.y)],lo=Math.min(0,...ys),hi=Math.max(0,...ys),span=hi-lo||1,yMin=lo>=0?0:lo-span*.06,yMax=hi+span*.08;
   const X=(x:number)=>64+(x-a.domain.min)/(a.domain.max-a.domain.min)*592,Y=(y:number)=>216-(y-yMin)/(yMax-yMin)*184;
   for(let i=0;i<=4;i++){const y=yMin+(yMax-yMin)*i/4;make('path',{d:`M64 ${Y(y)}H656`,class:'exploration-grid'});make('text',{x:56,y:Y(y)+4,'text-anchor':'end',class:'exploration-axis'},format(y,Math.abs(y)>100?0:2));}
   make('path',{d:`M64 26V216H656`,class:'exploration-axis-line'});
   for(let i=0;i<=4;i++){const x=a.domain.min+(a.domain.max-a.domain.min)*i/4;make('text',{x:X(x),y:238,'text-anchor':'middle',class:'exploration-axis'},format(x,1));}
   make('text',{x:64,y:17,class:'exploration-axis ink-text','data-offset':yLabelOffset},a.yLabel);make('text',{x:656,y:257,'text-anchor':'end',class:'exploration-axis ink-text','data-offset':domainOffset},a.domain.label);
   if(a.regression){for(const p of regressionAnalysis(a,state).rows){make('path',{d:`M${X(p.x)} ${Y(p.y)}V${Y(p.predicted)}`,class:'exploration-residual'});make('circle',{cx:X(p.x),cy:Y(p.predicted),r:3,fill:palette[0]});make('text',{x:X(p.x)+9,y:(Y(p.y)+Y(p.predicted))/2+5,class:'exploration-residual-label'},'e='+format(p.residual,2));}}
   for(const p of a.observations||[]){make('circle',{cx:X(p.x),cy:Y(p.y),r:4,fill:'var(--ink)'});if(p.label)make('text',{x:X(p.x)+8,y:Y(p.y)-7,class:'exploration-axis'},p.label);}
   curves.forEach((c,i)=>{make('polyline',{points:c.map(p=>`${X(p.x)},${Y(p.y)}`).join(' '),fill:'none',stroke:palette[i],'stroke-width':2.7,'stroke-linejoin':'round'});const last=c.at(-1)!;make('circle',{cx:X(last.x),cy:Y(last.y),r:4.2,fill:palette[i]});});
   const desc=make('desc',{},a.series.map((s,i)=>`${s.label}：${format(curves[i][0].y)} → ${format(curves[i].at(-1)!.y)}`).join('；'));svg.prepend(desc);
   chart.replaceChildren(svg);fillExplorationResults(results,b,state);status.textContent='';
  }catch(e){chart.replaceChildren(el('p','exploration-error',String(e instanceof Error?e.message:e)));fillExplorationResults(results,b,state);status.textContent='调整参数后重新计算。';}
 }
}

/** Search and saved quotations can target an inactive passage. Reveal it before measuring ink. */
export function revealExploration(root:HTMLElement,offset:number){
 const panel=[...root.querySelectorAll<HTMLElement>('.exploration-panel')].find(p=>offset>=Number(p.dataset.start)&&offset<Number(p.dataset.end));
 if(panel?.hidden){const range=root.querySelector<HTMLInputElement>('.exploration-step-range');if(range){const panels=[...root.querySelectorAll('.exploration-panel')];range.value=String(panels.indexOf(panel));range.dispatchEvent(new Event('input'));}}
}
