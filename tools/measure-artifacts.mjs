import {readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const baseline='output/size-baseline/';
const targets=[['reader.html','dist/index.html'],['machine-learning.html','dist/downloads/machine-learning.html'],['product.html','dist/downloads/paper-notebook-product.html'],['concept.html','dist/downloads/concept.html'],['conversation.zip','dist/downloads/paper-notebook-conversation.zip']];
const entries=[];
for(const [name,path]of targets){
 const beforeBytes=(await stat(baseline+name)).size,afterBytes=(await stat(path)).size;
 const row={name,beforeBytes,afterBytes,savedBytes:beforeBytes-afterBytes,savedPercent:Number((100*(beforeBytes-afterBytes)/beforeBytes).toFixed(1))};
 if(name.endsWith('.html')){
  const html=await readFile(path,'utf8');
  row.fontCSSBytes=[...html.matchAll(/@font-face\s*\{[^{}]*\}/g)].reduce((sum,m)=>sum+Buffer.byteLength(m[0]),0);
  row.scriptsBytes=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].reduce((sum,m)=>sum+Buffer.byteLength(m[1]),0);
  row.embeddedImagesBytes=[...html.matchAll(/data:image\/[^,]+,[^"'\s)<>]+/g)].reduce((sum,m)=>sum+Buffer.byteLength(m[0]),0);
 }
 entries.push(row);
}
const fontCatalog=JSON.parse(await readFile('assets/fonts/reading/manifest.json','utf8'));
let visualComparison;
try{
 const before=await readFile('output/font-comparison/before.png'),after=await readFile('output/font-comparison/after.png');
 const beforeData=JSON.parse(await readFile('output/font-comparison/before.json','utf8')),afterData=JSON.parse(await readFile('output/font-comparison/after.json','utf8'));
 visualComparison={artifact:'machine-learning.html',firstPagePNGIdentical:before.equals(after),firstPageSHA256:createHash('sha256').update(after).digest('hex'),sameLessonText:beforeData.text===afterData.text,samePagination:JSON.stringify(beforeData.pages)===JSON.stringify(afterData.pages)};
}catch(error){if(error.code!=='ENOENT')throw error;}
await writeFile('docs/verification/size-report.json',JSON.stringify({date:new Date().toISOString(),unit:'bytes (MB values in documentation are decimal)',entries,fontPolicy:{coverage:fontCatalog.coverage,chunkGlyphs:fontCatalog.chunkGlyphs,bytes:fontCatalog.bytes,outlineAndMetricsVerified:fontCatalog.outlineAndMetricsVerified},visualComparison,scope:'Actual built files compared with a saved pre-change build. Original media and complete font sources remain in the repository, outside runtime packages. No model download-speed measurements or user-provided broken HTML were available.'},null,2)+'\n');
console.log(entries.map(row=>`${row.name}: ${(row.beforeBytes/1e6).toFixed(2)} → ${(row.afterBytes/1e6).toFixed(2)} MB (${row.savedPercent}% smaller)`).join('\n'));
