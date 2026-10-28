import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),prompts=new URL('skills/paper-notebook/prompts/',root);
const agent=await readFile(new URL('coding-agent.txt',prompts),'utf8'),chat=await readFile(new URL('conversation-model.txt',prompts),'utf8');
let html=await readFile(new URL('public/chat-start.html',root),'utf8');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(const [id,prompt]of [['repository-prompt',agent],['prompt',chat]]){
 const slot=new RegExp('(<textarea\\b[^>]*\\bid="'+id+'"[^>]*>)[\\s\\S]*?(</textarea>)');
 if(!slot.test(html))throw new Error('Missing prompt field: '+id);
 html=html.replace(slot,(_,open,close)=>open+escape(prompt)+close);
}
await writeFile(new URL('public/chat-start.html',root),html);await writeFile(new URL('public/paper-notebook-prompt.txt',root),chat);
const message=(await readFile(new URL('skills/paper-notebook/references/responses/download-unavailable.zh-CN.txt',root),'utf8')).trim();
const helperPath=new URL('skills/paper-notebook/scripts/prepare_conversation.py',root);
const helper=await readFile(helperPath,'utf8'),slot=/# preset-download-response:start[\s\S]*?# preset-download-response:end/;
if(!slot.test(helper))throw new Error('Missing download response slot');
await writeFile(helperPath,helper.replace(slot,()=>`# preset-download-response:start\nDOWNLOAD_MESSAGE = ${JSON.stringify(message)}\n# preset-download-response:end`));
