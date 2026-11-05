import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig(({mode})=>({
  base: './', plugins: [viteSingleFile()],
  // Pages copies only its published assets in prepare-pages.mjs. The full
  // offline/developer release still keeps the complete public directory.
  publicDir: mode==='pages'?false:'public',
  build: { target: 'es2022', assetsInlineLimit: 10000000, cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } } }
}));
