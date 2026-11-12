import { inlineParts } from '../model/inline-math';
import { formulaHTML } from './math';

export const projectedText=(span:HTMLElement)=>span.dataset.source??span.textContent??'';
export function projection(node:HTMLElement,text:string,offset=0,math=true){
  const spans=(math?inlineParts(text):[{text,start:0}]).map(part=>{
    const span=document.createElement('span');span.className='ink-text';span.dataset.offset=String(offset+part.start);
    if('latex' in part&&part.latex!==undefined){
      span.classList.add('inline-math');span.dataset.source=part.text;
      span.innerHTML=formulaHTML(part.latex,false);
    }else span.textContent=part.text;
    node.append(span);return span;
  });
  return spans[0];
}

/** Captions, options and feedback render math without claiming body offsets. */
export function renderInlineText(node:HTMLElement,text:string){
  projection(node,text);for(const span of node.querySelectorAll<HTMLElement>('.ink-text')){span.classList.remove('ink-text');delete span.dataset.offset;}
  return node;
}
