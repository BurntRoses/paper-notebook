import MarkdownIt from 'markdown-it';
import { blankDocument, uid, pagesOf, type NotebookDocument, type Block, type Page } from '../model/types';
import { parseDocument } from '../model/document';
const markdown=new MarkdownIt({html:false,linkify:false});
function clean(s:string){return s.replace(/\*\*(.*?)\*\*/g,'$1').replace(/`([^`]+)`/g,'$1').replace(/!\[([^\]]*)\]\(([^)]*)\)/g,'[图片：$1] ($2)').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'$1 ($2)');}
export function importText(input:string):{document:NotebookDocument;warnings:string[]}{
 let source=input.replace(/^\uFEFF/,'').trim();
 const fenced=source.match(/^(`{3,}|~{3,})(?:json|markdown|md|text|txt)?[ \t]*\n([\s\S]*?)\n\1[ \t]*$/i);if(fenced)source=fenced[2];
 if(source.startsWith('{')){let data:unknown;try{data=JSON.parse(source);}catch{throw new Error('JSON 语法错误。请检查引号、逗号和截断的内容。');}return parseDocument(data);}
 const d=blankDocument();const warnings:string[]=[];let chapter=d.notebook.chapters[0];chapter.title='正文';let page=chapter.pages[0];page.title='开始阅读';let metadata:Partial<NotebookDocument>&{structure?:{id:string;pages:(Partial<Page>&{id:string})[]}[]}|undefined;
 const tokens=markdown.parse(source,{});let paragraph:string[]=[];
 const add=(b:Block)=>page.blocks.push(b);
 const flush=()=>{const text=paragraph.join('\n').trim();if(text)add({id:uid('block'),type:'prose',text:clean(text)});paragraph=[];};
 for(let i=0;i<tokens.length;i++){
  const t=tokens[i];
  if(t.type==='heading_open'){
   flush();const level=Number(t.tag.slice(1));const title=tokens[i+1]?.content||'';i+=2;
   if(level===1)d.notebook.title=title;
   else if(level===2){if(d.notebook.chapters.length===1&&chapter.pages.length===1&&!page.blocks.length&&chapter.title==='正文'){chapter.title=title;}else{chapter={id:uid('chapter'),title,pages:[{id:uid('page'),title:'开始阅读',blocks:[] as Block[]}]};d.notebook.chapters.push(chapter);page=chapter.pages[0];}}
   else if(level===3){if(!page.blocks.length&&page.title==='开始阅读')page.title=title;else{page={id:uid('page'),title,blocks:[]};chapter.pages.push(page);}}
   else add({id:uid('block'),type:'concept',title,text:''});
  }else if(t.type==='fence'){
   flush();if(t.info.trim()==='notebook-metadata'){
    try{metadata=JSON.parse(t.content);}catch{throw new Error('notebook-metadata JSON 无效。');}
   }else if(t.info.trim()==='notebook-block'){
    try{const b=JSON.parse(t.content);if(!b.id)b.id=uid('block');add(b);}catch{throw new Error(`第 ${(t.map?.[0]||0)+1} 行 notebook-block JSON 无效；原文尚未导入。`);}
   }else if(['math','latex'].includes(t.info.trim()))add({id:uid('block'),type:'formula',latex:t.content.trim()});
   else add({id:uid('block'),type:'code',language:t.info.trim(),text:t.content.replace(/\n$/,'')});
  }else if(t.type==='blockquote_open'){
   flush();const texts:string[]=[];while(++i<tokens.length&&tokens[i].type!=='blockquote_close')if(tokens[i].type==='inline')texts.push(tokens[i].content);add({id:uid('block'),type:'quote',text:clean(texts.join('\n'))});
  }else if(t.type==='bullet_list_open'||t.type==='ordered_list_open'){
   flush();const ordered=t.type==='ordered_list_open',end=ordered?'ordered_list_close':'bullet_list_close';const items:{id:string;text:string}[]=[];let depth=1;
   while(++i<tokens.length){if(tokens[i].type===t.type)depth++;if(tokens[i].type===end&&!--depth)break;if(tokens[i].type==='inline')items.push({id:uid('item'),text:clean(tokens[i].content.replace(/^\[[ xX]\]\s*/,''))});}
   add({id:uid('block'),type:ordered?'steps':'checklist',items});
  }else if(t.type==='table_open'){
   flush();const rows:string[][]=[];let row:string[]=[];
   while(++i<tokens.length&&tokens[i].type!=='table_close'){if(tokens[i].type==='tr_open')row=[];if(tokens[i].type==='inline')row.push(clean(tokens[i].content));if(tokens[i].type==='tr_close')rows.push(row);}
   add({id:uid('block'),type:'comparison',columns:rows.shift()||[],rows});
  }else if(t.type==='inline'){paragraph.push(t.content);if(t.children?.some(x=>x.type==='image'))warnings.push(`第 ${(t.map?.[0]||0)+1} 行：Markdown 图片链接已作为文字保留；请通过图片块导入本地文件，以保证离线可用。`);}
  else if(t.type==='paragraph_close')flush();
 }
 flush();if(metadata){if(metadata.notebook)d.notebook={...d.notebook,...metadata.notebook,title:d.notebook.title,chapters:d.notebook.chapters};if(metadata.assets)d.assets=metadata.assets;if(metadata.extensions)d.extensions=metadata.extensions;if(metadata.userState)d.userState=metadata.userState;metadata.structure?.forEach((c,i)=>{const chapter=d.notebook.chapters[i];if(!chapter)return;chapter.id=c.id;c.pages.forEach((p,j)=>{const page=chapter.pages[j];if(page){const {blocks:_,title:__,...presentation}=p;Object.assign(page,presentation);}});});}
 if(!pagesOf(d).some(p=>p.id===d.userState.lastPageId))d.userState.lastPageId=pagesOf(d)[0].id;if(!source)throw new Error('请先粘贴内容或选择文件。');
 const result=parseDocument(d);return {document:result.document,warnings:[...warnings,...result.warnings]};
}
export function exportMarkdown(d:NotebookDocument){const metadata={userState:d.userState,notebook:{...d.notebook,chapters:undefined},assets:d.assets,extensions:d.extensions,structure:d.notebook.chapters.map(c=>({id:c.id,pages:c.pages.map(p=>({...p,blocks:undefined,title:undefined}))}))};return `# ${d.notebook.title}\n\n\`\`\`notebook-metadata\n${JSON.stringify(metadata,null,2)}\n\`\`\`\n\n`+d.notebook.chapters.map(c=>`## ${c.title}\n\n`+c.pages.map(p=>`### ${p.title}\n\n`+p.blocks.map(b=>'```notebook-block\n'+JSON.stringify(b,null,2)+'\n```').join('\n\n')).join('\n\n')).join('\n\n');}
