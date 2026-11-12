import test from 'node:test';
import assert from 'node:assert/strict';
import {onlineReader} from '../tools/online-reader.mjs';

test('hosted reader keeps notebook data and serves deduplicated content-addressed assets',()=>{
 const font=Buffer.from('font fixture').toString('base64'),source=`<!doctype html><html><head><style>@font-face{font-family:StudyHand;src:url(data:font/woff2;base64,${font});unicode-range:U+20-7E}@font-face{font-family:Other;src:url(data:font/woff2;base64,${font})}p{color:red}</style><script type="module" crossorigin>window.test=1</script></head><body><script id="notebook-data" type="application/json">{"notebook":{"id":"same"}}</script></body></html>`;
 const hosted=onlineReader(source,'reader.html?v=fingerprint');
 assert.equal(hosted.assets.size,3);assert.match(hosted.html,/meta name="paper-notebook-template" content="reader.html\?v=fingerprint"/);assert.match(hosted.html,/rel="preload"[^>]+as="font"/);assert.match(hosted.html,/script type="module" crossorigin src="reader-assets\/reader-[\da-f]{20}\.js"/);assert.ok(hosted.html.includes('{"notebook":{"id":"same"}}'));assert.ok(!hosted.html.includes('data:font'));
 const css=[...hosted.assets].find(([name])=>name.endsWith('.css'))![1].toString();assert.equal(css.match(/\.\/font-/g)?.length,2);assert.equal([...hosted.assets].find(([name])=>name.endsWith('.woff2'))![1].toString(),'font fixture');assert.deepEqual(onlineReader(source,'reader.html?v=fingerprint'),hosted);
});
