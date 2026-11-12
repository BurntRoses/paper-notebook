import { type Block, type ExplorationState, type NotebookDocument, traceValueText } from '../model/types';
import { evaluate, explorationState, isInteractive, regressionAnalysis } from '../model/exploration';
import { el } from './dom';

export const numberText=(n:number,digits=3)=>n.toLocaleString('zh-CN',{maximumFractionDigits:digits});
export function fillExplorationResults(root:HTMLElement,b:Block,s:ExplorationState){
 const a=b.exploration!,state=explorationState(a,s),detailsOpen=root.querySelector('details')?.open;
 root.replaceChildren();root.append(el('h4','exploration-report-title',a.kind==='plot'?'实时计算':'变量状态'));
 const fields=el('dl','exploration-outputs');
 const row=(name:string,value:string,kind?:string)=>{const r=el('div');if(kind)r.dataset.metric=kind;r.append(el('dt','',name),el('dd','',value));fields.append(r);};
 try{
  if(a.kind==='plot'){
   const values=state.values!;
   a.parameters.forEach(p=>row(p.label,numberText(values[p.id],6)+(p.unit?' '+p.unit:''),'parameter-'+p.id));
   a.outputs.forEach((o,i)=>row(o.label,numberText(evaluate(o.expression,{...values,x:a.domain.max}),o.digits??2)+(o.unit?' '+o.unit:''),'output-'+i));
   if(a.regression){
    const r=regressionAnalysis(a,state);
    row('样本数 n',String(r.n),'n');row('均方误差 MSE',numberText(r.mse,4),'mse');row('均方根误差 RMSE',numberText(r.rmse,4),'rmse');row('决定系数 R²',r.r2===null?'—（标签无变化）':numberText(r.r2,4),'r2');
    root.append(fields);
    const details=el('details','exploration-residuals');details.open=detailsOpen??false;details.append(el('summary','','逐点误差'));
    const scroll=el('div','exploration-table-scroll'),table=el('table'),caption=el('caption','','e = ŷ − y；SSE = '+numberText(r.sse,4)),head=el('tr');['样本','ŷ','e','e²'].forEach(t=>head.append(el('th','',t)));const thead=el('thead');thead.append(head);const body=el('tbody');
    r.rows.forEach(p=>{const tr=el('tr');[p.label,numberText(p.predicted),numberText(p.residual),numberText(p.squared)].forEach(t=>tr.append(el('td','',t)));body.append(tr);});table.append(caption,thead,body);scroll.append(table);details.append(scroll);root.append(details);
   }else root.append(fields);
  }else{
   const index=a.frames.findIndex(f=>f.id===state.active),frame=a.frames[index],previous=a.frames[index-1];
   const names=[...new Set(a.frames.flatMap(f=>f.variables?.map(v=>v.name)||[]))];
   for(const name of names){const current=frame.variables?.find(v=>v.name===name),before=previous?.variables?.find(v=>v.name===name),r=el('div','trace-variable');r.dataset.variable=name;const changed=index>0&&JSON.stringify(current?.value)!==JSON.stringify(before?.value);r.dataset.changed=String(changed);r.append(el('dt','',name),el('dd','',current?traceValueText(current):'未赋值'));if(changed)r.append(el('small','trace-previous','上一步：'+(before?traceValueText(before):'未赋值')));fields.append(r);}
   root.append(fields,el('p','exploration-trace-position',`步骤 ${index+1} / ${a.frames.length} · ${frame.line?'已执行第 '+frame.line+' 行':'尚未执行'}`));
  }
 }catch(e){root.append(el('p','exploration-error',e instanceof Error?e.message:String(e)));}
}
export function renderExplorationResults(b:Block,d:NotebookDocument){
 const root=el('section','exploration-results');root.dataset.explorationReport=b.id;root.setAttribute('aria-label',(b.title||'页内交互')+'计算与状态');fillExplorationResults(root,b,d.userState.explorations?.[b.id]||{});return root;
}
export function updateExplorationResults(container:ParentNode,b:Block,state:ExplorationState){for(const n of container.querySelectorAll<HTMLElement>(`[data-exploration-report="${CSS.escape(b.id)}"]`))fillExplorationResults(n,b,state);}
export function hasLiveReport(b:Block){return b.type==='exploration'&&!!b.exploration&&isInteractive(b.exploration);}
