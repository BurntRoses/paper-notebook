# 通用提示词

按使用环境的工具能力选择，与具体模型或厂商无关。打开对应文件，复制全文，与材料一起发送即可。

| 使用环境 | 提示词 | 交付方式 |
| --- | --- | --- |
| 能访问仓库、编辑文件、运行命令的编程智能体 | [coding-agent.txt](coding-agent.txt) | 在工作区编辑、校验、构建，交付实际 HTML 文件 |
| 能执行代码、创建并附加文件的网页或应用对话 | [conversation-model.txt](conversation-model.txt) | AI 自动获取必要工具，构建并交付 HTML 附件；下载受限才需手动上传 ZIP |

网页对话直接发送短提示词和材料。AI 优先复用已有文件，否则自行获取[对话构建包](https://burntroses.github.io/paper-notebook/downloads/paper-notebook-conversation.zip)，实际下载失败或环境明确限制下载时，才请用户下载并上传 ZIP。不需要手动解压、安装 Skill 或重新填写已有需求。包内 Node 与 Python 两条构建路径在获取工具后均可离线执行。网页搜索能读取仓库文字，不等于完整运行时文件已保存到执行环境；应使用直接下载工具验证实际文件。

成品都是一个可离线打开的 HTML，内嵌阅读器、字体、素材、源数据与学习记录。不能创建并附加文件的对话环境应在需求问答前说明限制，不得用 Markdown、TXT 或聊天中的源码代替成品。

外部提示词各用一句话，只写仓库地址、任务和交付方式。下载地址、运行时、校验、回退和交付细节统一维护在 [Skill](../SKILL.md) 与 [对话流程](../references/conversation-start.md)，不需要用户手动拼接。网页复制按钮通过 `tools/sync-prompts.mjs` 从本目录同步，避免多份提示词各自漂移。
