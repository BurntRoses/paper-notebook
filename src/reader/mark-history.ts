import type { NotebookDocument } from '../model/types';
type MarkState=Pick<NotebookDocument['userState'],'annotations'|'dismissedStudyMarks'>;
/** History owns only marks. Embedded images, prose and other records never enter it. */
export class MarkHistory {
 private past:MarkState[]=[];private future:MarkState[]=[];
 constructor(private limit=60){}
 get canUndo(){return this.past.length>0}get canRedo(){return this.future.length>0}
 private snapshot(state:MarkState):MarkState{return structuredClone({annotations:state.annotations,dismissedStudyMarks:state.dismissedStudyMarks});}
 change(state:MarkState,fn:()=>void){const before=this.snapshot(state);fn();const after={annotations:state.annotations,dismissedStudyMarks:state.dismissedStudyMarks};if(JSON.stringify(before)===JSON.stringify(after))return false;this.past.push(before);if(this.past.length>this.limit)this.past.shift();this.future=[];return true;}
 undo(state:MarkState){return this.move(state,this.past,this.future)}
 redo(state:MarkState){return this.move(state,this.future,this.past)}
 private move(state:MarkState,from:MarkState[],to:MarkState[]){const next=from.pop();if(!next)return false;to.push(this.snapshot(state));state.annotations=next.annotations;state.dismissedStudyMarks=next.dismissedStudyMarks;return true;}
 reset(){this.past=[];this.future=[];}
}
