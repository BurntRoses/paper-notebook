# 在线托管

项目通过 GitHub Pages 发布产品首页、制作入口、视频和离线阅读器。`main` 分支每次更新后，`.github/workflows/pages.yml` 执行模型测试、构建和自动部署。网站不需要服务器、数据库或模型 API 密钥。

网站：https://burntroses.github.io/paper-notebook/  
源码：https://github.com/BurntRoses/paper-notebook

| 路径 | 用途 |
| --- | --- |
| `/` | 产品介绍、演示、试读和制作指令；右上角菜单提供快捷入口 |
| `/#create` | 按文件工具能力区分的两条通用制作指令 |
| `/chat-start.html` | 兼容跳转到首页制作区域 |
| `/#read`、`/downloads/machine-learning.html` | 嵌入试读与完整机器学习示例 |
| `/downloads/paper-notebook-product.html` | 产品介绍笔记 |
| `/downloads/blank-notebook.html` | 导入 AI 输出、圈画并导出离线文件 |
| `/#film` | 自动适配屏幕比例的宣传片 |
| `/promo.html`、`/start.html`、`/promo-motion.html` | 兼容跳转到首页、试读和影片 |
| `/hosting.json` | 本次部署的源码版本与入口 |

这些路径均以网站地址为前缀；项目型 GitHub Pages 的前缀包含仓库名。页面采用相对路径，支持该部署方式。

## 发布与本地核验

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build:pages
pnpm exec vite preview --outDir output/site --host 127.0.0.1 --port 4173
```

浏览器打开 `http://localhost:4173/`。视频进度定位测试需支持 Range 的静态服务器。Vite 使用 SPA 回退，内部文件的正式 404 验收应在实际 Pages 或无回退的静态服务执行。部署目录为 `output/site/`，首页使用产品介绍；原始空白阅读器另存为 `reader.html`。`dist/` 中原有离线文件及 ZIP 构建接口不受影响。`prepare-pages.mjs` 使用明确白名单构建网站，禁止整体复制 dist：不发布 docs、分镜脚本、源 JSON、制作素材包、单独配乐、开发工具包或验证截图。公开导航不提供 MP4 下载、方向开关或制作资料入口；只有许可和 AI 运行所需的便携 Skill 保留对应资源。

部署后可运行 `NOTEBOOK_BASE=https://burntroses.github.io/paper-notebook pnpm test:hosting`，检查主要页面链接、复制指令、导入下载、影片自动适配和旧入口跳转，以及内部材料不可访问。浏览器测试需要可用的 Playwright；非标准安装位置可通过 `PLAYWRIGHT_MODULE` 指定。

在 GitHub 仓库 Settings → Pages 选择 GitHub Actions。首次部署完成后可从 Actions 的部署记录获取 HTTPS 地址。后续修改并推送到 `main` 即可重新发布。

## 实测范围

建议检查首页试读、横竖翻页、选字标记、通用指令复制、空白阅读器导入、HTML 下载后离线重开，以及宣传片播放、旋转时自动适配并保留进度。

AI 内容由用户选择的编程智能体或对话模型生成；需要文件工具的路径直接构建 HTML，需要对话附件能力的路径使用便携构建包。成品 HTML 下载后直接用浏览器打开，无需回到网站。个人记录保存在当前浏览器，跨设备使用需下载并转移个人副本。

影片在首页打开后即用 `preload=auto` 加载当前屏幕方向的一版，避免隐藏播放器争抢带宽。单播放器在横竖切换时恢复进度与暂停/播放状态。两版均为 720p / 30 fps、64 秒，使用 H.264 CRF 26、AAC 80 kb/s、2 秒关键帧和 MP4 fast-start；每版约 5.6 MB，合计约 11.2 MB。原生播放器可在首段数据到达后开始播放，不等待完整下载。加载失败时可原位重试。

首页展示图与影片封面采用 WebP（每张约 75–81 KB），原始 PNG 留作制作源，不进入网站部署。嵌入试读器在距离视口 180px 内才开始加载，首页其余资源优先提供给视频。预览图可通过 `python3 tools/optimize-promo-images.py` 从原始 PNG 重新生成。
