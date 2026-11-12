import {createHash} from 'node:crypto';

/** Split the hosted reader for browser caching; offline artifacts keep their canonical shell. */
export function onlineReader(html,templateURL){
 const assets=new Map(),digest=value=>createHash('sha256').update(value).digest('hex').slice(0,20);
 const asset=(prefix,extension,data)=>{const file=`${prefix}-${digest(data)}.${extension}`;assets.set(file,data);return file;};
 let coreFont;
 html=html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/g,(_,source)=>{
  const css=source.replace(/@font-face\s*\{[^{}]*\}/g,face=>face.replace(/data:([^;,]+);base64,([A-Za-z0-9+/=]+)/g,(_url,mime,encoded)=>{
   const extension=mime.includes('woff2')?'woff2':mime.includes('woff')?'woff':null;if(!extension)return _url;
   const file=asset('font',extension,Buffer.from(encoded,'base64'));
   if(/font-family:\s*["']?StudyHand\b/.test(face)&&/U\+20-7E\b/i.test(face))coreFont=file;
   return './'+file;
  }));
  return `<link rel="stylesheet" href="reader-assets/${asset('reader','css',Buffer.from(css))}">`;
 });
 html=html.replace(/<script\b([^>]*\btype=["']module["'][^>]*)>([\s\S]*?)<\/script>/g,(_,attributes,script)=>`<script${attributes} src="reader-assets/${asset('reader','js',Buffer.from(script))}"></script>`);
 const metadata=`<meta name="paper-notebook-template" content="${templateURL}">`+(coreFont?`<link rel="preload" href="reader-assets/${coreFont}" as="font" type="font/woff2" crossorigin>`:'');
 return {html:html.replace('</head>',metadata+'</head>'),assets};
}
