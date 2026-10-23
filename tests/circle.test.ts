import test from 'node:test';
import assert from 'node:assert/strict';
import {circleStroke} from '../src/reader/circle';
test('circle tail follows an ellipse and crosses naturally in the upper right',()=>{
 const path=circleStroke(20,30,130,28,937),numbers=path.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)!.map(Number);
 assert.equal(path,circleStroke(20,30,130,28,937));assert.notEqual(path,circleStroke(20,30,130,28,938));
 assert.ok(!/[ZQ]/.test(path));assert.ok(numbers.every(Number.isFinite));
 const first=numbers.slice(0,2),last=numbers.slice(-2),cx=85,cy=44;
 assert.ok(first[0]>cx&&last[0]>cx&&first[1]<cy&&last[1]<cy);
 const point=(x:number,y:number)=>Math.hypot((x-cx)/71,(y-cy)/19);
 assert.ok(point(...first as [number,number])>.98);
 assert.ok(point(...last as [number,number])<.95);
});
