import test from 'node:test';
import assert from 'node:assert/strict';
import {codeTokens} from '../src/ui/code';

const kind=(source:string,language:string,text:string)=>codeTokens(source,language).find(t=>t.text===text)?.kind;
function exact(source:string,language:string){
 const tokens=codeTokens(source,language);assert.equal(tokens.map(t=>t.text).join(''),source);
 let offset=0;for(const token of tokens){assert.equal(token.start,offset);assert.equal(token.text,source.slice(token.start,token.end));offset=token.end;}assert.equal(offset,source.length);return tokens;
}
test('Python highlighting preserves source and distinguishes declarations, parameters and literals',()=>{
 const source='def count(ids):\n    label = "# 顾客 😀"\n\treturn len(set(ids))  # 不同编号\n';
 exact(source,'Python');assert.equal(kind(source,'Python','def'),'keyword');assert.equal(kind(source,'Python','count'),'function');assert.equal(kind(source,'Python','ids'),'parameter');assert.equal(kind(source,'Python','label'),'variable');assert.equal(kind(source,'Python','len'),'builtin');assert.equal(kind(source,'Python','"# 顾客 😀"'),'string');assert.equal(kind(source,'Python','# 不同编号'),'comment');
 const multiline='content = r"""first # literal\nreturn false\n"""\n# actual\n用户 = 1_000.5e-2\n';exact(multiline,'py');assert.equal(kind(multiline,'py','r"""first # literal\nreturn false\n"""'),'string');assert.equal(kind(multiline,'py','用户'),'variable');assert.equal(kind(multiline,'py','1_000.5e-2'),'number');
});
test('SQL fields, relations and aggregate functions have separate tokens',()=>{
 const source="SELECT customer_id, COUNT(*) AS orders\nFROM orders\nWHERE status = 'paid -- literal' AND refunded_at IS NULL; -- 顾客\n/* SELECT\nFROM */";
 exact(source,'postgresql');assert.equal(kind(source,'sql','SELECT'),'keyword');assert.equal(kind(source,'sql','customer_id'),'property');assert.equal(kind(source,'sql','COUNT'),'builtin');assert.equal(codeTokens(source,'sql').filter(t=>t.text==='orders')[1].kind,'type');assert.equal(kind(source,'sql',"'paid -- literal'"),'string');assert.equal(kind(source,'sql','/* SELECT\nFROM */'),'comment');
 const quoted="select \"订单号\", [total], `status`, 'it''s paid', $$not /* a comment */$$ from sales";exact(quoted,'SQL');assert.equal(kind(quoted,'sql','"订单号"'),'property');assert.equal(kind(quoted,'sql',"'it''s paid'"),'string');assert.equal(kind(quoted,'sql','$$not /* a comment */$$'),'string');
 assert.equal(kind('SELECT count FROM totals','sql','count'),'property');
});
test('JSON properties are distinguished from string values without altering escape sequences',()=>{
 const source='{\n  "title": "含\\\"引号\\\"的例子 😀", "value": 1.2e-3, "enabled": true\n}';exact(source,'JSON');assert.equal(kind(source,'json','"title"'),'property');assert.equal(kind(source,'json','"含\\\"引号\\\"的例子 😀"'),'string');assert.equal(kind(source,'json','1.2e-3'),'number');assert.equal(kind(source,'json','true'),'keyword');
 const comments='{ /* title */ "name": "//value"\n}';exact(comments,'jsonc');assert.equal(kind(comments,'jsonc','/* title */'),'comment');
});
test('JavaScript and TypeScript recognize object fields and parameters',()=>{
 const source='const config = { rate: 0.1, name: "// literal" };\nfunction total(amount) { return amount * config.rate; }\nconst doubled = (value = Math.max(1, 2), count = 1) => value * count;';exact(source,'javascript');assert.equal(kind(source,'js','config'),'variable');assert.equal(kind(source,'js','rate'),'property');assert.equal(kind(source,'js','amount'),'parameter');assert.equal(kind(source,'js','value'),'parameter');assert.equal(kind(source,'js','count'),'parameter');assert.equal(kind(source,'js','Math'),'builtin');assert.equal(kind(source,'js','max'),'property');assert.equal(kind(source,'js','"// literal"'),'string');
 const ts='interface Result { amount: number }\nconst total = (value: number): number => value;';exact(ts,'TS');assert.equal(kind(ts,'typescript','interface'),'keyword');assert.equal(kind(ts,'typescript','Result'),'type');assert.equal(kind(ts,'typescript','number'),'type');assert.equal(kind(ts,'typescript','value'),'parameter');
 assert.equal(kind('const settings = {"rate": 0.1};','js','"rate"'),'property');
 assert.equal(kind('const settings = {return: false}; settings.return;','js','return'),'property');
 const regexp='const matcher = /^https?:\\/\\//i; const ratio = total / count;';exact(regexp,'js');assert.equal(kind(regexp,'js','/^https?:\\/\\//i'),'string');assert.equal(kind(regexp,'js','/'),'operator');
});
test('unknown language names do not accidentally activate a different lexer',()=>{
 const source='const 三色 = "# not a comment"; 42\n';assert.deepEqual(exact(source,'copybook'),[{text:source,kind:'plain',start:0,end:source.length}]);assert.deepEqual(exact(source,'pythonic'),[{text:source,kind:'plain',start:0,end:source.length}]);assert.deepEqual(codeTokens('',''),[]);
});
test('fallback characters preserve complete Unicode code points',()=>{
 const tokens=exact('print(😀)','python');assert.ok(tokens.some(t=>t.text==='😀'));assert.ok(tokens.every(t=>!/^[\uD800-\uDFFF]$/.test(t.text)));
});
