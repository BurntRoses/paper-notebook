import assert from 'node:assert/strict';
import test from 'node:test';
import {blankDocument,pagesOf} from '../src/model/types';
import {restoreDraft} from '../src/model/store';
test('draft restore keeps the supplied revision and restores newer personal records and preferences',()=>{
 const source=blankDocument();source.notebook.revision=3;pagesOf(source)[0].blocks=[{id:'text',type:'prose',text:'新版正文'}];
 const draft=structuredClone(source);draft.notebook.revision=1;pagesOf(draft)[0].blocks[0].text='旧版正文';draft.userState.updatedAt='2099-01-01T00:00:00Z';draft.userState.checks.saved=true;draft.extensions.readerProfile={font:'sans',paperStyle:'white'};
 draft.assets=[{id:'private-figure',name:'figure.svg',mime:'image/svg+xml',data:'data:image/svg+xml;charset=utf-8,%3Csvg/%3E'}];
 const restored=restoreDraft(source,draft);assert.equal(restored.notebook.revision,3);assert.equal(pagesOf(restored)[0].blocks[0].text,'新版正文');assert.equal(restored.userState.checks.saved,true);assert.deepEqual(restored.extensions.readerProfile,draft.extensions.readerProfile);assert.deepEqual(restored.assets,draft.assets);
 assert.equal(draft.notebook.revision,1);assert.equal(source.userState.checks.saved,undefined);
});
test('newer draft content restores; older or unrelated records leave the supplied document intact',()=>{
 const source=blankDocument(),draft=structuredClone(source);draft.notebook.revision=2;draft.userState.updatedAt='2099-01-01T00:00:00Z';assert.equal(restoreDraft(source,draft).notebook.revision,2);
 draft.notebook.id='other';assert.equal(restoreDraft(source,draft),source);draft.notebook.id=source.notebook.id;draft.userState.updatedAt='2000-01-01T00:00:00Z';assert.equal(restoreDraft(source,draft),source);assert.equal(restoreDraft(source),source);
});
