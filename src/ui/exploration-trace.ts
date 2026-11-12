import { type Block, frameText, type ExplorationState, type NotebookDocument } from '../model/types';
import { explorationState } from '../model/exploration';
import { el,button } from './dom';
import { projection } from './projection';
import { fillExplorationResults,renderExplorationResults } from './exploration-results';

export function renderTrace(b:Block,d:NotebookDocument,save:(state:ExplorationState)=>void){
 const a=b.exploration!;if(a.kind==='plot'||!a.trace)throw Error('trace declaration required');
 let state=explorationState(a,d.userState.explorations?.[b.id]);
 const root=el('div','exploration exploration-trace'),header=el('div','exploration-toolbar');root.dataset.kind='sequence';
 const reset=button('重置',()=>select(0),'exploration-reset');header.append(el('span','exploration-kind',a.trace.language+' · 执行过程'),reset);root.append(header);
 const code=el('pre','trace-code');code.setAttribute('aria-label','程序代码');let offset=a.frames.flatMap(frameText).join('\n').length+1;
 const lines=a.trace.code.map((line,i)=>{const row=el('code','trace-line');row.dataset.line=String(i+1);const number=el('span','trace-line-number',String(i+1));number.setAttribute('aria-hidden','true');const source=el('span');projection(source,line,offset);offset+=line.length+1;row.append(number,source);code.append(row);return row;});root.append(code);
 const arrays=el('div','trace-collections'),panels=el('div','exploration-panels');let frameOffset=0;
 const contents=a.frames.map(f=>{const panel=el('div','exploration-panel');panel.dataset.start=String(frameOffset);panel.dataset.explorationFrame=f.id;for(const [i,text]of frameText(f).entries()){if(i===0||text===f.text){const n=el(i===0?'h4':'p');projection(n,text,frameOffset);panel.append(n);}frameOffset+=text.length+1;}panel.dataset.end=String(frameOffset);panels.append(panel);return panel;});
 const pager=el('div','exploration-pager'),previous=button('上一步',()=>select(index()-1),'exploration-step'),next=button('下一步',()=>select(index()+1),'exploration-step'),range=el('input','exploration-range exploration-step-range'),count=el('span');
 range.type='range';range.min='0';range.max=String(a.frames.length-1);range.step='1';range.setAttribute('aria-label','执行步骤');range.addEventListener('input',()=>select(range.valueAsNumber));pager.append(previous,range,count,next);
 const results=renderExplorationResults(b,d);root.append(arrays,panels,pager,results);
 function index(){return a.kind==='plot'?0:a.frames.findIndex(f=>f.id===state.active);}
 function select(i:number,persist=true){
  if(a.kind==='plot')return;i=Math.max(0,Math.min(a.frames.length-1,i));const f=a.frames[i],before=a.frames[i-1];state={active:f.id};
  contents.forEach((n,j)=>n.hidden=i!==j);lines.forEach((n,j)=>{n.dataset.active=String(j+1===f.line);if(j+1===f.line)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');});
  arrays.replaceChildren();for(const v of f.variables||[]){if(!Array.isArray(v.value))continue;const group=el('div','trace-collection'),name=el('code','',v.name),values=el('div','trace-values');group.append(name,values);const old=before?.variables?.find(x=>x.name===v.name)?.value;
   if(!v.value.length)values.append(el('span','trace-empty',v.display==='set'?'空集':'空列表'));
   v.value.forEach((value,j)=>{const chip=el('span','trace-value',JSON.stringify(value));chip.dataset.current=String(v.name===a.trace?.input&&j===f.cursor);chip.dataset.added=String(v.display==='set'&&Array.isArray(old)&&!old.includes(value));values.append(chip);});arrays.append(group);
  }
  previous.disabled=i===0;next.disabled=i===a.frames.length-1;reset.disabled=i===0;range.value=String(i);range.style.setProperty('--exploration-fill',`${100*i/(a.frames.length-1)}%`);range.setAttribute('aria-valuetext',`${i+1} / ${a.frames.length}：${f.label}`);count.textContent=`${i+1} / ${a.frames.length}`;fillExplorationResults(results,b,state);if(persist)save(state);
 }
 select(index(),false);return root;
}
