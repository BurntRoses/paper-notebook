# 纸间 · Paper Notebook

AI 结构化教程的离线阅读器。Agent 按学习目标和材料整理内容，阅读器呈现概念、推理、公式、图示、练习和来源。

[在线体验](https://burntroses.github.io/paper-notebook/) · [生成笔记](https://burntroses.github.io/paper-notebook/chat-start.html) · [GitHub 源码](https://github.com/BurntRoses/paper-notebook)

**成品是一份独立 HTML 笔记本。** 横屏默认一张横版纸，竖屏一张竖版纸，默认带横线。正文、图文和 SVG 笔迹共用 PageSurface；双页为可选项。学习记录集中在侧栏，本机草稿自动保存。

## 生成入口

- Coding agent：下载工具包或安装 Skill，提供材料，说“我想学习机器学习，用 Paper Notebook 制作教程”。生成前集中确认目标、基础、时间、材料及习题偏好，交付 HTML、JSON、ZIP。
- 支持文件与 Python 的对话：上传 `dist/downloads/paper-notebook-chat.zip` 和材料，按包内 `CHAT-START.md` 生成实际 HTML、JSON、ZIP。Python 构建器只依赖标准库。
- ChatGPT、DeepSeek 等文字对话：打开 [生成入口](public/chat-start.html)，复制通用指令，输出完整 Markdown/TXT。粘贴到空白阅读器，导入并下载离线 HTML。无需在聊天账号中安装 Skill。

## 本地运行与安装

```sh
npm install
npm run build
npm run preview -- --port 4173
```

打开 `dist/downloads/paper-notebook.html` 阅读结构化学习指南；`dist/downloads/paper-notebook-product.html` 用笔记介绍产品；`dist/promo-motion.html` 播放基于同一本笔记制作的 64 秒推介片，含横竖两版与原创配乐。

```sh
npm run install-skill
```

安装器生成完整便携 Skill，包含协议、组件、空白数据、阅读器及无需额外依赖的 CLI。Node 20.19+。旧 Skill 自动移入带时间戳的备份目录；可通过 CODEX_HOME 选择安装位置。无需注册 MCP 服务。是否显示原生问答控件取决于 agent 宿主能力。

## 生成教程

```sh
node tools/notebook.mjs validate examples/formula.json
node tools/notebook.mjs build examples/formula.json --out output/my-tutorial
node tools/notebook.mjs convert lesson.md --out notebook.json
node tools/writing-check.mjs notebook.json
```

源 JSON 采用稳定 ID。AI 更新保留 notebook.id，提供 extensions.baseRevision；导入时保留个人记录。正文、源数据、素材和用户状态分离。

## 阅读与交付

目录含搜索、结构索引、记录和来源。选字支持荧光、下划线、圈注、波浪、框选、括注、勾记、星标与着重点；点击已有标记可选中并删除，重叠范围会合并。阅读设置支持纸张方向、翻页方向、缩放、字号、夜间与减少动态。手机自动提高逻辑字号并重新分页；阅读位置按原内容偏移恢复。

阅读器以 AI 生成的结构化教程为主：章节目录、搜索、概念、公式、图示、对照表、练习与来源共用一个渲染器。正文固定排版，不提供文本框拖拽或双击改写。圈画工具收在页脚，选中文字时显示九种标记；“重点”汇集原句摘录，“记录”保留个人圈画与历史学习数据。

页面可用黑板、摘录和手绘草图承载公式、定义与关系图；文学、理工、商学和代码页面有对应的轻量样式。生成前问答会记录目标、基础、语言风格、时间周期、材料遵循程度和 OCR 校正要求。翻页预设为仿真、覆盖、滑动和无动画；阅读器不加载自由布料模拟。旧版布局与便签数据继续保留，作为兼容内容显示与导出。

下载默认包含全部个人记录，可取消勾选生成公开副本。格式为 HTML、JSON、ZIP、Markdown；浏览器打印可保存 PDF。本机草稿用于恢复，下载副本用于长期保存与转移设备。旧笔迹保留原始坐标，缺少原纸幅时在“记录”的待定位列表中手动关联。

`dist/downloads/` 含空白容器、三类主题示例、便携 Skill、通用对话使用包、产品笔记、工具包及离线合集。`public/promo/` 仅含发布使用的海报、影片、最终配乐和封面。八张原生纸页及坐标源位于 `production/promo/story/`；笔迹展开帧写入已忽略的 `output/`，不进入发布目录。旧录屏、旧编辑器、过程截图及历史输出已完整校验后收进工作区 `../archives/2026-10-23-cleanup/`，映射和哈希见 归档目录中的 `manifest.json`。

## 资料与许可

[首次使用](docs/first-use.md) · [协议](docs/content-contract.md) · [组件](docs/components.md) · [交付](docs/delivery.md) · [验证记录](docs/verification.md)

新增代码 MIT。Humanizer 与 Humanizer-zh 固定引用版本及 MIT 声明保留于 licenses/。现有材质与第三方资源继续保留来源。在线发布使用 GitHub Pages，部署目录与离线交付分开，见[托管说明](docs/hosting.md)。

## 工作区目录

最终成果入口见上一级 [成果索引](../README.md)。本项目只保留当前阅读器与可重建最终素材的源码；`production/promo/story/` 是影片页面源，`public/promo/` 是发布素材，`dist/` 是已构建的离线交付。`output/` 是可再生成的工作缓存；`node_modules/` 是保留的本机开发依赖。历史资产在上一级 `archives/`，不再混入源码与下载包。
