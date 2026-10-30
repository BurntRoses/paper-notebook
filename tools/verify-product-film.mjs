import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),ffmpeg=process.env.FFMPEG||'ffmpeg',report=[];
await mkdir(root+'docs/verification',{recursive:true});
const variants=[['',1280,720],['-portrait',720,1280],['-low',960,540],['-portrait-low',540,960]];
for(const [suffix,width,height]of variants.filter(([suffix])=>!process.argv.includes('--low')||suffix.endsWith('-low'))){
 const file=root+'public/promo/paper-notebook-film'+suffix+'.mp4';
 const run=args=>{const r=spawnSync(ffmpeg,['-hide_banner',...args],{encoding:'utf8',maxBuffer:10e6});assert.equal(r.status,0,r.stderr);return r.stderr;};
 const info=run(['-i',file,'-vf','blackdetect=d=0.1:pix_th=0.06','-af','ebur128=peak=true','-f','null','-']);
 assert.ok(info.includes(`${width}x${height}`));assert.match(info,/30 fps/);assert.match(info,/Duration: 00:01:04\.00/);assert.match(info,/Video: h264/);assert.ok(/Audio: aac[^\n]*48000 Hz, stereo/.test(info),'AAC stereo 48 kHz required');assert.ok(!/black_start:/.test(info));
 const levels=[...info.matchAll(/I:\s*(-?[\d.]+) LUFS/g)].map(m=>+m[1]);const lufs=levels.at(-1);assert.ok(lufs>-20&&lufs<-12,`unexpected loudness ${lufs}`);
 const peaks=[...info.matchAll(/Peak:\s*(-?[\d.]+) dBFS/g)].map(m=>+m[1]);assert.ok(peaks.at(-1)<0,'clipping');
 const contact=root+'docs/screenshots/product-film-decoded'+(suffix||'-landscape')+'.png';
 run(['-y','-i',file,'-vf',`fps=1/4,scale=${suffix?216:384}:-1,tile=4x4`,'-frames:v','1',contact]);
 report.push({file,width,height,fps:30,duration:64,frames:1920,codec:'H264/AAC stereo 48kHz',fullDecode:true,blackFrames:false,lufs,truePeak:peaks.at(-1),contact});console.log('✓ '+file+' full decode, '+lufs+' LUFS');
}
await writeFile(root+'docs/verification/product-film'+(process.argv.includes('--low')?'-low':'')+'-report.json',JSON.stringify({date:new Date().toISOString(),report},null,2));
