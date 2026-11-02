import test from 'node:test';
import assert from 'node:assert/strict';
import {paperStyles,resolvePaperStyle} from '../src/reader/paper-styles';
import {blankDocument,type Page} from '../src/model/types';
import {parseDocument} from '../src/model/document';

test('paper materials match page subjects, preserve explicit choice and survive source roundtrip',()=>{
 const subjects:Page['subject'][]=['general','stem','literature','business','code'];
 assert.deepEqual(subjects.map(subject=>resolvePaperStyle('auto',subject)),['cotton','mist','inkwash','ivory','white']);
 assert.equal(resolvePaperStyle(undefined,undefined),'cotton');
 for(const {id} of paperStyles){
  for(const subject of subjects)if(id!=='auto')assert.equal(resolvePaperStyle(id,subject),id);
  const d=blankDocument();d.extensions.readerProfile={paperStyle:id};
  assert.equal((parseDocument(d).document.extensions.readerProfile as {paperStyle:string}).paperStyle,id);
 }
 const invalid=blankDocument();invalid.extensions.readerProfile={paperStyle:'photo'};assert.throws(()=>parseDocument(invalid),/paperStyle/);
});
