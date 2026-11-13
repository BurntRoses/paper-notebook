export type CodeTokenKind='plain'|'keyword'|'builtin'|'function'|'string'|'comment'|'number'|'property'|'parameter'|'variable'|'operator'|'type';
export interface CodeToken {text:string;kind:CodeTokenKind;start:number;end:number}
type Language='python'|'javascript'|'typescript'|'json'|'jsonc'|'sql';
const aliases:Record<string,Language>={py:'python',python:'python',python3:'python',js:'javascript',javascript:'javascript',jsx:'javascript',node:'javascript',nodejs:'javascript',ts:'typescript',typescript:'typescript',tsx:'typescript',json:'json',jsonc:'jsonc',sql:'sql',postgres:'sql',postgresql:'sql',mysql:'sql',sqlite:'sql',tsql:'sql','t-sql':'sql'};
const words=(value:string)=>new Set(value.split(' '));
const pythonKeywords=words('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case');
const jsKeywords=words('async await break case catch class const continue debugger default delete do else export extends false finally for from function if import in instanceof let new null of return static super switch this throw true try typeof var void while with yield');
const tsKeywords=words('abstract as asserts declare enum implements infer interface is keyof namespace never private protected public readonly satisfies type unique unknown');
const sqlKeywords=words('ALL ALTER AND ANY AS ASC BEGIN BETWEEN BY CASE CAST CHECK COLUMN COMMIT CONSTRAINT CREATE CROSS CURRENT_DATE CURRENT_TIME CURRENT_TIMESTAMP DATABASE DEFAULT DELETE DESC DISTINCT DROP ELSE END EXCEPT EXISTS FALSE FETCH FILTER FIRST FOLLOWING FOR FOREIGN FROM FULL GROUP HAVING IF IN INDEX INNER INSERT INTERSECT INTERVAL INTO IS JOIN KEY LAST LEFT LIKE LIMIT MATERIALIZED NATURAL NOT NULL NULLS OFFSET ON ONLY OR ORDER OUTER OVER PARTITION PRECEDING PRIMARY RANGE RECURSIVE REFERENCES RETURNING RIGHT ROLLBACK ROW ROWS SELECT SET TABLE THEN TRUE TRUNCATE UNBOUNDED UNION UNIQUE UPDATE USING VALUES VIEW WHEN WHERE WINDOW WITH');
const pythonBuiltins=words('abs all any bool bytes dict enumerate filter float frozenset input int isinstance len list map max min next object open print range reversed round set sorted str sum super tuple type zip');
const jsBuiltins=words('Array BigInt Boolean Date Error Infinity Intl JSON Map Math NaN Number Object Promise RegExp Set String Symbol URL WeakMap WeakSet console document window undefined');
const sqlBuiltins=words('ABS AVG CEIL COALESCE CONCAT COUNT DATE_TRUNC EXTRACT FLOOR GREATEST LEAST LENGTH LOWER MAX MIN NULLIF ROUND ROW_NUMBER SIGN SQRT STDDEV STRING_AGG SUBSTR SUBSTRING SUM UPPER');
const types=words('any bigint boolean number object string symbol void');

/** Lightweight lexical highlighting. Every token retains its exact UTF-16 source range. */
export function codeTokens(text:string,language=''):CodeToken[]{
 const lang=aliases[language.trim().toLowerCase()];
 if(!lang)return text?[{text,kind:'plain',start:0,end:text.length}]:[];
 const tokens:CodeToken[]=[],identifier=/[\p{L}_$][\p{L}\p{N}\p{M}_$]*/uy,number=/(?:0[xX][\da-fA-F](?:[\da-fA-F_]*[\da-fA-F])?|0[bB][01][01_]*|0[oO][0-7][0-7_]*|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?)[nNjJ]?/y;
 let at=0,previousSignificant:CodeToken|undefined;
 const push=(end:number,kind:CodeTokenKind)=>{const token={text:text.slice(at,end),kind,start:at,end};tokens.push(token);if(kind!=='comment'&&!/^\s+$/.test(token.text))previousSignificant=token;at=end;};
 const quoted=(start:number,quote:string,sql=false)=>{
  let end=start+quote.length;
  while(end<text.length){
   if(text.startsWith(quote,end)){if(sql&&text.startsWith(quote,end+quote.length)){end+=quote.length*2;continue;}return end+quote.length;}
   if(text[end]==='\\'&&!sql){end+=Math.min(2,text.length-end);continue;}end++;
  }return text.length;
 };
 while(at<text.length){
  const rest=text.slice(at),ch=text[at];
  if(/\s/.test(ch)){let end=at+1;while(end<text.length&&/\s/.test(text[end]))end++;push(end,'plain');continue;}
  if((lang==='python'&&ch==='#')||(lang==='sql'&&rest.startsWith('--'))||((lang==='javascript'||lang==='typescript'||lang==='jsonc')&&rest.startsWith('//'))){const end=text.indexOf('\n',at);push(end<0?text.length:end,'comment');continue;}
  if(lang!=='python'&&lang!=='json'&&rest.startsWith('/*')){const end=text.indexOf('*/',at+2);push(end<0?text.length:end+2,'comment');continue;}
  if(lang==='sql'){
   const dollar=rest.match(/^\$(?:[A-Za-z_][\w]*)?\$/)?.[0];
   if(dollar){const end=text.indexOf(dollar,at+dollar.length);push(end<0?text.length:end+dollar.length,'string');continue;}
   if(ch==='['){const end=text.indexOf(']',at+1);push(end<0?text.length:end+1,'property');continue;}
  }
  if((lang==='javascript'||lang==='typescript')&&ch==='/'){
   const previous=previousSignificant;
   if(!previous||['=','=>','(','[','{',',',':','!','&&','||','??','return','throw','case','yield'].includes(previous.text)){
    let end=at+1,bracket=false;
    while(end<text.length&&text[end]!=='\n'&&text[end]!=='\r'){
     if(text[end]==='\\'){end+=2;continue;}
     if(text[end]==='[')bracket=true;else if(text[end]===']')bracket=false;
     else if(text[end]==='/'&&!bracket){end++;while(/[a-z]/i.test(text[end]||'')&&end<text.length)end++;push(end,'string');break;}
     end++;
    }
    if(at===end)continue;
   }
  }
  const prefix=lang==='python'?rest.match(/^(?:br|rb|fr|rf|r|u|b|f)(?=['"])/i)?.[0]||'':'';
  const quoteAt=at+prefix.length,quote=text[quoteAt];
  if(quote==='"'||quote==="'"||((lang==='javascript'||lang==='typescript'||lang==='sql')&&quote==='`')){
   const delimiter=lang==='python'&&text.startsWith(quote.repeat(3),quoteAt)?quote.repeat(3):quote,end=quoted(quoteAt,delimiter,lang==='sql');
   const property=(lang==='sql'&&quote!=="'")||((lang==='json'||lang==='jsonc'||lang==='javascript'||lang==='typescript')&&/^\s*:/.test(text.slice(end)));
   push(end,property?'property':'string');continue;
  }
  number.lastIndex=at;const numeric=number.exec(text);if(numeric){push(number.lastIndex,'number');continue;}
  identifier.lastIndex=at;const name=identifier.exec(text);
  if(name){const word=name[0],upper=word.toUpperCase();let kind:CodeTokenKind='plain';
   if(lang==='python'){if(pythonKeywords.has(word))kind='keyword';else if(pythonBuiltins.has(word))kind='builtin';}
   else if(lang==='javascript'||lang==='typescript'){if(jsKeywords.has(word)||(lang==='typescript'&&tsKeywords.has(word)))kind='keyword';else if(lang==='typescript'&&types.has(word))kind='type';else if(jsBuiltins.has(word))kind='builtin';}
   else if(lang==='sql'){if(sqlKeywords.has(upper))kind='keyword';else kind='property';}
   else if(['true','false','null'].includes(word))kind='keyword';
   push(identifier.lastIndex,kind);continue;
  }
  if(/[+\-*\/=<>!%&|^~?:]/.test(ch)){let end=at+1;while(end<text.length&&/[+\-*\/=<>!%&|^~?:]/.test(text[end])&&!text.startsWith('//',end)&&!text.startsWith('/*',end))end++;push(end,'operator');continue;}
  push(at+(text.codePointAt(at)!>0xffff?2:1),'plain');
 }
 if(lang==='json'||lang==='jsonc')return tokens;
 // Context only affects identifiers. Comments, literals and source whitespace
 // remain intact; no parser or code execution is required by the reader.
 const significant=tokens.filter(t=>t.kind!=='comment'&&!/^\s+$/.test(t.text));
 const closing=new Map<number,number>(),opens:number[]=[];
 significant.forEach((token,i)=>{if(token.text==='(')opens.push(i);else if(token.text===')'){const start=opens.pop();if(start!==undefined)closing.set(start,i);}});
 const nameToken=(t:CodeToken|undefined)=>!!t&&/^[\p{L}_$][\p{L}\p{N}\p{M}_$]*$/u.test(t.text)&&!['comment','string','number','keyword'].includes(t.kind);
 const variables=new Set<string>(),parameters=new Set<string>();
 for(let i=0;i<significant.length;i++){
  const t=significant[i],before=significant[i-1],next=significant[i+1];
  if(lang!=='sql'&&/^[\p{L}_$][\p{L}\p{N}\p{M}_$]*$/u.test(t.text)){
   if(before?.text==='.'||before?.text==='?.'){t.kind='property';continue;}
   if(next?.text===':'&&(lang==='javascript'||lang==='typescript')&&['{',','].includes(before?.text)){t.kind='property';continue;}
  }
  if(!nameToken(t))continue;
  if(lang==='sql'){
   if(['FROM','JOIN','UPDATE','INTO','TABLE'].includes(before?.text.toUpperCase()))t.kind='type';
   else if(next?.text==='(')t.kind=sqlBuiltins.has(t.text.toUpperCase())?'builtin':'function';
   continue;
  }
  if(before?.text==='class'||before?.text==='interface'||before?.text==='type'){t.kind='type';continue;}
  if(before?.text==='def'||before?.text==='function'){t.kind='function';continue;}
  if(['const','let','var'].includes(before?.text)||['=',':='].includes(next?.text)||((before?.text==='for'||before?.text===',')&&next?.text==='in'))variables.add(t.text);
 }
 // Parameter slots of named declarations and arrow functions. Nested default
 // values stay expressions rather than being mistaken for extra parameters.
 for(let i=0;i<significant.length;i++){
  if(significant[i].text==='('){
   const end=closing.get(i);if(end===undefined)continue;
   const previous=significant[i-1],named=significant[i-2],declaration=named?.text==='def'||named?.text==='function'||previous?.text==='function';
   let arrow=significant[end+1]?.text==='=>';
   if(lang==='typescript'&&significant[end+1]?.text===':'){
    for(let j=end+2;j<significant.length;j++){const word=significant[j].text;if(word==='=>'){arrow=true;break;}if([';','{','}','='].includes(word))break;}
   }
   if(!declaration&&!arrow)continue;
   let slot=true,nesting=0;
   for(let j=i+1;j<end;j++){
    const t=significant[j];if(['(','[','{'].includes(t.text)){nesting++;continue;}if([')',']','}'].includes(t.text)){nesting--;continue;}
    if(!nesting&&t.text===','){slot=true;continue;}
    if(!nesting&&slot&&nameToken(t)){parameters.add(t.text);t.kind='parameter';slot=false;}
   }
  }else if(significant[i+1]?.text==='=>'&&nameToken(significant[i]))parameters.add(significant[i].text);
 }
 for(let i=0;i<significant.length;i++){
  const t=significant[i],before=significant[i-1],next=significant[i+1];if(!nameToken(t)||['property','type','function'].includes(t.kind))continue;
  if(parameters.has(t.text))t.kind='parameter';else if(variables.has(t.text))t.kind='variable';else if(t.kind==='plain'&&next?.text==='('&&before?.text!=='.')t.kind='function';
 }
 return tokens;
}
