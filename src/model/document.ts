import Ajv from 'ajv';
import { migrateInk } from './paper';
import schema from '../../schemas/notebook.schema.json';
import { blocksOf, pagesOf, textOf, defaultPreferences, type NotebookDocument, type Selector, type Block, type Answer } from './types';
const validate = new Ajv({allErrors:true,strict:false}).compile(schema);
export function parseDocument(raw: unknown): { document: NotebookDocument; warnings: string[] } {
  if(!validate(raw)) throw new Error((validate.errors||[]).slice(0,8).map(e=>`${e.instancePath || '/'} ${e.message}`).join('\n'));
  const d=structuredClone(raw) as unknown as NotebookDocument,warnings:string[]=[],ids=new Set<string>();
  // Preferences added after 1.0 remain optional on disk so older notebooks keep opening.
  const defaults = defaultPreferences();
  d.userState.preferences = { ...defaults, ...d.userState.preferences };
  const add=(id:string,path:string)=>{if(ids.has(id))throw new Error(`${path}: 重复 ID / duplicate ID: ${id}`);ids.add(id);};
  add(d.notebook.id,'notebook');for(const source of d.notebook.sources)add(source.id,'source');
  for(const c of d.notebook.chapters){add(c.id,'chapter');for(const p of c.pages){add(p.id,'page');for(const cue of p.cues||[]){add(cue.id,'cue');if(cue.blockId&&!p.blocks.some(b=>b.id===cue.blockId))throw new Error(`${p.id}: cue ${cue.id} 引用了不存在的内容块。`);}for(const b of p.blocks){add(b.id,'block');for(const item of [...b.items||[],...b.steps||[],...b.options||[]])add(item.id,b.id);for(const item of b.pairs||[])add(item.id,b.id);}}}
  for(const p of pagesOf(d))for(const cue of p.cues||[])if(cue.anchor){const source=p.blocks.find(b=>b.id===cue.blockId);if(!source||!textOf(source).includes(cue.anchor))throw new Error(`${p.id}: cue ${cue.id} 的 anchor 必须对应正文原句。`);}
  if(pagesOf(d).length>500||blocksOf(d).length>5000)throw new Error('请将超过 500 页或 5000 个内容块的笔记拆为分册。');
  for(const a of d.assets){add(a.id,'asset');if(!/^data:image\/(png|jpeg|webp|gif|avif|svg\+xml);(base64|charset=utf-8),/i.test(a.data))throw new Error(`资源 ${a.id} 必须是内嵌图片 data URL。`);}
  const profile=d.extensions.readerProfile as Record<string,unknown>|undefined;
  if(profile){if(typeof profile!=='object'||Array.isArray(profile))throw new Error('readerProfile 必须是对象。');const allowed:Record<string,string[]>={layout:['auto','single','spread','scroll'],direction:['horizontal','vertical'],sidebar:['open','collapsed'],pageShape:['auto','portrait','landscape'],transition:['turn','cover','slide','fade','none'],theme:['paper-light','paper-night'],motion:['full','reduced'],font:['hand','serif','sans'],lineSpacing:['1.65','1.85','2.05','2.25']};for(const [key,values] of Object.entries(allowed))if(profile[key]!==undefined&&!values.includes(String(profile[key])))throw new Error(`readerProfile.${key}: 无效选项。`);}
  const assets=new Set(d.assets.map(a=>a.id)),sources=new Set(d.notebook.sources.map(s=>s.id));
  for(const b of blocksOf(d)){
    if(b.type==='image'&&!assets.has(b.assetId||''))throw new Error(`${b.id}: 图片资源不存在 ${b.assetId}`);
    if(b.type==='exercise'&&b.questionType==='matching'&&!b.pairs?.length)throw new Error(`${b.id}: 匹配题需要至少一对条目。`);
    for(const ref of b.sourceRefs||[])if(!sources.has(ref.sourceId))warnings.push(`${b.id}: 来源 ${ref.sourceId} 不存在`);
    if(['single','multiple','truefalse'].includes(b.questionType||'')) {const opts=new Set(b.options?.map(o=>o.id));if(!b.solution?.length||b.solution.some(s=>!opts.has(s)))throw new Error(`${b.id}: 标准答案必须引用实际选项 ID。`);if(b.questionType!=='multiple'&&b.solution.length!==1)throw new Error(`${b.id}: 单选题只能有一个答案。`);}
    if(b.type==='chart'&&b.series?.some(s=>s.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))))throw new Error(`${b.id}: 图表数据须为有限数值。`);
    if(b.type==='diagram'){const nodeIds=new Set(b.nodes?.map(n=>n.id));if(nodeIds.size!==b.nodes?.length||b.edges?.some(e=>!nodeIds.has(e.from)||!nodeIds.has(e.to)))throw new Error(`${b.id}: 图示节点 ID 或连线无效。`);}
  }
  const pageIds=new Set(pagesOf(d).map(p=>p.id));
  for(const list of [d.userState.notes,d.userState.annotations,d.userState.doubts,d.userState.figureMarks||[]])for(const entry of list)add(entry.id,'userState');
  // Page-only bookmarks were strings in 1.0. Keep them readable while newer
  // text bookmarks carry an exact selector and a stable id.
  d.userState.bookmarks = d.userState.bookmarks.map((raw,index)=>typeof raw==='string'?({id:`bookmark-${raw}-${index}`,pageId:raw,kind:'page'}):raw);
  for(const b of d.userState.bookmarks){if(typeof b==='string')continue;add(b.id,'bookmark');if(!pageIds.has(b.pageId))warnings.push(`书签 ${b.id} 指向的页面已移除。`);if(b.kind==='text'&&!b.selector)throw new Error(`书签 ${b.id} 缺少原文选区。`);if(b.selector&&resolveSelector(d,b.selector).status!=='resolved')warnings.push(`书签 ${b.id} 的原文待重新关联。`);}
  if(!pageIds.has(d.userState.lastPageId))d.userState.lastPageId=pagesOf(d)[0].id;
  for(const n of d.userState.notes)if(!pageIds.has(n.pageId)){warnings.push(`便签 ${n.id} 的原页面已移除，移入当前页待整理。`);n.pageId=d.userState.lastPageId;n.attached=false;}
  for(const record of [...d.userState.notes,...d.userState.doubts]){
    const anchors=record.anchors?.length?record.anchors:record.selector?[{pageId:record.pageId,selector:record.selector}]:[];
    if(anchors.some(a=>!pageIds.has(a.pageId)||resolveSelector(d,a.selector).status!=='resolved'))warnings.push(`记录 ${record.id} 的原文待重新关联。`);
  }
  migrateInk(d);
  for(const a of d.userState.annotations){if(a.status==='needs-placement') {warnings.push(`批注 ${a.id}: 待定位，原始数据已保留`);continue;}const statuses=a.selectors.map(s=>resolveSelector(d,s).status);a.status=statuses.includes('orphaned')?'orphaned':statuses.includes('ambiguous')?'ambiguous':'resolved';if(a.status!=='resolved')warnings.push(`批注 ${a.id}: ${a.status}`);}
  return {document:d,warnings};
}
export function resolveInText(text:string,s:Selector):{status:'resolved'|'ambiguous'|'orphaned';start:number;end:number}{
  const boundary=(i:number)=>!(i>0&&i<text.length&&/[\uD800-\uDBFF]/.test(text[i-1])&&/[\uDC00-\uDFFF]/.test(text[i]));
  if(!boundary(s.start)||!boundary(s.end))return {status:'orphaned',start:0,end:0};
  if(s.end>s.start&&text.slice(s.start,s.end)===s.exact)return {status:'resolved',start:s.start,end:s.end};
  if(!s.exact)return {status:'orphaned',start:0,end:0};
  const candidates:number[]=[];let at=text.indexOf(s.exact);while(at!==-1){candidates.push(at);at=text.indexOf(s.exact,at+1);}
  if(!candidates.length)return {status:'orphaned',start:0,end:0};
  const contextual=candidates.filter(i=>(!s.prefix||text.slice(Math.max(0,i-s.prefix.length),i)===s.prefix)&&(!s.suffix||text.slice(i+s.exact.length,i+s.exact.length+s.suffix.length)===s.suffix));
  const matches=contextual.length?contextual:candidates;
  return matches.length===1?{status:'resolved',start:matches[0],end:matches[0]+s.exact.length}:{status:'ambiguous',start:0,end:0};
}
export function resolveSelector(d:NotebookDocument,s:Selector){const b=blocksOf(d).find(b=>b.id===s.blockId);return b?resolveInText(textOf(b),s):{status:'orphaned' as const,start:0,end:0};}
export function mergeUpdate(current:NotebookDocument,incoming:NotebookDocument){
  if(current.notebook.id!==incoming.notebook.id)throw new Error('更新必须使用同一个 notebook.id。');
  const base=incoming.extensions.baseRevision;
  if(base!==current.notebook.revision)throw new Error(`正文更新基于版本 ${String(base)}，当前版本是 ${current.notebook.revision}。请先导出当前版本交给 AI 合并。`);
  const next=structuredClone(incoming);next.userState=structuredClone(current.userState);next.notebook.revision=Math.max(current.notebook.revision+1,incoming.notebook.revision);next.userState.updatedAt=new Date().toISOString();
  next.assets=[...current.assets.filter(a=>!next.assets.some(x=>x.id===a.id)),...next.assets];return parseDocument(next);
}
export function grade(b:Block,a:Answer):{correct:boolean|null;score:number;total:number}{
  const total=b.points??1;if(!a.submitted||b.questionType==='subjective')return {correct:null,score:0,total};
  const correct=b.questionType==='matching'?(b.pairs||[]).every(p=>a.matches?.[p.id]===p.id):[...new Set(a.selected)].sort().join('|')===[...(b.solution||[])].sort().join('|');
  return {correct,score:correct?total:0,total};
}
export function scriptJSON(d:unknown){return JSON.stringify(d).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
