import {writeFile,mkdir,cp,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {productStory,productFilm} from '../src/product-story.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
await Promise.all([mkdir(root+'production/promo/story',{recursive:true}),mkdir(root+'dist/downloads',{recursive:true})]);
await writeFile(root+'examples/product-notebook.json',JSON.stringify(productStory,null,2));
await writeFile(root+'public/promo/product-film-script.json',JSON.stringify(productFilm,null,2));
for(const command of [['validate','examples/product-notebook.json'],['build','examples/product-notebook.json','--out','output/product-notebook']]){const result=spawnSync(process.execPath,['tools/notebook.mjs',...command],{cwd:root,encoding:'utf8'});if(result.status!==0)throw Error(result.stderr||result.stdout);console.log(result.stdout.trim());}
const built=JSON.parse(await readFile(root+'output/product-notebook/build-report.json','utf8'));
for(const [from,to] of [[built.html,'html'],['notebook.json','json'],[built.zip,'zip']])await cp(root+'output/product-notebook/'+from,root+'dist/downloads/paper-notebook-product.'+to);
await writeFile(root+'docs/product-film-script.md','# Paper Notebook 产品推介片\n\n64 秒 · 120 BPM · 横竖两版 · 原创配乐 · 原生笔记页面\n\n'+productFilm.scenes.map(s=>`## ${s.start}–${s.end} 秒 · ${s.headline}\n\n目的：${s.purpose}\n\n画面：${s.visual}\n\n声音：${s.sound}\n`).join('\n'));
console.log('Product notebook, screenplay and native capture source are ready.');
