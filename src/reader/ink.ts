import { getStroke } from 'perfect-freehand';
import { resolveInText } from '../model/document';
import { inkPoints } from '../model/paper';
import { circleStroke } from './circle';
import { drawRuling } from './ruling';
import { indexForBookmark } from './anchors';
import type { SurfacePage } from './surface';
import { blocksOf, textOf, type Annotation, type Bookmark, type NotebookDocument, type Selector } from '../model/types';
const NS='http://www.w3.org/2000/svg';
const svg=(tag:string,attrs:Record<string,string|number>)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
const random=(seed:number)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
export { authoredAnnotations } from '../model/study';
export function polygonPath(points:number[][]){return points.length?'M '+points.map(p=>p.slice(0,2).join(' ')).join(' L ')+' Z':'';}
export function rangeFor(span:HTMLElement,start:number,end:number){
 const walker=document.createTreeWalker(span,NodeFilter.SHOW_TEXT),nodes:Text[]=[];let n:Node|null;while((n=walker.nextNode()))nodes.push(n as Text);
 let at=0,first:Text|undefined,last:Text|undefined,a=0,b=0;
 for(const node of nodes){if(!first&&start<=at+node.length){first=node;a=Math.max(0,start-at);}if(end>=at&&end<=at+node.length){last=node;b=end-at;break;}at+=node.length;}
 if(!first||!last)return null;const range=document.createRange();range.setStart(first,a);range.setEnd(last,b);return range;
}
export function lineRects(rects:DOMRect[]){
 const out:DOMRect[]=[];for(const r of rects.filter(r=>r.width>.1&&r.height>1).sort((a,b)=>Math.abs(a.top-b.top)<3?a.left-b.left:a.top-b.top)){
  const prev=out.at(-1);if(prev&&Math.abs(prev.top-r.top)<3&&r.left<=prev.right+4)out[out.length-1]=new DOMRect(Math.min(prev.left,r.left),Math.min(prev.top,r.top),Math.max(prev.right,r.right)-Math.min(prev.left,r.left),Math.max(prev.bottom,r.bottom)-Math.min(prev.top,r.top));else out.push(r);
 }return out;
}
export function selectorRects(paper:HTMLElement,d:NotebookDocument,selector:Selector){
 const b=blocksOf(d).find(b=>b.id===selector.blockId);if(!b)return [];const resolved=resolveInText(textOf(b),selector);if(resolved.status!=='resolved')return [];
 const rects:DOMRect[]=[];for(const block of paper.querySelectorAll<HTMLElement>(`[data-block="${CSS.escape(selector.blockId)}"]`))for(const span of block.querySelectorAll<HTMLElement>('.ink-text')){
  const offset=Number(span.dataset.offset||0),start=Math.max(0,resolved.start-offset),end=Math.min(span.textContent?.length||0,resolved.end-offset);if(end>start){const r=rangeFor(span,start,end);if(r)rects.push(...r.getClientRects());}
 }return lineRects(rects);
}
export function flashPassage(paper:HTMLElement,d:NotebookDocument,selector:Selector){
 const overlay=paper.querySelector('.ink-overlay');if(!overlay)return;
 overlay.querySelector('.passage-located')?.remove();
 const base=paper.getBoundingClientRect(),sx=paper.offsetWidth/base.width,sy=paper.offsetHeight/base.height,group=svg('g',{class:'passage-located'});
 for(const r of selectorRects(paper,d,selector))group.append(svg('rect',{x:(r.left-base.left)*sx-2,y:(r.top-base.top)*sy,width:r.width*sx+4,height:r.height*sy,rx:2}));
 overlay.prepend(group);window.setTimeout(()=>group.remove(),2600);
}
export function drawInk(paper:HTMLElement,annotations:Annotation[],d:NotebookDocument,pages?:SurfacePage[]){
 const overlay=paper.querySelector<SVGSVGElement>('.ink-overlay');if(!overlay)return;overlay.replaceChildren();
 paper.querySelectorAll('strong.bold-ink,span.red-ink').forEach(n=>n.replaceWith(...n.childNodes));paper.querySelectorAll('.ink-text').forEach(n=>n.normalize());
 const base=paper.getBoundingClientRect(),width=paper.offsetWidth,height=paper.offsetHeight,sx=width/base.width,sy=height/base.height;
 overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
 for(const a of [...annotations].sort((a,b)=>Number(!['bold','red'].includes(a.kind))-Number(!['bold','red'].includes(b.kind)))){
  if(a.status==='needs-placement')continue;
  if(a.kind==='freehand'&&a.points?.length){
   if((a.sheet||0)!==Number(paper.dataset.part||0))continue;
   let pts=inkPoints(a,a.attachedBlockId&&a.sourceSize?a.sourceSize.width:width,a.attachedBlockId&&a.sourceSize?a.sourceSize.height:height);
   if(a.attachedBlockId&&a.blockFrame){const block=paper.querySelector<HTMLElement>(`[data-block="${CSS.escape(a.attachedBlockId)}"]`);if(!block)continue;const br=block.getBoundingClientRect(),old=a.blockFrame;pts=pts.map(p=>[(br.left-base.left)*sx+(p[0]-old.x)*(br.width*sx/old.width),(br.top-base.top)*sy+(p[1]-old.y)*(br.height*sy/old.height),p[2]]);}
   let node:SVGElement;
   if(a.tool==='arrow'){
    const first=pts[0],last=pts.at(-1)!,angle=Math.atan2(last[1]-first[1],last[0]-first[0]),len=14;
    node=svg('path',{d:`M ${first[0]} ${first[1]} Q ${(first[0]+last[0])/2} ${(first[1]+last[1])/2-4} ${last[0]} ${last[1]} M ${last[0]-len*Math.cos(angle-.5)} ${last[1]-len*Math.sin(angle-.5)} L ${last[0]} ${last[1]} L ${last[0]-len*Math.cos(angle+.5)} ${last[1]-len*Math.sin(angle+.5)}`,fill:'none',stroke:a.color,'stroke-width':a.width,'stroke-linecap':'round','stroke-linejoin':'round'});
   }else node=svg('path',{d:polygonPath(getStroke(pts,{size:a.tool==='marker'?a.width*7:a.width*2,thinning:a.tool==='marker'?0:.55,smoothing:.65,streamline:.35,simulatePressure:false,last:true})),fill:a.color,opacity:a.tool==='marker'?.27:a.tool==='pencil'?.68:.94});
   node.dataset.ink=a.id;overlay.append(node);continue;
  }
  if(a.kind==='bold'||a.kind==='red'){
   for(const s of a.selectors){const b=blocksOf(d).find(b=>b.id===s.blockId);if(!b)continue;const r=resolveInText(textOf(b),s);if(r.status!=='resolved')continue;for(const block of paper.querySelectorAll<HTMLElement>(`[data-block="${CSS.escape(s.blockId)}"]`))for(const span of block.querySelectorAll<HTMLElement>('.ink-text')){const off=Number(span.dataset.offset||0),start=Math.max(0,r.start-off),end=Math.min(span.textContent!.length,r.end-off);if(end<=start)continue;const range=rangeFor(span,start,end);if(!range)continue;const wrapper=document.createElement(a.kind==='bold'?'strong':'span');wrapper.className=a.kind==='bold'?'bold-ink':'red-ink';if(a.kind==='red')wrapper.style.color=a.color;wrapper.append(range.extractContents());range.insertNode(wrapper);}}
   continue;
  }
  let index=0;for(const selector of a.selectors)for(const [line,r] of selectorRects(paper,d,selector).entries()){
   if(line>0&&['star','check','arrow'].includes(a.kind))continue;
   const rand=random(a.seed+index++*19),j=(n:number)=>(rand()-.5)*n,x=(r.left-base.left)*sx,y=(r.top-base.top)*sy,w=r.width*sx,h=r.height*sy;let path:SVGElement;
   if(a.kind==='highlight'){
    const top=y+h*.17,bottom=y+h*.94;
    path=svg('path',{d:`M ${x} ${top+1} Q ${x+w*.45} ${top+j(1.3)} ${x+w} ${top} L ${x+w} ${bottom-1} Q ${x+w*.48} ${bottom+j(1.3)} ${x} ${bottom} Z`,fill:a.color,opacity:.31});
   }else if(a.kind==='circle'){
    path=svg('path',{d:circleStroke(x,y,w,h,a.seed+index*19),fill:'none',stroke:a.color,'stroke-width':a.width*.8,'stroke-linecap':'round','stroke-linejoin':'round'});
   }else if(a.kind==='dots'){const count=Math.max(1,Math.round(w/Math.max(8,h*.75))),group=svg('g',{});for(let k=0;k<count;k++)group.append(svg('circle',{cx:x+(k+.5)*w/count,cy:y+h+5,r:1.8,fill:a.color}));path=group;}else if(a.kind==='wave'){const yy=y+h+2,steps=Math.max(2,Math.ceil(w/12));let d=`M ${x} ${yy}`;for(let k=0;k<steps;k++)d+=` q ${w/steps/4} ${k%2?-3:3} ${w/steps/2} 0 q ${w/steps/4} ${k%2?3:-3} ${w/steps/2} 0`;path=svg('path',{d,fill:'none',stroke:a.color,'stroke-width':a.width*.8,'stroke-linecap':'round'});}
   else if(a.kind==='box')path=svg('path',{d:`M ${x-6} ${y-4} Q ${x+w*.6} ${y-4+j(.7)} ${x+w+6} ${y-4} L ${x+w+6} ${y+h+4} Q ${x+w*.4} ${y+h+4} ${x-6} ${y+h+4} Z`,fill:'none',stroke:a.color,'stroke-width':a.width*.7,'stroke-linejoin':'round'});
   else if(a.kind==='bracket')path=svg('path',{d:`M ${x+1} ${y-2} l -8 1 q -3 ${h/2} 0 ${h+4} l 8 0 M ${x+w-1} ${y-2} l 8 1 q 3 ${h/2} 0 ${h+4} l -8 0`,fill:'none',stroke:a.color,'stroke-width':a.width*.8,'stroke-linecap':'round'});
   else if(a.kind==='star'){const pts:number[][]=[],radius=Math.min(11,h*.27),cx=Math.min(width-20,x+w+radius*.45),cy=y-radius*.8;for(let i=0;i<10;i++){const angle=-Math.PI/2+i*Math.PI/5,r=i%2?radius*.43:radius;pts.push([cx+Math.cos(angle)*r,cy+Math.sin(angle)*r]);}path=svg('path',{d:polygonPath(pts),fill:'none',stroke:a.color,'stroke-width':a.width*.65,'stroke-linejoin':'round'});}
   else if(a.kind==='check'){const cx=Math.min(width-25,x+w+5),cy=y-5;path=svg('path',{d:`M ${cx-5} ${cy} l 4 4 l 9 -12`,fill:'none',stroke:a.color,'stroke-width':a.width*.8,'stroke-linecap':'round','stroke-linejoin':'round'});}
   else if(a.kind==='arrow')path=svg('path',{d:`M ${Math.max(10,x-50)} ${y+h*.6} Q ${x-25} ${y+h*.4} ${x-7} ${y+h*.55} m -10 -6 l 10 6 l -10 6`,fill:'none',stroke:a.color,'stroke-width':a.width,'stroke-linecap':'round','stroke-linejoin':'round'});
   else {const yy=a.kind==='strike'?y+h*.53:y+h+1;path=svg('path',{d:`M ${x} ${yy+j(.7)} Q ${x+w*.45} ${yy+2+j(1)} ${x+w} ${yy+j(.7)}`,fill:'none',stroke:a.color,'stroke-width':a.width,'stroke-linecap':'round'});}
   path.classList.add('ink-mark');path.dataset.ink=a.id;path.dataset.kind=a.kind;path.dataset.origin=a.id.startsWith('author-')?'author':'reader';path.dataset.rect=[x,y,w,h].join(',');overlay.append(path);
  }
 }
 drawExplanations(paper,overlay,d,base,sx,sy);
 drawBookmarks(paper,overlay,d,base,sx,sy,pages);
 drawRuling(paper);
}
function drawBookmarks(paper:HTMLElement,overlay:SVGSVGElement,d:NotebookDocument,base:DOMRect,sx:number,sy:number,pages?:SurfacePage[]){
 const list=(d.userState.bookmarks||[]).map((b,i)=>typeof b==='string'?({id:`legacy-${b}-${i}`,pageId:b,kind:'page' as const}):b as Bookmark);
 const page=list.filter(b=>{if(b.pageId!==paper.dataset.page||b.kind!=='page')return false;if(pages){const target=pages[indexForBookmark(pages,d,b)];return target?.id===paper.dataset.page&&target.part===Number(paper.dataset.part||0);}return b.selector?selectorRects(paper,d,b.selector).length>0:b.sheet===undefined||b.sheet===Number(paper.dataset.part||0);});
 if(page.length){const x=paper.offsetWidth-70,y=34;const n=svg('path',{d:`M ${x} ${y} h 22 v 28 l -11 -7 l -11 7 Z`,fill:'#b8794d',stroke:'#724f3c','stroke-width':1.5});n.dataset.bookmark=page[0].id;n.classList.add('page-bookmark-ink');overlay.append(n);}
 const width=paper.offsetWidth;
 for(const b of list.filter(x=>x.pageId===paper.dataset.page&&x.kind==='text'&&x.selector)){
  const rect=selectorRects(paper,d,b.selector!)[0];if(!rect)continue;
  const x=Math.min(width-24,(rect.right-base.left)*sx+7),y=Math.max(18,(rect.top-base.top)*sy-4),n=svg('path',{d:`M ${x} ${y} h 13 v 20 l -6.5 -4 l -6.5 4 Z`,fill:'#b8794d',stroke:'#724f3c','stroke-width':1});n.dataset.bookmark=b.id;n.classList.add('text-bookmark-ink');overlay.append(n);
 }
}
function drawExplanations(paper:HTMLElement,overlay:SVGSVGElement,d:NotebookDocument,base:DOMRect,sx:number,sy:number){
 for(const [noteIndex,note] of [...paper.querySelectorAll<HTMLElement>('[data-explain-target]')].entries()){
  const block=note.closest<HTMLElement>('[data-block]'),b=blocksOf(d).find(b=>b.id===block?.dataset.block),target=note.dataset.explainTarget||'';if(!b||!target)continue;
  const text=textOf(b),start=text.indexOf(target);if(start<0)continue;const selector={blockId:b.id,start,end:start+target.length,exact:target,prefix:'',suffix:''};
  let rect=selectorRects(paper,d,selector)[0];if(!rect)continue;
  const line=selectorRects(paper,d,{...selector,start:0,end:text.length,exact:text}).find(r=>Math.abs(r.top-rect.top)<3);if(line)rect=line;
  const nr=note.getBoundingClientRect(),br=block!.getBoundingClientRect(),pre=block!.querySelector('pre')?.getBoundingClientRect(),rightSide=nr.left>rect.right+12;
  const ax=(Math.min(rect.right+4,pre?pre.right-10:rect.right+4)-base.left)*sx,ay=(rect.top+rect.height*.55-base.top)*sy,ex=(rightSide?nr.left-6:nr.right+5)-base.left,ey=(nr.top+Math.min(14,nr.height/2)-base.top)*sy,gate=(rightSide?nr.left-14:br.right-7-(noteIndex%3)*8/sx)-base.left;
  const path=svg('path',{d:`M ${ax} ${ay} H ${gate*sx} V ${ey} H ${ex*sx}`,fill:'none',stroke:'#9a7864','stroke-width':1,'stroke-opacity':.65,'stroke-linejoin':'round'});path.classList.add('explanation-leader');overlay.append(path);
 }
}
