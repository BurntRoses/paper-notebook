import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),assets=new URL('skills/paper-notebook/assets/',root);
const agent=await readFile(new URL('agent-prompt.txt',assets),'utf8'),chat=await readFile(new URL('chat-prompt.txt',assets),'utf8');
let html=await readFile(new URL('public/chat-start.html',root),'utf8');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(const [id,prompt]of [['repository-prompt',agent],['prompt',chat]])html=html.replace(new RegExp('(<textarea\\b[^>]*\\bid="'+id+'"[^>]*>)[\\s\\S]*?(</textarea>)'),(_,open,close)=>open+escape(prompt)+close);
await writeFile(new URL('public/chat-start.html',root),html);await writeFile(new URL('public/paper-notebook-prompt.txt',root),chat);
