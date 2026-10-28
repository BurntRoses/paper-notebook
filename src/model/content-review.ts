import rules from '../../skills/paper-notebook/references/writing-rules.json';
import { textOf, type NotebookDocument } from './types';
export interface WritingWarning {rule:string;location:string;at:number;phrase:string;context:string;guidance:string}
/** Advisory only. Never edit source, quotations, technical literals or personal records. */
export function reviewContent(d:NotebookDocument){
 const warnings:WritingWarning[]=[];
 const inspect=(value:unknown,location:string)=>{
  if(typeof value!=='string')return;
  const safe=value.replace(/```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]*?\$\$|\$[^$\n]+\$|https?:\/\/[^\s)]+/g,hit=>' '.repeat(hit.length));
  for(const rule of rules)for(const hit of safe.matchAll(new RegExp(rule.pattern,'g')))warnings.push({rule:rule.id,location,at:hit.index!,phrase:hit[0],context:value.slice(Math.max(0,hit.index!-20),hit.index!+hit[0].length+40),guidance:rule.guidance});
 };
 inspect(d.notebook.title,'notebook.title');inspect(d.notebook.subtitle,'notebook.subtitle');d.notebook.goals.forEach((g,i)=>inspect(g,`goals.${i}`));
 const pages:{pageId:string;characters:number;figures:number;tables:number}[]=[];
 for(const chapter of d.notebook.chapters){inspect(chapter.title,chapter.id+'.title');for(const page of chapter.pages){
  for(const key of ['title','subtitle','summary'] as const)inspect(page[key],page.id+'.'+key);
  page.cues?.forEach(c=>inspect(c.text,c.id));
  let characters=0,figures=0,tables=0;
  for(const b of page.blocks){
   characters+=textOf(b).length;if(['image','diagram','chart'].includes(b.type))figures++;if(b.type==='comparison')tables++;
   if(['quote','code'].includes(b.type))continue;
   for(const key of ['title','text','question','prompt','result','explanation','caption','alt','xLabel','yLabel'])inspect(b[key],b.id+'.'+key);
   for(const item of [...b.items||[],...b.steps||[],...b.options||[]])inspect(item.text,item.id);
   b.parameters?.forEach((p,i)=>{inspect(p.name,`${b.id}.parameters.${i}.name`);inspect(p.description,`${b.id}.parameters.${i}.description`)});
   [...b.columns||[],...(b.rows||[]).flat()].forEach((v,i)=>inspect(v,`${b.id}.cells.${i}`));
   [...b.nodes||[],...b.edges||[],...b.series||[]].forEach((v,i)=>inspect(v.label,`${b.id}.labels.${i}`));
   b.pairs?.forEach(p=>{inspect(p.left,p.id+'.left');inspect(p.right,p.id+'.right')});
   inspect(b.study?.aside,b.id+'.study.aside');inspect(b.study?.label,b.id+'.study.label');b.study?.explanations?.forEach((e,i)=>inspect(e.note,`${b.id}.study.explanations.${i}`));
  }
  pages.push({pageId:page.id,characters,figures,tables});
 }}
 const imageIds=new Set(d.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks).filter(b=>b.type==='image').map(b=>b.assetId));
 const assets=d.assets.map(a=>({assetId:a.id,used:imageIds.has(a.id),bytes:a.data.includes(';base64,')?Math.floor((a.data.length-a.data.indexOf(',')-1)*3/4):new TextEncoder().encode(a.data).length})).sort((a,b)=>b.bytes-a.bytes);
 const visualWarnings:string[]=[];
 if(pages.some((p,i)=>i>0&&p.characters>=300&&pages[i-1].characters>=300&&!p.figures&&!pages[i-1].figures))visualWarnings.push('连续讲解缺少实际配图；按关系、空间、数值等教学需要增加图解。表格单独计数。');
 for(const a of assets){if(!a.used)visualWarnings.push(`${a.assetId}: 未引用素材，检查是否仍供原图追溯。`);if(a.bytes>300000)visualWarnings.push(`${a.assetId}: 素材超过 300 KB，核对显示尺寸与文字清晰度后压缩。`);}
 return {advisory:true,automaticRewrite:false,writing:{warnings},visuals:{pages,figures:pages.reduce((s,p)=>s+p.figures,0),tables:pages.reduce((s,p)=>s+p.tables,0),warnings:visualWarnings},assets};
}
