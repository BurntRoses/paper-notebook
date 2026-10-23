import { authoredAnnotations, drawInk } from './ink';
import { addAnnotation, captureSelection, type MarkKind, type SelectionPart } from './records';
import type { Annotation, NotebookDocument, Page, PaperShape } from '../model/types';
import { button, el, toast } from '../ui/dom';
export interface EditorHost {d:NotebookDocument;page:Page;shape:PaperShape;render:()=>void;remember:()=>void;invalidate:()=>void}
export const readingMarks:[MarkKind,string,string][]=[['highlight','荧光','▰'],['underline','下划线','U̲'],['circle','圈注','◯'],['wave','波浪线','〰'],['box','方框','▢'],['bracket','括注','〔〕'],['check','勾记','✓'],['star','重点星标','☆'],['dots','着重点','···']];
/** A reader may mark an anchored passage; lesson content and page layout never change. */
export class PaperEditor {
 selection:SelectionPart[]=[];private inspector:HTMLElement|null=null;private selected:string[]=[];private down:{x:number;y:number}|null=null;private past:NotebookDocument[]=[];private future:NotebookDocument[]=[];
 constructor(private host:EditorHost,private root:HTMLElement){
  document.addEventListener('selectionchange',()=>{this.cacheSelection();if(getSelection()?.toString())this.closeInspector();});
  root.addEventListener('pointerdown',e=>{this.down={x:e.clientX,y:e.clientY};});
  root.addEventListener('pointerup',e=>{const down=this.down;this.down=null;if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6||(e.target as HTMLElement).closest('button,input,select,textarea,dialog'))return;window.setTimeout(()=>{if(getSelection()?.toString())return;this.inspectAt(e.clientX,e.clientY)},0);});
  document.addEventListener('pointerdown',e=>{if(this.inspector&&!this.inspector.contains(e.target as Node))this.closeInspector();});
  document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||(e.target as HTMLElement).closest('input,textarea,select'))return;if((e.key==='Delete'||e.key==='Backspace')&&this.selected.length){e.preventDefault();this.removeSelected();return;}if(e.key==='Escape')this.closeInspector();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?this.redo():this.undo();}});
 }
 get d(){return this.host.d;}
 change(fn:()=>void){const before=structuredClone(this.d);fn();if(JSON.stringify(before.userState)!==JSON.stringify(this.d.userState)){this.past.push(before);if(this.past.length>60)this.past.shift();this.future=[];this.host.remember();}this.host.render();}
 undo=()=>{const before=this.past.pop();if(!before)return;this.future.push(structuredClone(this.d));this.d.userState.annotations=before.userState.annotations;this.d.userState.dismissedStudyMarks=before.userState.dismissedStudyMarks;this.host.render();};
 redo=()=>{const after=this.future.pop();if(!after)return;this.past.push(structuredClone(this.d));this.d.userState.annotations=after.userState.annotations;this.d.userState.dismissedStudyMarks=after.userState.dismissedStudyMarks;this.host.render();};
 reset(){this.past=[];this.future=[];this.selection=[];}
 cancel(_render=true){this.closeInspector();this.selection=[];}
 choose(_tool:string){this.cacheSelection();}
 cacheSelection(){const parts=captureSelection();if(parts.length)this.selection=parts;}
 mark(kind:MarkKind,parts=this.selection){if(!parts.length){toast('先选取需要标记的原文');return;}this.change(()=>addAnnotation(this.d,parts,kind));getSelection()?.removeAllRanges();this.selection=[];}
 toolbar(parts=this.selection){const bar=el('div','stationery');bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','原文标记');bar.onpointerdown=e=>{this.cacheSelection();e.preventDefault();};
  for(const [kind,name,glyph] of readingMarks){const b=button(name,()=>this.mark(kind,parts),'stationery-tool',glyph);b.append(el('small','mark-name',name));bar.append(b);}
  const history=el('div','mark-history'),undo=button('撤销标记',this.undo,'stationery-tool','↶'),redo=button('重做标记',this.redo,'stationery-tool','↷');undo.disabled=!this.past.length;redo.disabled=!this.future.length;history.append(undo,redo);bar.append(history);return bar;
 }
 closeInspector(){this.inspector?.remove();this.inspector=null;this.selected=[];this.root.querySelectorAll('[data-selected]').forEach(n=>n.removeAttribute('data-selected'));}
 inspectAt(x:number,y:number){
  this.closeInspector();const hits=[...this.root.querySelectorAll<SVGGraphicsElement>('.ink-overlay [data-ink]')].filter(n=>{const r=n.getBoundingClientRect();const raw=n.dataset.rect?.split(',').map(Number),paper=n.closest<HTMLElement>('.page-surface')!;if(raw){const p=paper.getBoundingClientRect(),sx=p.width/paper.offsetWidth,sy=p.height/paper.offsetHeight;const left=p.left+raw[0]*sx,top=p.top+raw[1]*sy;return x>=Math.min(r.left,left)-7&&x<=Math.max(r.right,left+raw[2]*sx)+7&&y>=Math.min(r.top,top)-6&&y<=Math.max(r.bottom,top+raw[3]*sy)+7;}return x>=r.left-6&&x<=r.right+6&&y>=r.top-6&&y<=r.bottom+6;});
  const ids=[...new Set(hits.map(n=>n.dataset.ink!))];if(!ids.length)return;
  this.selected=ids;hits.forEach(n=>n.dataset.selected='true');const authorMarks=hits.flatMap(n=>authoredAnnotations(this.d,n.closest<HTMLElement>('.page-surface')?.dataset.page||this.host.page.id));const marks=[...authorMarks,...this.d.userState.annotations].filter((a,i,all)=>ids.includes(a.id)&&all.findIndex(x=>x.id===a.id)===i);
  const panel=el('div','mark-inspector');panel.setAttribute('role','dialog');panel.setAttribute('aria-label','已选阅读标记');panel.append(el('strong','',ids.length>1?`已选 ${ids.length} 个标记`:'已选标记'),el('p','',marks.map(a=>a.selectors.map(s=>s.exact).join('…')).join(' / ')));
  if(ids.length>1){const list=el('div','mark-selection-list');for(const a of marks){const name=readingMarks.find(m=>m[0]===a.kind)?.[1]||'历史标记';list.append(button(name,()=>{this.selected=[a.id];this.root.querySelectorAll<SVGGraphicsElement>('[data-selected]').forEach(n=>{if(n.dataset.ink!==a.id)n.removeAttribute('data-selected');});list.replaceChildren(el('span','',name+'已选中'));}));}panel.append(list);}
  panel.append(button('删除标记',()=>this.removeSelected()),button('取消选择',()=>this.closeInspector()));document.body.append(panel);this.inspector=panel;const r=panel.getBoundingClientRect();panel.style.left=Math.min(innerWidth-r.width-12,Math.max(12,x-30))+'px';panel.style.top=Math.min(innerHeight-r.height-12,Math.max(12,y+18))+'px';
 }
 removeSelected(){const ids=[...this.selected];this.closeInspector();this.change(()=>{this.d.userState.annotations=this.d.userState.annotations.filter(a=>!ids.includes(a.id));this.d.userState.dismissedStudyMarks=[...new Set([...(this.d.userState.dismissedStudyMarks||[]),...ids.filter(id=>id.startsWith('author-'))])];});}
 paint(){for(const paper of this.root.querySelectorAll<HTMLElement>('.page-surface'))drawInk(paper,[...authoredAnnotations(this.d,paper.dataset.page!),...this.d.userState.annotations.filter(a=>a.pageId===paper.dataset.page)],this.d);}
 notes(container:HTMLElement){for(const note of this.d.userState.notes){const row=el('div','record-card');row.append(el('strong','record-label',note.title||'学习笔记'),el('p','record-text',note.text||note.back));if(note.selector)row.append(el('p','record-quote',note.selector.exact));container.append(row);}}
 pending(container:HTMLElement){for(const a of this.d.userState.annotations.filter(a=>a.status&&a.status!=='resolved')){const row=el('div','record-card pending-ink');row.append(el('strong','','待定位的历史标记'),el('p','',a.migration||a.selectors.map(s=>s.exact).join(' ')||'原始坐标已保留，当前阅读器不修改历史笔迹。'));container.append(row);}}
}
