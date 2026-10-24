# 结构化学习阅读器验收 · 2026-10-24

当前入口为 `dist/downloads/paper-notebook.html`。正文固定排版，圈画工具位于页脚，学习记录位于侧栏；翻页使用仿真、覆盖、滑动和无动画预设。

## 构建与数据

TypeScript 检查、Vite 构建及离线发布构建通过。32 项模型测试通过，覆盖数据校验、稳定 ID、Markdown 往返、AI 更新基线、个人记录保留、Unicode 锚点、客观与主观题、内嵌素材、脚本转义、纸幅方向、旧笔迹迁移、笔迹比例、学科视觉和完整个人副本。

CLI 已对 `examples/paper-notebook.json` 运行 validate，结果为 7 个源页面、无警告；build 保留独立 HTML、源 JSON 和 ZIP 接口；面向学习者默认只交付一个自动命名的离线 HTML。便携 Skill 随发布重建，包含相同的阅读器、校验协议、OCR 工作流和 CLI。

## 浏览器与纸页

17 组集中浏览器验收通过，无页面脚本错误，结果见 [reader-report.json](verification/reader-report.json)。检查包括：

- 默认单张横线纸、固定正文、页脚工具，没有文本编辑或拖动手柄。
- 中英文与 emoji 长文自动续页；续页锚点在旋转、连续阅读和草稿重开后恢复。
- 短词与跨行荧光端点、确定性重绘、阅读缩放后的笔迹对齐。
- 选区标注、重复标记合并/切换、点击标记删除、撤销及跨页撤销。
- 快速连续跳转、四种翻页预设、页角取消与提交、减少动态模式。
- HTML 离线重开后再次导出，个人圈画、笔记和旧布局数据保留，未发起网络请求。
- 桌面 1440×1000、平板 1180×820 / 820×1180、手机 390×844 截图，无横向页面溢出。
- 长公式在纸内滚动查看，旧版宽度归一化笔迹保留原样并进入可见待定位列表。

[逐页布局报告](verification/page-layout.json) 检查横屏、竖屏与手机共 21 张物理纸页，正文高度均处于纸面正文区域内。手机提高逻辑字号，内容按实测高度重新分页。桌面、平板横竖屏与手机最终截图位于 `docs/screenshots/paper-*.png`。

[学科 UI 检查](verification/study-ui.json) 逐页检查星标位于文字右上行间、方框四周留白、代码文字与缩进不变、行旁解释数量及窄屏选择菜单边界。截图位于 `docs/screenshots/study/`。手机关系图采用纵向排列；关系图与数据图保留原生 SVG，文字使用几何精度渲染，避免纸页缩放后字形偏离节点。本轮体验检查进一步比较有无图表文字时的实际截图像素，覆盖深浅主题、四种视口、字体切换与阅读缩放，确认字形绘制位置与节点及坐标轴一致。

## 本轮阅读与交付验收

[体验报告](verification/experience-report.json) 覆盖深色纸张、侧栏、全书组件、弹窗和字体菜单；被测可见普通文字对比度达到 4.5:1。顶部按钮点击区域均为 44×44，SVG 均为 20×20，中心对齐；Logo 导航包含项目主页、AI 制作、GitHub Star 与许可，关闭后恢复焦点。

默认下载只触发一个“教程名-v版本.html”。实际下载后禁网重开，验证笔记、文字标记、作答和再次保存；ZIP、JSON、Markdown 和当前页 PNG 保留为高级导出。字库按正文 Unicode 分片瘦身，中文、生僻字、英文、数学符号与新增笔记使用手写、衬线、无衬线的系统回退链。原色图片保持原色。

机器学习示例的原生概念图、数据图、分步推导和案例在深浅主题下检查。手绘边框按稳定 ID 选择，黑板公式保持不透明背景；定义、推导、例题、证据和练习通过角色区分。表头居中，数值列默认居中，解释列左对齐。

实际通过 Chromium 生成 A4 纵向和横向 PDF，输出在 `output/pdf/machine-learning-A4-portrait.pdf`（12 页）与 `output/pdf/machine-learning-A4-landscape.pdf`（21 页）。独立浅色纸张使用 12pt 正文、四周至少 12mm 留白，等待字体和图像就绪后重新分页；核对源内容完整、纸张尺寸及正文边界。压力检查覆盖 60 行表格的重复表头、95 行代码逐行保留、18 步推导连续编号、宽公式、图片、学习记录及自由笔迹原页附录。Poppler 渲染检查全书联系表及代表页面，并核对图表横轴标题与图例的间距；完成或取消打印后恢复分页/连续阅读的位置、主题和缩放。

翻页检查覆盖键盘、横向/纵向拖拽、Escape 取消、双页快速反向、屏幕旋转及系统减少动态效果。完成后页码与正文一致，无残留动画。手机打印仍使用独立 A4 尺寸，不受窄屏阅读尺寸影响。

发布页面检查覆盖 30 个同站目标、两套完整生成指令的复制及剪贴板失败回退、文本导入和 HTML 下载、横竖视频与 Skill 包。结果见 [发布页面报告](verification/hosting-report.json)。提示在文件状态确认后才询问主题，首轮明确结束等待；两套路径均说明单 HTML 交付。

以下材料提取、推广片与历史布局报告保留各自记录日期，不代表本轮重新执行了 OCR 或视频制作。

## 材料与生成工作流

生成流程先请求参考文件或明确“没有文件”，说明无材料时会按可用能力检索可靠来源并原创图解，随后结束本轮等待。确认材料状态后，先以选择题补问领域或主题，再补齐目标、基础、难度、语言、表达风格、时间、短期速览/长期课程、练习及材料遵循程度；已提供的信息不重复询问。严格模式保留题目、答案、顺序与客观表述，原文疑点单列待核实。

[材料提取检查](verification/material-preparation.json) 实测一张纸页截图的 Apple Vision OCR、五页 PDF 文字层和 DOCX 正文提取。原始文本、来源指纹、页码/段落定位及不确定行均保留，校正字段独立。DOCX 不承诺恢复视觉页码；数学符号、单位和否定词仍须对照原件。示例中的 Python 函数执行输出为 2；缩进和包含引号内注释符号的文本往返不变。

## 推介片、产品笔记与对话生成

新增产品笔记使用同一 PageSurface，共八张源页，内容源为 `src/product-story.ts`。横竖共 16 张纸页检查无溢出，报告见 [product-pages.json](verification/product-pages.json)。上右圈注改为沿椭圆切线交错收笔，种子稳定，往返翻页形状不变。

主推广影片为 64 秒产品推介片：Skill 与对话生成入口 → 长篇 AI 回答的阅读负担 → 结构 → 圈画 → 学科 → 材料要求 → 沉浸离线 → 开始使用。画面取自真实笔记的正文、黑板、图示、代码和 SVG 笔迹，再作节拍纸页编排。两版规格为 1920×1080 / 1080×1920、30fps、H264/AAC，配原创 120 BPM 立体声配乐，新增电钢琴、马林巴、钢片琴和短长笛音色，对应指令、公式、圈注、星标、代码及保存等画面；中段减鼓后恢复。完整解码、黑帧、响度与峰值检查见 [product-film-report.json](verification/product-film-report.json)。逐段检查联系表：[横屏](screenshots/product-film-landscape-contact.png)、[竖屏](screenshots/product-film-portrait-contact.png)。制作命令与素材来源见 [promo-production.md](promo-production.md)。旧 48 秒操作视频保留为历史资产，推广主入口不再使用。

32 项模型/数据测试通过，包括完整回答外套 Markdown 围栏、文本导入示例与 Python 对话构建器测试。通用对话使用包经过真实解压、标准库构建、ZIP 完整性和正式校验器验证；生成的 HTML 以 file:// 离线打开，检查圈注、翻页和再次返回。通用指令内的完整示例从导入 UI 进入空白阅读器，实际下载 HTML 后断网重开，公式、例题和原生图示保留。复制按钮的离线回退、播放器 file:// 章节定位也通过。包验证命令为 `node tools/verify-chat-package.mjs`，结果见 [chat-package-report.json](verification/chat-package-report.json)。浏览器与播放器验收记录见 [product-delivery-report.json](verification/product-delivery-report.json)。测试未连接远程 ChatGPT 或 DeepSeek 账号，能力取决于对话环境是否提供文件/代码工具；无工具时交付完整导入稿。

原 14 张学科横竖海报继续来自实际页面，清单见 `public/promo/poster-manifest.json`；新推介片各段封面存放于 `public/promo/story/film-*-poster-*.png`。可复建纸页源图和几何数据位于 `production/promo/story/`，笔迹帧属于忽略发布的 `output/` 缓存。

## 复现与范围

```sh
npm test
npm run build
node tests/reader-browser.mjs
node tests/experience-browser.mjs
node tools/prepare-pages.mjs
node tests/hosting-browser.mjs
node tools/check-paper-layout.mjs
node tools/verify-product-film.mjs
node tools/verify-chat-package.mjs
node tests/product-delivery-browser.mjs
node tools/notebook.mjs validate examples/paper-notebook.json
node tools/notebook.mjs build examples/paper-notebook.json --out output/guide
```

浏览器脚本需 Playwright/Chromium，默认由本地静态服务提供 `dist/`。可设置 `PLAYWRIGHT_MODULE`、`NOTEBOOK_BASE`；视频检查需 ffmpeg，可设置 `FFMPEG`。原桌面及较早 reader-extra/media 测试属于历史记录，当前结论以上述报告为准。

检查使用本机 Chromium 和视口模拟，尚未完成真实 iPhone/iPad、Android、Safari、读屏软件、原生系统打印对话框或低内存设备验收。PDF 文件由 Chromium 实际输出，系统“另存为 PDF”界面的人工操作未执行。本次没有重新进行性能基准，未宣称原生设备帧率或陌生用户可用性结论。
