/** Verify the shipped conversation package without a vendor account or API. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {unzipSync,strFromU8} from 'fflate';

const root=process.cwd(),destination=resolve(root,'output/chatgpt-package-check');
const files=unzipSync(await readFile('dist/downloads/paper-notebook-chat.zip'));
for(const [name,bytes] of Object.entries(files)){
 const target=resolve(destination,name);
 assert.ok(target.startsWith(destination+'/'),'package path must stay inside its output folder');
 await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
}
for(const name of ['CHAT-START.md','assets/reader.html','assets/chat-prompt.txt','scripts/build_reader.py','references/notebook.schema.json'])assert.ok(files['paper-notebook/'+name],name);
assert.equal(strFromU8(files['paper-notebook/assets/chat-prompt.txt']),await readFile('public/paper-notebook-prompt.txt','utf8'));
const kit=resolve(destination,'paper-notebook'),source=await readFile('examples/product-notebook.json','utf8');
await writeFile(kit+'/notebook.json',source);
const run=(command,args,cwd=root)=>{
 const result=spawnSync(command,args,{cwd,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||result.stdout);return result.stdout.trim();
};
const build=run(process.env.PYTHON||'python3',['scripts/build_reader.py','notebook.json','--out','output'],kit);
const builtReport=JSON.parse(await readFile(kit+'/output/build-report.json','utf8'));
const html=await readFile(kit+'/output/'+builtReport.html,'utf8'),json=await readFile(kit+'/output/notebook.json','utf8');
assert.deepEqual(JSON.parse(json),JSON.parse(source));
const embedded=html.match(/<script\b[^>]*\bid=["']notebook-data["'][^>]*>([\s\S]*?)<\/script>/);
assert.ok(embedded);assert.deepEqual(JSON.parse(embedded[1]),JSON.parse(source));
const builtZIP=unzipSync(await readFile(kit+'/output/'+builtReport.zip));
assert.equal(strFromU8(builtZIP[builtReport.html]),html);assert.deepEqual(JSON.parse(strFromU8(builtZIP['notebook.json'])),JSON.parse(source));
const validation=JSON.parse(run(process.execPath,['tools/notebook.mjs','validate',kit+'/output/notebook.json']));
assert.equal(validation.valid,true);assert.deepEqual(validation.warnings,[]);
await mkdir('docs/verification',{recursive:true});
await writeFile('docs/verification/chat-package-report.json',JSON.stringify({date:new Date().toISOString(),archive:'paper-notebook-chat.zip',entries:Object.keys(files).length,promptMatches:true,pythonBuild:true,exactSourcePreserved:true,embeddedSourceMatches:true,zipMatches:true,validation,build,scope:'Local package extraction, Python standard-library build and shared schema validation. No remote ChatGPT or DeepSeek session/API used; browser results are recorded separately.'},null,2));
console.log('Conversation package: prompt, Python build, exact source, HTML/ZIP and shared validator passed.');
