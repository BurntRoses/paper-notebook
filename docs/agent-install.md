# 安装与调用

工具包根目录运行 `npm install && npm run build && npm run install-skill`。安装器将可自足的 Skill 放到 `${CODEX_HOME:-~/.codex}/skills/paper-notebook`。包含完整说明、schema、组件规范、空白 JSON、离线 HTML 和已捆绑的 Node CLI。已有安装会先移入CODEX_HOME/skill-backups 中的时间戳目录。

下载便携 Skill ZIP 时，将其中 paper-notebook 目录放入宿主的技能目录即可。Node 20.19+ 用于校验和构建；阅读 HTML 不需要 Node。无需注册 MCP、账号或远程生成服务。

调用：“我想学习机器学习，用 Paper Notebook 制作教程。” Agent 根据 Skill 补齐目标、基础、时间、材料与练习选择，输出结构化数据，运行校验与构建。原生提问/选择控件仅在宿主支持时使用，其他环境采用文字问答。

一句话委托安装：“安装这个工具包中的 Paper Notebook Skill，并制作离线教程；先询问缺少的学习需求。” 尚未配置公开仓库 URL。发布后，可在该句中附上真实仓库地址。

CLI 使用 Skill 目录下 scripts/notebook.mjs：validate / build / convert。脚本不依赖原仓库位置或 node_modules。输出 index.html、notebook.json、notebook.zip 和构建报告。
