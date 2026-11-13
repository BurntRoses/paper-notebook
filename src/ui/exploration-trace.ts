import { type Block, frameText, type ExplorationState, type NotebookDocument } from '../model/types';
import { explorationState } from '../model/exploration';
import { el,button } from './dom';
import { icon } from './icons';
import { projection } from './projection';
import { codeTokens } from './code';
import { fillExplorationResults,renderExplorationResults } from './exploration-results';

export function renderTrace(b:Block,d:NotebookDocument,save:(state:ExplorationState)=>void){
 const a=b.exploration!;if(a.kind==='plot'||!a.trace)throw Error('trace declaration required');
 let state=explorationState(a,d.userState.explorations?.[b.id]);
 const names=[...new Set(a.frames.flatMap(f=>f.variables?.map(v=>v.name)||[]))];
 const color=(name:string)=>String(names.indexOf(name)%4);
 const root=el('div','exploration exploration-trace'),header=el('div','exploration-toolbar');root.dataset.kind='sequence';
 if(a.trace.input)root.dataset.traceInput=a.trace.input;
 const reset=button('重置',()=>select(0),'exploration-reset');header.append(el('span','exploration-kind',a.trace.language+' · 执行过程'));root.append(header);
 const code=el('pre','trace-code');code.setAttribute('aria-label','程序代码');code.tabIndex=0;
 // Tokenize the whole program before splitting lines so multiline strings and
 // comments retain their lexical context. Projection offsets address the source.
 const tokensByLine:{text:string;kind:string}[][]=a.trace.code.map(()=>[]);let tokenLine=0;
 for(const token of codeTokens(a.trace.code.join('\n'),a.trace.language)){
  token.text.split('\n').forEach((text,i)=>{if(i)tokenLine++;if(text)tokensByLine[tokenLine]?.push({text,kind:token.kind});});
 }
 let offset=a.frames.flatMap(frameText).join('\n').length+1;
 const lines=a.trace.code.map((line,i)=>{
  const row=el('code','trace-line');row.dataset.line=String(i+1);
  const number=el('span','trace-line-number',String(i+1));number.setAttribute('aria-hidden','true');
  const source=el('span','trace-source'),span=projection(source,line,offset,false);offset+=line.length+1;
  span.replaceChildren(...tokensByLine[i].map(token=>{
   const node=el('span','code-token token-'+token.kind,token.text);
   if(!['string','comment','property'].includes(token.kind)&&names.includes(token.text)){
    node.dataset.variable=token.text;node.dataset.variableColor=color(token.text);
   }
   return node;
  }));
  row.append(number,source);code.append(row);return row;
 });root.append(code);
 const arrays=el('div','trace-collections'),panels=el('div','exploration-panels');let frameOffset=0;
 const collections=new Map<string,{group:HTMLElement;values:HTMLElement;empty:HTMLElement;chips:Map<string,HTMLElement>}>();
 for(const name of names){
  if(!a.frames.some(f=>f.variables?.some(v=>v.name===name&&Array.isArray(v.value))))continue;
  const group=el('div','trace-collection'),label=el('code','trace-collection-name',name),values=el('div','trace-values'),empty=el('span','trace-empty');
  group.dataset.variable=name;group.dataset.variableColor=color(name);group.dataset.input=String(name===a.trace.input);
  group.append(label,values);values.append(empty);arrays.append(group);collections.set(name,{group,values,empty,chips:new Map()});
 }
 const contents=a.frames.map(f=>{const panel=el('div','exploration-panel');panel.dataset.start=String(frameOffset);panel.dataset.explorationFrame=f.id;for(const [i,text]of frameText(f).entries()){if(i===0||text===f.text){const n=el(i===0?'h4':'p');projection(n,text,frameOffset);panel.append(n);}frameOffset+=text.length+1;}panel.dataset.end=String(frameOffset);panels.append(panel);return panel;});
 const pager=el('div','exploration-pager'),previous=button('上一步',()=>select(index()-1),'exploration-step',''),next=button('下一步',()=>select(index()+1),'exploration-step',''),range=el('input','exploration-range exploration-step-range'),count=el('span');
 previous.append(icon('previous'));next.append(icon('next'));pager.setAttribute('role','group');pager.setAttribute('aria-label','执行步骤控制');header.append(pager,reset);
 range.type='range';range.min='0';range.max=String(a.frames.length-1);range.step='1';range.setAttribute('aria-label','执行步骤');range.addEventListener('input',()=>select(range.valueAsNumber));pager.append(previous,range,count,next);
 const results=renderExplorationResults(b,d),status=el('p','exploration-status trace-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');root.append(arrays,panels,results,status);
 const animations=new Set<Animation>();let scrollFrame=0;
 const stopAnimations=()=>{for(const animation of animations)animation.cancel();animations.clear();};
 function animate(node:HTMLElement){
  if(!root.isConnected||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches||root.closest('[data-motion="reduced"]'))return;
  const r=node.getBoundingClientRect();if(r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth)return;
  const animation=node.animate([{opacity:.55,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.2,.7,.2,1)'});
  animations.add(animation);animation.onfinish=()=>animations.delete(animation);
 }
 function revealLine(line?:number){
  cancelAnimationFrame(scrollFrame);
  scrollFrame=requestAnimationFrame(()=>{
   const row=line?lines[line-1]:undefined;if(!root.isConnected||!row)return;
   const box=code.getBoundingClientRect(),target=row.getBoundingClientRect(),scale=box.height/code.offsetHeight||1;
   if(target.top<box.top+4)code.scrollTop-=Math.ceil((box.top+4-target.top)/scale);
   else if(target.bottom>box.bottom-4)code.scrollTop+=Math.ceil((target.bottom-box.bottom+4)/scale);
  });
 }
 function index(){return a.kind==='plot'?0:a.frames.findIndex(f=>f.id===state.active);}
 function select(i:number,persist=true){
  if(a.kind==='plot')return;i=Math.max(0,Math.min(a.frames.length-1,i));
  const prior=a.frames[index()],f=a.frames[i],before=a.frames[i-1],changed=state.active!==f.id;state={active:f.id};
  stopAnimations();
  contents.forEach((n,j)=>n.hidden=i!==j);panels.scrollTop=0;lines.forEach((n,j)=>{n.dataset.active=String(j+1===f.line);if(j+1===f.line)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');});
  for(const [name,collection]of collections){
   const current=f.variables?.find(v=>v.name===name),value=current?.value;
   collection.group.hidden=!Array.isArray(value);if(!Array.isArray(value))continue;
   const old=before?.variables?.find(v=>v.name===name)?.value,priorValue=prior?.variables?.find(v=>v.name===name)?.value;
   const {values,empty,chips}=collection;empty.hidden=!!value.length;empty.textContent=current?.display==='set'?'空集':'空列表';
   const present=new Set<string>(),occurrences=new Map<string,number>();
   value.forEach((item,j)=>{
    const text=JSON.stringify(item),occurrence=occurrences.get(text)||0,key=text+'#'+occurrence;occurrences.set(text,occurrence+1);present.add(key);
    let chip=chips.get(key);const created=!chip;if(!chip){chip=el('span','trace-value',text);chips.set(key,chip);}
    const currentInput=name===a.trace?.input&&j===f.cursor,wasCurrent=chip.dataset.current==='true';
    chip.dataset.current=String(currentInput);chip.dataset.added=String(current?.display==='set'&&Array.isArray(old)&&!old.includes(item));
    chip.setAttribute('aria-label',name+'['+j+'] = '+text+(currentInput?'，当前输入':''));
    if(currentInput)chip.setAttribute('aria-current','true');else chip.removeAttribute('aria-current');
    // Insert only when the order actually changes. Existing cells keep identity.
    const following=values.children[j+1];if(following!==chip)values.insertBefore(chip,following||null);
    if(persist&&changed&&(currentInput&&!wasCurrent||created&&(!Array.isArray(priorValue)||!priorValue.includes(item))))animate(chip);
   });
   for(const [key,chip]of chips)if(!present.has(key)){chip.remove();chips.delete(key);}
  }
  previous.disabled=i===0;next.disabled=i===a.frames.length-1;reset.disabled=i===0;range.value=String(i);range.style.setProperty('--exploration-fill',`${a.frames.length>1?100*i/(a.frames.length-1):0}%`);range.setAttribute('aria-valuetext',`${i+1} / ${a.frames.length}：${f.label}`);count.textContent=`${i+1} / ${a.frames.length}`;fillExplorationResults(results,b,state);
  if(persist&&changed)status.textContent=`步骤 ${i+1} / ${a.frames.length}，${f.label}；${f.line?'已执行第 '+f.line+' 行':'尚未执行'}。`;
  revealLine(f.line);if(persist&&changed)save(state);
 }
 select(index(),false);return root;
}
