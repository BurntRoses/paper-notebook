import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFile,stat,writeFile} from 'node:fs/promises';
const root=fileURLToPath(new URL('../public/promo/',import.meta.url));
for(const suffix of ['', '-portrait'])for(const tier of [720,540]){
 const portrait=!!suffix,width=portrait?tier:Math.round(tier*16/9),height=portrait?Math.round(tier*16/9):tier;
 const source=root+'paper-notebook-film'+suffix+'-1080.mp4',target=root+'paper-notebook-film'+suffix+(tier===540?'-low':'')+'.mp4';
 const crf=tier===720?20:24,preset=tier===720?'slow':'medium',maxrate=tier===720?'2200k':'480k',bufsize=tier===720?'4400k':'960k';
 const result=spawnSync(process.env.FFMPEG||'ffmpeg',['-y','-hide_banner','-loglevel','error','-i',source,'-vf',`scale=${width}:${height}:flags=lanczos`,'-c:v','libx264','-preset',preset,'-crf',String(crf),'-maxrate',maxrate,'-bufsize',bufsize,'-g','60','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',target],{encoding:'utf8'});
 if(result.status!==0)throw new Error(result.stderr||'Video tier encode failed');
 if(tier===720){
  const manifest=JSON.parse(await readFile(source.replace(/\.mp4$/,'.json'),'utf8'));
  Object.assign(manifest,{width,height,file:target.split('/').at(-1),master:source.split('/').at(-1),bytes:(await stat(target)).size,encoding:{...manifest.encoding,crf,preset,maxrate:'2200 kb/s',buffer:'4400 kb/s'}});
  await writeFile(target.replace(/\.mp4$/,'.json'),JSON.stringify(manifest,null,2));
 }
 console.log(JSON.stringify({file:target,width,height,bytes:(await stat(target)).size,sourceBytes:(await stat(source)).size}));
}
