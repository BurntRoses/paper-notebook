import {updateRuntime} from './runtime-update';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {checkDeliveryReview,reviewTemplate} from '../src/io/delivery-review';
import {buildMetrics} from '../src/model/build-metrics';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {zipSync,strToU8} from 'fflate';
import {parseDocument,scriptJSON} from '../src/model/document';
import {importText} from '../src/io/markdown';
import {pagesOf,blocksOf} from '../src/model/types';
import {slimFonts,artifactStem,bundleReadme} from '../src/io/packaging';
import {verifyBundledReader} from '../src/io/reader-proof';
import {reviewContent} from '../src/model/content-review';
import {checkStudyMarks} from '../src/model/study-quality';
const root=fileURLToPath(new URL('../',import.meta.url));
const [command,input,...args]=process.argv.slice(2);
const allowUnmarked=args.includes('--allow-unmarked');
async function resource(paths:string[]){for(const path of paths){try{return await readFile(root+path,'utf8')}catch{}}throw new Error('Reader runtime is missing. Run npm run build in the toolkit, or install the complete Skill package.');}
async function pinnedTemplate(){const template=await resource(['dist/index.html','assets/reader.html']);const expected=(await resource(['dist/reader-shell.sha256','assets/reader-shell.sha256'])).trim();if(createHash('sha256').update(template).digest('hex')!==expected)throw new Error('Bundled reader fingerprint mismatch; reacquire the published runtime.');return template;}
if(!['validate','build','convert','verify','review','finalize','update'].includes(command)||!input){console.log('Usage:\n  node tools/notebook.mjs validate notebook.json\n  node tools/notebook.mjs build notebook.json --out output\n  node tools/notebook.mjs verify tutorial.html --source notebook.json\n  node tools/notebook.mjs review notebook.json\n  node tools/notebook.mjs finalize tutorial.html --source notebook.json --review review.json\n  node tools/notebook.mjs convert lesson.md --out notebook.json');process.exit(command?1:0)}
try{
  if(command==='update'){console.log(JSON.stringify(await updateRuntime(input,args.includes('--offline')),null,2));process.exit(0);}
  const source=await readFile(resolve(input),'utf8');
  if(command==='review'){const document=JSON.parse(source),sourceHash=createHash('sha256').update(source).digest('hex'),rulesHash=createHash('sha256').update(await resource(['skills/paper-notebook/references/chinese-writing.md','references/chinese-writing.md'])).digest('hex');console.log(JSON.stringify({sourceSHA256:sourceHash,...buildMetrics(document),contentReview:reviewContent(document),review:reviewTemplate(document,sourceHash,rulesHash)},null,2));
  }else if(command==='verify'||command==='finalize'){
    const flag=args.indexOf('--source');if(flag>=0&&!args[flag+1])throw new Error('--source requires a path');
    const expected=flag>=0?JSON.parse(await readFile(resolve(args[flag+1]),'utf8')):undefined;
    const proof=verifyBundledReader(source,await pinnedTemplate(),expected,allowUnmarked);
    if(command==='finalize'){
      const reviewFlag=args.indexOf('--review');if(!expected||reviewFlag<0||!args[reviewFlag+1])throw new Error('finalize requires --source and --review');
      parseDocument(expected);
      const sourceHash=createHash('sha256').update(await readFile(resolve(args[flag+1]))).digest('hex'),rulesHash=createHash('sha256').update(await resource(['skills/paper-notebook/references/chinese-writing.md','references/chinese-writing.md'])).digest('hex'),artifactHash=createHash('sha256').update(source).digest('hex');
      const review=JSON.parse(await readFile(resolve(args[reviewFlag+1]),'utf8')),report={...checkDeliveryReview(expected,review,sourceHash,rulesHash,artifactHash),proof};
      await writeFile(resolve(input).replace(/\.html$/i,'')+'.delivery.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
    }else console.log(JSON.stringify({valid:true,...proof,htmlBytes:Buffer.byteLength(source)},null,2));
  }else{
  const {document,warnings}=importText(source);parseDocument(document);
  const studyMarks=command==='convert'?undefined:checkStudyMarks(document,allowUnmarked);
  const contentReview=command==='convert'?undefined:reviewContent(document);
  if(command==='validate')console.log(JSON.stringify({valid:true,id:document.notebook.id,pages:pagesOf(document).length,blocks:blocksOf(document).length,assets:document.assets.length,studyMarks,...buildMetrics(document),contentReview,warnings},null,2));
  else{
    const flag=args.indexOf('--out');if(flag>=0&&!args[flag+1])throw new Error('--out requires a path');const output=resolve(flag>=0?args[flag+1]:(command==='convert'?'notebook.json':'output'));
    if(command==='convert'){await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(document,null,2));console.log(output)}
    else{
      const template=await pinnedTemplate();let injected=false;
      const html=slimFonts(template.replace(/(<script\b[^>]*\bid=["']notebook-data["'][^>]*>)[\s\S]*?(<\/script>)/,(_,open,close)=>{injected=true;return open+scriptJSON(document)+close}).replace(/<title>[^<]*<\/title>/,()=>'<title>'+document.notebook.title.replace(/[<>&]/g,'')+' · Paper Notebook</title>'),document);
      if(!injected||/src=["'][^"']*\/src\//.test(html))throw new Error('The HTML template is not a bundled reader.');
      const proof=verifyBundledReader(html,template,document,allowUnmarked);
      const notices=await resource(['THIRD_PARTY_NOTICES.txt','assets/THIRD_PARTY_NOTICES.txt']),json=JSON.stringify(document,null,2);
      const stem=artifactStem(document.notebook.title,document.notebook.revision);
      await mkdir(output,{recursive:true});await writeFile(output+'/'+stem+'.html',html);await writeFile(output+'/notebook.json',json);await writeFile(output+'/'+stem+'.zip',zipSync({[stem+'.html']:strToU8(html),'notebook.json':strToU8(JSON.stringify(document)),'THIRD_PARTY_NOTICES.txt':strToU8(notices),'打开我-README.txt':strToU8(bundleReadme(stem))},{level:9}));await writeFile(output+'/build-report.json',JSON.stringify({id:document.notebook.id,revision:document.notebook.revision,html:stem+'.html',zip:stem+'.zip',htmlBytes:Buffer.byteLength(html),...proof,anchors:proof.studyMarks.anchors,...buildMetrics(document,template),schemaValidated:true,coreReferencesChecked:true,browserInspected:false,deliveryReady:false,nextStep:'Review source-bound editorial findings and run finalize.',contentReview,warnings},null,2));console.log(`Built ${output}/${stem}.html, notebook.json, ${stem}.zip`);
    }
  }
  }
}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1}
