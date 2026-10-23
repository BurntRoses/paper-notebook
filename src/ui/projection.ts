export function projection(node:HTMLElement,text:string,offset=0){
  const span=document.createElement('span');
  span.className='ink-text';
  span.dataset.offset=String(offset);
  span.textContent=text;
  node.append(span);
  return span;
}
