import type {Block} from './types';
/** Collapse cycles, then rank the component DAG by actual directed edges. */
export function diagramLayers(b:Block){
 const nodes=b.nodes||[],ids=new Set(nodes.map(n=>n.id)),adj=new Map(nodes.map(n=>[n.id,[] as string[]]));
 for(const e of b.edges||[])if(ids.has(e.from)&&ids.has(e.to))adj.get(e.from)!.push(e.to);
 let tick=0;const index=new Map<string,number>(),low=new Map<string,number>(),stack:string[]=[],active=new Set<string>(),groups:string[][]=[];
 const visit=(id:string)=>{index.set(id,tick);low.set(id,tick++);stack.push(id);active.add(id);for(const next of adj.get(id)!){if(!index.has(next)){visit(next);low.set(id,Math.min(low.get(id)!,low.get(next)!));}else if(active.has(next))low.set(id,Math.min(low.get(id)!,index.get(next)!));}if(low.get(id)===index.get(id)){const group:string[]=[];let next:string;do{next=stack.pop()!;active.delete(next);group.push(next);}while(next!==id);groups.push(group);}};
 for(const n of nodes)if(!index.has(n.id))visit(n.id);
 const groupOf=new Map(groups.flatMap((g,i)=>g.map(id=>[id,i] as const))),out=groups.map(()=>new Set<number>()),incoming=groups.map(()=>0),rank=groups.map(()=>0);
 for(const e of b.edges||[]){const a=groupOf.get(e.from),z=groupOf.get(e.to);if(a!==undefined&&z!==undefined&&a!==z&&!out[a].has(z)){out[a].add(z);incoming[z]++;}}
 const queue=incoming.flatMap((v,i)=>v===0?[i]:[]);for(let i=0;i<queue.length;i++){const a=queue[i];for(const z of out[a]){rank[z]=Math.max(rank[z],rank[a]+1);if(--incoming[z]===0)queue.push(z);}}
 const layers:typeof nodes[]=[];for(const n of nodes){const r=rank[groupOf.get(n.id)!];(layers[r]??=[]).push(n);}return layers;
}
