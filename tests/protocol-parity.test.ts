import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {blankDocument} from '../src/model/types';
import {parseDocument} from '../src/model/document';
import {importText} from '../src/io/markdown';
import {notebookFromArchive} from '../src/io/import-package';
import {zipSync,strToU8} from 'fflate';

const pythonCheck=(document:unknown)=>spawnSync('python3',['-c',"import sys,json;sys.path.insert(0,'skills/paper-notebook/scripts');from build_reader import validate,check_references;d=json.load(sys.stdin);s=json.load(open('schemas/notebook.schema.json'));validate(d,s,s);check_references(d)"],{encoding:'utf8',input:JSON.stringify(document)});

test('Node and portable Python reject unusable reader settings before delivery',()=>{
 for(const profile of [null,false,[],{layout:'teleport'},{lineSpacing:'2.05'},{marginNotes:'false'},{bottomNotes:1}]){
  const d=blankDocument();d.extensions.readerProfile=profile;
  assert.throws(()=>parseDocument(d),/readerProfile/);
  const result=pythonCheck(d);assert.notEqual(result.status,0);assert.match(result.stderr,/readerProfile/);
 }
 const d=blankDocument();d.extensions.readerProfile={layout:'single',paperStyle:'ivory',font:'hand',lineSpacing:2.05,marginNotes:false,bottomNotes:true};
 assert.doesNotThrow(()=>parseDocument(d));const result=pythonCheck(d);assert.equal(result.status,0,result.stderr);
});

test('portable Python checks personal-record IDs and text bookmarks like the reader',()=>{
 for(const record of ['figure','bookmark','selection']){
  const d=blankDocument(),pageId=d.userState.lastPageId;
  if(record==='figure')d.userState.figureMarks=[{id:d.notebook.id,pageId,blockId:'old-block',kind:'circle',x:10,y:10}];
  if(record==='bookmark')d.userState.bookmarks=[{id:d.notebook.id,pageId,kind:'page'}];
  if(record==='selection')d.userState.bookmarks=[{id:'text-bookmark',pageId,kind:'text'}];
  assert.throws(()=>parseDocument(d),record==='selection'?/selector|原文选区/:/duplicate ID/);
  const result=pythonCheck(d);assert.notEqual(result.status,0);assert.match(result.stderr,record==='selection'?/selector/:/duplicate ID/);
 }
});

test('pasted imports cannot bypass the 50 MB limit with ASCII or multibyte text',()=>{
 const limit=50*1024*1024;
 assert.throws(()=>importText('x'.repeat(limit+1)),/50 MB/);
 assert.throws(()=>importText('中'.repeat(Math.floor(limit/3)+1)),/50 MB/);
});

test('Python source size and nonfinite numbers fail with useful errors',()=>{
 const result=spawnSync('python3',['-c',`import sys,json,tempfile
from pathlib import Path
sys.path.insert(0,'skills/paper-notebook/scripts')
from build_reader import validate,build
errors=[]
for value in [float('inf'),float('nan'),10**1000]:
 try:validate(value,{'type':'number'},{},'$.value')
 except ValueError as e:errors.append(str(e))
with tempfile.TemporaryDirectory() as directory:
 source=Path(directory)/'large.json'
 with source.open('wb') as handle:handle.truncate(50*1024*1024+1)
 try:build(source,None,None,None,None)
 except ValueError as e:errors.append(str(e))
print(json.dumps(errors))`],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);const errors=JSON.parse(result.stdout);assert.equal(errors.length,4);assert.ok(errors.slice(0,3).every((error:string)=>error.includes('$.value: number must be finite')));assert.match(errors[3],/50 MB/);
});

test('unknown extension numbers never change silently during JSON roundtrip',()=>{
 const d=blankDocument();d.extensions.future={value:0};
 const overflow=JSON.stringify(d).replace('"value":0','"value":1e999');
 assert.throws(()=>importText(overflow),/extensions\/future\/value.*有限/);
 const result=spawnSync('python3',['-c',"import sys,json;sys.path.insert(0,'skills/paper-notebook/scripts');from build_reader import check_references;check_references(json.load(sys.stdin))"],{encoding:'utf8',input:overflow});
 assert.notEqual(result.status,0);assert.match(result.stderr,/extensions.future.value: number must be finite/);
});

test('ZIP imports select one exact notebook.json and leave other entries compressed',async()=>{
 const expected=JSON.stringify(blankDocument());
 // Unsupported compression in the unselected entry proves it was never inflated.
 const archive=zipSync({'book/notebook.json':strToU8(expected),'copies/notebook.json':strToU8('unused duplicate'),'prefix-notebook.json':strToU8('not the source')},{level:0});
 let central=0,seen=0;
 for(let i=0;i<archive.length-46;i++)if(archive[i]===0x50&&archive[i+1]===0x4b&&archive[i+2]===1&&archive[i+3]===2){seen++;if(seen===2){central=i;break;}}
 assert.ok(central);archive[central+10]=99;
 assert.equal(await notebookFromArchive(archive),expected);
 await assert.rejects(()=>notebookFromArchive(zipSync({'prefix-notebook.json':strToU8(expected)})),/缺少 notebook.json/);
 const oversized=zipSync({'notebook.json':strToU8('x')},{level:0});
 for(let i=0;i<oversized.length-46;i++)if(oversized[i]===0x50&&oversized[i+1]===0x4b&&oversized[i+2]===1&&oversized[i+3]===2){new DataView(oversized.buffer,oversized.byteOffset).setUint32(i+24,50*1024*1024+1,true);break;}
 await assert.rejects(()=>notebookFromArchive(oversized),/notebook.json 超过 50 MB/);
});
