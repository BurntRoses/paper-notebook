import type { Exploration, ExplorationState, Expression } from './types';

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
 if(a.kind!=='plot'){const ids=a.frames.map(f=>f.id);if(new Set(ids).size!==ids.length)fail('frames','步骤 ID 重复。');return;}
 const names=new Set<string>();for(const p of a.parameters){if(names.has(p.id)||p.id==='x')fail('parameters','变量 ID 重复或占用了 x。');names.add(p.id);if(p.min>=p.max||p.step>p.max-p.min||p.value<p.min||p.value>p.max)fail('parameters.'+p.id,'检查范围、步长和初始值。');}
 if(a.domain.min>=a.domain.max)fail('domain','最大值必须大于最小值。');
 for(const p of a.observations||[])if(p.x<a.domain.min||p.x>a.domain.max)fail('observations','观察点须落在横轴范围内。');
 const inspect=(e:Expression,depth=0):void=>{if(depth>16)fail('expression','超过 16 层。');if(typeof e==='string'){if(e!=='x'&&!names.has(e))fail('expression','未知变量 '+e);return;}if(typeof e==='number')return;const n=e.args.length;if(['sub','div','pow'].includes(e.op)&&n!==2||['ln','exp','abs'].includes(e.op)&&n!==1)fail('expression','运算参数数量不符。');e.args.forEach(v=>inspect(v,depth+1));};
 [...a.series,...a.outputs].forEach(v=>inspect(v.expression));
 const values=explorationState(a).values!;
 for(let i=0;i<=32;i++){const vars={...values,x:a.domain.min+(a.domain.max-a.domain.min)*i/32};try{a.series.forEach(s=>evaluate(s.expression,vars));a.outputs.forEach(s=>evaluate(s.expression,vars));}catch(e){fail('expression',String(e));}}
}
