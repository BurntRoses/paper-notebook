#!/usr/bin/env node
import {cp,mkdir,access,rename,mkdtemp,rm} from 'node:fs/promises';
import {homedir} from 'node:os';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),targetRoot=process.env.CODEX_HOME||resolve(homedir(),'.codex'),target=resolve(targetRoot,'skills/paper-notebook');
await access(resolve(root,'dist/index.html'));const {buildSkill}=await import('./build-skill.mjs');await buildSkill();await mkdir(targetRoot,{recursive:true});const stage=await mkdtemp(resolve(targetRoot,'paper-notebook-install-'));
try{
 await cp(resolve(root,'skills/paper-notebook'),stage,{recursive:true});await mkdir(resolve(stage,'assets'),{recursive:true});await mkdir(resolve(stage,'scripts'),{recursive:true});
 for(const name of ['content-contract','components','chat-import'])await cp(resolve(root,'docs',name+'.md'),resolve(stage,'references',name+'.md'));
 await cp(resolve(root,'schemas/notebook.schema.json'),resolve(stage,'references/notebook.schema.json'));await cp(resolve(root,'dist/index.html'),resolve(stage,'assets/reader.html'));await cp(resolve(root,'examples/blank-notebook.json'),resolve(stage,'assets/blank-notebook.json'));await cp(resolve(root,'THIRD_PARTY_NOTICES.txt'),resolve(stage,'assets/THIRD_PARTY_NOTICES.txt'));await cp(resolve(root,'dist/skill-runtime/notebook.mjs'),resolve(stage,'scripts/notebook.mjs'));
 await mkdir(dirname(target),{recursive:true});try{await access(target);const backup=resolve(targetRoot,'skill-backups','paper-notebook-'+new Date().toISOString().replace(/[:.]/g,'-'));await mkdir(dirname(backup),{recursive:true});await rename(target,backup);console.log('Previous installation archived: '+backup)}catch(error){if(error.code!=='ENOENT')throw error}
 await rename(stage,target);console.log('Installed self-contained Skill: '+target);console.log('Use: 我想学习机器学习，用 Paper Notebook 制作教程。');
}catch(error){await rm(stage,{recursive:true,force:true});throw error}
