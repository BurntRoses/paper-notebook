import { uid, type Block, type FigureMark, type NotebookDocument } from '../model/types';
import { button, el, input, modal } from '../ui/dom';
import { figureMarks } from '../ui/figure-marks';

export function showFigureEditor(b:Block,d:NotebookDocument,original:HTMLElement,onChange:()=>void){
 const m=modal(b.title||'图像批注','选工具后在图上拖动或点击；标记会随 HTML 保存。');m.dialog.classList.add('figure-editor');
 const tools=el('div','figure-tools'),canvas=el('div','figure-editor-canvas');const media=original.querySelector('img,svg:not(.figure-annotations)')?.cloneNode(true) as HTMLElement|undefined;if(!media){m.close();return;}
 const [w,h=1]=original.style.aspectRatio.split('/').map(Number),ratio=w/h||4/3;canvas.style.aspectRatio=String(ratio);canvas.append(media);
 let tool:FigureMark['kind']='pen',color='#b1483d',draft:FigureMark|undefined,pointer:number|undefined;
 const undone:NonNullable<NotebookDocument['userState']['figureMarks']>=[];
 const resize=()=>{
  if(!m.dialog.isConnected)return;
  const style=getComputedStyle(m.body),dialogStyle=getComputedStyle(m.dialog);
  const pixels=(value:string)=>parseFloat(value)||0;
  const outerHeight=(node:HTMLElement)=>{if(!node.offsetHeight)return 0;const s=getComputedStyle(node);return node.offsetHeight+pixels(s.marginTop)+pixels(s.marginBottom);};
  const width=m.body.clientWidth-pixels(style.paddingLeft)-pixels(style.paddingRight);
  // A capped dialog's own height hides overflowing children. Measure the actual
  // controls instead so wrapping tools and the text field leave room for the image.
  const chrome=[...m.dialog.children].filter(n=>n!==m.body).reduce((sum,n)=>sum+outerHeight(n as HTMLElement),0)
   +[...m.body.children].filter(n=>n!==canvas).reduce((sum,n)=>sum+outerHeight(n as HTMLElement),0)
   +pixels(style.paddingTop)+pixels(style.paddingBottom)
   +pixels(dialogStyle.paddingTop)+pixels(dialogStyle.paddingBottom)+pixels(dialogStyle.borderTopWidth)+pixels(dialogStyle.borderBottomWidth);
  const maxHeight=Math.min(innerHeight-24,pixels(dialogStyle.maxHeight)||innerHeight-36);
  canvas.style.width=Math.max(1,Math.min(width,(maxHeight-chrome-2)*ratio))+'px';
 };
 const personal=()=>d.userState.figureMarks?.filter(a=>a.blockId===b.id)||[];
 const paint=()=>{canvas.querySelector('.figure-annotations')?.remove();canvas.append(figureMarks([...(b.figure?.annotations||[]),...personal(),...(draft?[draft]:[])],ratio));};
 const text=input('','输入短说明，再点图放置');text.setAttribute('aria-label','图像文字说明');text.hidden=true;text.maxLength=240;
 for(const [kind,name,glyph] of [['pen','画笔','✎'],['circle','圈注','◯'],['arrow','箭头','↗'],['check','勾记','✓'],['text','文字','T']] as const){const btn=button('图像工具：'+name,()=>{tool=kind;text.hidden=kind!=='text';tools.querySelectorAll('[data-figure-tool]').forEach(n=>n.setAttribute('aria-pressed',String((n as HTMLElement).dataset.figureTool===kind)));resize();if(kind==='text')text.focus();},'figure-tool',glyph);btn.dataset.figureTool=kind;btn.setAttribute('aria-pressed',String(kind===tool));tools.append(btn);}
 for(const [name,value] of [['红色','#b1483d'],['蓝色','#285f9e'],['绿色','#357344']] as const){const btn=button('图像笔色：'+name,()=>{color=value;tools.querySelectorAll('[data-figure-color]').forEach(n=>n.setAttribute('aria-pressed',String((n as HTMLElement).dataset.figureColor===value)));},'note-swatch','');btn.dataset.figureColor=value;btn.style.setProperty('--note-color',value);btn.setAttribute('aria-pressed',String(value===color));tools.append(btn);}
 const undo=button('撤销图像批注',()=>{const last=personal().at(-1);if(last){undone.push(last);d.userState.figureMarks=d.userState.figureMarks!.filter(a=>a.id!==last.id);onChange();paint();sync();}},'figure-tool','↶');
 const redo=button('重做图像批注',()=>{const last=undone.pop();if(last){(d.userState.figureMarks??=[]).push(last);onChange();paint();sync();}},'figure-tool','↷');
 const sync=()=>{undo.disabled=!personal().length;redo.disabled=!undone.length;};tools.append(undo,redo);
 const point=(e:PointerEvent)=>{const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)),Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100))];};
 canvas.onpointerdown=e=>{if(e.button!==0||tool==='text'&&!text.value.trim())return;e.preventDefault();const [x,y]=point(e);draft={kind:tool,x,y,x2:x,y2:y,color,...(tool==='pen'?{points:[[x,y]]}:{}),...(tool==='text'?{text:text.value.trim()}: {})};pointer=e.pointerId;canvas.setPointerCapture(e.pointerId);paint();};
 canvas.onpointermove=e=>{if(!draft||pointer!==e.pointerId)return;const [x,y]=point(e);draft.x2=x;draft.y2=y;if(draft.kind==='pen'&&(draft.points?.length||0)<5000)draft.points?.push([x,y]);paint();};
 canvas.onpointerup=e=>{if(!draft||pointer!==e.pointerId)return;const valid=['text','check'].includes(draft.kind)||Math.hypot((draft.x2||0)-draft.x,(draft.y2||0)-draft.y)>.3;if(valid){const pageId=d.notebook.chapters.flatMap(c=>c.pages).find(p=>p.blocks.some(block=>block.id===b.id))!.id;(d.userState.figureMarks??=[]).push({...draft,id:uid('figure-mark'),blockId:b.id,pageId});undone.length=0;onChange();}draft=undefined;pointer=undefined;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);paint();sync();};
 canvas.onpointercancel=()=>{draft=undefined;pointer=undefined;paint();};
 m.body.append(tools,text,canvas);m.foot.append(button('完成',m.close,'primary'));paint();sync();resize();
 const observer=new ResizeObserver(resize);observer.observe(tools);window.addEventListener('resize',resize);
 m.dialog.addEventListener('close',()=>{observer.disconnect();window.removeEventListener('resize',resize);});
}
