# 内容协议 1.0 · Reader 2.0

机器规范为 `schemas/notebook.schema.json`，接口为 `src/model/types.ts`。Notebook → Chapter → Page → Block 使用稳定 ID。内容采用结构化数据，正文不执行 HTML、CSS 或脚本。所有图片采用内嵌 data URL，离线文件无外部运行时依赖。

根字段：`schemaVersion: "1.0.0"`、`notebook`、`userState`、`assets`、`extensions`。从 `examples/blank-notebook.json` 开始。便携 Skill 对应 `assets/blank-notebook.json`。

`notebook` 包含 id、递增 revision、标题、语言、目标、来源及章节。每章至少一页，每页可为空。`userState` 独立保存标记、疑问、作答及兼容旧记录；正文不混入个人数据。

## 纸页与呈现

Page 常用 `layout: reading | cornell | grid | exam`，`free` 仅用于兼容已生成的固定构图。阅读器不提供对象拖拽、文本框编辑或自由物理翻页。Cornell 可带 `cues: [{id,text,blockId?}]` 与 `summary`；cue 的 blockId 必须引用同页正文。逻辑纸幅横版 1120×792、竖版 792×1120，等比显示。普通内容自动续页，复用原页面、块 ID 与 UTF-16 文字偏移；不可分技术对象放在可滚动视口内。

`paper: {ruling: lined|grid|dots|blank, lineHeight}` 控制底纹与行距；默认横线。`Page.subject` 可为 `general|stem|literature|business|code`，只影响合适的视觉细节，不改变内容语义。Block 可带 `study: {visual: plain|blackboard|extract|sketch, label?, aside?, tone?, marks[]}`；黑板适合公式或关键结论，摘录适合定义和引文，手绘草图适合小型关系图，文字仍可选择和导出。`placements[landscape|portrait][blockId]` 保存作者排版；`userState.layouts[pageId][shape][blockId]` 保存个人调整并优先显示。对象 frame 为 `{x,y,width,height?,z,sheet?}`，坐标使用逻辑纸幅像素。正文布局和纸张底纹分别设置。

`extensions.readerProfile`：layout 为 auto/single/spread/scroll；direction 为 horizontal/vertical；sidebar 为 open/collapsed；pageShape 为 auto/portrait/landscape；transition 为 turn（仿真）/cover（覆盖）/slide（滑动）/none（无动画），兼容旧 fade；theme 为 paper-light/paper-night；motion 为 full/reduced。窄屏将双页降为单页，系统减少动态优先。

`userState.readingAnchor` 保存 `{pageId,blockId?,offset,sheet?,textOffset?}`。`sheet` 区分物理续页，`textOffset` 记录该片段在原块中的 UTF-16 起点；窗口旋转与重新分页优先按原文字偏移定位，再回退至续页或源页。旧文件只带 pageId/offset 时仍可恢复。

可选 `study.explanations: [{text,note}]` 将正文中的关键概念或代码表达式连接到简短解释，最多三条；text 必须出现在实际文本中。引线从所在行尾经过空白区域抵达解释，竖版解释移至下方。代码语法着色保留原文和 UTF-16 锚点，不执行代码。

## ID、更新与文本锚点

ID 采用字母、数字、下划线、连字符、点或冒号，在文档内唯一。diagram.nodes 的 ID 是组件局部 ID。复制块时更换条目与选项 ID，并同步答案。AI 更新保留 notebook.id 和原实体 ID，提供 `extensions.baseRevision`。基线不符时拒绝覆盖。更新保留活动文档的个人记录。

`textOf` 的投影：先取 text/question/prompt/latex 中首个非空值，再取 items/steps，最后取 result；比较表按 columns、rows 展开；非空片段之间一个换行。标题不参与。偏移使用 JavaScript UTF-16，边界不得切开代理对。

Selector 保存 blockId、start/end、exact、prefix/suffix。先尝试原偏移，再按原句与上下文匹配。多个候选标为 ambiguous；原文消失标为 orphaned。阅读器在记录区提示待关联，不猜测位置。荧光、下划线、圈注、波浪、方框、括注、勾记、星标和着重点使用实际 Range 矩形生成确定性 SVG。同类型重叠范围合并，重复标记切换显示；点击现有标记可删除。作者标记的隐藏 ID 写入 `userState.dismissedStudyMarks`，不修改正文；公开副本恢复作者标记。

自由笔 `coordinateSpace: normalized-page` 表示 x/纸宽、y/纸高，`sourceSize` 保存落笔纸幅。独立笔迹等比保留，`attachedBlockId + blockFrame` 使笔迹随对象变换。`sheet` 指续页序号。旧笔迹两轴均按纸宽归一化，迁移为 `legacy-width` 并复制 `originalPoints`；缺少历史纸幅时标为 `needs-placement`，在可见列表中重新定位。便签 `positions[shape]` 保存横竖排版。

## 媒体、来源与边界

assets: id/name/data/mime，可附 source/license/originalAssetId/verified。支持内嵌 PNG/JPEG/WebP/GIF/AVIF/SVG。图像衍生关系保留原始资源 ID。技术图以结构化几何、数值和独立文字为准。

导入上限 50 MB；500 页、5000 块为保护上限。图片不得依赖远程地址。未知块保留原对象并显示原始内容。校验在副本上进行，失败保留活动文档；错误显示字段路径。

## 答疑册

疑问任务包含原教程 ID/版本、原句、上下文、问题、页 ID 和块 ID。答疑册设置 `notebook.parent: {notebookId,pageId?}`；`extensions.doubtLinks: [{doubtId,pageId}]` 将原疑问与答疑页对应。HTML 独立保存，导入原教程或答疑册进行切换；文件访问受浏览器权限限制，不承诺自动寻找磁盘文件。

## 保存与分享

无账号。本机 IndexedDB 保存草稿，重开相同笔记时恢复较新记录。导出默认包含全部个人记录（圈画、自由笔、便签、排版、疑问、作答），取消勾选时生成公开正文副本。HTML、JSON、ZIP、结构化 Markdown 使用相同协议；默认下载一个 HTML，源数据、字体、素材与所选记录内嵌。ZIP、JSON 等保留在高级导出中。PDF 面板按 A4 横竖方向、12pt 正文和至少 12mm 留白重新分页后调用系统打印；文字标记随原文重排，自由笔迹保留为原页附录。内部 `PrintOptions` 仅控制方向和是否包含记录，不改变阅读器源数据格式。源 JSON 适合交回 agent 更新。


## 图框与内容审阅

`Block.figure` 为可选向后兼容字段，统一 image、diagram、chart 的尺寸、比例、对齐与手绘风格；字段详见 components.md。Asset 的 width/height 表示真实图片尺寸。固定占位与等比容纳用于稳定分页，标签与数据不裁切。

Node validate/build 和 Python build 均输出 `contentReview`（advisory、automaticRewrite:false、writing、visuals、assets）。写作问题需要语义审阅，不自动删词。图表计数不包括对照表；素材清单标记未引用及超过 300 KB 的图片。审阅不修改源数据，也不分析个人批注。
