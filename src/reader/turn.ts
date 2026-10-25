import { el } from '../ui/dom';
import { foldPolygon, paperFold } from './fold';

export interface TurnSheet {node:HTMLElement;rect:DOMRect}
interface Leaf {front:HTMLElement;back:HTMLElement;shadow:HTMLElement;width:number;height:number}
export const captureSheets=(wrap:HTMLElement):TurnSheet[]=>[...wrap.children].map(node=>({node:node as HTMLElement,rect:node.getBoundingClientRect()}));
let copyId=0;
function copySheet(node:HTMLElement){
 const copy=node.cloneNode(true) as HTMLElement,prefix=`turn-copy-${++copyId}-`,ids=new Map<string,string>();
 for(const n of copy.querySelectorAll('[id]')){ids.set(n.id,prefix+n.id);n.id=prefix+n.id;}
 // Keep SVG markers, masks and clip paths connected to their own temporary
 // sheet, without duplicating IDs from the live incoming page.
 for(const n of copy.querySelectorAll('*'))for(const a of [...n.attributes]){
  let value=a.value.replace(/url\(#([^)]+)\)/g,(match,id)=>ids.has(id)?`url(#${ids.get(id)})`:match);
  if((a.name==='href'||a.name==='xlink:href')&&value.startsWith('#')&&ids.has(value.slice(1)))value='#'+ids.get(value.slice(1));
  if(['aria-labelledby','aria-describedby','aria-controls'].includes(a.name))value=value.split(' ').map(id=>ids.get(id)||id).join(' ');
  if(value!==a.value)n.setAttribute(a.name,value);
 }
 return copy;
}

/** The live incoming paper is already mounted below this transparent scene.
 * Keep the actual outgoing DOM until the fold settles: no screenshots, blank
 * rectangle, full-reader rebuild or opacity fade at the middle of a turn. */
export class PageTurn {
 readonly scene=el('div','page-transition');progress=0;restoreOnCancel=false;
 private leaves:Leaf[]=[];private raf=0;private disposed=false;
 constructor(private wrap:HTMLElement,private outgoing:TurnSheet[],private sign:number,private vertical:boolean,private mode:string){
  const stage=wrap.parentElement!,origin=stage.getBoundingClientRect(),incoming=captureSheets(wrap);
  this.scene.setAttribute('aria-hidden','true');this.scene.inert=true;this.scene.dataset.mode=mode;
  this.scene.style.height=Math.max(wrap.offsetTop+wrap.offsetHeight,...outgoing.map(s=>s.rect.bottom-origin.top))+'px';
  const spread=mode==='turn'&&!vertical&&outgoing.length===2&&incoming.length===2;
  const active=sign>0?outgoing.length-1:0;
  const gutter=spread?Math.max(0,outgoing[1].rect.left-outgoing[0].rect.right):0;
  for(const [index,sheet] of outgoing.entries()){
   const {rect,node}=sheet,slot=el('div','turn-sheet');
   Object.assign(slot.style,{left:rect.left-origin.left+stage.scrollLeft+'px',top:rect.top-origin.top+'px',width:rect.width+'px',height:rect.height+'px'});
   const front=el('div','turn-front');front.append(node);slot.append(front);this.scene.append(slot);
   if(spread&&index!==active){slot.classList.add('turn-still');continue;}
   if(!spread)slot.classList.add('turn-contained');
   const back=el('div','turn-back'),shadow=el('div','turn-shadow');
   if(spread){
    const source=copySheet(incoming[sign>0?0:1].node);
    const content=el('div','turn-back-content');content.append(source);back.append(content);back.classList.add('turn-printed-back');
   }
   slot.append(shadow,back);this.leaves.push({front,back,shadow,width:rect.width,height:rect.height});
  }
  this.scene.style.setProperty('--turn-gutter',String(gutter));stage.append(this.scene);this.seek(0);
 }
 seek(value:number){
  if(this.disposed)return;this.progress=Math.max(0,Math.min(1,value));
  const p=this.progress,axis=this.vertical?'Y':'X';this.scene.dataset.progress=p.toFixed(3);
  for(const leaf of this.leaves){
   if(this.mode!=='turn'){
    leaf.back.hidden=leaf.shadow.hidden=true;
    leaf.front.style.transform=this.mode==='fade'?'none':`translate${axis}(${-this.sign*p*102}%)`;
    leaf.front.style.opacity=this.mode==='fade'?String(1-p):'1';continue;
   }
   const fold=paperFold(leaf.width,leaf.height,p,this.sign,this.vertical,Number(this.scene.style.getPropertyValue('--turn-gutter')));
   leaf.front.style.clipPath=foldPolygon(fold.front);
   leaf.back.style.clipPath=foldPolygon(fold.back);leaf.back.style.transform=`matrix(${fold.matrix.join(',')})`;
   leaf.back.style.setProperty('--fold-angle',Math.atan2(fold.normal.y,fold.normal.x)*180/Math.PI+90+'deg');
   if(fold.crease.length>=2){
    const [a,b]=fold.crease,length=Math.hypot(b.x-a.x,b.y-a.y),width=Math.min(60,leaf.width*.085);
    Object.assign(leaf.shadow.style,{width:width+'px',height:length+'px',left:a.x+'px',top:a.y+'px',opacity:String(Math.min(1,p*8,(1-p)*8)),transform:`rotate(${Math.atan2(b.y-a.y,b.x-a.x)-Math.PI/2}rad) translateX(${-width/2}px)`});
   }else leaf.shadow.style.opacity='0';
  }
 }
 play(target:number,done:()=>void){
  cancelAnimationFrame(this.raf);const from=this.progress,start=performance.now(),duration=target?Math.max(160,460*(1-from)):Math.max(140,240*from);
  const tick=(now:number)=>{
   if(this.disposed)return;const t=Math.min(1,(now-start)/duration),ease=t*t*(3-2*t);
   this.seek(from+(target-from)*ease);if(t<1)this.raf=requestAnimationFrame(tick);else done();
  };this.raf=requestAnimationFrame(tick);
 }
 dispose(restore=false){
  if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.raf);
  if(restore)this.wrap.replaceChildren(...this.outgoing.map(s=>s.node));this.scene.remove();
 }
}
