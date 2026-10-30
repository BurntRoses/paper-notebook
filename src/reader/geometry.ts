import { paperSize } from '../model/paper';
import type { PaperShape } from '../model/types';

/** Pagination and display use the same per-sheet viewport, including stacked spreads. */
export function readerGeometry(width:number,height:number,spread:boolean,setting:'auto'|PaperShape='auto'){
 const stacked=spread&&height>width,columns=spread&&!stacked?2:1,rows=stacked?2:1,gap=12;
 const inset=width<800?8:12;
 const slotWidth=Math.max(120,(width-inset*2-gap*(columns-1))/columns);
 const slotHeight=Math.max(120,(height-92-gap*(rows-1))/rows);
 const shape:PaperShape=setting==='auto'?(slotWidth>slotHeight?'landscape':'portrait'):setting;
 let sheet:{width:number;height:number};
 if(setting!=='auto'){
  const size=paperSize(shape),ratio=size.width/size.height;
  const sheetWidth=Math.max(792,Math.floor(Math.min(slotWidth,slotHeight*ratio)));
  sheet={width:sheetWidth,height:Math.round(sheetWidth/ratio)};
 }else{
  // Keep readable logical typography on small screens, scaling the full sheet once.
  const scale=Math.max(1,(width<600?792:640)/slotWidth,420/slotHeight);
  sheet={width:Math.round(slotWidth*scale),height:Math.round(slotHeight*scale)};
 }
 return {shape,sheet,stacked,columns,rows,gap,slotWidth,slotHeight};
}
