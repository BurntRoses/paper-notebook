# 用 Agent、ChatGPT 或 DeepSeek 生成笔记

支持 Skill 的 Agent 可调用 Paper Notebook 构建文件；提供文件/代码工具的对话环境可用 Python 构建器；ChatGPT、DeepSeek 等纯文字对话可输出完整导入稿，粘贴到空白阅读器后下载 HTML。是否能直接生成附件取决于宿主工具，不能仅根据模型名称判断。

打开 `chat-start.html`，点击“复制给 Agent”或“复制给网页端模型”，把完整指令与主题和材料一起发送。Agent 指令包含公开仓库、Skill 和运行资源地址，由 Agent 自行读取并构建文件；网页端指令自带完整导入格式，生成后复制到空白阅读器即可使用。`assets/chat-prompt.txt` 与网页端复制内容保持一致。DeepSeek 普通对话无需 API 密钥；导入时会校验结构，原材料疑点仍须核实。

## 有文件和 Python 工具的对话环境

优先使用生成入口的 Agent 指令，让模型自行获取运行资源。对于已提供 `paper-notebook-chat.zip` 的文件环境，也可与讲义、题库等材料一同使用，在对话中发送：

> 请读取压缩包中的 CHAT-START.md，用 Paper Notebook 为我制作学习笔记。先集中确认尚不明确的学习目标、基础、时间、语言风格、难度、短期速览或长期课程、练习需求，以及对参考材料的遵循程度。已经给出的信息不要重复询问。严格材料模式保留原题、答案和顺序。PDF 优先提取文字层，扫描件使用 OCR，保留页码、不确定内容与校正记录。请使用包内共享阅读器，实际生成并交付 index.html、notebook.json、notebook.zip 的下载链接。

包内有单文件阅读器、结构协议、组件说明、空白源文件、完整示例，以及仅依赖 Python 标准库的构建器。Python 环境解压后，在包目录运行：

```sh
python scripts/build_reader.py notebook.json --out output
```

支持 Node 的 Agent 优先用 Skill 内的 `scripts/notebook.mjs validate/build`。Python 构建器检查共享 Schema 和核心 ID、图示、资源及答案引用；阅读器打开时仍会执行完整校验与兼容处理。构建报告单独记录是否做过浏览器检查。没有运行工具的对话不能声称已经构建或提供不存在的附件。

## 纯文字对话：完整导入稿

把下面的提示与材料发给聊天模型。将完整结果保存为 `.md` / `.txt`，或直接复制到 `blank-notebook.html` 的“导入”。预览章节、页数和组件后确认，随后下载 HTML 副本。

> 请为 Paper Notebook 输出一份完整可导入的结构化学习笔记。集中确认尚不明确的目标、基础、学习时间、语言和表达风格、难度、短期速览或长期课程、练习需求，以及材料遵循程度。严格模式保留材料原题、答案、顺序与客观内容，补充解释另列；疑似原文错误标为待核实。扫描件或图片按当前能力识别，无法辨认的内容保留疑点，不能猜写。
>
> 输出格式：`# 教程名`、`## 章节名`、`### 纸页标题`。每页围绕一个连贯问题组织条件、解释、推导、例子和来源。普通段落可直接写；特殊组件使用下面示例的 notebook-block JSON 围栏。每块使用唯一且稳定的 id。黑板适合关键公式，摘录紧邻原文解释，代码保留缩进，图示表达实际关系，圈画仅标真正的关键词。练习只在需要时提供。语言直接自然，不写对话式开场、空泛鼓励、预设错误或重复总结。输出完整内容，不用省略号替代正文，不在全文外再套一层代码围栏。当前只有文字能力时，交付完整导入稿，不能声称已生成 HTML 或下载附件。

下面是可直接导入的完整示例（围栏使用普通三反引号）：

````markdown
# 复利：每一期的增长基础
## 恒定增长率
### 从一期到两期
期间无额外存取，每期增长率保持 10%。初始金额为 100 元。

```notebook-block
{"id":"growth-rule","type":"prose","text":"每期的期末金额，成为下一期的增长基础。","study":{"marks":[{"kind":"circle","text":"下一期的增长基础"}]}}
```

```notebook-block
{"id":"growth-formula","type":"formula","latex":"P_n=P_0(1+r)^n","text":"P₀ 是初始金额，r 是每期增长率，n 是期数。","study":{"visual":"blackboard"}}
```

```notebook-block
{"id":"growth-worked","type":"example","title":"两期后有多少？","prompt":"初始 100 元，每期增长 10%，计算两期期末金额。","steps":[{"id":"growth-step-1","text":"第一期期末：100 × 1.1 = 110 元。"},{"id":"growth-step-2","text":"第二期期末：110 × 1.1 = 121 元。"}],"result":"累计增长：121 − 100 = 21 元。"}
```

### 从金额看递推关系
```notebook-block
{"id":"growth-diagram","type":"diagram","nodes":[{"id":"g0","label":"100 元"},{"id":"g1","label":"110 元"},{"id":"g2","label":"121 元"}],"edges":[{"from":"g0","to":"g1","label":"× 1.1"},{"from":"g1","to":"g2","label":"× 1.1"}],"caption":"每一期都以前一期的期末金额为基础。"}
```
````

普通列表、表格、引用、代码会转换为对应组件。图片链接会保留为文字并提示位置；离线图片需要 JSON 的 assets 内嵌资源。完整字段见 [组件说明](components.md)。更新已有笔记时，优先提供源 JSON 或从阅读器导出的 Markdown，以保留页面 ID、标注与个人记录；不要凭标题重新猜测旧 ID。

## DeepSeek 接入与验证范围

DeepSeek 官方提供 [聊天 API](https://api-docs.deepseek.com/) 与 [JSON 输出](https://api-docs.deepseek.com/guides/json_mode/)；本项目的普通对话路径只要求模型输出完整文字，未使用厂商专属调用。API 开发者也可提交完整 notebook JSON，但仍须本地 Schema 校验，不能将 JSON 语法有效等同于笔记协议有效。

工具包可运行 `node tools/verify-chat-package.mjs` 检查使用包解压、Python 构建、源数据、HTML/ZIP 与共享校验器。

本地验收覆盖通用指令示例、完整回答外套 Markdown 围栏、阅读器导入及 HTML 离线导出。未登录远程 ChatGPT/DeepSeek 账号实测，也未调用付费 API；不要将这些本地测试描述为厂商账号端验收。
