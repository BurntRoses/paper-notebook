import { textOf, type NotebookDocument, type Selector } from '../model/types';

export interface SearchHit {pageId:string;pageTitle:string;blockId?:string;selector?:Selector;before:string;match:string;after:string}
/** Search canonical source once, rather than duplicated pagination fragments. */
export function searchNotebook(d:NotebookDocument,query:string,offset=0,limit=40){
 const hits:SearchHit[]=[];let total=0;const needle=query.trim();
 if(!needle)return {hits,total};
 const pattern=needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const scan=(text:string,pageId:string,pageTitle:string,blockId?:string,anchored=false)=>{
  for(const match of text.matchAll(new RegExp(pattern,'giu'))){
   const start=match.index!,end=start+match[0].length;
   const paragraphStart=text.lastIndexOf('\n',Math.max(0,start-1))+1,nextBreak=text.indexOf('\n',end),paragraphEnd=nextBreak<0?text.length:nextBreak;
   const beforeStart=Math.max(paragraphStart,start-35),afterEnd=Math.min(paragraphEnd,end+55);
   if(total>=offset&&hits.length<limit)hits.push({pageId,pageTitle,blockId,
    ...(anchored&&blockId?{selector:{blockId,start,end,exact:text.slice(start,end),prefix:text.slice(Math.max(0,start-24),start),suffix:text.slice(end,end+24)}}:{}),
    before:(beforeStart>paragraphStart?'…':'')+text.slice(beforeStart,start),match:match[0],after:text.slice(end,afterEnd)+(afterEnd<paragraphEnd?'…':'')});
   total++;
  }
 };
 for(const chapter of d.notebook.chapters)for(const page of chapter.pages){
  scan(page.title,page.id,page.title);
  for(const block of page.blocks){
   if(block.title)scan(block.title,page.id,page.title,block.id);
   scan(textOf(block),page.id,page.title,block.id,true);
   const labels=[block.caption,block.alt,...(block.nodes||[]).map(n=>n.label),...(block.edges||[]).map(e=>e.label),block.xLabel,block.yLabel,...(block.series||[]).map(s=>s.label)].filter(Boolean).join('\n');
   if(labels)scan(labels,page.id,page.title,block.id);
  }
 }
 return {hits,total};
}
