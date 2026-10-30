import { type Note, type NotebookDocument, type MaterialId } from '../model/types';
import { button, el, textarea } from '../ui/dom';
import { cueNode, cuesForSheet, layoutPaperMargins, notesForSheet, summaryForSheet } from './margins';
import type { SurfacePage } from './surface';

interface MarginHost {
 d:NotebookDocument; pages:SurfacePage[];
 indexForAnchor:(a:{pageId:string;blockId?:string;textOffset?:number})=>number;
 remember:()=>void; refreshWorkspace:()=>void; goSelector:(pageId:string,selector:NonNullable<Note['selector']>)=>void;
 addMarginNote:(page:SurfacePage,region:'right'|'bottom',position:number)=>void;
}
const colors:[MaterialId,string,string][]=[['transparent','透明','transparent'],['butter','黄色','#f0dc9e'],['sage','绿色','#d7e3bd'],['rose','粉色','#edc9c0'],['lilac','紫色','#ded1eb']];

/** Notes and authored cues share document flow; adding a note pushes later cues. */
export function renderMargin(host:MarginHost,page:SurfacePage,region:'right'|'bottom'){
 const zone=el(region==='right'?'aside':'section',region==='right'?'paper-notes':'cornell-summary paper-bottom');
 zone.dataset.notesPage=page.id;zone.dataset.notesPart=String(page.part);zone.dataset.noteRegion=region;
 zone.setAttribute('aria-label',region==='right'?'右栏批注':'底栏批注');zone.title='双击空白处写便条';zone.tabIndex=0;
 const stream=el('div','margin-stream');zone.append(stream);
 const entries:{node:HTMLElement;position:number}[]=[];
 if(region==='right')for(const cue of cuesForSheet(page,host.d)){
  entries.push({node:cueNode(cue),position:0});
 }
 if(region==='bottom'){const summary=summaryForSheet(host.d,page);if(summary)entries.push({node:el('p','margin-preset',summary),position:0});}
 const notes=notesForSheet(host.d.userState.notes,page,host.pages.indexOf(page),n=>host.indexForAnchor({pageId:n.pageId,blockId:n.selector!.blockId,textOffset:n.selector!.start}),region);
 const arrange=()=>{const paper=zone.closest('.page-surface');if(paper)layoutPaperMargins(paper,host.d);};
 for(const note of notes){
  const card=el('article','workspace-note');card.dataset.note=note.id;card.dataset.material=note.material;
  if(note.title)card.append(el('strong','note-legacy-title',note.title));
  if(note.selector){const quote=button('返回原文：'+note.selector.exact,()=>host.goSelector(note.pageId,note.selector!),'note-anchor','↗');card.append(quote);}
  const text=textarea(note.text,1);text.setAttribute('aria-label','便条内容');text.placeholder='写下想法…';
  const expand=button('展开便条',()=>{note.collapsed=!note.collapsed;host.remember();resize();},'note-expand','展开全部');
  const resize=()=>{text.style.height='0px';const full=Math.max(28,text.scrollHeight);const long=full>112;const collapsed=note.collapsed!==false;text.style.height=(long&&collapsed?100:full)+'px';card.dataset.collapsed=String(long&&collapsed);expand.hidden=!long;expand.textContent=collapsed?'展开全部':'收起';expand.setAttribute('aria-label',collapsed?'展开便条':'收起便条');expand.setAttribute('aria-expanded',String(!collapsed));arrange();};
  text.onfocus=()=>{note.collapsed=false;resize();};
  text.oninput=()=>{note.text=text.value;host.remember();resize();};
  card.addEventListener('focusout',e=>{if(e.relatedTarget instanceof Node&&card.contains(e.relatedTarget))return;if(text.scrollHeight>112){note.collapsed=true;resize();host.remember();}});
  card.append(text);if(note.back)card.append(el('p','note-back',note.back));card.append(expand);
  const actions=el('div','note-tools');actions.onpointerdown=e=>e.preventDefault();actions.setAttribute('role','group');actions.setAttribute('aria-label','便条颜色');
  for(const [material,name,color] of colors){const swatch=button('便条颜色：'+name,()=>{note.material=material;card.dataset.material=material;actions.querySelectorAll('button[data-color]').forEach(n=>n.setAttribute('aria-pressed',String((n as HTMLElement).dataset.color===material)));host.remember();},'note-swatch','');swatch.dataset.color=material;swatch.style.setProperty('--note-color',color);swatch.setAttribute('aria-pressed',String(note.material===material));actions.append(swatch);}
  actions.append(button('删除便条',()=>{host.d.userState.notes=host.d.userState.notes.filter(n=>n.id!==note.id);host.remember();host.refreshWorkspace();},'note-delete','×'));
  card.append(actions);card.dataset.marginPosition=String(note.marginPosition??.08);entries.push({node:card,position:note.marginPosition??.08});requestAnimationFrame(resize);
 }
 entries.sort((a,b)=>a.position-b.position);for(const entry of entries)stream.append(entry.node);
 const add=(position:number)=>host.addMarginNote(page,region,position);
 zone.addEventListener('dblclick',e=>{if((e.target as HTMLElement).closest('.workspace-note,.margin-preset'))return;e.preventDefault();getSelection()?.removeAllRanges();const r=zone.getBoundingClientRect();add(Math.max(0,Math.min(1,(e.clientY-r.top)/r.height)));});
 zone.addEventListener('keydown',e=>{if(e.target===zone&&e.key==='Enter'){e.preventDefault();add(.1);}});
 requestAnimationFrame(arrange);return zone;
}
