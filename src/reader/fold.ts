export type Point = { x: number; y: number };
export type Matrix = [number, number, number, number, number, number];

/** A soft sheet folds about the perpendicular bisector of its moving corner.
 * Coordinates stay in the displayed sheet's pixel space, including at zoom. */
export function paperFold(width:number,height:number,progress:number,sign=1,vertical=false,gutter=0){
 const p=Math.max(0,Math.min(1,progress)),extent=vertical?height:width,cross=vertical?width:height;
 const curl=Math.sin(Math.PI*p)*Math.min(extent*.22,cross*.2);
 const travel=2*(extent+gutter/2)*Math.max(.00001,p);
 const length=Math.hypot(travel,curl),u=travel/length,v=curl/length;
 const midU=extent-travel/2,midV=cross-curl/2;
 const mid=vertical?{x:midV,y:sign>0?midU:extent-midU}:{x:sign>0?midU:extent-midU,y:midV};
 const normal=vertical?{x:v,y:sign*u}:{x:sign*u,y:v};
 const distance=(q:Point)=>(q.x-mid.x)*normal.x+(q.y-mid.y)*normal.y;
 const rect:Point[]=[{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}];
 const clip=(keep:number)=>{
  const out:Point[]=[];
  for(let i=0;i<rect.length;i++){
   const a=rect[i],b=rect[(i+1)%rect.length],da=distance(a)*keep,db=distance(b)*keep;
   if(da<=0)out.push(a);
   if((da<0&&db>0)||(da>0&&db<0)){const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
  }
  return out;
 };
 const dot=mid.x*normal.x+mid.y*normal.y;
 const matrix:Matrix=[1-2*normal.x**2,-2*normal.x*normal.y,-2*normal.x*normal.y,1-2*normal.y**2,2*dot*normal.x,2*dot*normal.y];
 const front=p===0?rect:p===1?[]:clip(1),back=p===0?[]:clip(-1);
 const crease=front.filter(q=>Math.abs(distance(q))<.01);
 return {front,back,matrix,crease,normal};
}

export const foldPolygon=(points:Point[])=>points.length?`polygon(${points.map(p=>`${p.x.toFixed(3)}px ${p.y.toFixed(3)}px`).join(',')})`:'polygon(0 0,0 0,0 0)';
