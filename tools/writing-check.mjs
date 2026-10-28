#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {tsImport} from 'tsx/esm/api';
const {importText}=await tsImport('../src/io/markdown.ts',import.meta.url);
const {reviewContent}=await tsImport('../src/model/content-review.ts',import.meta.url);
const path=process.argv[2];if(!path){console.error('Usage: node tools/writing-check.mjs notebook.json');process.exit(1)}
const {document}=importText(await readFile(path,'utf8'));
console.log(JSON.stringify(reviewContent(document),null,2));
