import type { Block } from '../model/types';
/** One pass over the complete source, shared by header, body and continuation sheets. */
export function tableAlignments(source:Block){
 return (source.columns||[]).map((_,col)=>source.align?.[col]||((source.rows?.length||0)>0&&source.rows!.every(row=>/^[\s+−–—\d.,%￥$€×÷=()/^:：eE²³⁰¹⁻≤≥]+$/.test(row[col]||''))?'center':'left'));
}
