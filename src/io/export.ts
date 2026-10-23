import { zipSync, strToU8 } from 'fflate';
import { toPng } from 'html-to-image';
import { userState, type NotebookDocument } from '../model/types';
import { scriptJSON } from '../model/document';
import { download, safeName } from '../ui/dom';
import notices from '../../THIRD_PARTY_NOTICES.txt?raw';
export { notices };
let initialShell='';
export function captureShell(){initialShell='<!doctype html>\n'+document.documentElement.outerHTML;}
export function shareDocument(d:NotebookDocument,personal:boolean){const copy=structuredClone(d);if(!personal){const prefs=copy.userState.preferences;copy.userState=userState(copy.notebook.chapters[0].pages[0].id);copy.userState.preferences={...prefs,weatherEnabled:false,weatherCity:'',timerRunning:false,timerEnd:undefined,timerRemaining:1500};}return copy;}
export async function htmlFor(d:NotebookDocument){let shell=initialShell;if(/<script[^>]+src=["'][^"']*(?:src\/(?:main|reader\/main)|@vite)/.test(shell)){
 const response=await fetch('./downloads/blank-notebook.html');if(!response.ok)throw new Error('开发入口请先 build，再用 preview 打开；离线导出需要已打包的运行时。');shell=await response.text();if(!shell.includes('notebook-data')||shell.includes('/src/main.ts')||shell.includes('/src/reader/main.ts'))throw new Error('未找到成品运行时，请先运行 build。');
 }
 return shell.replace(/(<script\b[^>]*\bid=["']notebook-data["'][^>]*>)[\s\S]*?(<\/script>)/,(_,open,close)=>open+scriptJSON(d)+close).replace(/<title>[^<]*<\/title>/,()=>`<title>${d.notebook.title.replace(/[<>&]/g,'')} · Paper Notebook</title>`);
}
export async function exportHTML(d:NotebookDocument){download(safeName(d.notebook.title)+'.html',await htmlFor(d),'text/html;charset=utf-8');}
export async function exportBundle(d:NotebookDocument){const files:Record<string,Uint8Array>={'index.html':strToU8(await htmlFor(d)),'notebook.json':strToU8(JSON.stringify(d,null,2)),'THIRD_PARTY_NOTICES.txt':strToU8(notices),'README.txt':strToU8('打开 index.html 即可阅读、标记和再次导出。notebook.json 是完整源文件。\nOpen index.html to read and mark. No server or AI account is required.\n第三方许可见应用的关于页面 / See About for third-party notices.')};for(const asset of d.assets){const match=asset.data.match(/^data:([^;,]+);base64,(.*)$/s);if(match){const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));files['assets/'+asset.id+'.'+(asset.mime.split('/')[1]||'bin').replace('svg+xml','svg')]=bytes;}else files['assets/'+asset.id+'.txt']=strToU8(asset.data);}download(safeName(d.notebook.title)+'.zip',new Blob([zipSync(files,{level:6}) as Uint8Array<ArrayBuffer>],{type:'application/zip'}));}
export async function pagePNG(paper:HTMLElement){paper.classList.add('export-capture');try{return await toPng(paper,{width:paper.offsetWidth,height:paper.offsetHeight,pixelRatio:2,style:{transform:'none'},filter:n=>!(n instanceof HTMLElement&&(n.classList.contains('object-handles')||n.classList.contains('page-corner')||n.hasAttribute('data-export-exclude')))});}finally{paper.classList.remove('export-capture');}}
export async function exportPreview(paper:HTMLElement,title:string){const url=await pagePNG(paper);const a=document.createElement('a');a.href=url;a.download=safeName(title)+'.png';a.click();}
