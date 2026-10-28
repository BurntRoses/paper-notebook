import type {NotebookDocument} from '../model/types';

const dataSlot=()=>/(<script\b[^>]*\bid=["']notebook-data["'][^>]*>)([\s\S]*?)(<\/script>)/g;
const faces=()=>/@font-face\s*\{[^{}]*\}/g;
const isReadingFace=(face:string)=>/font-family:\s*["']?StudyHand\b/.test(face);
const readingFaces=(html:string)=>[...html.matchAll(faces())].map(m=>m[0]).filter(isReadingFace);
const canonical=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);

function shell(html:string){
 if([...html.matchAll(dataSlot())].length!==1)throw new Error('Expected exactly one notebook-data slot');
 return html.replace(dataSlot(),(_m,open,_data,close)=>open+close)
  .replace(/<title>[^<]*<\/title>/,'<title></title>')
  .replace(faces(),face=>isReadingFace(face)?'':face);
}

export function verifyBundledReader(html:string,template:string,source?:NotebookDocument){
 if(!['page-surface','reader-content','StudyHand'].every(marker=>template.includes(marker)))throw new Error('The reference must be the bundled Paper Notebook reader template.');
 if(shell(html)!==shell(template))throw new Error('Reader shell differs from the bundled template. Do not deliver a custom HTML/CSS/JS reader; rebuild with the supplied builder.');
 const allowed=readingFaces(template),actual=readingFaces(html);
 if(!actual.length||actual.some(face=>!allowed.includes(face))||allowed.filter(face=>/U\+20-7E\b/i.test(face)).some(face=>!actual.includes(face)))throw new Error('The bundled reading fonts were removed or replaced.');
 const embedded=JSON.parse([...html.matchAll(dataSlot())][0][2]);
 if(source&&canonical(embedded)!==canonical(source))throw new Error('Embedded notebook data differs from the authored source.');
 return {bundledReaderMatches:true,sourceMatches:!!source};
}
