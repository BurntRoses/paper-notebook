#!/usr/bin/env node
import {cp,mkdir,access,rename,mkdtemp,rm} from 'node:fs/promises';
import {homedir} from 'node:os';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),targetRoot=process.env.CODEX_HOME||resolve(homedir(),'.codex'),target=resolve(targetRoot,'skills/paper-notebook');
await access(resolve(root,'dist/skills/paper-notebook/runtime-manifest.json'));await mkdir(targetRoot,{recursive:true});const stage=await mkdtemp(resolve(targetRoot,'paper-notebook-install-'));
try{
 await cp(resolve(root,'dist/skills/paper-notebook'),stage,{recursive:true});
 await mkdir(dirname(target),{recursive:true});try{await access(target);const backup=resolve(targetRoot,'skill-backups','paper-notebook-'+new Date().toISOString().replace(/[:.]/g,'-'));await mkdir(dirname(backup),{recursive:true});await rename(target,backup);console.log('Previous installation archived: '+backup)}catch(error){if(error.code!=='ENOENT')throw error}
 await rename(stage,target);console.log('Installed self-contained Skill: '+target);console.log('Use: 我想学习机器学习，用 Paper Notebook 制作教程。');
}catch(error){await rm(stage,{recursive:true,force:true});throw error}
