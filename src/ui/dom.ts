import { uiText } from './i18n';
import { icon } from './icons';
export function el<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',text?:string):HTMLElementTagNameMap[K]{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
export function button(label:string,fn:()=>void,cls='',glyph?:string){label=uiText(label);const b=el('button',cls);b.type='button';b.title=label;b.setAttribute('aria-label',label);if(glyph!==undefined){if(glyph){const i=el('span','button-icon',glyph);i.setAttribute('aria-hidden','true');b.append(i);}}else b.textContent=label;b.addEventListener('click',fn);return b;}
export function label(text:string,field:HTMLElement){if(!field.hasAttribute('aria-label'))field.setAttribute('aria-label',uiText(text));const n=el('label','field');n.append(el('span','field-label',uiText(text)),field);return n;}
export function input(value='',placeholder=''){const n=el('input');n.value=value;n.placeholder=placeholder;return n;}
export function textarea(value='',rows=5){const n=el('textarea');n.value=value;n.rows=rows;return n;}
export function select(options:[string,string][],value:string,change?:(v:string)=>void){const n=el('select');for(const [v,name]of options){const o=el('option','',uiText(name));o.value=v;n.append(o);}n.value=value;if(change)n.addEventListener('change',()=>change(n.value));return n;}
export function checkbox(checked:boolean,onChange:(v:boolean)=>void){const n=el('input');n.type='checkbox';n.checked=checked;n.addEventListener('change',()=>onChange(n.checked));return n;}
export function download(name:string,data:Blob|string,mime='text/plain;charset=utf-8'){const blob=typeof data==='string'?new Blob([data],{type:mime}):data;const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export function safeName(s:string){return s.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,80)||'notebook';}
export function modal(title:string,subtitle=''){
 title=uiText(title);subtitle=uiText(subtitle);const previous=document.activeElement as HTMLElement|null;const previousNote=previous?.closest<HTMLElement>('[data-note]')?.dataset.note,previousBlock=previous?.closest<HTMLElement>('[data-block]')?.dataset.block,previousLabel=previous?.getAttribute('aria-label');const dialog=el('dialog','sheet-dialog');dialog.tabIndex=-1;dialog.autofocus=true;const head=el('header','dialog-head');const titleNode=el('h2','',title);titleNode.id='dialog-'+Math.random().toString(36).slice(2);dialog.setAttribute('aria-labelledby',titleNode.id);const close=button('关闭 / Close',()=>dialog.close(),'close-dialog','');close.append(icon('close'));head.append(titleNode,close);dialog.append(head);if(subtitle)dialog.append(el('p','dialog-subtitle',subtitle));
 const body=el('div','dialog-body'),foot=el('footer','dialog-foot');dialog.append(body,foot);document.body.append(dialog);
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if((e as MouseEvent).clientX<r.left||(e as MouseEvent).clientX>r.right||(e as MouseEvent).clientY<r.top||(e as MouseEvent).clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{dialog.remove();if(previous?.isConnected)previous.focus({preventScroll:true});else{const selector=previousNote?`[data-note="${CSS.escape(previousNote)}"]`:previousBlock?`[data-block="${CSS.escape(previousBlock)}"]`:previousLabel?`[aria-label="${CSS.escape(previousLabel)}"]`:null;if(selector)document.querySelector<HTMLElement>(selector)?.focus({preventScroll:true});}});
 dialog.showModal();dialog.focus({preventScroll:true});return {dialog,body,foot,close:()=>dialog.close()};
}
export function confirmDialog(title:string,message:string,accept:()=>void){const m=modal(title,message);m.foot.append(button('取消',m.close,'quiet'),button('确定',()=>{m.close();accept();},'primary'));}
export function toast(message:string,persistent=false){let n=document.querySelector<HTMLElement>('#toast');if(!n){n=el('div','toast');n.id='toast';n.setAttribute('role','status');n.setAttribute('aria-live','polite');document.body.append(n);}n.textContent=uiText(message);n.hidden=false;clearTimeout((toast as unknown as {timer:number}).timer);if(!persistent)(toast as unknown as {timer:number}).timer=window.setTimeout(()=>{n!.hidden=true;},4800);}
export async function copyText(text:string){try{await navigator.clipboard.writeText(text);toast('已复制 / Copied');}catch{const m=modal('复制内容 / Copy','当前入口限制剪贴板；可选中下面内容手动复制。');const area=textarea(text,14);m.body.append(area);area.focus();area.select();m.foot.append(button('关闭',m.close,'primary'));}}
export function readFile(file:File){return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(file);});}
export function pickFile(accept:string,multiple=false):Promise<File[]>{return new Promise(resolve=>{const n=el('input');n.type='file';n.accept=accept;n.multiple=multiple;n.hidden=true;document.body.append(n);n.addEventListener('change',()=>{resolve([...n.files||[]]);n.remove();});n.addEventListener('cancel',()=>{resolve([]);n.remove();});n.click();});}

let activeChoice:{wrap:HTMLElement;close:()=>void}|null=null;
let choiceOutsideBound=false;
/** Keep a real select for values/forms, and present an accessible paper-styled listbox. */
export function enhanceSelects(root:ParentNode=document){
 if(!choiceOutsideBound){document.addEventListener('pointerdown',e=>{if(activeChoice&&!activeChoice.wrap.contains(e.target as Node))activeChoice.close();});choiceOutsideBound=true;}
 const selects=[...(root instanceof HTMLSelectElement&&!root.dataset.choice?[root]:[]),...root.querySelectorAll<HTMLSelectElement>('select:not([data-choice])')];
 for(const n of selects){
  n.dataset.choice='true';n.tabIndex=-1;n.setAttribute('aria-hidden','true');const wrap=el('span','paper-choice'),trigger=button('',()=>toggle()),list=el('div','paper-choice-list');
  n.before(wrap);wrap.append(n,trigger,list);trigger.className='paper-choice-trigger';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
  const id='choice-'+Math.random().toString(36).slice(2);list.id=id;list.setAttribute('role','listbox');list.setAttribute('popover','manual');trigger.setAttribute('aria-controls',id);
  let index=0,opened=false;
  const sync=()=>{trigger.textContent=n.selectedOptions[0]?.textContent||'选择';trigger.disabled=n.disabled;trigger.setAttribute('aria-label',n.getAttribute('aria-label')||n.closest('label')?.querySelector('.field-label')?.textContent||n.closest('label')?.firstElementChild?.textContent||'选择');};
  const close=()=>{if(activeChoice?.wrap===wrap)activeChoice=null;opened=false;trigger.setAttribute('aria-expanded','false');if(list.matches(':popover-open'))list.hidePopover();else list.hidden=true;};
  const focus=(i:number)=>{const options=[...list.querySelectorAll<HTMLButtonElement>('[role=option]')];index=Math.max(0,Math.min(options.length-1,i));options[index]?.focus();};
  const toggle=()=>{
   if(opened){close();return;}activeChoice?.close();activeChoice={wrap,close};sync();list.replaceChildren();[...n.options].forEach((o,i)=>{const b=button(o.textContent||'',()=>{n.value=o.value;n.dispatchEvent(new Event('change',{bubbles:true}));sync();close();if(trigger.isConnected)trigger.focus();});b.setAttribute('role','option');b.setAttribute('aria-selected',String(o.selected));b.disabled=o.disabled;list.append(b);});
   const r=trigger.getBoundingClientRect(),width=Math.min(innerWidth-24,Math.max(190,r.width));list.style.width=width+'px';list.style.left=Math.min(Math.max(12,r.left),Math.max(12,innerWidth-width-12))+'px';list.style.top=Math.min(innerHeight-220,r.bottom+5)+'px';list.style.maxHeight=Math.min(300,innerHeight-40)+'px';list.hidden=false;list.showPopover?.();opened=true;trigger.setAttribute('aria-expanded','true');focus(Math.max(0,n.selectedIndex));
  };
  n.addEventListener('change',sync);trigger.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','Enter',' '].includes(e.key)){e.preventDefault();toggle();}});
  list.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Tab'){close();trigger.focus();if(e.key==='Escape')e.preventDefault();}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();focus(e.key==='Home'?0:e.key==='End'?n.options.length-1:index+(e.key==='ArrowDown'?1:-1));}});
  sync();list.hidden=true;
 }
}
