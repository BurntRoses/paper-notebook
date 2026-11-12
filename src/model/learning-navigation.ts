import { pagesOf, type NotebookDocument } from './types';
import { isInteractive } from './exploration';
export type LearningCategory='activity'|'exercise'|'figure'|'formula'|'code';
export interface LearningJump {category:LearningCategory;pageId:string;blockId:string;title:string;pageTitle:string}
export const learningCategories=[['activity','页内交互'],['exercise','查看习题'],['figure','图解'],['formula','公式'],['code','代码']] as const;
export function learningJumps(d:NotebookDocument):LearningJump[]{
 return pagesOf(d).flatMap(p=>p.blocks.flatMap(b=>{
  const category:LearningCategory|undefined=b.type==='exploration'&&b.exploration&&isInteractive(b.exploration)?'activity':b.type==='exercise'?'exercise':['image','diagram','chart'].includes(b.type)?'figure':b.type==='formula'?'formula':b.type==='code'?'code':undefined;
  return category?[{category,pageId:p.id,blockId:b.id,title:b.title||b.question||b.caption||p.title,pageTitle:p.title}]:[];
 }));
}
