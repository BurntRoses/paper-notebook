import type { Exploration, ExplorationState, Expression, PlotExploration } from './types';

export const isInteractive=(a:Exploration)=>a.kind==='plot'||a.kind==='sequence'&&!!a.trace;
export function regressionAnalysis(a:PlotExploration,state:ExplorationState){
 const points=a.observations||[],values=explorationState(a,state).values!;
 const rows=points.map((p,i)=>{const predicted=evaluate(a.series[0].expression,{...values,x:p.x}),residual=predicted-p.y;return {...p,label:p.label||String(i+1),predicted,residual,squared:residual*residual};});
 const n=rows.length,mean=rows.reduce((sum,p)=>sum+p.y,0)/n,sse=rows.reduce((sum,p)=>sum+p.squared,0),total=rows.reduce((sum,p)=>sum+(p.y-mean)**2,0),mse=sse/n;
 return {rows,n,sse,mse,rmse:Math.sqrt(mse),r2:total>0?1-sse/total:null};
}
export function leastSquares(a:PlotExploration){
 const points=a.observations!,x=points.reduce((s,p)=>s+p.x,0)/points.length,y=points.reduce((s,p)=>s+p.y,0)/points.length;
 const slope=points.reduce((s,p)=>s+(p.x-x)*(p.y-y),0)/points.reduce((s,p)=>s+(p.x-x)**2,0);
 return {slope,intercept:y-slope*x};
}

/** A small data language. Lesson files never supply JavaScript or executable markup. */
export function evaluate(expression:Expression,variables:Record<string,number>,depth=0):number {
 if(depth>16)throw new Error('表达式超过 16 层。');
 let result:number;
 if(typeof expression==='number')result=expression;
 else if(typeof expression==='string'){if(!Object.hasOwn(variables,expression))throw new Error('未知变量：'+expression);result=variables[expression];}
 else {const a=expression.args.map(e=>evaluate(e,variables,depth+1));switch(expression.op){
  case 'add':result=a.reduce((x,y)=>x+y,0);break;case 'sub':result=a[0]-a[1];break;
  case 'mul':result=a.reduce((x,y)=>x*y,1);break;case 'div':result=a[0]/a[1];break;
  case 'pow':result=Math.pow(a[0],a[1]);break;case 'ln':result=Math.log(a[0]);break;
  case 'exp':result=Math.exp(a[0]);break;case 'abs':result=Math.abs(a[0]);break;
  case 'min':result=Math.min(...a);break;case 'max':result=Math.max(...a);break;
  default:throw new Error('未知运算。');
 }}
 if(!Number.isFinite(result)||Math.abs(result)>1e15)throw new Error('当前参数超出可计算范围。');return result;
}
export function explorationState(a:Exploration,s:ExplorationState={}):ExplorationState {
 if(a.kind!=='plot')return {active:a.frames.some(f=>f.id===s.active)?s.active:a.frames[0].id};
 return {values:Object.fromEntries(a.parameters.map(p=>{const raw=s.values?.[p.id],v=Number.isFinite(raw)?Number(raw):p.value;return [p.id,Number(Math.min(p.max,Math.max(p.min,p.min+Math.round((v-p.min)/p.step)*p.step)).toPrecision(12))];}))};
}
export function validateExploration(a:Exploration,path:string){
 const fail=(field:string,message:string):never=>{throw new Error(`${path}.exploration.${field}: ${message}`);};
 if(a.kind!=='plot'){
  const ids=a.frames.map(f=>f.id);if(new Set(ids).size!==ids.length)fail('frames','步骤 ID 重复。');
  if(a.trace){
   if(a.kind!=='sequence')fail('trace','执行过程使用 sequence。');
   for(const [i,f]of a.frames.entries()){
    if(!Number.isInteger(f.line)||f.line!<0||f.line!>a.trace.code.length)fail(`frames.${i}.line`,'须对应代码行号，0 表示尚未执行。');
    if(!f.variables)fail(`frames.${i}.variables`,'缺少完整变量快照。');
    const names=f.variables!.map(v=>v.name);if(new Set(names).size!==names.length)fail(`frames.${i}.variables`,'变量名重复。');
    if(f.variables!.some(v=>v.display==='set'&&(!Array.isArray(v.value)||new Set(v.value.map(x=>JSON.stringify(x))).size!==v.value.length)))fail(`frames.${i}.variables`,'集合值必须为不含重复元素的数组。');
    if(f.cursor!==undefined){const input=f.variables!.find(v=>v.name===a.trace!.input)?.value;if(!Array.isArray(input)||f.cursor<0||f.cursor>=input.length)fail(`frames.${i}.cursor`,'须对应输入列表中的元素。');}
   }
   if(!a.frames.some((f,i)=>i>0&&JSON.stringify(f.variables)!==JSON.stringify(a.frames[i-1].variables)))fail('frames','执行过程须包含变量变化。');
  }return;
 }
 const names=new Set<string>();for(const p of a.parameters){if(names.has(p.id)||p.id==='x')fail('parameters','变量 ID 重复或占用了 x。');names.add(p.id);if(p.min>=p.max||p.step>p.max-p.min||p.value<p.min||p.value>p.max)fail('parameters.'+p.id,'检查范围、步长和初始值。');}
 if(a.domain.min>=a.domain.max)fail('domain','最大值必须大于最小值。');
 if(a.regression){
  if(a.regression.slope===a.regression.intercept||![a.regression.slope,a.regression.intercept].every(id=>names.has(id)))fail('regression','斜率与截距须绑定不同的已声明参数。');
  if((a.observations?.length||0)<2||new Set(a.observations?.map(p=>p.x)).size<2)fail('regression','至少需要两个横坐标不同的观测点。');
 }
 for(const p of a.observations||[])if(p.x<a.domain.min||p.x>a.domain.max)fail('observations','观察点须落在横轴范围内。');
 const inspect=(e:Expression,depth=0):void=>{if(depth>16)fail('expression','超过 16 层。');if(typeof e==='string'){if(e!=='x'&&!names.has(e))fail('expression','未知变量 '+e);return;}if(typeof e==='number')return;const n=e.args.length;if(['sub','div','pow'].includes(e.op)&&n!==2||['ln','exp','abs'].includes(e.op)&&n!==1)fail('expression','运算参数数量不符。');e.args.forEach(v=>inspect(v,depth+1));};
 [...a.series,...a.outputs].forEach(v=>inspect(v.expression));
 const values=explorationState(a).values!;
 for(let i=0;i<=32;i++){const vars={...values,x:a.domain.min+(a.domain.max-a.domain.min)*i/32};try{a.series.forEach(s=>evaluate(s.expression,vars));a.outputs.forEach(s=>evaluate(s.expression,vars));if(a.regression&&Math.abs(evaluate(a.series[0].expression,vars)-(values[a.regression.slope]*vars.x+values[a.regression.intercept]))>1e-8)fail('regression','首条曲线须为所绑定斜率与截距的一元线性模型。');}catch(e){fail('expression',String(e));}}
}
