# 对话环境交付

对话模型的目标交付物是一个真正生成、可下载、离线打开的单文件 HTML。Markdown 只可作为用户提供的源材料，或通过阅读器导入已有笔记；它不是生成任务的最终回答。

项目有两条按工具能力区分的路径：

- 能操作仓库的编程智能体：使用 `skills/paper-notebook/SKILL.md`，在 checkout 中生成源数据、运行项目 CLI 并留下 HTML 产物。
- 能创建附件的对话环境：下载[便携对话包](https://burntroses.github.io/paper-notebook/downloads/paper-notebook-conversation.zip)，将 ZIP 上传到对话，按包内 `START-HERE.md` 用 Node 或 Python 构建器生成 HTML，并附加实际文件。
- 不能创建或附加文件的对话环境：无法完成此交付，应说明当前限制，不要退化成 Markdown、TXT 或聊天中的 HTML 源码。

网页[生成入口](../public/chat-start.html)分别提供“编程智能体”和“对话模型”提示词。两者都保持简短；流程、教材质量、Schema、构建、验证和交付细节以仓库 Skill 或便携包内文档为准。

## 对话包内容

便携包包含单文件阅读器模板、JSON Schema、空白源数据、组件/内容规范、写作与 OCR 说明，以及捆绑的 Node CLI 与 Python 标准库构建器。完整流程在 [conversation-start.md](../skills/paper-notebook/references/conversation-start.md)。生成结束后，只需将实际构建的 HTML 作为可下载附件交付；JSON、ZIP 只在用户要求编辑或迁移时提供。

构建器会校验 Schema、ID、图示引用、素材和答案引用，并生成报告。报告中的浏览器检查默认为未执行；不得仅凭成功构建就声称离线浏览器检查已通过。
