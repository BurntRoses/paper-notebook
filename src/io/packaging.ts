import type { NotebookDocument } from '../model/types';

/** Empty readers keep the common-character catalog; authored books keep only
 * used slices and the UI core. No network or font tooling is needed at runtime. */
export function slimFonts(html:string,d:NotebookDocument){
 if(!d.notebook.chapters.some(c=>c.pages.some(p=>p.blocks.length)))return html;
 const points=[...new Set([...JSON.stringify(d)].map(c=>c.codePointAt(0)!))];
 return html.replace(/@font-face\s*\{[^{}]*\}/g,face=>{
  if(!/font-family:\s*["']?StudyHand\b/.test(face))return face;
  const ranges=face.match(/unicode-range:\s*([^;}]+)/i)?.[1];if(!ranges)return face;
  // Retain the core (punctuation, common Chinese and all reader UI) unconditionally.
  if(/U\+20-7E\b/i.test(ranges))return face;
  const used=ranges.split(',').some(range=>{const m=range.trim().match(/^U\+([\da-f]+)(?:-([\da-f]+))?$/i);if(!m)return true;const lo=parseInt(m[1],16),hi=parseInt(m[2]||m[1],16);return points.some(p=>p>=lo&&p<=hi);});
  return used?face:'';
 });
}
export function artifactStem(title:string,revision:number){
 const name=title.normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g,'-').replace(/[\s-]+/g,'-').replace(/^[. -]+|[. -]+$/g,'').slice(0,72)||'学习笔记';
 return (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name)?'笔记-'+name:name)+'-v'+Math.max(1,revision);
}
export const bundleReadme=(name:string)=>`打开 ${name}.html 即可阅读、圈画和再次导出，无需安装或联网。\nnotebook.json 保留内容、内嵌素材与学习记录，供以后更新。\n素材已内嵌，无需逐个寻找文件。许可见 THIRD_PARTY_NOTICES.txt。\nOpen ${name}.html in a modern browser.\nPaper Notebook · https://github.com/BurntRoses/paper-notebook\n如果这本小笔记帮上了忙，欢迎到 GitHub 给项目留一颗 Star ☆\n`;
