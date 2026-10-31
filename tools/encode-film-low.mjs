import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {stat} from 'node:fs/promises';
const root=fileURLToPath(new URL('../public/promo/',import.meta.url));
for(const [suffix,width,height] of [['',960,540],['-portrait',540,960]]){
 const source=root+'paper-notebook-film'+suffix+'.mp4',target=root+'paper-notebook-film'+suffix+'-low.mp4';
 const result=spawnSync(process.env.FFMPEG||'ffmpeg',['-y','-hide_banner','-loglevel','error','-i',source,'-vf',`scale=${width}:${height}:flags=lanczos`,'-c:v','libx264','-preset','medium','-crf','24','-maxrate','480k','-bufsize','960k','-g','60','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',target],{encoding:'utf8'});
 if(result.status!==0)throw new Error(result.stderr||'Low video encode failed');
 console.log(JSON.stringify({file:target,width,height,bytes:(await stat(target)).size,sourceBytes:(await stat(source)).size}));
}
