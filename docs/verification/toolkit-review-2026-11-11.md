# 工具包核查与修订（2026-11-11）

核查对象：当前仓库、随包 Node/Python CLI、schema、编写规范和实际阅读器。未取得报告所述 25 章原稿及其外部 kit，未复核 156,067 字、478 条 cue 等稿件统计。

| 报告项目 | 核查结果与处理 |
| --- | --- |
| cue 锚点被 helper 删除 | 仓库没有该 kit.page()；原构建器确实只能检查仍存在的 anchor。现在文字 cue 缺少 anchor 也会失败，并报告页、cue、字段。图块可按 blockId 关联。新增官方 authoring.page() 在作者入口即报错，保留失败输入。 |
| 12 条正则零命中 | 原检查器覆盖有限，报告 advisory=true，并非语义验收。现在额外报告词频密度、句长和段长分布、重复句、逐章统计、cue 问句比例/重复/空缺、图文密度与有位置的连续无图页。零命中不会产生 deliveryReady。 |
| write() 少算字数 | 外部 write() 不在仓库；两条正式构建路径现在以 block_text/textOf 统一统计表格、步骤、结果、参数，另列页数、图数、表数与标记数。正文计数采用 UTF-16 canonical block 文本；可见标题与页边说明另见 metrics。 |
| Python 缺少 oneOf | 已复现。补齐 oneOf、anyOf、not 和布尔 schema；oneOf 恰好一个分支匹配才通过。无效书签结构与重叠分支测试均覆盖。 |
| 作者 helper 截断与裸异常 | 报告所述 helper 不在仓库。正式 schema 已限制最多三条说明；新增官方 authoring.code/exercise/page 对超量说明、选项越界、缺失源块及锚点报字段级 ValueError，无静默截断。构建同时拒绝失配说明。 |
| 模板自证 | 原核验没有独立固定指纹。仅修改模板而不修改成品，本来会产生差异；真正缺口是允许把同时改过的模板当作基准。现在发布 reader-shell.sha256 和逐文件 runtime-manifest；修改模板与成品两份也会被 CLI 拒绝。 |
| 强调校验分散 | 已确认原构建只拒绝零标记、未强制实际粗体与文字颜色。现在 Node/Python 的同一入口同时检查锚点、说明、标记和全文粗体/变色。取消逐页强调提醒，封面、目录、来源和续页不设配额。 |
| diagram 不按关系布局 | 已确认。改为按有向 edges 分层，合流位于所有前驱之后；环路按强连通分量处理。无障碍描述逐条列实际边与孤立节点，不再虚构链。 |
| 构建无实际版面测量 | 新增便携 inspect_layout.mjs，遍历三种视口的所有物理续页，记录边界、滚动可达性、实际表宽与图片比例/解码。finalize 绑定实际 HTML、源文件及完整页数。无浏览器时须记录原因，报告保持未检查。 |
| 500 页/5000 块无预警 | 保留阅读器上限；review 可在超限前后独立运行，400 页/4000 块起给容量预警及分册提示。不对 534 页合订本宣称通过。 |
| 字体缺字 | 新增内嵌手写字体 unicode-range 覆盖报告，列出依赖系统回退的字符及位置。它报告回退风险，不把系统回退等同于实际缺字；特殊字形仍需实际显示检查。 |
| 表格无列宽配置 | 新增 columnWidths，按像素设置阅读宽度，续页共用原列宽，窄屏在表内滚动；行列数、列宽数量不匹配直接失败。 |
| 只禁词、无语义与 brief 检查 | 完整收录用户提供的 chinese-writing.md，列为必读规范；finalize 要求逐章 writing/teaching/facts/brief 的实际发现及处理。termPolicy/languageStyle/scope 等按语义审阅，未伪装为正则事实检查。可用 extensions.terminology 提供标准术语/备选写法，报告跨章位置与章节引用。 |
| quote/code 整块跳过 | 已确认。现在只保护原始 text 字面量，标题、说明、study.explanations 等仍进入措辞检查。 |
| 同一词不能既粗又变色 | 正式数据格式和阅读器原已支持同一 phrase 两个 mark，已有实际回归测试；不需要重复正文或嵌套 inline。新增 authoring.emphasize 默认叠加两种 mark。外部 inline API 无法核实。 |
| writing-check 命令不存在 | 当前仓库存在 tools/writing-check.mjs，原文明确称为仓库命令。便携包现在另有统一 review 命令及 Python quality_gate.py，不再要求运行仓库专用路径。 |
| 页级增量保护 | 新增 patch_pages.py，校验 notebookId、baseRevision、原页摘要，只替换指定页面，保留其他页与学习记录；输出前执行正式校验。单文件 HTML 仍需重新打包，未声称局部二进制更新。 |
| 全局计数器、固定生成元数据 | 所述生成器不在仓库；正式空白文档使用 UUID、当前时间和初始 revision=1。新增作者 API 不使用全局计数器，不覆盖调用者指定的版本；修改页时递增版本并更新时间。历史示例元数据与生成器默认值分别处理。 |
| 缓存运行时不更新 | 已确认旧 prepare 只看目录是否存在。新增 runtime.json、逐文件 manifest、包 SHA-256；Node update / Python prepare 都先查发布版本，再校验、临时构建和替换运行时文件。源稿、批注和产物保留，下载或验证失败不覆盖原目录。版本服务不可达时明确返回 unavailable。 |

交付流程：检查运行时版本 → 读取编写规范 → 编写 → review/修订 → validate/build → 实际版面检查 → source-bound finalize → HTML。源文件或规范变更后，旧审阅记录不能用于交付。自动检查不能替代学科判断；逐章记录必须来自实际审阅，不可用套话填充。

验证：81 项模型/工具测试通过；独立 Node/Python 打包、校验、固定指纹拒绝篡改及 finalize 命令通过；Python 缓存升级/失败回退、Node 真实包解压与构建、用户文件保留通过。布局夹具在三种视口累计检查 10 张物理页，0 项越界；分支图截图与无障碍边描述已检查。Chromium/WebKit 均通过长内容溢出回归和六学科强调、页边关联、离线导出检查。这些是工具包与夹具的结果，不代替对未提供的长篇成稿的验收。
