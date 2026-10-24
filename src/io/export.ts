import { zipSync, strToU8 } from 'fflate';
import { toPng } from 'html-to-image';
import { userState, type NotebookDocument } from '../model/types';
import { scriptJSON } from '../model/document';
import { slimFonts, artifactStem, bundleReadme } from './packaging';
import { download, safeName } from '../ui/dom';
import notices from '../../THIRD_PARTY_NOTICES.txt?raw';
export { notices };
let initialShell='';
export function captureShell(){initialShell='<!doctype html>\n'+document.documentElement.outerHTML;}
export function shareDocument(d:NotebookDocument,personal:boolean){const copy=structuredClone(d);if(!personal){const prefs=copy.userState.preferences;copy.userState=userState(copy.notebook.chapters[0].pages[0].id);copy.userState.preferences={...prefs,weatherEnabled:false,weatherCity:'',timerRunning:false,timerEnd:undefined,timerRemaining:1500};}return copy;}
export async function htmlFor(d:NotebookDocument){let shell=initialShell;if(/<script[^>]+src=["'][^"']*(?:src\/(?:main|reader\/main)|@vite)/.test(shell)){
 const response=await fetch('./downloads/blank-notebook.html');if(!response.ok)throw new Error('开发入口请先 build，再用 preview 打开；离线导出需要已打包的运行时。');shell=await response.text();if(!shell.includes('notebook-data')||shell.includes('/src/main.ts')||shell.includes('/src/reader/main.ts'))throw new Error('未找到成品运行时，请先运行 build。');
 }
 return slimFonts(shell.replace(/(<script\b[^>]*\bid=["']notebook-data["'][^>]*>)[\s\S]*?(<\/script>)/,(_,open,close)=>open+scriptJSON(d)+close).replace(/<title>[^<]*<\/title>/,()=>`<title>${d.notebook.title.replace(/[<>&]/g,'')} · Paper Notebook</title>`),d);
}
export async function exportHTML(d:NotebookDocument){download(artifactStem(d.notebook.title,d.notebook.revision)+'.html',await htmlFor(d),'text/html;charset=utf-8');}
export async function exportBundle(d:NotebookDocument){const stem=artifactStem(d.notebook.title,d.notebook.revision);const files:Record<string,Uint8Array>={[stem+'.html']:strToU8(await htmlFor(d)),'notebook.json':strToU8(JSON.stringify(d)),'THIRD_PARTY_NOTICES.txt':strToU8(notices),'打开我-README.txt':strToU8(bundleReadme(stem))};download(stem+'.zip',new Blob([zipSync(files,{level:9}) as Uint8Array<ArrayBuffer>],{type:'application/zip'}));}
export async function pagePNG(paper:HTMLElement){paper.classList.add('export-capture');try{return await toPng(paper,{width:paper.offsetWidth,height:paper.offsetHeight,pixelRatio:2,style:{transform:'none'},filter:n=>!(n instanceof HTMLElement&&(n.classList.contains('object-handles')||n.classList.contains('page-corner')||n.hasAttribute('data-export-exclude')))});}finally{paper.classList.remove('export-capture');}}
export async function exportPreview(paper:HTMLElement,title:string){const url=await pagePNG(paper);const a=document.createElement('a');a.href=url;a.download=safeName(title)+'.png';a.click();}
