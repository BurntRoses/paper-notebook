async function copyPrompt(field,status,details,message){
 try{
  await navigator.clipboard.writeText(field.value);
  status.textContent=message;
 }catch{
  details.open=true;field.focus();field.select();
  let copied=false;try{copied=document.execCommand('copy');}catch{}
  status.textContent=copied?message:'已选中完整指令，请按 Ctrl+C（Mac 用 ⌘C）复制，然后粘贴到 AI 对话。';
 }
}
 document.querySelector('#copy-repository').onclick=()=>copyPrompt(document.querySelector('#repository-prompt'),document.querySelector('#repository-status'),document.querySelector('#agent-instructions'),'已复制，请与材料和学习要求一起发送。');
 document.querySelector('#copy').onclick=()=>copyPrompt(document.querySelector('#prompt'),document.querySelector('#status'),document.querySelector('#chat-instructions'),'已复制，请与材料和学习要求一起发送。');
