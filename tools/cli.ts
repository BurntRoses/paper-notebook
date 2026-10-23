import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {zipSync,strToU8} from 'fflate';
import {parseDocument,scriptJSON} from '../src/model/document';
import {importText} from '../src/io/markdown';
import {pagesOf,blocksOf} from '../src/model/types';
const root=fileURLToPath(new URL('../',import.meta.url));
const [command,input,...args]=process.argv.slice(2);
async function resource(paths:string[]){for(const path of paths){try{return await readFile(root+path,'utf8')}catch{}}throw new Error('Reader runtime is missing. Run npm run build in the toolkit, or install the complete Skill package.');}
if(!['validate','build','convert'].includes(command)||!input){console.log('Usage:\n  node tools/notebook.mjs validate notebook.json\n  node tools/notebook.mjs build notebook.json --out output\n  node tools/notebook.mjs convert lesson.md --out notebook.json');process.exit(command?1:0)}
try{
  const source=await readFile(resolve(input),'utf8'),{document,warnings}=importText(source);parseDocument(document);
  if(command==='validate')console.log(JSON.stringify({valid:true,id:document.notebook.id,pages:pagesOf(document).length,blocks:blocksOf(document).length,assets:document.assets.length,warnings},null,2));
  else{
    const flag=args.indexOf('--out');if(flag>=0&&!args[flag+1])throw new Error('--out requires a path');const output=resolve(flag>=0?args[flag+1]:(command==='convert'?'notebook.json':'output'));
    if(command==='convert'){await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(document,null,2));console.log(output)}
    else{
      const template=await resource(['dist/index.html','assets/reader.html']);let injected=false;
      const html=template.replace(/(<script\b[^>]*\bid=["']notebook-data["'][^>]*>)[\s\S]*?(<\/script>)/,(_,open,close)=>{injected=true;return open+scriptJSON(document)+close}).replace(/<title>[^<]*<\/title>/,()=>'<title>'+document.notebook.title.replace(/[<>&]/g,'')+' · Paper Notebook</title>');
      if(!injected||/src=["'][^"']*\/src\//.test(html))throw new Error('The HTML template is not a bundled reader.');
      const notices=await resource(['THIRD_PARTY_NOTICES.txt','assets/THIRD_PARTY_NOTICES.txt']),json=JSON.stringify(document,null,2);
      await mkdir(output,{recursive:true});await writeFile(output+'/index.html',html);await writeFile(output+'/notebook.json',json);await writeFile(output+'/notebook.zip',zipSync({'index.html':strToU8(html),'notebook.json':strToU8(json),'THIRD_PARTY_NOTICES.txt':strToU8(notices)},{level:6}));await writeFile(output+'/build-report.json',JSON.stringify({id:document.notebook.id,revision:document.notebook.revision,htmlBytes:Buffer.byteLength(html),warnings},null,2));console.log(`Built ${output}/index.html, notebook.json, notebook.zip`);
    }
  }
}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1}
