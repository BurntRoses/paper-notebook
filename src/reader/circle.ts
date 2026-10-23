/** One elliptical pen gesture with a short crossing tail at the upper right.
 * The tail moves from just outside the opening to just inside it. It follows
 * the ellipse tangent throughout, avoiding the old inward hook.
 */
export function circleStroke(x:number,y:number,w:number,h:number,seed:number){
 const cx=x+w/2,cy=y+h/2,rx=w/2+6,ry=h/2+5,start=-.68,span=Math.PI*2+.36;
 const phase=(seed%997)/997*Math.PI*2;
 const at=(p:number)=>{
  const t=start+span*p,tail=Math.max(0,(p-.84)/.16),inward=Math.max(0,(p-.94)/.06);
  const cross=Math.sin(tail*Math.PI)*.055-inward*inward*(3-2*inward)*.07;
  const wobble=Math.sin(t*3+phase)*.006+Math.sin(t*5-phase)*.003;
  const radius=1+wobble+cross;
  return [cx+Math.cos(t)*rx*radius,cy+Math.sin(t)*ry*radius];
 };
 const count=48,points=Array.from({length:count+1},(_,i)=>at(i/count));
 let d=`M ${points[0].join(' ')}`;
 for(let i=1;i<points.length;i++){
  const prev=points[i-1],next=points[i],before=points[Math.max(0,i-2)],after=points[Math.min(count,i+1)];
  const a=[prev[0]+(next[0]-before[0])/6,prev[1]+(next[1]-before[1])/6];
  const b=[next[0]-(after[0]-prev[0])/6,next[1]-(after[1]-prev[1])/6];
  d+=` C ${a.join(' ')} ${b.join(' ')} ${next.join(' ')}`;
 }
 return d;
}
