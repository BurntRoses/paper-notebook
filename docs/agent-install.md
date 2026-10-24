# 调用与安装

日常使用：打开 [生成入口](https://burntroses.github.io/paper-notebook/chat-start.html#agent)，点击“复制给 Agent”，与主题和材料一起发送。指令包含仓库、Skill 与完整运行包地址，由 Agent 获取工具并生成文件。网页端模型使用同页的“复制给网页端模型”，结果粘贴到空白阅读器即可导入。

以下安装方式用于开发环境或需要长期保留本地 Skill 的宿主。

工具包根目录运行 `npm install && npm run build && npm run install-skill`。安装器将可自足的 Skill 放到 `${CODEX_HOME:-~/.codex}/skills/paper-notebook`。包含完整说明、schema、组件规范、空白 JSON、离线 HTML 和已捆绑的 Node CLI。已有安装会先移入CODEX_HOME/skill-backups 中的时间戳目录。

下载便携 Skill ZIP 时，将其中 paper-notebook 目录放入宿主的技能目录即可。Node 20.19+ 用于校验和构建；阅读 HTML 不需要 Node。无需注册 MCP、账号或远程生成服务。

调用：“我想学习机器学习，用 Paper Notebook 制作教程。” Agent 根据 Skill 补齐目标、基础、时间、材料与练习选择，输出结构化数据，运行校验与构建。原生提问/选择控件仅在宿主支持时使用，其他环境采用文字问答。

从公开代码仓库调用：“请使用 GitHub 仓库 https://github.com/BurntRoses/paper-notebook 中的 Paper Notebook Skill，为我制作学习笔记。先读取 skills/paper-notebook/SKILL.md；根据 Skill 先等待参考文件或“没有文件”，再用选择题补问未提供的学习要求，复用共享格式生成 HTML、JSON 和 ZIP。” 如果 Agent 不能直接从远程仓库读取 Skill，先下载该仓库或其中的 `skills/paper-notebook/` 并安装；不要把纯文本对话误报为已安装 Skill。

一句话委托安装：“安装 Paper Notebook Skill，并制作离线教程；先询问缺少的学习需求。” 公开仓库地址：https://github.com/BurntRoses/paper-notebook 。纯文字对话可以使用网站中的生成指令输出导入稿，由阅读器生成离线文件。

CLI 使用 Skill 目录下 scripts/notebook.mjs：validate / build / convert。脚本不依赖原仓库位置或 node_modules。输出按教程标题和版本命名的 HTML、ZIP，另存 notebook.json 和构建报告。
