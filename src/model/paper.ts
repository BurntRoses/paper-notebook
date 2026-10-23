import { pagesOf, type Annotation, type NotebookDocument, type ObjectFrame, type Page, type PaperShape } from './types';
export const paperSize=(shape:PaperShape)=>shape==='landscape'?{width:1120,height:792}:{width:792,height:1120};
export const paperShape=(setting:string|undefined,width:number,height:number):PaperShape=>setting==='portrait'||setting==='landscape'?setting:width>height?'landscape':'portrait';
export function frameFor(d:NotebookDocument,page:Page,shape:PaperShape,id:string):ObjectFrame|undefined{const own=d.userState.layouts?.[page.id]?.[shape]?.[id]||page.placements?.[shape]?.[id];if(own)return own;const other=shape==='landscape'?'portrait':'landscape',f=d.userState.layouts?.[page.id]?.[other]?.[id]||page.placements?.[other]?.[id];if(!f)return;const a=paperSize(other),b=paperSize(shape),s=Math.min(b.width/a.width,b.height/a.height);return {...f,x:Math.min(b.width-f.width*s-24,f.x*s),y:Math.max(198,f.y*s),width:f.width*s,height:f.height?f.height*s:undefined};}
export function setFrame(d:NotebookDocument,pageId:string,shape:PaperShape,id:string,frame:ObjectFrame){d.userState.layouts||={};d.userState.layouts[pageId]||={};d.userState.layouts[pageId][shape]||={};d.userState.layouts[pageId][shape]![id]={...frame};}
/** The pre-reader used paper width for BOTH axes. Keep those original samples verbatim. */
export function migrateInk(d:NotebookDocument){
 for(const a of d.userState.annotations){
  if(a.kind!=='freehand'||!a.points?.length||a.coordinateSpace)continue;
  a.originalPoints=structuredClone(a.points);a.coordinateSpace='legacy-width';
  const page=pagesOf(d).find(p=>p.id===a.pageId);
  // Width-normalized ink has no historical aspect ratio; never guess which text it belongs to.
  if(!page||!a.sourceSize){a.status='needs-placement';a.migration='原笔迹按纸宽归一化，缺少原纸幅。请选择目标纸页重新定位。';}
 }
}
export function inkPoints(a:Annotation,width:number,height:number){
 const source=a.sourceSize;
 if(a.coordinateSpace==='normalized-page'&&source&&!a.attachedBlockId){const scale=Math.min(width/source.width,height/source.height);return (a.points||[]).map(p=>[p[0]*source.width*scale,p[1]*source.height*scale,p[2]??.5]);}
 const aspect=a.coordinateSpace==='normalized-page'?height:width;
 return (a.points||[]).map(p=>[p[0]*width,p[1]*aspect,p[2]??.5]);
}
export function safeBoundary(text:string,at:number){return at>0&&at<text.length&&/[\uD800-\uDBFF]/.test(text[at-1])&&/[\uDC00-\uDFFF]/.test(text[at])?at-1:at;}
