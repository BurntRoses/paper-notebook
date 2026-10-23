import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function buildSkill(){await mkdir(root+'dist/skill-runtime',{recursive:true});await build({entryPoints:[root+'tools/cli.ts'],outfile:root+'dist/skill-runtime/notebook.mjs',bundle:true,platform:'node',format:'esm',target:'node20',minify:true,banner:{js:"import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"}})}
if(process.argv[1]===fileURLToPath(import.meta.url))await buildSkill();
