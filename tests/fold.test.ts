import assert from 'node:assert/strict';
import {test} from 'node:test';
import {paperFold,type Point} from '../src/reader/fold.ts';
const area=(points:Point[])=>Math.abs(points.reduce((s,a,i)=>{const b=points[(i+1)%points.length];return s+a.x*b.y-a.y*b.x},0)/2);
test('soft folds partition the sheet and reflection preserves its geometry in all directions',()=>{
 for(const vertical of [false,true])for(const sign of [-1,1])for(const p of [.001,.08,.25,.5,.75,.99]){
  const {front,back,matrix:m}=paperFold(900,650,p,sign,vertical);
  assert.ok(Math.abs(area(front)+area(back)-900*650)<.01);
  const reflected=back.map(q=>({x:m[0]*q.x+m[2]*q.y+m[4],y:m[1]*q.x+m[3]*q.y+m[5]}));
  assert.ok(Math.abs(area(back)-area(reflected))<.01);
  for(const a of back){const b={x:m[0]*a.x+m[2]*a.y+m[4],y:m[1]*a.x+m[3]*a.y+m[5]};assert.ok(Math.abs(m[0]*b.x+m[2]*b.y+m[4]-a.x)<.001);assert.ok(Math.abs(m[1]*b.x+m[3]*b.y+m[5]-a.y)<.001);}
 }
});
test('fold endpoints cover the initial paper and settle across the spread gutter without a jump',()=>{
 for(const sign of [-1,1]){
  assert.equal(area(paperFold(900,650,0,sign).front),900*650);
  const {front,back,matrix:m}=paperFold(900,650,1,sign,false,16);
  assert.equal(front.length,0);assert.equal(area(back),900*650);
  const xs=back.map(q=>m[0]*q.x+m[2]*q.y+m[4]);
  assert.ok(Math.abs(Math.min(...xs)-(sign>0?-916:916))<.001);
  assert.ok(Math.abs(Math.max(...xs)-(sign>0?-16:1816))<.001);
 }
});
