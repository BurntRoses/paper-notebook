import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createServer} from 'node:http';
import {access,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {zipSync,strToU8,unzipSync} from 'fflate';
import {conversationUpload} from '../tools/conversation-package.mjs';

const run=promisify(execFile),helper=resolve('skills/paper-notebook/scripts/prepare_conversation.py');
async function fixture(extra:Record<string,Uint8Array>={}){
 const files:Record<string,Uint8Array>={
  'paper-notebook/START-HERE.md':strToU8('Use the bundled builder.'),
  'paper-notebook/SKILL.md':strToU8('Build a notebook.'),
  'paper-notebook/assets/reader.html':await readFile('tests/fixtures/reader-template.html'),
  'paper-notebook/assets/blank-notebook.json':await readFile('examples/blank-notebook.json'),
  'paper-notebook/assets/THIRD_PARTY_NOTICES.txt':await readFile('THIRD_PARTY_NOTICES.txt'),
  'paper-notebook/scripts/build_reader.py':await readFile('skills/paper-notebook/scripts/build_reader.py'),
  'paper-notebook/scripts/verify_reader.py':await readFile('skills/paper-notebook/scripts/verify_reader.py'),
  'paper-notebook/scripts/content_review.py':await readFile('skills/paper-notebook/scripts/content_review.py'),
  'paper-notebook/references/writing-rules.json':await readFile('skills/paper-notebook/references/writing-rules.json'),
  'paper-notebook/scripts/study_quality.py':await readFile('skills/paper-notebook/scripts/study_quality.py'),
  'paper-notebook/references/notebook.schema.json':await readFile('schemas/notebook.schema.json'),
 };
 return zipSync({...files,...extra});
}
async function prepare(args:string[]){
 try{
  const result=await run(process.env.PYTHON||'python3',[helper,...args]);
  return {code:0,report:JSON.parse(result.stdout)};
 }catch(error){
  const failure=error as {code:number;stdout:string};
  return {code:failure.code,report:JSON.parse(failure.stdout)};
 }
}
async function withServer(handler:Parameters<typeof createServer>[0],fn:(url:string)=>Promise<void>){
 const server=createServer(handler);
 await new Promise<void>(ready=>server.listen(0,'127.0.0.1',ready));
 const address=server.address();assert.ok(address&&typeof address!=='string');
 try{await fn(`http://127.0.0.1:${address.port}/package.zip`)}
 finally{await new Promise<void>((done,reject)=>server.close(error=>error?reject(error):done()))}
}

test('conversation runtime downloads, retries a transient failure, builds and reuses without another request',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paper-auto-')),archive=await fixture();let requests=0;
 try{await withServer((_req,res)=>{
  requests++;res.writeHead(requests===1?503:200,{'content-type':'application/zip'});res.end(requests===1?'Try again':archive);
 },async url=>{
  const args=['--url',url,'--out',join(directory,'runtime')];
  const first=await prepare(args);assert.equal(first.code,0,JSON.stringify(first.report));assert.equal(first.report.source,'download');assert.equal(first.report.manualUploadRequired,false);assert.equal(requests,2);
  assert.ok((await readFile(first.report.smokeHTML,'utf8')).includes('notebook-data'));
  const second=await prepare(args);assert.equal(second.report.source,'existing');assert.equal(requests,2);
 })}finally{await rm(directory,{recursive:true,force:true})}
});

test('an uploaded runtime builds without making a network request',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paper-upload-'));let requests=0;
 try{
  const archive=join(directory,'uploaded.zip');await writeFile(archive,await fixture());
  await withServer((_req,res)=>{requests++;res.writeHead(403);res.end()},async url=>{
   const result=await prepare(['--archive',archive,'--url',url,'--out',join(directory,'runtime')]);
   assert.equal(result.code,0,JSON.stringify(result.report));assert.equal(result.report.source,'attachment');assert.equal(result.report.manualUploadRequired,false);assert.equal(requests,0);
  });
 }finally{await rm(directory,{recursive:true,force:true})}
});

test('manual upload is requested only after an actual failed download, including a corrupt ZIP',async()=>{
 for(const status of [403,200]){
  const directory=await mkdtemp(join(tmpdir(),'paper-blocked-'));let requests=0;
  try{await withServer((_req,res)=>{requests++;res.writeHead(status);res.end('<html>Not a runtime ZIP</html>')},async url=>{
   const result=await prepare(['--url',url,'--out',join(directory,'runtime')]);
   assert.equal(result.code,1);assert.equal(result.report.status,'upload_required');assert.equal(result.report.stage,'download');assert.equal(result.report.manualUploadRequired,true);assert.equal(requests,2);
   assert.equal(result.report.userMessage,(await readFile('skills/paper-notebook/references/responses/download-unavailable.zh-CN.txt','utf8')).trim());
  })}finally{await rm(directory,{recursive:true,force:true})}
 }
});

test('a Finder-recompressed folder uploads without keeping macOS metadata',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paper-finder-'));
 try{
  const archive=join(directory,'paper-notebook.zip');
  await writeFile(archive,await fixture({
   '__MACOSX/._paper-notebook':strToU8('Finder metadata'),
   '__MACOSX/paper-notebook/._SKILL.md':strToU8('Finder metadata'),
   '.DS_Store':strToU8('Finder metadata'),
   'paper-notebook/.DS_Store':strToU8('Finder metadata'),
  }));
  const result=await prepare(['--archive',archive,'--out',join(directory,'runtime')]);
  assert.equal(result.code,0,JSON.stringify(result.report));assert.equal(result.report.source,'attachment');
  assert.equal(result.report.manualUploadRequired,false);
  await assert.rejects(access(join(result.report.runtime,'.DS_Store')));
  await assert.rejects(access(join(directory,'runtime/__MACOSX')));
 }finally{await rm(directory,{recursive:true,force:true})}
});

test('invalid uploaded archives are reported as runtime errors without writing outside the output',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paper-invalid-'));
 try{
  for(const name of ['paper-notebook/../../outside.txt','__MACOSX/../../outside.txt']){
   const archive=join(directory,'invalid.zip');await writeFile(archive,await fixture({[name]:strToU8('invalid')}));
   const result=await prepare(['--archive',archive,'--out',join(directory,'runtime')]);
   assert.equal(result.code,1);assert.equal(result.report.status,'runtime_invalid');assert.equal(result.report.manualUploadRequired,false);assert.match(result.report.detail,/Unsafe archive entry/);
  }
 }finally{await rm(directory,{recursive:true,force:true})}
});


test('upload wrapper preserves the inner ZIP byte-for-byte with less than 1 KB overhead',async()=>{
 const runtime=await fixture(),wrapper=conversationUpload(runtime),entries=unzipSync(wrapper);
 assert.deepEqual(Object.keys(entries),['paper-notebook-upload/paper-notebook-conversation.zip','paper-notebook-upload/上传说明.txt']);
 assert.deepEqual(entries['paper-notebook-upload/paper-notebook-conversation.zip'],runtime);
 assert.ok(wrapper.byteLength-runtime.byteLength<1024);
 assert.deepEqual(conversationUpload(runtime),wrapper);
});

test('outer upload ZIP and its automatically expanded inner ZIP both build offline',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paper-nested-'));let requests=0;
 try{
  const runtime=await fixture(),wrapper=conversationUpload(runtime);
  const archive=join(directory,'paper-notebook-upload.zip');await writeFile(archive,wrapper);
  // Simulate a browser expanding the outer ZIP only, preserving the ready-to-upload inner ZIP.
  const inner=join(directory,'paper-notebook-conversation.zip');await writeFile(inner,unzipSync(wrapper)['paper-notebook-upload/paper-notebook-conversation.zip']);
  await withServer((_req,res)=>{requests++;res.writeHead(403);res.end()},async url=>{
   for(const [name,path]of [['outer',archive],['inner',inner]]){
    const result=await prepare(['--archive',path,'--url',url,'--out',join(directory,name)]);
    assert.equal(result.code,0,JSON.stringify(result.report));assert.equal(result.report.source,'attachment');assert.equal(result.report.manualUploadRequired,false);
   }
   assert.equal(requests,0);
  });
 }finally{await rm(directory,{recursive:true,force:true})}
});

test('downloaded upload wrappers build without a manual upload',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paper-nested-download-'));
 try{const wrapper=conversationUpload(await fixture());await withServer((_req,res)=>{res.writeHead(200,{'content-type':'application/zip'});res.end(wrapper)},async url=>{
  const result=await prepare(['--url',url,'--out',join(directory,'runtime')]);assert.equal(result.code,0,JSON.stringify(result.report));assert.equal(result.report.source,'download');assert.equal(result.report.manualUploadRequired,false);
 })}finally{await rm(directory,{recursive:true,force:true})}
});

test('upload wrappers reject traversal, corrupt inner archives and additional nesting',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paper-invalid-wrapper-'));
 try{
  const normal=conversationUpload(await fixture());
  const cases=[conversationUpload(strToU8('invalid ZIP')),conversationUpload(normal),conversationUpload(await fixture({'paper-notebook/../../outside.txt':strToU8('invalid')})),zipSync({...unzipSync(normal),'__MACOSX/../../outside.txt':strToU8('invalid')})];
  for(let i=0;i<cases.length;i++){
   const archive=join(directory,'invalid-'+i+'.zip');await writeFile(archive,cases[i]);
   const result=await prepare(['--archive',archive,'--out',join(directory,'runtime-'+i)]);assert.equal(result.code,1);assert.equal(result.report.status,'runtime_invalid');assert.equal(result.report.manualUploadRequired,false);
  }
  await assert.rejects(access(join(directory,'outside.txt')));
 }finally{await rm(directory,{recursive:true,force:true})}
});
