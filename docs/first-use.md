# 第一次使用

打开 start.html 或 promo.html，先体验概念、公式、实践三类教程。

使用编程智能体：打开 chat-start.html，点击“复制给编程智能体”，发送指令和材料。智能体在仓库里读取 Skill、确认材料与缺失需求，使用项目 CLI 校验并构建单文件 HTML，留在工作区供你打开。

使用对话模型：在同一页点击“复制给对话模型”，发送参考材料和指令即可。AI 优先复用已有工具，否则自动下载对话构建包，使用 Node 或 Python 校验构建，交付可下载的单文件 HTML。只有实际下载失败或环境明确限制下载时，才需要手动上传备用 ZIP。无法创建或附加文件的环境必须说明限制，不以 Markdown/TXT 代替成品。

阅读器顶部提供目录、日夜模式、阅读设置和文件夹图标；文件菜单包含导入、下载和导出 PDF。点击 Logo 可打开项目介绍、AI 制作入口与 GitHub 导航，关闭后继续阅读。目录含正文搜索、公式/图示/习题索引；记录区保存标记和历史问题；来源区列出参考材料。选中文字可添加荧光、圈注、波浪、框选、括注、勾记、星标或着重点。点击纸面上的已有标记可删除，重复同一标记不会叠加。

导入窗口提供“生成前问答”：先按使用平台选择对话附件或编程工作区，再填写学习目标、已有基础、语言风格、短期速览或长期课程、学习路线、参考材料遵循程度、术语和 OCR 校正要求。复制的提示词会保留已填答案，只补问缺项。PDF 优先提取文字层；图片与扫描件使用当前环境可用的 OCR，保留页码、原文和疑点，将校正与术语表交给 AI。题库或讲义选择严格遵循时，题目、答案和顺序保持原样。

阅读设置支持单页、双页、连续、纸张方向和翻页效果。左右方向可用页面边缘、横向触摸滑动或方向键；上下方向可用页缘与上下方向键。连续模式保留浏览器滚动。PageUp/PageDown、Home/End 也可导航。

本机草稿自动保存阅读位置和记录。需要带走时使用“下载离线 HTML”，选择是否包含个人记录。字体、素材和源数据均内嵌；ZIP、JSON、Markdown 与当前页图片位于“高级导出”。更新正文时，agent 应保留 ID 与 baseRevision。

需要 PDF 时，打开“文件 → 导出 PDF”，选择 A4 纵向或横向及学习记录选项，再点击“打开系统打印”并选择“另存为 PDF”。纸页会以浅色重新排版；自由笔迹放在原页附录，完成或取消后回到原阅读位置。

独立体验任务：导入一段材料 → 搜索一处概念 → 选择一句标记并提问 → 完成一道客观题 → 下载包含记录的 HTML → 断网打开并验证记录。

# Quick start

Open chat-start.html and choose a prompt by available tools. A coding agent edits the repository and builds the HTML artifact. A conversation model with file attachment capability uses the portable conversation package and returns a downloadable HTML. Text-only output is not a substitute for the requested file.

Read with the contents/search sidebar, layouts, light text marks, questions and optional exercises. Local drafts restore your work; download a copy for long-term storage. Personal records are optional in exported copies. The generated HTML opens offline without a server.
