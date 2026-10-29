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
 document.querySelector('#copy-repository').onclick=()=>copyPrompt(document.querySelector('#repository-prompt'),document.querySelector('#repository-status'),document.querySelector('#agent-instructions'),'已复制。发给编程智能体后，按提示上传文件，或回复“没有文件”。');
 document.querySelector('#copy').onclick=()=>copyPrompt(document.querySelector('#prompt'),document.querySelector('#status'),document.querySelector('#chat-instructions'),'已复制。将指令与材料发给 AI；它会先自动获取工具，下载受限时才需要上传备用 ZIP。');
