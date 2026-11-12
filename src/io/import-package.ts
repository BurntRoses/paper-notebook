import {unzip,strFromU8} from 'fflate';

const limit=50*1024*1024;
/** Read one source entry without inflating unrelated or duplicate notebooks. */
export async function notebookFromArchive(data:Uint8Array):Promise<string>{
 if(data.byteLength>limit)throw new Error('单次导入限制 50 MB。');
 return new Promise((resolve,reject)=>{
  let found=false,tooLarge=false;
  unzip(data,{filter:entry=>{
   if(found||!/(?:^|[/\\])notebook\.json$/i.test(entry.name))return false;
   found=true;tooLarge=entry.originalSize>limit;return !tooLarge;
  }},(error,files)=>{
   if(error){reject(error);return;}
   if(tooLarge){reject(new Error('ZIP 中的 notebook.json 超过 50 MB。'));return;}
   const source=Object.values(files)[0];
   if(!source){reject(new Error('ZIP 中缺少 notebook.json。'));return;}
   if(source.byteLength>limit){reject(new Error('ZIP 中的 notebook.json 超过 50 MB。'));return;}
   try{resolve(strFromU8(source));}catch(error){reject(error);}
  });
 });
}
