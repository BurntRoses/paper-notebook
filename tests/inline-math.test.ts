import test from 'node:test';
import assert from 'node:assert/strict';
import {inlineParts,inlineBoundary} from '../src/model/inline-math';

test('inline mathematics preserves exact source and UTF-16 offsets',()=>{
 const text=String.raw`增长📈为 \(P_n=P_0(1+r)^n\)，利率 $r=0.05$。`;
 const parts=inlineParts(text);assert.equal(parts.map(p=>p.text).join(''),text);
 assert.deepEqual(parts.filter(p=>p.latex!==undefined).map(p=>p.latex),['P_n=P_0(1+r)^n','r=0.05']);
 for(const p of parts)assert.equal(text.slice(p.start,p.start+p.text.length),p.text);
 const math=parts[1];assert.equal(inlineBoundary(text,math.start+5),math.start);assert.equal(inlineBoundary(text,math.start+math.text.length),math.start+math.text.length);
});
test('currency, escaped delimiters, incomplete expressions and code stay literal',()=>{
 for(const text of [String.raw`费用 $5 到 $6。`,String.raw`\$r=2\$`,String.raw`\\(x\\)`,String.raw`\(x`,String.raw`$$x$$`,'$ x $',String.raw`\(\)`,String.raw`\(x`+'\n'+String.raw`y\)`])assert.ok(inlineParts(text).every(p=>p.latex===undefined),text);
});
