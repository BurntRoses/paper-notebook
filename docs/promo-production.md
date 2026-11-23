# 重建演示影片

网站直接使用 `public/promo/` 内的成片，常规构建无需重新渲染。

重建需要 Node.js 20.19+、Python 3（Pillow、numpy、fonttools、brotli）、sharp 和 FFmpeg。从仓库根目录运行：

```sh
node tools/prepare-product-assets.mjs
python3 tools/render-product-film.py
python3 tools/render-product-film.py --portrait
node tools/encode-film-low.mjs
node tools/verify-product-film.mjs
```

配乐和标题分别使用 `tools/compose-product-music.py` 和 `tools/build-film-titles.py` 生成。若演示笔记内容发生变化，先运行 `node --import tsx tools/build-product-story.mjs` 和 `pnpm build`，再用 `pnpm exec vite preview --port 4173` 提供构建结果，并运行 `NOTEBOOK_BASE=http://localhost:4173 node tools/capture-product-story.mjs`。重新采集需要 Playwright/Chromium。

源素材位于 `production/promo/story/`，中间帧和核验结果位于 `output/`。授权见 [第三方许可](../THIRD_PARTY_NOTICES.txt)。
