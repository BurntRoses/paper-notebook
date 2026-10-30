# 组件目录 / Component catalog

所有组件包含唯一 `id` 和 `type`，可选 `title`、`sourceRefs: [{sourceId,locator}]`、`verification`。文字均为纯文本。完整实例见 `examples/`；字段限制以 Schema 为准。

| type | 内容字段 | 用途 |
| --- | --- | --- |
| prose | text | 连续解释，避免拆成大量卡片 |
| concept | text, title? | 定义、条件、边界 |
| steps | items: [{id,text}] | 操作或推导顺序 |
| example | prompt, steps: [{id,text}], result | 有条件和过程的完整例子 |
| comparison | columns: string[], rows: string[][] | 相同维度的对照 |
| formula | latex, text? | 公式及变量/单位/条件说明 |
| code | text, language? | 保留缩进，只展示、不执行 |
| quote | text, attribution? | 可追踪原文或明确标为教学自拟的旁注 |
| callout | text, title?, tone? | 淡纸色底、铅笔边线与轻排线的补充条件或提醒；具体标题优先，正文空行分段 |
| checklist | items: [{id,text}] | 状态放 userState.checks |
| image | assetId, alt, caption? | assets 中的内嵌图片 |
| diagram | nodes: [{id,label,shape?}], edges: [{from,to,label?}] | 可导出 SVG 的关系与流程图 |
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

页面可设 `subject: stem|literature|business|code|general`。组件可带 `study: {visual, label?, aside?, tone?, marks?}`：`visual` 为 plain、blackboard、extract、sketch；`marks` 为 `[{text,kind,color?,seed?}]`，text 必须是组件实际文本的完整子串。kind 支持 highlight、underline、circle、wave、box、bracket、check、star、dots、bold、red。`bold` 加粗实际文字；`red` 配合 `color` 修改实际文字颜色（如蓝色 `#285f9e`、红色 `#b1483d`），与彩色圈画独立。黑板保留可选文字与原生公式，适合关键公式或结论；摘录承载引文、定义；草图承载关系。避免同一页大量重复视觉容器。

生成教程默认必须在每个讲解部分写入关键概念加粗、短语变色与少量作者圈画，而不是只提供圈画工具。按意义选择关键词、条件或已核验的结论；禁止整段装饰性圈画。作者标记存在正文 `study.marks`，个人操作存在 `userState.annotations`。构建报告的 `studyMarks` 提供数量、类型和未标记页；非空文字教程零标记或目标文字不存在时拒绝交付。仅用户明确要求无标记内容时使用 `--allow-unmarked`，空白阅读器不受此限制。

小型 diagram 可设 `arrangement: "row"`，最多四个节点横向排列；手机自动转为纵向，更复杂的关系使用默认分层排布。code 保留缩进，显示语言与复制按钮，语法颜色仅作用于文字，不执行程序。

需要解释代码或关键概念时，可用 `study.explanations: [{text, note}]`，最多三条。text 必须是实际正文的子串；阅读器从对应文字行尾引线至旁注，窄页将解释移至下方，保持原文和缩进。标记的星标、勾记位于文字右上角行间，框线留出文字四周空间。

## 教材组件与宽松纸页（2.1）

`study.role`: definition / intuition / derivation / example / evidence / takeaway / recall；用于区分知识点、推导、例题与回忆。`study.frame`: auto / plain / pencil / tape / double / margin。auto 按块 ID 稳定选样，不在翻页时重新随机。

`chart` 使用 chartType（scatter/line/bar）、xLabel、yLabel、series: [{id,label,points:[{x,y,label?}]}]，最多四系列。线图按提供顺序连接；教学示意与测量数据须明确区分。图标题、坐标、单位和数值必须与正文一致。

`comparison.align`: 与列对应的 left/center/right。表头与正文采用相同的列对齐：数值列居中，其他列左对齐，单元格垂直居中。

`keepTogether:true` 可用于重要完整块。默认就会将能在新页放下的块完整移到下一页；超高代码、公式、图、例题使用完整滚动框。仅超长正文、列表、表格会分页，表格保留表头。

Markdown 的 `notebook-page` 围栏可在 ### 后指定 {id, layout, subject, cues:[{id,text,blockId,anchor?}], summary}。默认 Cornell，宽图与长推导可选 reading。cues 引用本页实际块；可选 anchor 是正文原句短语，问题随所在片段续页、按原句位置对齐，点击可定位原文。图像问题引用对应图像块。summary 仅在该部分末张纸页显示，写有用结论，不放通用鼓励。


## 手绘配图与版式 / Figure layout

`image`、`diagram`、`chart` 共用可选 `figure`，旧笔记继续兼容。默认 `size: wide, ratio: auto, align: center, style: sketch`。

| 字段 | 值与行为 | 选择依据 |
| --- | --- | --- |
| size | small：48% 列宽、上限 360；medium：76%、上限 620；wide/full：100% | small 用于细节；medium 用于对象图；宽图用 reading 页。数值是纸面逻辑像素。full 表示当前内容列，不覆盖侧栏。 |
| ratio | auto / 1:1 / 4:3 / 3:2 / 16:9 / 3:4 | auto 使用 SVG/资产尺寸；固定比例预留完整图框，等比容纳内容，不裁切。 |
| align | left / center / right | 控制图框在内容列的位置；不环绕正文。 |
| style | sketch / precise | 原生框图默认叠加轻微铅笔描边；precise 使用单一精确轮廓。数据点和数值坐标始终准确。不会自动重绘上传图片。 |

窄屏 small 扩至 70%，medium 扩至 100%，避免标签过小。图注随图框排列。位图资产 `assets[]` 可选 `width`、`height`（实际正整数像素），SVG 应带 `viewBox`。图片未知尺寸且未指定比例时先按 4:3 稳定占位；生成时应补齐真实尺寸。照片、扫描图和插画需要 alt、来源与许可。手绘技术几何保持真实比例，生成模型的图中文字应改为独立可读标签。

分页会测量标题、图注、来源与外边距，将图像等比缩到可用高度；图注保持整列宽度。当前页空间不足时整图移到下一页。极长图注会作为可选文字续到下一张纸，完整图像保留在前页。此过程仅改变显示片段，不修改源数据。图框无需内部滚动；点击图像进入自适应屏幕高度的批注编辑器，可撤销、重做个人图上标记。

```json
{"id":"growth-plot","type":"chart","title":"同一初始值的两种增长","chartType":"line","figure":{"size":"wide","ratio":"3:2","style":"sketch"},"xLabel":"期数","yLabel":"期末值 / 元","series":[{"id":"compound","label":"复利 10%","points":[{"x":0,"y":100},{"x":1,"y":110},{"x":2,"y":121}]}],"caption":"教学数据；每期增长率恒定，期间无额外存取。"}
```

图像生成、压缩与审阅规则见 [multimodal.md](https://github.com/BurntRoses/paper-notebook/blob/main/skills/paper-notebook/references/multimodal.md)。写作规范及上游版本见 [writing-review.md](https://github.com/BurntRoses/paper-notebook/blob/main/skills/paper-notebook/references/writing-review.md)。

图上批注示例（坐标是图像视口的百分比）：

```json
{"figure":{"size":"wide","ratio":"3:2","annotations":[{"kind":"circle","x":30,"y":25,"x2":45,"y2":50},{"kind":"arrow","x":65,"y":20,"x2":46,"y2":36},{"kind":"text","x":55,"y":16,"text":"边界条件"}]}}
```

圈、箭头与文字解释具体位置，保持数据、刻度和原图标签可读。下载阅读器自带图像批注与新手教程，不需外部脚本或网络。
