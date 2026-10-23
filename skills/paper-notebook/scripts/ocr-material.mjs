#!/usr/bin/env node
// Extract material locally. Raw recognition is immutable; corrections stay separate.
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {basename,extname,join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const input=process.argv[2],out=process.argv[3]||'ocr-material';
if(!input){console.error('Usage: node ocr-material.mjs <PDF|PNG|JPG|WEBP|TIFF|DOCX|TXT> [output-dir]');process.exit(2)}
const file=resolve(input),root=resolve(out),ext=extname(file).toLowerCase(),bytes=await readFile(file),sha256=createHash('sha256').update(bytes).digest('hex');await mkdir(root,{recursive:true});
if(!['.pdf','.png','.jpg','.jpeg','.webp','.tif','.tiff','.docx','.doc','.rtf','.txt','.md'].includes(ext))throw Error('Unsupported material format: '+ext);
const sourceId='material-'+sha256.slice(0,16),manifest={source:{id:sourceId,file,name:basename(file),sha256},pages:[],status:'needs-ocr',corrections:[],glossary:[],notes:[]};
if(['.txt','.md'].includes(ext))manifest.pages=[{page:1,method:'text',rawText:await readFile(file,'utf8'),correctedText:'',uncertain:[],status:'review'}];
else if(['.docx','.doc','.rtf'].includes(ext)){
 if(process.platform!=='darwin')throw Error('DOCX extraction requires macOS textutil; use a document extraction skill on this host.');
 const r=spawnSync('/usr/bin/textutil',['-convert','txt','-stdout',file],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);manifest.pages=r.stdout.split('\f').map((rawText,i)=>({page:i+1,method:'textutil; pagination may differ from visual document',rawText,correctedText:'',uncertain:[],status:'review'}));
}else if(process.platform==='darwin'){
 const swift=fileURLToPath(new URL('./ocr-native.swift',import.meta.url)),r=spawnSync('/usr/bin/swift',[swift,file],{encoding:'utf8',maxBuffer:32e6});
 if(r.status!==0)throw Error(r.stderr||r.error?.message||'Native OCR failed');manifest.pages=JSON.parse(r.stdout);
}else{
 let images=[file];if(ext==='.pdf'){
  const r=spawnSync(process.env.PDFTOPPM||'pdftoppm',['-png','-r','180',file,join(root,'page')],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||'pdftoppm unavailable');
  images=(await readdir(root)).filter(f=>/^page-\d+\.png$/.test(f)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(f=>join(root,f));
 }
 for(const [i,image]of images.entries()){
  const r=spawnSync(process.env.TESSERACT||'tesseract',[image,'stdout','-l',process.env.OCR_LANG||'chi_sim+eng','--psm','3'],{encoding:'utf8',maxBuffer:32e6});if(r.status!==0)throw Error(r.stderr||'tesseract unavailable; install a local OCR engine');manifest.pages.push({page:i+1,method:'Tesseract OCR',rawText:r.stdout,correctedText:'',uncertain:[],status:'review'});
 }
}
manifest.pages=manifest.pages.map(p=>({...p,sourceId,locator:`${basename(file)} · ${p.method.startsWith('textutil')?'section':'page'} ${p.page}`}));
manifest.status='review';manifest.notes.push('Verify equations, negation, units, option IDs and uncertain glyphs against the original. Preserve rawText; record corrections and glossary separately.');
await writeFile(join(root,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({manifest:join(root,'manifest.json'),pages:manifest.pages.length,methods:[...new Set(manifest.pages.map(p=>p.method))],status:manifest.status},null,2));
