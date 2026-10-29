# 纸间 · Paper Notebook

AI 结构化教程的离线阅读器。Agent 按学习目标和材料整理内容，阅读器呈现概念、推理、公式、图示、练习和来源。

[在线体验](https://burntroses.github.io/paper-notebook/) · [生成笔记](https://burntroses.github.io/paper-notebook/chat-start.html) · [GitHub 源码](https://github.com/BurntRoses/paper-notebook)

**成品默认只有一个“教程名-v版本.html”，双击即可离线阅读。** 横屏默认一张横版纸，竖屏一张竖版纸，默认宽松康奈尔版式并带横线。正文、图文和 SVG 笔迹共用 PageSurface；双页为可选项。学习记录集中在侧栏，本机草稿自动保存。

默认使用常用字符字库，成书时再按内容筛选分片；生僻字由系统字体显示。机器学习示例约 2.01 MB，对话构建包约 2.9 MB，均无需安装完整字库。详见[体积优化与取舍](docs/size-optimization.md)。

2.2 版加入统一写作审阅规范、手绘配图尺寸与比例、稳定图片占位和标记历史优化。写作参考的固定版本、功能变化与实测结果见[升级记录](docs/upgrade-2.2.md)。网页端和编程智能体的入口提示词继续各用一句话。

## 生成入口

[仓库中的完整提示词目录](skills/paper-notebook/prompts/README.md)按工具能力区分两种环境；网页复制按钮与此目录自动同步。

**AI 执行入口：[制作规范](skills/paper-notebook/SKILL.md)。** 根据工具能力选择工作区构建或[对话文件交付](skills/paper-notebook/references/conversation-start.md)，按仓库规则完成材料确认、获取工具、校验和单 HTML 交付。

**必须复用本仓库阅读器，不得重新设计 HTML/CSS/JS 界面。** 示例中的纸张纹理、手写字体、康奈尔栏和翻页来自完整运行时，不能仅凭教材文字或 JSON 仿写。获取失败时保留内容，使用[预置回复](skills/paper-notebook/references/responses/download-unavailable.zh-CN.txt)给出构建包下载链接，请用户将 ZIP 原样上传，无需解压。交付前运行 `node tools/notebook.mjs verify <成品.html> --source notebook.json`（便携包使用 `node scripts/notebook.mjs`）；Python 环境可用包内 `scripts/verify_reader.py`。两条路径均核对原版阅读器与源数据。

- 编程智能体：打开 [生成入口](public/chat-start.html#agent)，点击“复制给编程智能体”，与材料一起发送。一句话提供仓库地址、任务和交付方式，执行细节由智能体从仓库读取。
- 对话模型：在[同一入口](public/chat-start.html#chat)点击“复制给对话模型”，提供材料或回复“没有文件”。AI 优先复用已有工具，否则自动下载对话构建包，用 Node 或 Python 构建并附上可下载的单文件离线 HTML。只有实际下载失败或下载受限时，才需要手动上传 ZIP；不支持文件交付时会明确说明。

通用委托示例：“请按 https://github.com/BurntRoses/paper-notebook 仓库内的指引，为我制作教材式学习笔记，并交付单文件离线 HTML。” AI 需要能访问仓库；能否直接生成 HTML 取决于当前环境是否提供文件与构建工具。

## 本地运行与安装

```sh
npm install
npm run build
npm run preview -- --port 4173
```

打开 `dist/promo.html` 预览产品首页，试读、影片和制作入口集中在这里。线上影片随屏幕比例自动适配；旧首页、示例入口和影片入口自动跳转到对应位置。

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

阅读器以 AI 生成的结构化教程为主：章节目录、搜索、概念、公式、图示、对照表、练习与来源共用一个渲染器。正文固定排版。选区旁的快捷栏支持九种圈画、便签、书签、疑问、展开讲解与举例；“重点”汇集原句摘录，“记录”保留个人圈画与历史学习数据。

右侧学习工作台提供独立便签、原文关联便签、页书签、文字书签与续学清单。书签同时显示在纸页和目录中；续学导出可选择便签、书签、疑问、标记和笔迹，生成下一轮 AI 提示及附带所选记录的 HTML。首次离线打开会显示功能引导，阅读设置中可再次查看。

电脑端支持左右方向键、空格与回车翻页，Shift + 空格返回上一页；填写批注和操作按钮时保留原有键盘行为。窗口放大后正文保持设置的字号，纸面重新分页以显示更多内容；阅读设置中的主动缩放单独生效。

生成教程默认自带少量作者圈点：AI 在源数据 `study.marks` 中选择关键术语、条件和结论，阅读器负责原生绘制。构建及交付校验会拒绝整本零标记的文字教程，并报告标记数量、类型和未标记页；仅用户明确要求纯净无圈画时使用 `--allow-unmarked`。作者标记随正文保留，个人圈画另存，不要求用户下载后再补齐默认样式。

页面可用黑板、摘录和手绘草图承载公式、定义与关系图；文学、理工、商学和代码页面有对应的轻量样式。生成前问答会记录目标、基础、语言风格、时间周期、材料遵循程度和 OCR 校正要求。翻页预设为仿真、覆盖、滑动和无动画；阅读器不加载自由布料模拟。旧版布局与便签数据继续保留，作为兼容内容显示与导出。

下载默认包含全部个人记录，可取消勾选生成公开副本。默认下载只保存 HTML；ZIP、JSON、Markdown 和当前页 PNG 收在“高级导出”。“导出 PDF”可选择 A4 横向或纵向，通过系统打印另存为 PDF；浅色排版、12pt 正文、12mm 留白，学习记录可选，文字标记重排，自由笔迹放在原页附录。本机草稿用于恢复，下载副本用于长期保存与转移设备。旧笔迹保留原始坐标，缺少原纸幅时在“记录”的待定位列表中手动关联。

`dist/downloads/` 保留离线文件与开发构建接口。公开网站采用单独白名单，只发布产品首页、制作入口、阅读器及页面使用的素材；制作脚本、分镜、源素材包和验证记录仅保留在仓库与开发构建中。

## 资料与许可

[首次使用](docs/first-use.md) · [协议](docs/content-contract.md) · [组件](docs/components.md) · [交付](docs/delivery.md) · [验证记录](docs/verification.md)

新增代码 MIT。Humanizer 与 Humanizer-zh 固定引用版本及 MIT 声明保留于 licenses/。现有材质与第三方资源继续保留来源。在线发布使用 GitHub Pages，部署目录与离线交付分开，见[托管说明](docs/hosting.md)。

备用构建包采用两层 ZIP，兼容浏览器自动解压：直接上传下载的 ZIP，或上传解压文件夹内的 `paper-notebook-conversation.zip`。AI 自动下载仍使用原始单层构建包。
