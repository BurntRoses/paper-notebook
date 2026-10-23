import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {importText} from '../src/io/markdown';
import {blankDocument,blocksOf} from '../src/model/types';

test('text-only chat example imports live formula, diagram and marked text',()=>{
 const {document,warnings}=importText(readFileSync('examples/chat-import.md','utf8'));
 assert.deepEqual(warnings,[]);const blocks=blocksOf(document);
 assert.equal(blocks.find(b=>b.id==='growth-formula')?.study?.visual,'blackboard');
 assert.equal(blocks.find(b=>b.id==='growth-rule')?.study?.marks?.[0].text,'下一期的增长基础');
 assert.equal(blocks.find(b=>b.id==='growth-diagram')?.edges?.length,2);
});
test('complete model answers wrapped in Markdown fences retain pages and components',()=>{
 const lesson=readFileSync('examples/chat-import.md','utf8');
 for(const [fence,language] of [['````','markdown'],['~~~','md'],['```','text']]){
  const {document}=importText(fence+language+'\n'+lesson+'\n'+fence);
  assert.equal(document.notebook.chapters[0].pages.length,2);
  assert.equal(blocksOf(document).find(b=>b.id==='growth-formula')?.type,'formula');
  assert.equal(blocksOf(document).find(b=>b.id==='growth-diagram')?.edges?.length,2);
 }
});
test('Python chat builder embeds exact source safely and rejects invalid references',()=>{
 const dir=mkdtempSync(join(tmpdir(),'paper-chat-'));
 try{
  const doc=blankDocument();doc.notebook.title='知识 </script><script>alert(1)</script> 😀';
  writeFileSync(join(dir,'source.json'),JSON.stringify(doc));
  writeFileSync(join(dir,'reader.html'),'<title>Template</title><script id="notebook-data" type="application/json">null</script>');
  const build=()=>spawnSync('python3',['skills/paper-notebook/scripts/build_reader.py',join(dir,'source.json'),'--out',join(dir,'output'),'--template',join(dir,'reader.html'),'--schema','schemas/notebook.schema.json','--notices','THIRD_PARTY_NOTICES.txt'],{encoding:'utf8'});
  const result=build();assert.equal(result.status,0,result.stderr);
  const html=readFileSync(join(dir,'output/index.html'),'utf8');const json=html.match(/<script id="notebook-data" type="application\/json">([\s\S]*?)<\/script>/)![1];
  assert.deepEqual(JSON.parse(json),doc);assert.ok(!html.includes('<script>alert'));
  assert.deepEqual(JSON.parse(readFileSync(join(dir,'output/notebook.json'),'utf8')),doc);
  assert.ok(readFileSync(join(dir,'output/notebook.zip')).length>0);
  doc.notebook.chapters[0].pages[0].blocks=[{id:'broken-image',type:'image',assetId:'missing'}];
  writeFileSync(join(dir,'source.json'),JSON.stringify(doc));assert.notEqual(build().status,0);
  doc.notebook.chapters[0].pages[0].blocks=[{id:doc.notebook.id,type:'prose',text:'duplicate'}];
  writeFileSync(join(dir,'source.json'),JSON.stringify(doc));assert.notEqual(build().status,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
