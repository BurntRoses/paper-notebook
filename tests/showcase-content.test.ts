import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importText} from '../src/io/markdown';
import {execFileSync} from 'node:child_process';
import katex from 'katex';
import {productStory} from '../src/product-story';
import {introNotebook} from '../src/intro';
import {machineLearning} from '../src/machine-learning';
import {examples,conceptExample} from '../src/examples';
import {showcaseNotebooks} from '../src/showcase';
import {parseDocument} from '../src/model/document';
import {checkStudyMarks} from '../src/model/study-quality';

const lessons=[productStory,introNotebook,machineLearning,...examples,...showcaseNotebooks.map(([,doc])=>doc)];
test('published lesson formulas render and authored anchors remain valid',()=>{
 for(const doc of lessons){
  parseDocument(doc);checkStudyMarks(doc);
  for(const block of doc.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks)){
   if(block.latex)assert.doesNotThrow(()=>katex.renderToString(block.latex!,{throwOnError:true}),block.id);
   for(const parameter of block.parameters||[])assert.doesNotThrow(()=>katex.renderToString(parameter.symbol,{throwOnError:true}),block.id);
  }
 }
});

test('statistics SQL applies its stated month, payment and refund rules',()=>{
 const sql=conceptExample.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks).find(b=>b.id==='obs-sql')!.text;
 const program=`import json,sqlite3,sys
query=json.load(sys.stdin)
db=sqlite3.connect(':memory:')
db.execute('CREATE TABLE orders(customer_id TEXT, paid_at TEXT, status TEXT, refunded_at TEXT)')
db.executemany('INSERT INTO orders VALUES (?,?,?,?)', [
 ('A','2026-10-01','paid',None),('A','2026-10-15','paid',None),('B','2026-10-31 23:59:59','paid',None),
 ('C','2026-09-30 23:59:59','paid',None),('D','2026-11-01','paid',None),
 ('E','2026-10-02','pending',None),('F','2026-10-03','paid','2026-10-04'),(None,'2026-10-10','paid',None)])
print(json.dumps(db.execute(query).fetchone()))
`;
 assert.deepEqual(JSON.parse(execFileSync('python3',['-c',program],{input:JSON.stringify(sql),encoding:'utf8'})),[4,2]);
});

test('programming example and its assertions execute together',()=>{
 const blocks=introNotebook.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks);
 const source=blocks.find(b=>b.id==='code-example')!.text+'\n'+blocks.find(b=>b.id==='code-tests')!.text;
 assert.equal(execFileSync('python3',['-c',source],{encoding:'utf8'}).trim(),'2');
});


test('bundled Markdown example follows the same emphasis and figure contract',()=>{
 const source=readFileSync('examples/chat-import.md','utf8');
 assert.equal(readFileSync('skills/paper-notebook/assets/example.md','utf8'),source);
 const doc=importText(source).document;parseDocument(doc);const marks=checkStudyMarks(doc);
 assert.ok(marks.total>0);
 assert.ok(doc.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks).some(b=>b.figure?.annotations?.length));
});
