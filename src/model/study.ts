import { pagesOf, textOf, type Annotation, type NotebookDocument } from './types';
/** One passage may carry bold, color and a circle; list its source range once. */
export function distinctPassages(marks:Annotation[]):Annotation[]{
 const passages=new Map<string,Annotation>();
 for(const mark of marks){if(!mark.selectors.length)continue;const key=JSON.stringify([mark.pageId,mark.selectors.map(s=>[s.blockId,s.start,s.end,s.exact])]);if(!passages.has(key))passages.set(key,mark);}
 return [...passages.values()];
}
/** Source emphasis is derived from the source page; dismissals are private reading state. */
export function authoredAnnotations(d:NotebookDocument,pageId:string,includeDismissed=false):Annotation[]{
 const result:Annotation[]=[];const page=pagesOf(d).find(p=>p.id===pageId);
 for(const b of page?.blocks||[])for(const [i,m] of (b.study?.marks||[]).entries()){
  const id=`author-${b.id}-${i}`;if(!includeDismissed&&d.userState.dismissedStudyMarks?.includes(id))continue;
  const text=textOf(b),start=text.indexOf(m.text);if(start<0)continue;
  let seed=m.seed||31;for(const c of b.id)seed=(seed*31+c.charCodeAt(0))%2147483646;
  const onBoard=b.study?.visual==='blackboard'&&!b.parameters?.length;
  result.push({id,pageId,kind:m.kind,selectors:[{blockId:b.id,start,end:start+m.text.length,exact:m.text,prefix:text.slice(Math.max(0,start-24),start),suffix:text.slice(start+m.text.length,start+m.text.length+24)}],color:m.color||(onBoard?'#eee7a9':m.kind==='highlight'?'#e4b942':['red','circle','wave','star','dots'].includes(m.kind)?'#b45149':'#345d76'),width:2.1,seed:seed+i+1,status:'resolved'});
 }
 return result;
}
