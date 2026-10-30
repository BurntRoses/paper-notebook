import test from 'node:test';
import assert from 'node:assert/strict';
import {readerGeometry} from '../src/reader/geometry';
test('automatic spread uses the per-page space in both orientations',()=>{
 for(const [w,h]of [[2048,1228],[1440,1000],[1024,768],[820,1180],[390,844]]){
  const g=readerGeometry(w,h,true),scale=Math.min(g.slotWidth/g.sheet.width,g.slotHeight/g.sheet.height,1);
  assert.ok(Math.abs(g.sheet.width*scale-g.slotWidth)<1);assert.ok(Math.abs(g.sheet.height*scale-g.slotHeight)<1);
  assert.equal(g.shape,g.slotWidth>g.slotHeight?'landscape':'portrait');assert.equal(g.gap,12);
  assert.ok(g.sheet.width/g.sheet.height<1.02||g.shape==='landscape');
 }
 assert.equal(readerGeometry(1440,1000,true).shape,'portrait');assert.equal(readerGeometry(820,1180,true).shape,'landscape');
});
test('explicit paper ratios survive single and spread layouts',()=>{
 for(const shape of ['portrait','landscape']as const)for(const spread of [true,false])for(const [w,h]of [[2048,1228],[820,1180],[390,844]]){
  const g=readerGeometry(w,h,spread,shape),ratio=shape==='portrait'?792/1120:1120/792;
  assert.equal(g.shape,shape);assert.ok(Math.abs(g.sheet.width/g.sheet.height-ratio)<.002);
  const scale=Math.min(g.slotWidth/g.sheet.width,g.slotHeight/g.sheet.height,1);assert.ok(g.sheet.width*scale<=g.slotWidth+.1);assert.ok(g.sheet.height*scale<=g.slotHeight+.1);
 }
});
