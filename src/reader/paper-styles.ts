import type { Page, PaperStyle } from '../model/types';

export const paperStyles:{id:PaperStyle;zh:string;en:string}[]=[
 {id:'auto',zh:'按学科匹配',en:'Match subject'},
 {id:'white',zh:'素白纸',en:'White paper'},
 {id:'ivory',zh:'象牙纸',en:'Ivory paper'},
 {id:'cotton',zh:'棉纹纸',en:'Cotton paper'},
 {id:'mist',zh:'雾蓝纸',en:'Blue mist'},
 {id:'sage',zh:'浅青纸',en:'Pale sage'},
 {id:'inkwash',zh:'淡墨纸',en:'Ink wash'}
];

/** Material and page ruling are independent; an explicit choice wins over subject defaults. */
export function resolvePaperStyle(style:PaperStyle|undefined,subject:Page['subject']):Exclude<PaperStyle,'auto'>{
 if(style&&style!=='auto')return style;
 if(style===undefined)return 'ivory';
 return subject==='literature'?'inkwash':subject==='stem'?'mist':subject==='code'?'white':subject==='business'?'ivory':'cotton';
}

export function applyPaperStyle(paper:HTMLElement,style:PaperStyle|undefined){
 paper.dataset.paperStyle=resolvePaperStyle(style,paper.dataset.subject as Page['subject']);
}
