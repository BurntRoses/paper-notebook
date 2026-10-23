import test from 'node:test';
import assert from 'node:assert/strict';
import { readerCopy } from '../src/reader/records';
import { conceptExample } from '../src/examples';
import { parseDocument } from '../src/model/document';
import { exportMarkdown, importText } from '../src/io/markdown';
test('reader export choices keep private records separate from public content',()=>{
 const d=structuredClone(conceptExample);const s=d.userState.annotations[0].selectors[0];
 d.userState.doubts=[{id:'doubt-export',pageId:'observation-1',selector:s,question:'私有问题',status:'open'}];d.userState.answers['obs-quiz-1']={selected:['obs-q1-a'],submitted:true};d.userState.lastPageId='observation-4';
 const publicCopy=readerCopy(d,{marks:false,questions:false,answers:false,legacy:false});assert.equal(publicCopy.userState.annotations.length,0);assert.equal(publicCopy.userState.doubts.length,0);assert.deepEqual(publicCopy.userState.answers,{});assert.equal(publicCopy.userState.lastPageId,'observation-1');assert.deepEqual(publicCopy.notebook,d.notebook);
 const privateCopy=readerCopy(d,{marks:true,questions:true,answers:true,legacy:false});assert.deepEqual(privateCopy.userState.doubts,d.userState.doubts);assert.deepEqual(privateCopy.userState.answers,d.userState.answers);assert.equal(privateCopy.userState.lastPageId,'observation-4');parseDocument(privateCopy);
});
test('Cornell cues, summary, profile and records survive structured Markdown',()=>{
 const d=parseDocument(conceptExample).document;const next=importText(exportMarkdown(d)).document;
 assert.deepEqual(next.notebook,d.notebook);assert.deepEqual(next.userState,d.userState);assert.deepEqual(next.extensions,d.extensions);
 const invalid=structuredClone(d);invalid.notebook.chapters[0].pages[1].cues![0].blockId='missing';assert.throws(()=>parseDocument(invalid),/不存在/);
 const badProfile=structuredClone(d);badProfile.extensions.readerProfile={layout:'teleport'};assert.throws(()=>parseDocument(badProfile),/readerProfile/);
});
