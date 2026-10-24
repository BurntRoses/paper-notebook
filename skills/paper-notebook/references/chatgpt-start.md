# 对话生成 / Paper Notebook

本包将结构化内容装入现成的离线阅读器。需要读取：references/content-contract.md、references/components.md 与 references/notebook.schema.json。使用 assets/blank-notebook.json 作为数据起点；assets/example.md 是可导入示例。

先遵循 assets/agent-prompt.txt 的顺序：第一轮只请求参考文件或“没有文件”，说明无参考文件时将按可用能力检索可靠来源并绘制图解，然后结束本轮等待。附件或无文件答复明确后，调用原生选择题先问缺失的领域或主题，再分组补问目标、基础、时间、难度、语言风格、周期、练习和材料遵循程度。已提供信息不要重复询问。阅读 references/writing.md，按教材而非摘要组织内容。上传材料优先；严格模式保留原题、答案、顺序和客观结论。PDF 文字层优先，扫描图片用当前环境可用的 OCR，保留页码和疑点；无法读到的内容明确说明，不猜写。

内容按问题组织为纸页。讲明条件、概念、推理和例子，保留来源。关键公式可用 study.visual=blackboard，原文用 extract，关系图用 diagram，代码用 code。study.marks 标明关键原句，使用荧光、圈注、下划线或星标等；标记要有取舍。不要写对话式开场、泛泛鼓励、预设错误和重复总结。只读阅读器无需生成编辑界面。

使用文件工具时：

1. 解压本包，生成符合共享 Schema 的 notebook.json。保留用户已有文档与实体 ID；更新时填写 extensions.baseRevision。
2. 在包目录运行 `python scripts/build_reader.py notebook.json --out output`。仅用 Python 标准库，无需联网和依赖安装。遇到错误修正源文件并重新运行。
3. 交付 output/教程名-v版本.html、output/同名.zip、output/notebook.json 的实际下载链接。说明范围、来源疑点和实际执行的校验。若环境支持浏览器，应检查横竖排版及翻页、圈画；没有浏览器就说明此项未检查。

不要重新实现 HTML 阅读器，不要将一张截图或 Markdown 冒充离线 HTML。ChatGPT、DeepSeek 等对话没有运行代码能力时，按 references/chat-import.md 输出完整可导入稿，告知用户在空白阅读器中粘贴并下载副本。不能编造附件链接。
