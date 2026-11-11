import assert from 'node:assert/strict';
import test from 'node:test';
import {blankDocument,pagesOf,textOf} from '../src/model/types';
import {resolveSelector} from '../src/model/document';
import {searchNotebook} from '../src/reader/search';

test('search anchors every literal occurrence with source offsets and bounded result pages',()=>{
 const d=blankDocument(),page=pagesOf(d)[0];page.title='搜索示例';
 page.blocks=[{id:'long',type:'prose',text:Array.from({length:95},(_,i)=>`第${i+1}段 Keyword[a+b] ${i===90?'末尾定位':''}`).join('\n\n')}];
 const first=searchNotebook(d,' keyword[A+B] '),second=searchNotebook(d,'Keyword[a+b]',40),last=searchNotebook(d,'Keyword[a+b]',80);
 assert.equal(first.total,95);assert.equal(first.hits.length,40);assert.equal(second.hits.length,40);assert.equal(last.hits.length,15);
 assert.ok(second.hits[0].selector!.start>first.hits.at(-1)!.selector!.start);
 for(const hit of [...first.hits,...second.hits,...last.hits]){assert.equal(resolveSelector(d,hit.selector!).status,'resolved');assert.equal(textOf(page.blocks[0]).slice(hit.selector!.start,hit.selector!.end),hit.match);}
 const end=searchNotebook(d,'末尾定位').hits[0];assert.ok(end.before.includes('Keyword[a+b]'));assert.equal(end.selector!.start,textOf(page.blocks[0]).indexOf('末尾定位'));
 assert.deepEqual(searchNotebook(d,'  '),{hits:[],total:0});
});
test('search titles once and include diagram labels, image descriptions and table cells',()=>{
 const d=blankDocument(),page=pagesOf(d)[0];page.title='唯一标题';page.blocks=[{id:'a',type:'prose',text:'普通正文'},{id:'b',type:'image',alt:'图片标记'},{id:'c',type:'diagram',nodes:[{id:'node',label:'关系标记'}]},{id:'table',type:'comparison',columns:['名称'],rows:[['表格标记']]}];
 assert.equal(searchNotebook(d,'唯一标题').total,1);
 const found=searchNotebook(d,'标记');assert.equal(found.total,3);assert.equal(found.hits[0].selector,undefined);assert.equal(found.hits[1].selector,undefined);assert.equal(resolveSelector(d,found.hits[2].selector!).status,'resolved');
});
