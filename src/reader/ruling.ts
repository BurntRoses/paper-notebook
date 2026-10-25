/** Ruled paper follows rendered text lines, including the selected font's metrics.
 * It never inserts characters or changes the measured layout/annotation offsets. */
export function drawRuling(paper:HTMLElement){
 const body=paper.querySelector<HTMLElement>('.reader-page-body');if(!body)return;
 const old=body.querySelector(':scope > .text-ruling');
 if(paper.dataset.ruling!=='lined'||paper.closest('#print-root')){old?.remove();return;}
 const base=body.getBoundingClientRect();if(!base.width||!base.height)return;
 const sx=body.clientWidth/base.width,sy=body.clientHeight/base.height,NS='http://www.w3.org/2000/svg';
 const overlay=document.createElementNS(NS,'svg');overlay.classList.add('text-ruling');overlay.setAttribute('viewBox',`0 0 ${body.clientWidth} ${body.clientHeight}`);overlay.setAttribute('aria-hidden','true');overlay.setAttribute('focusable','false');
 const rules:{left:number;right:number;y:number;block:string}[]=[];
 for(const span of body.querySelectorAll<HTMLElement>('.reader-content .ink-text')){
  // Technical figures, table cells and chalkboards have their own surfaces.
  if(span.closest('[data-visual=blackboard],.block-formula,.block-code,.table-scroll,.figure-caption,.block-image,.oversize-object'))continue;
  const container=span.closest<HTMLElement>('p,li,.callout-body')||span.parentElement!,bounds=container.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(span);
  const rows=[...range.getClientRects()].filter(r=>r.width>.1&&r.height>1);
  for(const rect of rows){
   const left=Math.max(0,(bounds.left-base.left)*sx),right=Math.min(body.clientWidth,(bounds.right-base.left)*sx),y=(rect.bottom-base.top)*sy+2;
   if(y<0||y>body.clientHeight||right<=left)continue;
   if(rules.some(r=>Math.abs(r.y-y)<1.5&&Math.abs(r.left-left)<2))continue;
   rules.push({left,right,y,block:span.closest<HTMLElement>('[data-block]')?.dataset.block||''});
  }
 }
 for(const r of rules){const line=document.createElementNS(NS,'line');line.setAttribute('x1',String(r.left));line.setAttribute('x2',String(r.right));line.setAttribute('y1',String(r.y));line.setAttribute('y2',String(r.y));line.dataset.ruleFor=r.block;overlay.append(line);}
 // Empty paper below the lesson keeps the rhythm of the final body text.
 const content=body.querySelector<HTMLElement>('.reader-content'),last=rules.at(-1),step=parseFloat(getComputedStyle(paper).getPropertyValue('--rule'));
 if(content&&step>0){const c=content.getBoundingClientRect(),bottom=Math.max(0,...[...content.children].map(n=>(n.getBoundingClientRect().bottom-base.top)*sy));for(let y=last?last.y+step:bottom+step;y<body.clientHeight;y+=step){if(y<bottom+step*.5)continue;const line=document.createElementNS(NS,'line');line.setAttribute('x1',String((c.left-base.left)*sx));line.setAttribute('x2',String((c.right-base.left)*sx));line.setAttribute('y1',String(y));line.setAttribute('y2',String(y));overlay.append(line);}}
 if(old)old.replaceWith(overlay);else body.prepend(overlay);
}
