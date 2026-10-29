import {zipSync,strToU8} from 'fflate';

/** One wrapper for browsers that expand downloads. Store the already-compressed runtime. */
export function conversationUpload(runtime){
 return zipSync({
  'paper-notebook-upload/paper-notebook-conversation.zip':runtime,
  'paper-notebook-upload/上传说明.txt':strToU8('将旁边的 paper-notebook-conversation.zip 上传给 AI，无需解压。\n如果下载后保留了 paper-notebook-upload.zip，直接上传外层 ZIP 也可以。\n已有学习材料和回答继续沿用。\n')
 },{level:0,mtime:new Date('2026-01-01T00:00:00Z')});
}
