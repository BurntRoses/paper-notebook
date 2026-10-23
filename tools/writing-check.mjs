#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {tsImport} from 'tsx/esm/api';
const {importText}=await tsImport('../src/io/markdown.ts',import.meta.url);
const path=process.argv[2];if(!path){console.error('Usage: node tools/writing-check.mjs notebook.json');process.exit(1)}
const {document}=importText(await readFile(path,'utf8'));const warnings=[];
const inspect=(text,location)=>{for(const rule of [/把/g,/被/g,/不是[\s\S]{0,50}而是/g,/众所周知|显而易见|你可能误以为|你一定|让我们一起|总而言之|赋能|深度赋能/g]){for(const hit of text.matchAll(rule))warnings.push({location,at:hit.index,phrase:hit[0],context:text.slice(Math.max(0,hit.index-15),hit.index+50)})}};
inspect(document.notebook.title,'notebook.title');
for(const c of document.notebook.chapters)for(const p of c.pages){inspect(p.title,p.id+'.title');if(p.subtitle)inspect(p.subtitle,p.id+'.subtitle');if(p.summary)inspect(p.summary,p.id+'.summary');for(const b of p.blocks){if(['quote','code','formula'].includes(b.type))continue;for(const key of ['title','text','question','prompt','result','explanation','caption'])if(typeof b[key]==='string')inspect(b[key],b.id+'.'+key);for(const item of [...b.items||[],...b.steps||[],...b.options||[]])inspect(item.text,item.id)}}
console.log(JSON.stringify({advisory:true,warnings},null,2));
