import { type Block, type Expression, type ExplorationState, type NotebookDocument, traceValueText } from '../model/types';
import { evaluate, explorationState, isInteractive, regressionAnalysis } from '../model/exploration';
import { el } from './dom';

export const numberText=(n:number,digits=3)=>n.toLocaleString('zh-CN',{maximumFractionDigits:digits});

/** Match the same curve at a specific x; derived metrics keep their own identity. */
export function outputSeries(expression:Expression,series:{expression:Expression}[]){
 return series.findIndex(s=>{
  let coordinate:Expression|undefined;
  const matches=(pattern:Expression,value:Expression):boolean=>{
   if(pattern==='x'){
    if(typeof value!=='number'&&value!=='x')return false;
    if(coordinate!==undefined&&coordinate!==value)return false;
    coordinate=value;return true;
   }
   if(typeof pattern!=='object'||typeof value!=='object')return pattern===value;
   return pattern.op===value.op&&pattern.args.length===value.args.length&&pattern.args.every((p,i)=>matches(p,value.args[i]));
  };
  return matches(s.expression,expression)&&coordinate!==undefined;
 });
}

interface ResultRow {node:HTMLElement;name:HTMLElement;value:HTMLElement;previous?:HTMLElement}
interface ResultView {
 title:HTMLElement;fields:HTMLElement;rows:Map<string,ResultRow>;
 error:HTMLElement;details?:HTMLDetailsElement;tableBody?:HTMLElement;caption?:HTMLElement;
 residuals:HTMLElement[][];
}
const views=new WeakMap<HTMLElement,ResultView>();

function resultView(root:HTMLElement):ResultView{
 const existing=views.get(root);if(existing)return existing;
 const title=el('h4','exploration-report-title'),fields=el('dl','exploration-outputs'),error=el('p','exploration-error');
 error.hidden=true;root.replaceChildren(title,fields,error);
 const view={title,fields,error,rows:new Map<string,ResultRow>(),residuals:[]};views.set(root,view);return view;
}

/** Update values in place: selections, expanded details and scroll positions survive. */
export function fillExplorationResults(root:HTMLElement,b:Block,s:ExplorationState){
 const a=b.exploration!,state=explorationState(a,s),view=resultView(root),used=new Set<string>();let position=0;
 view.title.textContent=a.kind==='plot'?'实时计算':'变量状态';view.fields.hidden=false;view.error.hidden=true;
 const row=(key:string,name:string,value:string)=>{
  used.add(key);let r=view.rows.get(key);
  if(!r){r={node:el('div'),name:el('dt'),value:el('dd')};r.node.append(r.name,r.value);view.rows.set(key,r);}
  if(r.name.textContent!==name)r.name.textContent=name;
  if(r.value.textContent!==value)r.value.textContent=value;
  if(view.fields.children[position]!==r.node)view.fields.insertBefore(r.node,view.fields.children[position]||null);
  position++;return r;
 };
 try{
  if(a.kind==='plot'){
   const values=state.values!;
   a.parameters.forEach(p=>{const r=row('parameter-'+p.id,p.label,numberText(values[p.id],6)+(p.unit?' '+p.unit:''));r.node.dataset.metric='parameter-'+p.id;});
   a.outputs.forEach((o,i)=>{
    const r=row('output-'+i,o.label,numberText(evaluate(o.expression,{...values,x:a.domain.max}),o.digits??2)+(o.unit?' '+o.unit:''));
    r.node.dataset.metric='output-'+i;
    const index=outputSeries(o.expression,a.series);
    if(index>=0)r.node.dataset.series=String(index);else delete r.node.dataset.series;
   });
   if(a.regression){
    const result=regressionAnalysis(a,state);
    for(const [key,name,value] of [
     ['n','样本数 n',String(result.n)],['mse','均方误差 MSE',numberText(result.mse,4)],
     ['rmse','均方根误差 RMSE',numberText(result.rmse,4)],['r2','决定系数 R²',result.r2===null?'—（标签无变化）':numberText(result.r2,4)],
    ])row(key,name,value).node.dataset.metric=key;
    if(!view.details){
     const details=el('details','exploration-residuals'),scroll=el('div','exploration-table-scroll'),table=el('table'),head=el('tr'),thead=el('thead');
     details.append(el('summary','','逐点误差'));['样本','ŷ','e','e²'].forEach(t=>head.append(el('th','',t)));thead.append(head);
     view.caption=el('caption');view.tableBody=el('tbody');table.append(view.caption,thead,view.tableBody);scroll.append(table);details.append(scroll);root.append(details);view.details=details;
    }
    view.details.hidden=false;view.caption!.textContent='e = ŷ − y；SSE = '+numberText(result.sse,4);
    result.rows.forEach((p,i)=>{
     let cells=view.residuals[i];
     if(!cells){const tr=el('tr');cells=Array.from({length:4},()=>el('td'));tr.append(...cells);view.tableBody!.append(tr);view.residuals[i]=cells;}
     [p.label,numberText(p.predicted),numberText(p.residual),numberText(p.squared)].forEach((text,j)=>{if(cells[j].textContent!==text)cells[j].textContent=text;});
    });
    for(const cells of view.residuals.splice(result.rows.length))cells[0].parentElement!.remove();
   }else if(view.details)view.details.hidden=true;
  }else{
   const index=a.frames.findIndex(f=>f.id===state.active),frame=a.frames[index],previous=a.frames[index-1];
   const names=[...new Set(a.frames.flatMap(f=>f.variables?.map(v=>v.name)||[]))];
   names.forEach((name,color)=>{
    const current=frame.variables?.find(v=>v.name===name),before=previous?.variables?.find(v=>v.name===name);
    const r=row('variable-'+name,name,current?traceValueText(current):'未赋值');r.node.classList.add('trace-variable');r.node.dataset.variable=name;r.node.dataset.variableColor=String(color%4);
    const changed=index>0&&JSON.stringify(current?.value)!==JSON.stringify(before?.value);r.node.dataset.changed=String(changed);
    if(changed){if(!r.previous){r.previous=el('small','trace-previous');r.node.append(r.previous);}r.previous.hidden=false;r.previous.textContent='上一步：'+(before?traceValueText(before):'未赋值');}
    else if(r.previous)r.previous.hidden=true;
   });
   let location=root.querySelector<HTMLElement>('.exploration-trace-position');
   if(!location){location=el('p','exploration-trace-position');root.append(location);}
   location.textContent=`步骤 ${index+1} / ${a.frames.length} · ${frame.line?'已执行第 '+frame.line+' 行':'尚未执行'}`;
   if(view.details)view.details.hidden=true;
  }
 }catch(e){view.fields.hidden=true;if(view.details)view.details.hidden=true;view.error.hidden=false;view.error.textContent=e instanceof Error?e.message:String(e);}
 for(const [key,r] of view.rows)if(!used.has(key)){r.node.remove();view.rows.delete(key);}
}

export function renderExplorationResults(b:Block,d:NotebookDocument){
 const root=el('section','exploration-results');root.dataset.explorationReport=b.id;root.setAttribute('aria-label',(b.title||'页内交互')+'计算与状态');fillExplorationResults(root,b,d.userState.explorations?.[b.id]||{});return root;
}
export function updateExplorationResults(container:ParentNode,b:Block,state:ExplorationState){for(const n of container.querySelectorAll<HTMLElement>(`[data-exploration-report="${CSS.escape(b.id)}"]`))fillExplorationResults(n,b,state);}
export function hasLiveReport(b:Block){return b.type==='exploration'&&!!b.exploration&&isInteractive(b.exploration);}
