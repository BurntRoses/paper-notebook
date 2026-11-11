import {readFile,writeFile,mkdir,mkdtemp,cp,rename,rm,stat} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {unzipSync} from 'fflate';
const endpoint='https://burntroses.github.io/paper-notebook/downloads/';
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
type Manifest={format:number;release:string;files:Record<string,string>};
const exists=async(path:string)=>{try{await stat(path);return true;}catch{return false;}};
async function get(url:string,timeout=40000){
 try{const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(timeout)});if(!response.ok)throw new Error('HTTP '+response.status);return new Uint8Array(await response.arrayBuffer());}
 catch(error){const result=spawnSync('curl',['--fail','--location','--silent','--show-error','--connect-timeout','10','--max-time',String(timeout/1000),url],{maxBuffer:64*1024*1024,timeout:timeout+1000});if(result.status!==0)throw error;return new Uint8Array(result.stdout);}
}
function safe(name:string){if(name.startsWith('/')||name.includes('\\')||name.split('/').includes('..'))throw new Error('Unsafe runtime path: '+name);return name;}
async function verify(root:string){const manifest=JSON.parse(await readFile(join(root,'runtime-manifest.json'),'utf8')) as Manifest;if(manifest.format!==1||!manifest.files['assets/reader.html']||!manifest.files['references/chinese-writing.md'])throw new Error('Invalid runtime manifest');for(const [path,expected] of Object.entries(manifest.files))if(hash(await readFile(join(root,safe(path))))!==expected)throw new Error('Runtime fingerprint mismatch: '+path);return manifest;}
export async function updateRuntime(destination:string,offline=false,base=endpoint){
 const root=resolve(destination);if(await exists(join(root,'package.json')))throw new Error('Update a portable runtime directory, not the source checkout.');
 let local:Manifest|undefined;try{local=await verify(root);}catch{}
 let latest:{release:string;sha256:string}|undefined;
 if(!offline)try{latest=JSON.parse(Buffer.from(await get(base+'runtime.json?check='+Date.now(),10000)).toString());}catch{}
 if(offline||!latest){if(!local)throw new Error('No verified local runtime; acquire the published package.');return {status:'ready',release:local.release,updateStatus:offline?'offline':'unavailable',runtime:root};}
 if(latest.release===local?.release)return {status:'ready',release:local.release,updateStatus:'checked',runtime:root};
 const archive=await get(base+'paper-notebook-conversation.zip?release='+latest.release);if(hash(archive)!==latest.sha256)throw new Error('Package fingerprint differs from published release.');
 await mkdir(dirname(root),{recursive:true});const temp=await mkdtemp(join(dirname(root),'.paper-runtime-')),stage=join(temp,'staged');
 try{
  await mkdir(stage);if(await exists(root))await cp(root,stage,{recursive:true});
  const files=unzipSync(archive),manifestBytes=files['paper-notebook/runtime-manifest.json'];if(!manifestBytes)throw new Error('Runtime manifest missing');const manifest=JSON.parse(Buffer.from(manifestBytes).toString()) as Manifest;if(manifest.release!==latest.release)throw new Error('Archive release differs from version check.');
  for(const name of Object.keys(local?.files||{}))if(!(name in manifest.files))await rm(join(stage,safe(name)),{force:true});
  for(const [name,bytes] of Object.entries(files)){safe(name);if(!name.startsWith('paper-notebook/'))throw new Error('Unexpected archive root');const relative=name.slice(15);if(!relative||name.endsWith('/'))continue;const target=join(stage,relative);await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);}
  await verify(stage);
  const smoke=spawnSync(process.execPath,['scripts/notebook.mjs','build','assets/blank-notebook.json','--out','runtime-check'],{cwd:stage,encoding:'utf8',timeout:60000});if(smoke.status!==0)throw new Error(smoke.stderr||smoke.stdout||'Runtime smoke build failed');
  const backup=join(temp,'previous');if(await exists(root))await rename(root,backup);try{await rename(stage,root);}catch(e){if(await exists(backup))await rename(backup,root);throw e;}
  return {status:'ready',release:latest.release,updateStatus:'updated',runtime:root};
 }finally{await rm(temp,{recursive:true,force:true});}
}
