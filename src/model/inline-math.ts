export interface InlinePart {text:string;start:number;latex?:string}

/** Delimiters remain in the source. Rendering never changes UTF-16 anchors. */
export function inlineParts(text:string):InlinePart[]{
 const parts:InlinePart[]=[];let plain=0,i=0;
 const escaped=(at:number)=>{let n=0;while(at>0&&text[--at]==='\\')n++;return n%2===1;};
 while(i<text.length){
  const paren=text.startsWith('\\(',i)&&!escaped(i),dollar=text[i]==='$'&&!escaped(i)&&text[i+1]!=='$'&&text[i-1]!=='$';
  if(!paren&&!dollar){i++;continue;}
  const open=paren?2:1,close=paren?'\\)':'$';let end=i+open;
  while(end<text.length&&!text.startsWith(close,end)&&text[end]!=='\n')end++;
  const latex=text.slice(i+open,end);
  if(end>=text.length||text[end]==='\n'||!latex.trim()||escaped(end)||(dollar&&(/[\w$]/.test(text[end+1]||'')||/^\s|\s$/.test(latex)))){i+=open;continue;}
  if(i>plain)parts.push({text:text.slice(plain,i),start:plain});
  const finish=end+close.length;parts.push({text:text.slice(i,finish),start:i,latex});i=finish;plain=i;
 }
 if(plain<text.length||!parts.length)parts.push({text:text.slice(plain),start:plain});return parts;
}

/** Keep an inline formula intact when a long paragraph continues on a sheet. */
export function inlineBoundary(text:string,at:number){
 for(const part of inlineParts(text))if(part.latex!==undefined&&at>part.start&&at<part.start+part.text.length)return part.start;
 return at;
}
