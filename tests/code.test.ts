import test from 'node:test';
import assert from 'node:assert/strict';
import {codeTokens} from '../src/ui/code';
test('syntax treatment preserves indentation, Unicode and literal comment characters',()=>{
 const source='def count(ids):\n    label = "# 顾客 😀"\n\treturn len(set(ids))  # 不同编号\n';
 const tokens=codeTokens(source,'Python');assert.equal(tokens.map(t=>t.text).join(''),source);
 assert.equal(tokens.find(t=>t.text==='def')?.kind,'keyword');assert.equal(tokens.find(t=>t.text==='len')?.kind,'builtin');assert.equal(tokens.find(t=>t.text==='"# 顾客 😀"')?.kind,'string');assert.equal(tokens.find(t=>t.text==='# 不同编号')?.kind,'comment');
 const js='const s = "// literal";\n  console.log(2); // comment\n';assert.equal(codeTokens(js,'JavaScript').map(t=>t.text).join(''),js);
});
