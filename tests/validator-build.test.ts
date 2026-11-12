import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,symlink,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

test('validator output is identical across checkout depths with shared dependencies',async()=>{
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),temp=await mkdtemp(join(tmpdir(),'notebook-validator-build-'));
 try{
  const results=[];
  for(const location of ['first','nested/second']){
   const project=join(temp,location);
   for(const directory of ['tools','schemas','src/model'])await mkdir(join(project,directory),{recursive:true});
   await copyFile(join(root,'tools/build-validator.mjs'),join(project,'tools/build-validator.mjs'));
   await copyFile(join(root,'schemas/notebook.schema.json'),join(project,'schemas/notebook.schema.json'));
   await symlink(join(root,'node_modules'),join(project,'node_modules'),process.platform==='win32'?'junction':'dir');
   execFileSync(process.execPath,['tools/build-validator.mjs'],{cwd:project,stdio:'pipe'});
   results.push(await readFile(join(project,'src/model/notebook-validator.js'),'utf8'));
  }
  assert.equal(results[0],results[1]);
  assert.equal(results[0],await readFile(join(root,'src/model/notebook-validator.js'),'utf8'));
 }finally{await rm(temp,{recursive:true,force:true});}
});
