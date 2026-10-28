# 对话环境交付

对话模型的目标交付物是一个真正生成、可下载、离线打开的单文件 HTML。Markdown 只可作为用户提供的源材料，或通过阅读器导入已有笔记；它不是生成任务的最终回答。

项目有两条按工具能力区分的路径：

- 能操作仓库的编程智能体：使用 `skills/paper-notebook/SKILL.md`，在 checkout 中生成源数据、运行项目 CLI 并留下 HTML 产物。
- 能执行代码并创建附件的对话环境：直接发送提示词与材料。AI 复用已有工具或自行下载[便携对话包](https://burntroses.github.io/paper-notebook/downloads/paper-notebook-conversation.zip)，按包内 `START-HERE.md` 用 Node 或 Python 构建并附加实际 HTML。只有实际下载失败或明确禁止下载时，才请用户手动上传 ZIP。
- 不能创建或附加文件的对话环境：无法完成此交付，应说明当前限制，不要退化成 Markdown、TXT 或聊天中的 HTML 源码。

网页[生成入口](../public/chat-start.html)分别提供“编程智能体”和“对话模型”提示词。两者都保持简短；流程、教材质量、Schema、构建、验证和交付细节以仓库 Skill 或便携包内文档为准。

## 对话包内容

便携包包含单文件阅读器模板、JSON Schema、空白源数据、组件/内容规范、写作与 OCR 说明，以及捆绑的 Node CLI 与 Python 标准库构建器。完整流程在 [conversation-start.md](../skills/paper-notebook/references/conversation-start.md)。生成结束后，只需将实际构建的 HTML 作为可下载附件交付；JSON、ZIP 只在用户要求编辑或迁移时提供。

构建器会校验 Schema、ID、图示引用、素材和答案引用，并生成报告。报告中的浏览器检查默认为未执行；不得仅凭成功构建就声称离线浏览器检查已通过。

成品必须使用包内原版阅读器。Node 与 Python 构建器会检查阅读器外壳；交付前再用包内 `node scripts/notebook.mjs verify <成品.html> --source notebook.json` 或 `python scripts/verify_reader.py <成品.html> --source notebook.json` 核对原版界面与内嵌内容。下载失败时不得自行重写 HTML/CSS/JS，避免产物与示例风格脱节。编程智能体使用 [工作区流程](../skills/paper-notebook/references/workspace-start.md)，只需 Node，无需 Python 或对话附件工具。

## 自动准备与受限环境

`skills/paper-notebook/scripts/prepare_conversation.py` 自动下载并检查 ZIP 完整性、必要文件和解压路径，再用 Python 构建空白 HTML。已有上传包可用 `--archive /path/to/package.zip` 完成同样检查，全程不联网。已准备的工具可直接复用。

HTML 是文本文件，仓库中的规范和脚本也可以直接读取。交付时仍须获取完整阅读器及其内嵌资源并实际写出成品；不能将仓库源码 `index.html`、网页检索摘要或截断的 HTML 当作可用产物。下载能力、文件执行能力和附件交付能力应分别验证。手动上传 ZIP 是下载受限时的备用路径，不是所有对话环境的必经步骤。

获取失败时，直接输出 [预置下载回复](../skills/paper-notebook/references/responses/download-unavailable.zh-CN.txt)：提供可点击的官方构建包链接，请用户将 ZIP 原样上传，无需解压；收到后保留材料和已答问题继续。明确不支持文件生成或附件时，输出 [预置能力回复](../skills/paper-notebook/references/responses/file-delivery-unavailable.zh-CN.txt)。外部提示词无需重复这些内部规则。
