import type { NotebookDocument } from './types';
import { resolveSelector } from './document';
export class NotebookStore {
  document: NotebookDocument; private past: NotebookDocument[]=[];private future: NotebookDocument[]=[];
  private listeners=new Set<(reason:string)=>void>();
  constructor(d:NotebookDocument){this.document=d;}
  subscribe(fn:(reason:string)=>void){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  private emit(reason:string){for(const fn of this.listeners)fn(reason);}
  change(label:string,fn:(d:NotebookDocument)=>void,content=false){
    const before=structuredClone(this.document);try{fn(this.document);}catch(e){this.document=before;throw e;}
    this.past.push(before);if(this.past.length>60)this.past.shift();this.future=[];if(content){this.document.notebook.revision++;for(const a of this.document.userState.annotations){if(a.status==='needs-placement')continue;const statuses=a.selectors.map(s=>resolveSelector(this.document,s).status);a.status=statuses.includes('orphaned')?'orphaned':statuses.includes('ambiguous')?'ambiguous':'resolved';}}
    this.document.userState.updatedAt=new Date().toISOString();this.emit(label);
  }
  transient(fn:(d:NotebookDocument)=>void){fn(this.document);this.document.userState.updatedAt=new Date().toISOString();this.emit('transient');}
  undo(){const d=this.past.pop();if(!d)return;this.future.push(structuredClone(this.document));this.document=d;this.document.userState.updatedAt=new Date().toISOString();this.emit('undo');}
  redo(){const d=this.future.pop();if(!d)return;this.past.push(structuredClone(this.document));this.document=d;this.document.userState.updatedAt=new Date().toISOString();this.emit('redo');}
  replace(d:NotebookDocument){this.document=structuredClone(d);this.past=[];this.future=[];this.emit('replace');}
  get canUndo(){return !!this.past.length;}get canRedo(){return !!this.future.length;}
}
let database:Promise<IDBDatabase>|undefined;
function db(){return database ||= new Promise<IDBDatabase>((resolve,reject)=>{if(!globalThis.indexedDB){reject(new Error('当前浏览器无法保存本机草稿，请导出文件。'));return;}const request=indexedDB.open('paper-notebook-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('documents',{keyPath:'notebook.id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export async function saveDraft(d:NotebookDocument){const database=await db();return new Promise<void>((resolve,reject)=>{const t=database.transaction('documents','readwrite');t.objectStore('documents').put(structuredClone(d));t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('保存事务已中断'));});}
export async function loadDraft(id:string){const database=await db();return new Promise<NotebookDocument|undefined>((resolve,reject)=>{const r=database.transaction('documents').objectStore('documents').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function listDrafts(){const database=await db();return new Promise<NotebookDocument[]>((resolve,reject)=>{const r=database.transaction('documents').objectStore('documents').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function deleteDraft(id:string){const database=await db();return new Promise<void>((resolve,reject)=>{const t=database.transaction('documents','readwrite');t.objectStore('documents').delete(id);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});}
