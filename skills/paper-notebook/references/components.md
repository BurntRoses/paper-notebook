# 组件目录 / Component catalog

所有组件包含唯一 `id` 和 `type`，可选 `title`、`sourceRefs: [{sourceId,locator}]`、`verification`。文字均为纯文本。完整实例见 `examples/`；字段限制以 Schema 为准。

| type | 内容字段 | 用途 |
| --- | --- | --- |
| prose | text | 连续解释，避免拆成大量卡片 |
| concept | text, title? | 定义、条件、边界 |
| steps | items: [{id,text}] | 操作或推导顺序 |
| example | prompt, steps: [{id,text}], result | 有条件和过程的完整例子 |
| comparison | columns: string[], rows: string[][] | 相同维度的对照 |
| formula | latex, text?, parameters?: [{symbol,name,description}] | 主公式、逐行符号解释、适用条件 |
| code | text, language? | 保留缩进，只展示、不执行 |
| quote | text, attribution? | 可追踪原文或明确标为教学自拟的旁注 |
| callout | text, tone? | 注意事项、待核实点 |
| checklist | items: [{id,text}] | 状态放 userState.checks |
| image | assetId, alt, caption? | assets 中的内嵌图片 |
| diagram | nodes: [{id,label}], edges: [{from,to,label?}] | 可导出 SVG 的关系与流程图 |
| exercise | question, questionType, 下述字段 | 独立作答与解析 |

练习的 `questionType`：single/multiple/truefalse 使用 `options: [{id,text}]` 和 `solution: [optionId]`；matching 使用 `pairs: [{id,left,right}]`；subjective 只给参考 `explanation`，不自动判分。可选 `points` 与 `explanation`。作答仅放 `userState.answers`，提交后比较选项集合或匹配映射，重做可再次编辑。

```json
{"id":"exercise-1","type":"exercise","questionType":"single","question":"A、A、B 涉及几位顾客？","options":[{"id":"q-a","text":"2"},{"id":"q-b","text":"3"}],"solution":["q-a"],"explanation":"不同编号是 A、B。","points":1}
```

```json
{"id":"diagram-1","type":"diagram","nodes":[{"id":"a","label":"材料"},{"id":"b","label":"核对"},{"id":"c","label":"解释"}],"edges":[{"from":"a","to":"b"},{"from":"b","to":"c"}]}
```

页面布局为 reading、cornell、grid、exam。布局不改变组件语义；手机重排后仍保留原 ID。每页围绕一个主要问题组织，内容长时合理拆页。

## 学科呈现与重点

页面可设 `subject: stem|literature|business|code|general`。组件可带 `study: {visual, label?, aside?, tone?, marks?}`：`visual` 为 plain、blackboard、extract、sketch；`marks` 为 `[{text,kind,color?,seed?}]`，text 必须是组件实际文本的完整子串。kind 支持 highlight、underline、circle、wave、box、bracket、check、star、dots。黑板保留可选文字与原生公式，适合关键公式或结论；摘录承载引文、定义；草图承载关系。避免同一页大量重复视觉容器。

小型 diagram 可设 `arrangement: "row"`，最多四个节点横向排列；手机自动转为纵向，更复杂的关系使用默认分层排布。code 保留缩进，显示语言与复制按钮，语法颜色仅作用于文字，不执行程序。

需要解释代码或关键概念时，可用 `study.explanations: [{text, note}]`，最多三条。text 必须是实际正文的子串；阅读器从对应文字行尾引线至旁注，窄页将解释移至下方，保持原文和缩进。标记的星标、勾记位于文字右上角行间，框线留出文字四周空间。

公式的 `parameters` 每项独占一行：`symbol` 使用 LaTeX，`name` 是简短名称，`description` 解释含义、单位、变化影响或具体代入。`text` 补充整体条件，不重复堆叠符号释义。长列表按完整条目续页，主公式在续页重复；旧版只有 `latex/text` 的内容仍可导入。函数配实际坐标图、计算路径或数值对照，图文数值保持一致。不要用空格或手写横线模拟版面。
