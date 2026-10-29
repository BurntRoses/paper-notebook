# 调用与安装

日常使用：打开[生成入口](https://burntroses.github.io/paper-notebook/#create)，按当前工具能力选择“复制给编程智能体”或“复制给对话模型”。编程智能体按 Skill 在仓库中编辑并构建；有文件能力的对话环境使用便携对话包并交付实际 HTML 附件。两条提示都保持简短，项目规范负责详细流程。

以下安装方式用于开发环境或需要长期保留本地 Skill 的宿主。

工具包根目录运行 `npm install && npm run build && npm run install-skill`。安装器将可自足的 Skill 放到 `${CODEX_HOME:-~/.codex}/skills/paper-notebook`。包含完整说明、schema、组件规范、空白 JSON、离线 HTML 和已捆绑的 Node CLI。已有安装会先移入CODEX_HOME/skill-backups 中的时间戳目录。

下载便携 Skill ZIP 时，将其中 paper-notebook 目录放入宿主的技能目录即可。Node 20.19+ 用于校验和构建；阅读 HTML 不需要 Node。无需注册 MCP、账号或远程生成服务。

调用：“我想学习机器学习，用 Paper Notebook 制作教程。” Agent 先请用户上传参考文件或明确回复“没有文件”，提前说明无文件时会按当前能力检索可靠资料并原创绘图，然后结束本轮等待。收到材料答复后，先用选择题确认尚未明确的领域或主题，再补齐目标、基础、时间与练习选择，输出结构化数据，运行校验与构建。原生提问/选择控件仅在宿主支持时使用，其他环境采用文字问答；已经提供的信息不再重复询问。

从公开仓库调用可直接说：“请基于 https://github.com/BurntRoses/paper-notebook，按 `skills/paper-notebook/SKILL.md` 为我制作学习笔记，并交付实际构建的离线 HTML。” 后续流程与交付要求以仓库当前版本为准。若当前环境无法读取仓库，说明缺少的访问能力；不要把文本回答说成已安装 Skill 或已构建文件。

一句话委托安装：“安装 Paper Notebook Skill，并制作离线教程；先询问缺少的学习需求。” 公开仓库地址：https://github.com/BurntRoses/paper-notebook 。对话环境应使用便携构建包并交付实际生成的 HTML 文件。

CLI 使用 Skill 目录下 scripts/notebook.mjs：validate / build / convert。脚本不依赖原仓库位置或 node_modules。构建接口输出按教程标题和版本命名的 HTML、ZIP，另存 notebook.json 和构建报告；默认只附上 HTML 下载链接，其余文件用于高级编辑与迁移。HTML 内的“导出 PDF”可通过系统打印保存横向或纵向 A4。
