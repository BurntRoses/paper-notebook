# 第一次使用

打开 start.html 或 promo.html，先体验概念、公式、实践三类教程。

有 coding agent：下载工具包，交给 agent 阅读 AGENTS.md 与 Paper Notebook Skill。agent 集中询问目标、基础、时间、材料和练习偏好，然后生成 JSON 并构建 HTML。安装独立 Skill 后，直接说“我想学习机器学习，用 Paper Notebook 制作教程”。

使用 ChatGPT、DeepSeek 等文字对话：打开 chat-start.html，复制完整指令并提供主题和材料。收到完整笔记后，在空白阅读器中选“文件 → 导入”，粘贴、预览并确认，再下载 HTML。若对话提供 Python 和文件工具，可上传 paper-notebook-chat.zip，按包内 CHAT-START.md 直接构建附件。

阅读器顶部提供目录、阅读设置、导入和下载。目录含正文搜索、公式/图示/习题索引；记录区保存标记和历史问题；来源区列出参考材料。选中文字可添加荧光、圈注、波浪、框选、括注、勾记、星标或着重点。点击纸面上的已有标记可删除，重复同一标记不会叠加。

导入窗口提供“生成前问答”：集中填写学习目标、已有基础、语言风格、短期速览或长期课程、学习路线、参考材料遵循程度、术语和 OCR 校正要求。PDF 优先提取文字层；图片与扫描件使用当前环境可用的 OCR，保留页码、原文和疑点，将校正与术语表交给 Agent。题库或讲义选择严格遵循时，题目、答案和顺序保持原样。

阅读设置支持单页、双页、连续、纸张方向和翻页效果。左右方向可用页面边缘、横向触摸滑动或方向键；上下方向可用页缘与上下方向键。连续模式保留浏览器滚动。PageUp/PageDown、Home/End 也可导航。

本机草稿自动保存阅读位置和记录。需要带走时使用“下载”，选择是否包含个人记录。HTML 是独立文件，JSON 是供 agent 修订的源内容。更新正文时，agent 应保留 ID 与 baseRevision。

独立体验任务：导入一段材料 → 搜索一处概念 → 选择一句标记并提问 → 完成一道客观题 → 下载包含记录的 HTML → 断网打开并验证记录。

# Quick start

Use the toolkit or install the portable Skill, then ask your agent to create a tutorial. It asks about your goal, prior knowledge, time, materials and exercise choice. A chat-only model can output structured Markdown for import into the blank HTML reader.

Read with the contents/search sidebar, layouts, light text marks, questions and optional exercises. Local drafts restore your work; download a copy for long-term storage. Personal records are optional in exported copies. The generated HTML opens offline without a server.
