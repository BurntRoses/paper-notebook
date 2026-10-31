import { cp, mkdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The public site is a product, not a mirror of the development release.
// Build interfaces and production sources remain in the repository/dist only.
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = root + 'dist/';
const site = root + 'output/site/';
for (const path of ['index.html', 'promo.html', 'chat-start.html', 'downloads/blank-notebook.html', 'downloads/paper-notebook-skill.zip', 'downloads/paper-notebook-conversation.zip', 'downloads/paper-notebook-upload.zip']) {
  if (!(await stat(dist + path)).isFile()) throw new Error(`Missing release file: ${path}. Run the build first.`);
}
const [reader, home] = await Promise.all([
  readFile(dist + 'index.html','utf8'),
  readFile(dist + 'promo.html','utf8'),
]);
await mkdir(root + 'output/', { recursive: true });
await rm(site, { recursive: true, force: true });
await mkdir(site+'downloads', {recursive:true});
await mkdir(site+'promo/story', {recursive:true});
await mkdir(site+'previews', {recursive:true});
for(const path of ['start.html','promo-motion.html','site.css','site-nav.js','create-notebook.js','responsive-film.js','paper-grain.svg','paper-notebook-prompt.txt','THIRD_PARTY_NOTICES.txt','LICENSE'])await cp(dist+path,site+path);
for(const name of ['blank-notebook','paper-notebook','paper-notebook-product','machine-learning','concept','formula','practice','compound-interest','literature','business','programming'])await cp(dist+'downloads/'+name+'.html',site+'downloads/'+name+'.html');
for(const name of ['machine-learning','compound-interest','concept','literature','business','programming'])await cp(dist+'downloads/'+name+'.json',site+'previews/'+name+'.json');
// This is the runtime fetched by the AI creation instructions, not a promotional download.
await cp(dist+'downloads/paper-notebook-skill.zip',site+'downloads/paper-notebook-skill.zip');
await cp(dist+'downloads/paper-notebook-conversation.zip',site+'downloads/paper-notebook-conversation.zip');
await cp(dist+'downloads/paper-notebook-upload.zip',site+'downloads/paper-notebook-upload.zip');
for(const path of ['paper-landscape-3.jpg','paper-portrait-3.jpg','paper-notebook-film.mp4','paper-notebook-film-portrait.mp4','paper-notebook-film-1080.mp4','paper-notebook-film-portrait-1080.mp4','paper-notebook-film-low.mp4','paper-notebook-film-portrait-low.mp4','story/film-landscape-poster-1.webp','story/film-portrait-poster-1.webp'])await cp(dist+'promo/'+path,site+'promo/'+path);
await writeFile(site + 'reader.html', reader);
const previewDocument=JSON.parse(await readFile(dist+'downloads/machine-learning.json','utf8'));
await writeFile(site+'preview-reader.html',reader.replace(/(<script\b[^>]*\bid=["']notebook-data["'][^>]*>)[\s\S]*?(<\/script>)/,(_,open,close)=>open+JSON.stringify(previewDocument).replaceAll('<','\\u003c')+close));
await writeFile(site + 'index.html', home);
await writeFile(site+'chat-start.html','<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./#create"><link rel="canonical" href="./#create"><title>制作笔记 · Paper Notebook</title><script>location.replace("./"+(["#agent","#chat"].includes(location.hash)?location.hash:"#create"))</script><a href="./#create">前往首页，复制制作指令</a></html>');
await writeFile(site+'promo.html','<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./"><link rel="canonical" href="./"><title>Paper Notebook</title><script>const anchors={reader:"read",subjects:"read",workflow:"create",downloads:"create"};location.replace("./"+(location.hash?"#"+(anchors[location.hash.slice(1)]||location.hash.slice(1)):""))</script><a href="./">前往 Paper Notebook</a></html>');
await writeFile(site + '.nojekyll', '');
await writeFile(site + 'hosting.json', JSON.stringify({
  product: 'Paper Notebook',
  revision: process.env.GITHUB_SHA || null,
  builtAt: new Date().toISOString(),
  home: 'index.html',
  generate: '#create',
  reader: 'downloads/blank-notebook.html',
  example: 'downloads/paper-notebook.html',
  generation: 'Bring your own agent or chat; import and export run in your browser.',
}, null, 2) + '\n');
console.log('GitHub Pages site ready: output/site (offline dist unchanged)');
