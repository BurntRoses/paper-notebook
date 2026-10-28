import { parameterText, textOf, type Block, type Bookmark, type NotebookDocument, type Page, type ReadingAnchor } from '../model/types';
import { resolveSelector } from '../model/document';

type Sheet = Page & {part:number};
type Anchor = Pick<ReadingAnchor,'pageId'|'blockId'|'sheet'|'textOffset'>;

/** Source offsets stay stable when text, table rows or formula parameters reflow. */
export function fragmentRanges(b:Block):{start:number;end:number}[]{
  const offset=Number(b._offset||0);
  if(b.type==='comparison'){
    const head=(b.columns||[]).reduce((sum,c)=>sum+c.length+1,0);
    const rows=(b.rows||[]).flat().reduce((sum,c)=>sum+c.length+1,0);
    return [{start:0,end:Math.max(0,head-1)},{start:head+Number(b._rowOffset||0),end:head+Number(b._rowOffset||0)+Math.max(0,rows-1)}];
  }
  if(b.type==='formula'&&b.parameters?.length){
    const start=Number(b._parameterOffset??((b.text||b.latex||'').length+1));
    return [...(b.text?[{start:0,end:b.text.length}]:[]),{start,end:start+b.parameters.reduce((sum,p)=>sum+parameterText(p).length+1,0)-1}];
  }
  return [{start:offset,end:offset+textOf(b).length}];
}

export function indexForReadingAnchor(pages:Sheet[],a:Anchor){
  const own=pages.map((p,index)=>({p,index})).filter(({p})=>p.id===a.pageId);
  if(a.blockId){
    const matching=own.filter(({p})=>p.blocks.some(b=>b.id===a.blockId));
    if(a.textOffset!==undefined){
      const at=matching.find(({p})=>p.blocks.some(b=>b.id===a.blockId&&fragmentRanges(b).some(r=>r.start<=a.textOffset!&&r.end>a.textOffset!)));
      if(at)return at.index;
    }
    return matching.find(({p})=>p.part===a.sheet)?.index??matching[0]?.index??own[0]?.index??0;
  }
  return own.find(({p})=>p.part===a.sheet)?.index??own[0]?.index??0;
}

export function indexForBookmark(pages:Sheet[],d:NotebookDocument,b:Bookmark){
  const resolved=b.selector?resolveSelector(d,b.selector):undefined;
  return indexForReadingAnchor(pages,{pageId:b.pageId,blockId:b.selector?.blockId||b.blockId,sheet:b.sheet,textOffset:resolved?.status==='resolved'?resolved.start:undefined});
}
