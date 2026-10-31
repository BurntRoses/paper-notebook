# 产品推介片与复现

影片开场说明先提供材料、再确认学习需求的流程，随后呈现“AI 长篇回答读着枯燥、重点难找”的阅读需求，以及知识结构、圈画、学科表达、材料要求、沉浸离线与开始使用。64 秒、120 BPM、30 fps，横版 1920×1080，竖版 1080×1920。它采用纸面动效编排，不依赖操作录屏。

分镜内容源是 `src/product-story.ts`：八张真实笔记页，仍可以翻页、选字、圈画。正文、黑板、代码、关系图与 SVG 笔迹均来自生产阅读器；完整界面镜头使用当前机器学习示例。产品介绍按真实行距自然续页，影片捕获全部续页。`tools/render-product-film.py` 负责原生纸页片段的进出、错位聚拢、镜头推进、学科接力、SVG 落笔与节拍对齐转场。横竖方向分别取对应阅读器布局。

`tools/compose-product-music.py` 生成原创配乐：FM 拨弦动机、和弦、切分低音、鼓组、踩镲，以及纸张与笔触音。新增电钢琴、马林巴、钢片琴与长笛短音：指令出现时点入高音木琴，公式和圈注配短铃音，星标与代码切换处增加轻巧回应。开场纸条的倾斜幅度控制在约 1 度内，避免遮住相邻文字。高音点缀通常持续 0.4–0.85 秒，按真实画面揭示时间编排。8 秒进入完整节奏，32 秒增加层次，40 秒减鼓并加入电钢琴短句，48 秒回归，60 秒收束。逐项时间、音高和对应动作记录在 `product-film-music.json` 的 `accentCues`。没有使用下载的音乐或循环素材。音乐为 CC0，第三方阅读器素材许可继续保留。

## 生成

需要 Node 20.19+、Python 3（Pillow、numpy、fonttools、brotli）、Playwright/Chromium、sharp 和 FFmpeg。可设置 `PLAYWRIGHT_MODULE`、`SHARP_MODULE`、`FFMPEG` 指向已有安装。HTTP 服务应提供本项目，默认 `NOTEBOOK_BASE=http://127.0.0.1:5178/paper-notebook-kit/dist`。

```sh
npm run build
node --import tsx tools/build-product-story.mjs
node tools/capture-product-story.mjs
node tools/prepare-product-assets.mjs
python tools/compose-product-music.py
python tools/build-film-titles.py
python tools/render-product-film.py --preview
python tools/render-product-film.py --preview --portrait
python tools/render-product-film.py
python tools/render-product-film.py --portrait
node tools/encode-film-low.mjs
node tools/verify-product-film.mjs
npm run build
```

页面捕获需要本地 HTTP 服务。运行 `npm run preview -- --port 4173` 时，设置 `NOTEBOOK_BASE=http://127.0.0.1:4173`。`capture-product-story.mjs` 从正式 `/downloads/paper-notebook-product.html` 获取页面。已保留的 PNG/SVG 与几何源文件足以重建影片；不修改内容时可从 `prepare-product-assets.mjs` 开始。不修改标题时可直接使用保留的 `production/promo/story/titles/*.svg`；重新生成字体轮廓需要完整工具包中的 `assets/fonts/reading/`。所有笔迹展开帧、无墨页面和未母带处理的音乐统一写入 `output/`，不参与网站发布。

捕获脚本从正式产品笔记加载页面并以 CSS 隐藏已有笔迹、保留笔迹数据，使用固定视口与 deviceScaleFactor=1，将纸页几何与截图在同一时刻记录。每个逻辑页的自然续页逐张检查后纵向合成素材，保留宽松排版与全部内容；几何及笔迹统一转换为合成图坐标。背景单独捕获无文字纸面，避免把正文当纹理重复。完整 UI 镜头从正式机器学习示例捕获：横版为日间左右双页，竖版为夜间上下双页，均展示右栏、底栏便条和图像批注工具。页面框线使用统一直线；便条通过阅读器实际操作添加，不写入示例源文件。捕获报告记录阅读器 SHA-256。`prepare` 将 CSS 坐标转换为实际 PNG 像素后抽出原生 SVG，渲染笔迹揭示帧。大标题使用 `build-film-titles.py` 从阅读器原字体提取字形轮廓，保存为不依赖字体加载的 SVG 路径。合成时由 sharp 在两倍影片宽度（3840 px）渲染，再缩至镜头所需尺寸，避免将约 34 px 高的截图文字放大至 100 px 以上。MP4 最终仍是像素帧；矢量源保证编码前的标题边缘清晰。影片可从保留的 PNG、SVG、几何 JSON 重建；高亮揭示帧输出到 `output/promo/story/`，可随时清除再生成。它们不会进入网站发布包。

## 交付文件

- `dist/downloads/paper-notebook-product.html/json/zip`：影片里的产品笔记。
- `public/promo/paper-notebook-film-1080.mp4`、`paper-notebook-film-portrait-1080.mp4`：原始尺寸的 1080p 成片；`paper-notebook-film.mp4`、`paper-notebook-film-portrait.mp4` 为 720p 版本，`*-low.mp4` 为 540p 版本。最终构建同步到 dist。
- `dist/downloads/paper-notebook-promo-source.zip`：分镜、真实纸页、原生笔迹与制作脚本的独立素材包。
- `examples/product-notebook.json`、`public/promo/product-film-script.json`、`docs/product-film-script.md`：笔记源数据与分镜。
- `public/promo/product-film-music.wav/mp3/json`：原创配乐与声明。
- `production/promo/story/`：从阅读器捕获的纸页 PNG、原生 SVG、页面几何和来源记录，是影片重建源。`output/promo/story/`：忽略发布的重建缓存，需时由 `prepare-product-assets.mjs` 生成。`public/promo/story/` 只保存视频封面构图。
- `docs/screenshots/product-film-*-contact.png`：逐段抽帧检查；`docs/verification/product-film-report.json`：视频完整解码、规格、音量与黑帧检测结果。

旧操作演示 `paper-notebook-demo*` 和对应脚本已移至工作区 `../archives/2026-10-23-cleanup/process-and-legacy.tar.gz`；当前源码和下载包只保留最终推广影片。

## 公开发布边界

网站首页提供一处影片播放，自动选择屏幕比例并保留旋转前的进度。清晰度菜单位于播放器控制栏，提供自动、1080p、720p、540p，全屏时也可使用。`prepare-pages.mjs` 的媒体白名单包含当前界面的两张主图、两张影片封面与六个视频文件；制作脚本、配乐和源素材不进入 GitHub Pages。

## 网页播放优化

1080p 从原始纸页场景重新渲染为横版 1920×1080、竖版 1080×1920，使用 H.264 CRF 18 / slow、峰值 6000 kb/s、AAC 96 kb/s，横竖版各约 32 MB。`encode-film-low.mjs` 直接从更新后的 1080p 母版生成其余档位：720p 为横版 1280×720、竖版 720×1280，CRF 20 / slow、峰值 2200 kb/s，每版约 12 MB。所有版本均为 30 fps、64 秒、2 秒关键帧、MP4 fast-start。540p 同样直接从 1080p 母版生成横版 960×540、竖版 540×960 的流畅版本：CRF 24 / medium、峰值 480 kb/s，每版约 4.1 MB。

进入页面即预加载当前方向的视频，默认自动，菜单显示当前档位。自动模式优先 1080p；已知弱网和节省流量模式使用 540p。初次预加载超过 5 秒仍无画面，或播放持续缓冲 2.5 秒时，按 1080p → 720p → 540p 回退。手动选择清晰度后，屏幕旋转、网络变化与重试均保持选择。

自动模式使用 540p 时，网络改善且缓冲至少 10 秒后，以低优先级下载 1080p。完整下载后通过本地 Blob 切换，保留进度与播放状态，并用当前帧过渡。速度不足或播放余量不足时取消后台下载。旋转屏幕时取消旧方向的下载，已下载的高清可复用；播放器始终使用同一个 video 元素。

首页主图来自 `production/promo/story/ui-landscape.png` 与 `ui-portrait.png`，展示当前右侧批注、底栏与双页界面，导出为 JPEG；影片封面使用 WebP。发布 URL 带版本号，避免浏览器继续使用旧图。

## 在线试读

首页只加载一次包含完整字体的 `preview-reader.html`。切换学科时按需获取 `previews/*.json`，复用当前阅读器，鼠标停留或聚焦按钮时提前请求对应数据。切换保留各示例的本次批注与作答，并从第一页打开；独立下载仍为包含字体和素材的单文件 HTML。Chromium、WebKit 测试覆盖全部六个示例、快速切换、主题、教程与离线导出。
