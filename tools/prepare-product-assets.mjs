import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {default:sharp}=await import(process.env.SHARP_MODULE||'sharp');
const root=fileURLToPath(new URL('../',import.meta.url)),sourceDir=root+'production/promo/story/',dir=root+'output/promo/story/';
const steps=80;
await mkdir(dir,{recursive:true});
for(const orientation of ['landscape','portrait']){
 const pages=JSON.parse(await readFile(sourceDir+orientation+'.json','utf8'));
 for(const page of pages){
  const n=page.index,base=await readFile(sourceDir+`${orientation}-${n}.png`),dim=await sharp(base).metadata(),svgSource=await readFile(sourceDir+`${orientation}-${n}.svg`,'utf8'),viewBox=svgSource.match(/viewBox="([^"]+)"/)[1];
  if(page.coordinateSpace!=='raster-pixels'){
   const sx=dim.width/page.width,sy=dim.height/page.height;
   const scale=b=>({...b,x:b.x*sx,y:b.y*sy,width:b.width*sx,height:b.height*sy});
   page.cssSize={width:page.width,height:page.height};page.width=dim.width;page.height=dim.height;
   page.header=scale(page.header);page.heading=scale(page.heading);page.blocks=page.blocks.map(scale);if(page.fragments)page.fragments=page.fragments.map(scale);page.coordinateSpace='raster-pixels';
  }
  const svg=(body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="${viewBox}">${body}</svg>`;
  const transform=(p,xml)=>p.transform?`<g transform="${p.transform}">${xml}</g>`:xml;
  const full=svg(page.paths.map(p=>transform(p,p.xml)).join(''));
  await sharp(base).composite([{input:Buffer.from(full)}]).png().toFile(dir+`${orientation}-${n}-full.png`);
  await mkdir(dir+`ink-${orientation}-${n}`,{recursive:true});
  const queue=Array.from({length:steps+1},(_,i)=>i);
  // Native SVG paths are reused unchanged, apart from a stroke reveal or a
  // clipping rectangle for a filled highlighter. No synthetic marker drawing.
  const render=async(i)=>{const phase=i/steps,span=page.paths.length,paths=[];
   for(const [k,path]of page.paths.entries()){
    const p=Math.max(0,Math.min(1,phase*(span+.6)-k*.85));if(!p)continue;let xml=path.xml;
    if(p<1){const rect=xml.match(/data-rect="([^"]+)"/),d=xml.match(/\bd="([^"]+)"/);
     if(path.kind==='highlight'||path.kind==='dots'){
      const a=rect?rect[1].split(',').map(Number):[0,0,1120,792];const x=a[0]-8,y=a[1]-20,w=a[2]+16,h=a[3]+50;
      xml=`<defs><clipPath id="clip-${k}"><rect x="${x}" y="${y}" width="${w*p}" height="${h}"/></clipPath></defs><g clip-path="url(#clip-${k})">${xml}</g>`;
     }else if(d){
      const nums=(d[1].match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)||[]).map(Number);let len=0;for(let j=2;j+1<nums.length;j+=2)len+=Math.hypot(nums[j]-nums[j-2],nums[j+1]-nums[j-1]);len=Math.max(12,len);
      xml=xml.replace('<path',`<path stroke-dasharray="${len} ${len}" stroke-dashoffset="${len*(1-p)}"`);
     }
    }paths.push(transform(path,xml));
   }
   await sharp(Buffer.from(svg(paths.join('')))).png().toFile(dir+`ink-${orientation}-${n}/${String(i).padStart(3,'0')}.png`);
  };
  while(queue.length)await Promise.all(queue.splice(0,8).map(render));
  console.log(`${orientation} ${n}: ${page.paths.length} native ink paths, ${steps+1} reveal frames`);
 }
 await writeFile(dir+orientation+'.json',JSON.stringify(pages,null,2));
}
await writeFile(dir+'provenance.json',JSON.stringify({renderer:'Production PageSurface, deterministic Chromium capture with CSS/raster geometry checks',document:'examples/product-notebook.json',pages:8,orientations:['landscape','portrait'],ink:'Unmodified native SVG geometry; only dash/clip reveal',revealSteps:steps},null,2));
