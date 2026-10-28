# 通用提示词

按使用环境的工具能力选择，与具体模型或厂商无关。打开对应文件，复制全文，与材料一起发送即可。

| 使用环境 | 提示词 | 交付方式 |
| --- | --- | --- |
| 能访问仓库、编辑文件、运行命令的编程智能体 | [coding-agent.txt](coding-agent.txt) | 在工作区编辑、校验、构建，交付实际 HTML 文件 |
| 能执行代码、创建并附加文件的网页或应用对话 | [conversation-model.txt](conversation-model.txt) | 使用便携包构建，交付可下载的 HTML 附件 |

成品都是一个可离线打开的 HTML，内嵌阅读器、字体、素材、源数据与学习记录。不能创建并附加文件的对话环境应在需求问答前说明限制，不得用 Markdown、TXT 或聊天中的源码代替成品。

外部提示词只写项目入口、任务和交付方式。详细规则维护在 [Skill](../SKILL.md) 与 [对话流程](../references/conversation-start.md)，不需要用户手动拼接。网页复制按钮通过 `tools/sync-prompts.mjs` 从本目录同步，避免多份提示词各自漂移。
