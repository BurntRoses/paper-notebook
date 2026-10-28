import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {verifyBundledReader} from '../src/io/reader-proof';
import {blankDocument} from '../src/model/types';
import {scriptJSON} from '../src/model/document';

const core=readFileSync('tests/fixtures/reader-template.html','utf8');
const extra='@font-face{font-family:StudyHand;src:url(data:font/woff2;base64,ZXh0cmE=);unicode-range:U+4E00-4EFF}';
const template=core.replace('</style>',extra+'</style>');
const source=blankDocument();
const html=template.replace('<title>Reader fixture</title>','<title>Lesson</title>').replace('>null</script>','>'+scriptJSON(source)+'</script>');
const changedSource=JSON.parse(JSON.stringify(source));changedSource.notebook.title+=' changed';
const cases=[
 {name:'official reader',html,valid:true},
 {name:'unused font slice removed',html:html.replace(extra,''),valid:true},
 {name:'custom reader with valid data',html:'<!doctype html><title>Custom</title><main>Replacement</main><script id="notebook-data" type="application/json">'+scriptJSON(source)+'</script>',valid:false},
 {name:'modified CSS',html:html.replace('.page-surface{background:#faf4df}', '.page-surface{background:red}'),valid:false},
 {name:'modified runtime',html:html.replace('fixture:true','fixture:false'),valid:false},
 {name:'core font removed',html:html.replace(/@font-face\{[^{}]*unicode-range:U\+20-7E[^{}]*\}/,''),valid:false},
 {name:'replaced font',html:html.replace('data:font/woff2;base64,fixture-core','data:font/woff2;base64,replaced-core'),valid:false},
 {name:'changed source',html:html.replace(scriptJSON(source),scriptJSON(changedSource)),valid:false},
 {name:'duplicate data slots',html:html+'<script id="notebook-data">null</script>',valid:false},
];

test('Node and Python reject substituted readers while allowing normal font trimming',()=>{
 const dir=mkdtempSync(join(tmpdir(),'paper-reader-proof-'));
 try{
  writeFileSync(join(dir,'template.html'),template);writeFileSync(join(dir,'source.json'),JSON.stringify(source));
  for(const item of cases){
   if(item.valid)assert.deepEqual(verifyBundledReader(item.html,template,source),{bundledReaderMatches:true,sourceMatches:true},item.name);
   else assert.throws(()=>verifyBundledReader(item.html,template,source),undefined,item.name);
   writeFileSync(join(dir,'artifact.html'),item.html);
   const result=spawnSync('python3',['skills/paper-notebook/scripts/verify_reader.py',join(dir,'artifact.html'),'--template',join(dir,'template.html'),'--source',join(dir,'source.json')],{encoding:'utf8'});
   assert.equal(result.status===0,item.valid,item.name+': '+result.stderr);
   if(item.valid)assert.equal(JSON.parse(result.stdout).sourceMatches,true);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
