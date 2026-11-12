# 页内学习交互

优先从学习活动选择组件。数理计算采用参数与曲线，算法或历史过程采用状态分步，诗文阅读采用原句与解释。每项交互应回答具体的知识问题，并与正文条件、术语、单位相符。只在有教学用途的位置使用。

## 参数计算 `plot`

```json
{"id":"growth-experiment","type":"exploration","title":"增长率与累计金额","exploration":{"kind":"plot","parameters":[{"id":"rate","label":"每期增长率","min":0,"max":15,"step":0.5,"value":5,"unit":"%"}],"domain":{"min":0,"max":20,"label":"期数"},"yLabel":"金额（元）","series":[{"label":"复利","expression":{"op":"mul","args":[100,{"op":"pow","args":[{"op":"add","args":[1,{"op":"div","args":["rate",100]}]},"x"]}]}}],"outputs":[{"label":"第 20 期末","unit":"元","digits":2,"expression":{"op":"mul","args":[100,{"op":"pow","args":[{"op":"add","args":[1,{"op":"div","args":["rate",100]}]},20]}]}}]}}
```

`x` 是横坐标。其余变量必须在 parameters 声明，ID 使用英文字母开头的字母数字或下划线。表达式仅为数值、变量名或运算树：add/mul/min/max 接受 1–8 个参数，sub/div/pow 恰好两个，ln/exp/abs 恰好一个。最多 16 层。曲线在固定横轴范围采样，output 独立声明需要读取的量。不得用输出标题代替计算公式。

可选 `observations:[{x,y,label?}]` 标出真实或教学观测点；注明数据来源和性质。观察点须落在横轴范围内。初始值和全部可调范围应符合模型，读数按 digits 显示，内部使用未舍入值。零除、对负数取对数、溢出等情况显示组件内错误，输入仍可修改。图表色彩配有图例和数值，读屏可读取曲线起止值与结果。

## 过程分步 `sequence`

`exploration:{kind:"sequence",frames:[{id,label,quote?,text,facts?:[{label,value}]}]}`。

每一步写明操作与状态变化；facts 展示变量、容器内容、阶段结果。至少 2 步，最多 12 步。控制只切换已编写的状态，用于演示算法、实验流程或事件先后。若需要真实计算，使用 plot 或阅读器已有的练习组件。代码在 quote 中按原样展示；解释放在 text。

## 原文批读 `reading`

采用相同 frames 结构，kind 改为 reading。label 使用段落、诗联或原句名称，quote 保留原文，text 写背景、用词、修辞与结构的分析。facts 可列出格律、术语或材料位置。准确引文与分析各在其对应字段。沿用 sourceRefs 记录出处。作者标记可锚定 frame 的原句与解释，原生搜索可定位到未打开的段落。

## 保存与静态阅读

参数或当前片段保存在 `userState.explorations[blockId]`，不修改教材正文。reset 恢复作者初始值；切换页、调整版式、下载后再打开均保留所选记录。导出时取消学习记录则恢复初始值。Markdown 的 notebook-block 保留完整声明。打印展开全部过程和批读片段，参数计算保留当前值、图像及结果。

Node 与 Python 入口使用同一 schema；Python helper 为 `authoring.exploration(title, activity, id=...)`。生成交互后按 quality-workflow.md 完成核算和实际操作。示例见 examples 中的数学、机器学习、文学、商学和编程文件。
