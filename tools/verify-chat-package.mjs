/** Verify the shipped conversation package without a vendor account or API. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {unzipSync,strFromU8} from 'fflate';

const root=process.cwd(),destination=resolve(root,'output/conversation-package-check');
const files=unzipSync(await readFile('dist/downloads/paper-notebook-conversation.zip'));
for(const [name,bytes] of Object.entries(files)){
 const target=resolve(destination,name);
 assert.ok(target.startsWith(destination+'/'),'package path must stay inside its output folder');
 await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
}
for(const name of ['SKILL.md','START-HERE.md','assets/reader.html','assets/blank-notebook.json','prompts/README.md','prompts/conversation-model.txt','prompts/coding-agent.txt','scripts/build_reader.py','scripts/verify_reader.py','scripts/study_quality.py','scripts/content_review.py','references/writing-rules.json','references/writing-review.md','references/multimodal.md','scripts/prepare_conversation.py','scripts/notebook.mjs','references/notebook.schema.json','references/conversation-start.md','references/workspace-start.md','references/responses/download-unavailable.zh-CN.txt','references/responses/file-delivery-unavailable.zh-CN.txt','references/content-contract.md','references/components.md','references/writing.md','references/reader-output.md'])assert.ok(files['paper-notebook/'+name],name);
assert.equal(strFromU8(files['paper-notebook/START-HERE.md']),await readFile('skills/paper-notebook/references/conversation-start.md','utf8'));
assert.equal(strFromU8(files['paper-notebook/prompts/conversation-model.txt']),await readFile('public/paper-notebook-prompt.txt','utf8'));
for(const name of ['download-unavailable','file-delivery-unavailable']){
 const path='references/responses/'+name+'.zh-CN.txt';
 assert.equal(strFromU8(files['paper-notebook/'+path]),await readFile('skills/paper-notebook/'+path,'utf8'));
}
assert.ok(strFromU8(files['paper-notebook/scripts/prepare_conversation.py']).includes(JSON.stringify(strFromU8(files['paper-notebook/references/responses/download-unavailable.zh-CN.txt']).trim())),'helper returns the canonical preset');
const kit=resolve(destination,'paper-notebook'),source=await readFile('examples/product-notebook.json','utf8');
await writeFile(kit+'/notebook.json',source);
const execute=(command,args,cwd=root,nodeOnly=false)=>spawnSync(command,args,{cwd,encoding:'utf8',env:nodeOnly?{...process.env,PATH:dirname(process.execPath)}:process.env});
const run=(command,args,cwd=root,nodeOnly=false)=>{
 const result=execute(command,args,cwd,nodeOnly);
 assert.equal(result.status,0,result.stderr||result.stdout);return result.stdout.trim();
};
const build=run(process.env.PYTHON||'python3',['scripts/build_reader.py','notebook.json','--out','output'],kit);
const builtReport=JSON.parse(await readFile(kit+'/output/build-report.json','utf8'));
assert.equal(builtReport.bundledReaderMatches,true);assert.equal(builtReport.contentReview.advisory,true);
assert.ok(builtReport.studyMarks.total>0);assert.deepEqual(builtReport.studyMarks.invalidTargets,[]);
const html=await readFile(kit+'/output/'+builtReport.html,'utf8'),json=await readFile(kit+'/output/notebook.json','utf8');
assert.deepEqual(JSON.parse(json),JSON.parse(source));
const embedded=html.match(/<script\b[^>]*\bid=["']notebook-data["'][^>]*>([\s\S]*?)<\/script>/);
assert.ok(embedded);assert.deepEqual(JSON.parse(embedded[1]),JSON.parse(source));
const builtZIP=unzipSync(await readFile(kit+'/output/'+builtReport.zip));
assert.equal(strFromU8(builtZIP[builtReport.html]),html);assert.deepEqual(JSON.parse(strFromU8(builtZIP['notebook.json'])),JSON.parse(source));
const validation=JSON.parse(run(process.execPath,['scripts/notebook.mjs','validate',kit+'/output/notebook.json'],kit));
assert.equal(validation.valid,true);assert.deepEqual(validation.warnings,[]);
run(process.execPath,['scripts/notebook.mjs','build','notebook.json','--out','node-output'],kit,true);
const nodeReport=JSON.parse(await readFile(kit+'/node-output/build-report.json','utf8'));
const nodeHTML=await readFile(kit+'/node-output/'+nodeReport.html,'utf8');
const nodeEmbedded=nodeHTML.match(/<script\b[^>]*\bid=["']notebook-data["'][^>]*>([\s\S]*?)<\/script>/);
assert.ok(nodeEmbedded);assert.deepEqual(JSON.parse(nodeEmbedded[1]),JSON.parse(source));
assert.deepEqual(nodeReport.warnings,[]);
assert.equal(nodeReport.bundledReaderMatches,true);assert.equal(nodeReport.sourceMatches,true);
assert.deepEqual(nodeReport.studyMarks,builtReport.studyMarks);assert.deepEqual(nodeReport.contentReview,builtReport.contentReview);
assert.doesNotMatch(nodeHTML,/<script\b[^>]*\bsrc\s*=|<link\b[^>]*rel=["']stylesheet["']/i);
for(const [folder,report] of [['output',builtReport],['node-output',nodeReport]]){
 const artifact=folder+'/'+report.html;
 const nodeProof=JSON.parse(run(process.execPath,['scripts/notebook.mjs','verify',artifact,'--source','notebook.json'],kit,true));
 const pythonProof=JSON.parse(run(process.env.PYTHON||'python3',['scripts/verify_reader.py',artifact,'--source','notebook.json'],kit));
 for(const proof of [nodeProof,pythonProof]){assert.equal(proof.bundledReaderMatches,true);assert.equal(proof.sourceMatches,true);assert.deepEqual(proof.studyMarks,nodeReport.studyMarks);}
}
const changed=nodeHTML.replace('</head>','<style>body{background:red}</style></head>');
assert.notEqual(changed,nodeHTML);await writeFile(kit+'/custom-reader.html',changed);
for(const [command,args,nodeOnly] of [[process.execPath,['scripts/notebook.mjs','verify','custom-reader.html','--source','notebook.json'],true],[process.env.PYTHON||'python3',['scripts/verify_reader.py','custom-reader.html','--source','notebook.json'],false]]){
 const result=execute(command,args,kit,nodeOnly);assert.notEqual(result.status,0);assert.match(result.stderr,/Reader shell differs/);
}
const unmarked=JSON.parse(source);
for(const chapter of unmarked.notebook.chapters)for(const page of chapter.pages)for(const block of page.blocks)if(block.study)delete block.study.marks;
await writeFile(kit+'/unmarked.json',JSON.stringify(unmarked));
await writeFile(kit+'/unmarked.html',nodeHTML.replace(/(<script\b[^>]*\bid=["']notebook-data["'][^>]*>)[\s\S]*?(<\/script>)/,(_match,open,close)=>open+JSON.stringify(unmarked).replaceAll('<','\\u003c')+close));
for(const args of [['validate','unmarked.json'],['build','unmarked.json','--out','unmarked-output'],['verify','unmarked.html','--source','unmarked.json']]){
 const result=execute(process.execPath,['scripts/notebook.mjs',...args],kit,true);assert.notEqual(result.status,0);assert.match(result.stderr,/No authored study marks/);
}
for(const args of [['scripts/build_reader.py','unmarked.json','--out','unmarked-python'],['scripts/verify_reader.py','unmarked.html','--source','unmarked.json']]){
 const result=execute(process.env.PYTHON||'python3',args,kit);assert.notEqual(result.status,0);assert.match(result.stderr,/No authored study marks/);
}
run(process.execPath,['scripts/notebook.mjs','build','unmarked.json','--out','explicitly-unmarked','--allow-unmarked'],kit,true);
assert.equal(JSON.parse(run(process.execPath,['scripts/notebook.mjs','verify','unmarked.html','--source','unmarked.json','--allow-unmarked'],kit,true)).studyMarks.required,false);
await mkdir('docs/verification',{recursive:true});
await writeFile('docs/verification/conversation-package-report.json',JSON.stringify({date:new Date().toISOString(),archive:'paper-notebook-conversation.zip',entries:Object.keys(files).length,promptMatches:true,presetsMatch:true,pythonBuild:true,nodeBuild:true,nodeWithoutPython:true,readerShellVerified:true,customReaderRejected:true,studyMarksVerified:true,missingStudyMarksRejected:true,exactSourcePreserved:true,embeddedSourceMatches:true,zipMatches:true,validation,build,nodeReport,scope:'Local package extraction, independent Python and Node builds without fetching resources, Node path with only Node on PATH, exact reader/source verification, authored-emphasis checks and substituted-reader rejection. No remote chat service/API used; browser results are recorded separately.'},null,2));
console.log('Conversation package: preset replies, Node-only/Python builds, exact reader/source verification and substituted-reader rejection passed.');
