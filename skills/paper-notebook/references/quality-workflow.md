# 构建与交付

每次生成、修订都执行本流程。用户明确要求逐字保留的材料按原文处理。中文表达必须阅读 [通用去 AI 味规范](chinese-writing.md)；它按句意判断，不要求词频归零。更新正文后，旧审阅记录、排版报告和交付证明均失效。

## 运行时版本

开始制作前检查 `https://burntroses.github.io/paper-notebook/downloads/runtime.json`，使用不缓存的请求。将 release 与本地 `runtime-manifest.json` 比较；不同时下载当前发布包，核对 SHA-256，覆盖已发布的脚本、模板、schema 和规范，重新阅读新版 SKILL。保留 notebook.json、用户材料、批注与产物。禁止以“已有目录”跳过检查。

Python：`python scripts/prepare_conversation.py --out runtime`。它检查版本、校验每个发布文件，在临时目录构建后替换运行时；替换失败保留原目录。`--offline` 仅用于明确断网的环境。版本服务不可达时报告 updateStatus=unavailable，并用校验通过的本地版本继续；不要声称已是最新版。Node 环境在便携包目录执行 `node scripts/notebook.mjs update .`，它执行相同的 manifest/包指纹检查和替换，不能只比较包名或 npm 版本号。仓库用 Git 更新源码或把便携运行时放入独立目录，不能用 update 覆盖源码目录。只替换运行时管理的文件，保留用户文件。

## 制作与审阅

1. 使用原生 schema 编写 JSON。可选 Python `scripts/authoring.py` 提供 code/exercise/page/emphasize/write；没有全局 ID 计数器。`emphasize` 可在同一原句叠加粗体与颜色。代码说明超过三条应拆块，不能截断。元数据使用本书实际版本与生成时间。
2. `node scripts/notebook.mjs review notebook.json > analysis.json`；Python 等价命令为 `python scripts/quality_gate.py review notebook.json > analysis.json`。仓库使用 `node tools/notebook.mjs`。超出容量时也可先 review 查看统计；400 页或 4000 块开始预警，500 页/5000 块仍是阅读器上限。超出时按章节分册，不能删正文。534 页并不是“校验通过”。
3. 阅读带位置的措辞和教学提示、每万字词频、句长/段长分布、重复句、cue 问句比例与重复、逐章字数、图文密度和无图连续页。比较章名、章节引用、术语、变量、brief 的 termPolicy/languageStyle/scope 与材料要求。指标用于寻找具体段落；不把高频词视为错误，不因规则零命中宣布成稿合格。
4. 逐章审阅实际内容，依据材料核对事实、算式与案例；检查术语首现、解释链、例子、比较与让步是否承载真实信息，侧栏是否补充正文。修改后重新 review。将最终 analysis.json 中的 `review` 对象单独保存为 `review.json`，填写每章 writing/teaching/facts/brief 的实际发现及处理。每条已发现的措辞/教学提示须有 decision：写明改法，或保留该原句的具体理由。不能填虚构证据或套用“全部通过”。
5. 执行 `validate`、`build`。Python 用 `build_reader.py`。锚点、选项、说明、重复 ID、schema、原生强调和发布模板指纹失效时退出非零。报告区分正文统计与语义编辑结果；构建本身 `deliveryReady=false`。字数使用 canonical block_text/textOf，表格、步骤、结果和参数均计入；图注、标题和页边讲解另见 metrics。字体报告列出未被内嵌手写字体 unicode-range 覆盖的字符及位置；系统回退不等于缺字。需对特殊符号作实际显示检查。
6. 有浏览器时执行 `node scripts/inspect_layout.mjs output/教程-v1.html --source notebook.json --out layout.json`（仓库 `node tools/inspect-layout.mjs`）。此工具需 Playwright，逐张测量桌面、竖屏和手机的物理续页，检查滚动可达性、边界及图片解码，输出实际表格宽度和图片比例。将报告放入 review.json 的 browser 字段。抽看代表性图、公式、长表、代码与 cue 对齐，测量不能判断教学图是否正确。无浏览器时在 browser.reason 记录实际缺少的能力，不能填 inspected=true。
7. `node scripts/notebook.mjs finalize output/教程-v1.html --source notebook.json --review review.json`；Python 用 `python scripts/quality_gate.py finalize ... --source ... --review ...`。它重新验证成品、源文件、规范指纹、全部章节审阅记录和已发现问题的处理。浏览器报告若存在，也须匹配当前 HTML 与源文件，并覆盖全部物理页。源文件或规范变更后必须重新审阅。交付 `<教程>-v<版本>.html`，`.delivery.json` 为制作记录，用户不需要接收内部报告。

结构检查可以自动拒绝错误；语义审阅记录反映作者实际执行的判断，不能证明事实已自动核实。不输出“AI概率”或“已完全去除AI味”。

## 小范围更新

保留 notebook/entity IDs，设置 baseRevision。`scripts/patch_pages.py` 按原页 SHA-256 校验，仅替换明确指定的页面，保留其他页面及 userState；版本递增并更新实际时间。之后重建整份单文件 HTML 并重新完成受影响章节审阅。HTML 内嵌运行时是单文件离线的交付方式，分册重复包含模板不等于构建错误。不要将模板体积与压缩后的实际 HTML 体积直接相加。


## 交互内容验收

含 `exploration` 时，审阅者核对每项参数、单位、曲线与读数；数值例子至少独立核算初始值和一组变化值，并检查参数两端。过程分步逐步核对状态，原文批读核对各段原句与解释。浏览器实际操作初始、变化、重置、方向键、窄屏与深色模式，导出后断网再打开，核对当前参数/片段和学习记录；打印核对所有步骤和原文解释完整显示。在对应章节的 teaching/facts 和 browser 中记录实际测试。未执行的路径注明原因。
