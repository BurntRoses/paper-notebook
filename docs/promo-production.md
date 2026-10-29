# 产品推介片与复现

影片开场说明先提供材料、再确认学习需求的流程，随后呈现“AI 长篇回答读着枯燥、重点难找”的阅读需求，以及知识结构、圈画、学科表达、材料要求、沉浸离线与开始使用。64 秒、120 BPM、30 fps，横版 1920×1080，竖版 1080×1920。它采用纸面动效编排，不依赖操作录屏。

唯一内容源是 `src/product-story.ts`：八张真实笔记页，仍可以翻页、选字、圈画。正文、黑板、代码、关系图与 SVG 笔迹均来自生产阅读器。产品介绍也按真实行距自然续页，影片捕获全部续页，文案不再承诺所有内容挤进同一张纸。`tools/render-product-film.py` 负责原生纸页片段的进出、错位聚拢、镜头推进、学科接力、SVG 落笔与节拍对齐转场。横竖方向分别取对应阅读器布局，未另画一套仿笔记本界面。

`tools/compose-product-music.py` 生成原创配乐：FM 拨弦动机、和弦、切分低音、鼓组、踩镲，以及纸张与笔触音。新增电钢琴、马林巴、钢片琴与长笛短音：指令出现时点入高音木琴，公式和圈注配短铃音，星标与代码切换处增加轻巧回应。开场纸条的倾斜幅度控制在约 1 度内，避免遮住相邻文字。高音点缀通常持续 0.4–0.85 秒，按真实画面揭示时间编排。8 秒进入完整节奏，32 秒增加层次，40 秒减鼓并加入电钢琴短句，48 秒回归，60 秒收束。逐项时间、音高和对应动作记录在 `product-film-music.json` 的 `accentCues`。没有使用下载的音乐或循环素材。音乐为 CC0，第三方阅读器素材许可继续保留。

## 生成

需要 Node 20.19+、Python 3（Pillow、numpy）、Playwright/Chromium、sharp 和 FFmpeg。可设置 `PLAYWRIGHT_MODULE`、`SHARP_MODULE`、`FFMPEG` 指向已有安装。HTTP 服务应提供本项目，默认 `NOTEBOOK_BASE=http://127.0.0.1:5178/paper-notebook-kit/dist`。

```sh
npm run build
node --import tsx tools/build-product-story.mjs
node tools/capture-product-story.mjs
node tools/prepare-product-assets.mjs
python tools/compose-product-music.py
python tools/render-product-film.py --preview
python tools/render-product-film.py --preview --portrait
python tools/render-product-film.py
python tools/render-product-film.py --portrait
node tools/verify-product-film.mjs
npm run build
```

页面捕获需要本地 HTTP 服务。运行 `npm run preview -- --port 4173` 时，设置 `NOTEBOOK_BASE=http://127.0.0.1:4173`。`capture-product-story.mjs` 从正式 `/downloads/paper-notebook-product.html` 获取页面。已保留的 PNG/SVG 与几何源文件足以重建影片；不修改内容时可从 `prepare-product-assets.mjs` 开始。所有笔迹展开帧、无墨页面和未母带处理的音乐统一写入 `output/`，不参与网站发布。

捕获脚本从正式产品笔记加载页面并以 CSS 隐藏已有笔迹、保留笔迹数据，使用固定视口与 deviceScaleFactor=1，将纸页几何与截图在同一时刻记录。每个逻辑页的自然续页逐张检查后纵向合成素材，保留宽松排版与全部内容；几何及笔迹统一转换为合成图坐标。背景单独捕获无文字纸面，避免把正文当纹理重复。横竖 UI 分别呈现日间和夜间纸张。`prepare` 将 CSS 坐标转换为实际 PNG 像素后抽出原生 SVG，渲染笔迹揭示帧。影片可从保留的 PNG、SVG、几何 JSON 重建；高亮揭示帧输出到 `output/promo/story/`，可随时清除再生成。它们不会进入网站发布包。

## 交付文件

- `dist/downloads/paper-notebook-product.html/json/zip`：影片里的产品笔记。
- `public/promo/paper-notebook-film.mp4`、`paper-notebook-film-portrait.mp4`：两版成片；最终构建同步到 dist。
- `dist/downloads/paper-notebook-promo-source.zip`：分镜、真实纸页、原生笔迹与制作脚本的独立素材包。
- `examples/product-notebook.json`、`public/promo/product-film-script.json`、`docs/product-film-script.md`：笔记源数据与分镜。
- `public/promo/product-film-music.wav/mp3/json`：原创配乐与声明。
- `production/promo/story/`：从阅读器捕获的纸页 PNG、原生 SVG、页面几何和来源记录，是影片重建源。`output/promo/story/`：忽略发布的重建缓存，需时由 `prepare-product-assets.mjs` 生成。`public/promo/story/` 只保存视频封面构图。
- `docs/screenshots/product-film-*-contact.png`：逐段抽帧检查；`docs/verification/product-film-report.json`：视频完整解码、规格、音量与黑帧检测结果。

旧操作演示 `paper-notebook-demo*` 和对应脚本已移至工作区 `../archives/2026-10-23-cleanup/process-and-legacy.tar.gz`；当前源码和下载包只保留最终推广影片。

## 公开发布边界

这些制作规格、脚本、原始素材和检查结果供仓库开发使用。网站首页只提供一处影片播放，自动选择屏幕比例并保留旋转前的进度，不显示规格、章节按钮、方向开关、MP4 下载或源素材链接。`prepare-pages.mjs` 的发布白名单只包含页面实际使用的两张纸页主图、两张影片封面及两版成片；其余生产资源不进入 GitHub Pages。

## 网页播放优化

成片为横版 1280×720、竖版 720×1280，保留 30 fps 和 64 秒完整内容。H.264 CRF 26 / slow、峰值 1100 kb/s、2 秒关键帧、AAC 80 kb/s、MP4 fast-start；每版约 5.6 MB，比 2.3 的约 15 MB 再减少约 64%。仅当前方向的单个原生 video 预加载；切换方向时更新视频源并恢复进度与播放状态。浏览器自行管理媒体缓冲。

网站展示图使用 `tools/optimize-promo-images.py` 生成的 WebP。四张图从 7,637,055 字节降到 308,816 字节（约 96%），限制长边 1280px，保留原始 PNG 制作素材。只有这四张 WebP 进入部署。
