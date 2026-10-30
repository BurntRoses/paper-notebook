import type { Asset, Block, FigureMark } from '../model/types';
import { el } from './dom';
import { figureMarks } from './figure-marks';

/** Reserve the same space during pagination and decoding; never crop labels. */
export function figureLayout(b:Block, media:SVGSVGElement|HTMLImageElement, asset?:Asset,personal:FigureMark[]=[]){
 const figure=el('figure','lesson-figure'),viewport=el('div','figure-media');
 figure.dataset.size=b.figure?.size||'wide';figure.dataset.align=b.figure?.align||'center';
 figure.dataset.style=b.figure?.style||'sketch';
 let width=Number(media.getAttribute('width')),height=Number(media.getAttribute('height'));
 if(media instanceof HTMLImageElement){
  width=asset?.width||0;height=asset?.height||0;
  if((!width||!height)&&asset?.mime==='image/svg+xml'){
   try{const comma=asset.data.indexOf(','),header=asset.data.slice(0,comma),body=asset.data.slice(comma+1);const svg=new DOMParser().parseFromString(header.includes(';base64')?atob(body):decodeURIComponent(body),'image/svg+xml').documentElement;
    const box=svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);width=Number(svg.getAttribute('width'))||box?.[2]||0;height=Number(svg.getAttribute('height'))||box?.[3]||0;
   }catch{/* Unknown dimensions use a fixed fallback, also during measurement. */}
  }
  if(width>0&&height>0){media.width=width;media.height=height;}
 }
 const chosen=b.figure?.ratio||'auto',ratio=chosen==='auto'?(width>0&&height>0?width/height:4/3):chosen.split(':').map(Number).reduce((a,n)=>a/n);
 viewport.style.aspectRatio=String(ratio);figure.dataset.ratio=chosen;
 viewport.append(media);if(b.figure?.annotations?.length||personal.length)viewport.append(figureMarks([...(b.figure?.annotations||[]),...personal],ratio));figure.append(viewport);
 if(b.caption)figure.append(el('figcaption','figure-caption',b.caption));
 return figure;
}

/** Fit the media only. Captions keep their column width and readable line spacing. */
export function fitFigureHeight(root:HTMLElement,height:number){
 const media=root.querySelector<HTMLElement>('.figure-media');
 const [w,h=1]=(media?.style.aspectRatio||'').split('/').map(Number),ratio=w/h;
 if(media&&ratio>0){media.style.width=`min(100%, ${Math.max(1,height*ratio)}px)`;media.dataset.fitted='true';}
}

/** The complete block must fit, including title, caption, source credit and margins. */
export function fitFigureBlock(root:HTMLElement,maxHeight:number){
 const media=root.querySelector<HTMLElement>('.figure-media');if(!media)return;
 const overhead=root.offsetHeight-media.offsetHeight;
 const height=Math.max(1,maxHeight-overhead-2);fitFigureHeight(root,height);
 return height;
}

export function fitPageFigures(root:ParentNode){
 for(const block of root.querySelectorAll<HTMLElement>('[data-figure-height]'))fitFigureBlock(block,Number(block.dataset.figureHeight));
}
