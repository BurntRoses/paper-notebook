import rough from 'roughjs';

/** Decorative pencil edges use measured paper coordinates and a stable seed. */
export function drawSketchFrames(root:ParentNode){
 const targets=root.querySelectorAll<HTMLElement>('.block-callout,.block-example,.block-code,.block-comparison .table-scroll');
 for(const node of targets){
  const width=node.offsetWidth,height=node.offsetHeight;if(width<10||height<10)continue;
  const kind='panel';
  const key=kind+':'+width+':'+height;if(node.dataset.sketchSize===key&&node.querySelector(':scope > .sketch-frame'))continue;
  node.dataset.sketchSize=key;node.dataset.sketch=kind;node.querySelector(':scope > .sketch-frame')?.remove();
  let seed=17;for(const c of node.dataset.block||node.closest<HTMLElement>('[data-block],[data-page]')?.dataset.block||node.closest<HTMLElement>('[data-page]')?.dataset.page||kind)seed=(seed*31+c.charCodeAt(0))%2147483646;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('sketch-frame');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
  const pencil=rough.svg(svg),options={seed:seed+1,roughness:.9,bowing:1,strokeWidth:.85,stroke:'var(--sketch-line)',preserveVertices:true};
  {
   const outline=`M 5 7 Q ${width*.32} 2 ${width*.63} 5 T ${width-6} 4 Q ${width-2} ${height*.44} ${width-5} ${height-6} Q ${width*.59} ${height-2} ${width*.3} ${height-5} T 5 ${height-3} Q 2 ${height*.53} 5 7 Z`;
   svg.append(pencil.path(outline,{...options,roughness:1.2,bowing:1.4,fill:'var(--sketch-fill)',fillStyle:'solid'}));
   if(node.matches('.block-callout')){
    svg.append(pencil.polygon([[9,11],[width-10,9],[width-9,height-11],[10,height-8]],{...options,seed:seed+3,stroke:'none',fill:'var(--sketch-shade)',fillStyle:'hachure',fillWeight:.5,hachureGap:10,hachureAngle:78}));
   }
   if(node.matches('.table-scroll')){const rect=node.getBoundingClientRect(),scale=rect.width/width;for(const [i,row] of [...node.querySelectorAll('tr')].slice(0,-1).entries()){const y=(row.getBoundingClientRect().bottom-rect.top)/scale;svg.append(pencil.line(4,y,width-4,y,{...options,seed:seed+i+12,strokeWidth:.5}));}}
  }
  node.prepend(svg);
 }
}
