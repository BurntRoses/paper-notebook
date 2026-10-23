import { cp, mkdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Keep the offline release intact; only the hosted copy opens on the product page.
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = root + 'dist/';
const site = root + 'output/site/';
for (const path of ['index.html', 'promo.html', 'chat-start.html', 'downloads/blank-notebook.html', 'downloads/paper-notebook-skill.zip']) {
  if (!(await stat(dist + path)).isFile()) throw new Error(`Missing release file: ${path}. Run the build first.`);
}
const [reader, home] = await Promise.all([
  readFile(dist + 'index.html'),
  readFile(dist + 'promo.html'),
]);
await mkdir(root + 'output/', { recursive: true });
await rm(site, { recursive: true, force: true });
await cp(dist, site, { recursive: true });
await writeFile(site + 'reader.html', reader);
await writeFile(site + 'index.html', home);
await writeFile(site + '.nojekyll', '');
await writeFile(site + 'hosting.json', JSON.stringify({
  product: 'Paper Notebook',
  revision: process.env.GITHUB_SHA || null,
  builtAt: new Date().toISOString(),
  home: 'index.html',
  generate: 'chat-start.html',
  reader: 'downloads/blank-notebook.html',
  example: 'downloads/paper-notebook.html',
  generation: 'Bring your own agent or chat; import and export run in your browser.',
}, null, 2) + '\n');
console.log('GitHub Pages site ready: output/site (offline dist unchanged)');
