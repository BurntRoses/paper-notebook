# 在线托管

项目通过 GitHub Pages 发布静态介绍页、视频、阅读器、生成指令和下载包。`main` 分支每次更新后，`.github/workflows/pages.yml` 执行模型测试、构建和自动部署。网站不需要服务器、数据库或模型 API 密钥。

网站：https://burntroses.github.io/paper-notebook/  
源码：https://github.com/BurntRoses/paper-notebook

| 路径 | 用途 |
| --- | --- |
| `/` | 产品介绍，嵌入实际笔记阅读器 |
| `/chat-start.html` | Agent Skill、ChatGPT／DeepSeek 通用指令、空白阅读器入口 |
| `/downloads/paper-notebook.html` | 完整学习示例 |
| `/downloads/paper-notebook-product.html` | 产品介绍笔记 |
| `/downloads/blank-notebook.html` | 导入 AI 输出、圈画并导出离线文件 |
| `/promo-motion.html` | 横竖版宣传片 |
| `/hosting.json` | 本次部署的源码版本与入口 |

这些路径均以网站地址为前缀；项目型 GitHub Pages 的前缀包含仓库名。页面采用相对路径，支持该部署方式。

## 发布与本地核验

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build:pages
python3 -m http.server 4173 --directory output/site
```

浏览器打开 `http://localhost:4173/`。部署目录为 `output/site/`，首页使用产品介绍；原始空白阅读器另存为 `reader.html`。`dist/` 中原有离线文件及 ZIP 不受首页调整影响。

部署后可运行 `NOTEBOOK_BASE=https://burntroses.github.io/paper-notebook pnpm test:hosting`，检查主要页面链接、复制指令、导入下载、横竖视频与章节跳转。浏览器测试需要可用的 Playwright；非标准安装位置可通过 `PLAYWRIGHT_MODULE` 指定。

在 GitHub 仓库 Settings → Pages 选择 GitHub Actions。首次部署完成后可从 Actions 的部署记录获取 HTTPS 地址。后续修改并推送到 `main` 即可重新发布。

## 实测范围

建议检查首页试读、横竖翻页、选字标记、通用指令复制、空白阅读器导入、HTML 下载后离线重开，以及宣传片播放和横竖切换。

AI 内容由用户自己的 Agent 或 ChatGPT／DeepSeek 等对话生成；网站提供格式指令和浏览器中的导入、阅读与导出。个人记录保存在当前浏览器，跨设备使用需下载并转移个人副本。
