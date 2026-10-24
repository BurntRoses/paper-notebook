# 交付

| 文件 | 用途 |
| --- | --- |
| 教程名-v版本.html | 单文件离线教程，阅读、标记、提问、作答、再次下载 |
| notebook.json | agent 可修订的完整源内容与所选个人记录 |
| 教程名-v版本.zip | 同名 HTML、JSON、打开说明和许可；素材内嵌一次 |
| blank-notebook.html | 聊天模型内容导入入口 |
| paper-notebook-chat.zip | 通用对话包：Python 标准库构建器、完整模板、协议和复制指令 |
| paper-notebook-skill.zip | 独立 Skill、协议、组件、CLI 和阅读器 |
| paper-notebook-toolkit.zip | 完整源码、素材、构建工具、测试、文档 |
| paper-notebook-offline.zip | 空白容器和三类完整示例 |

下载默认选择 ZIP，也可单独选择 HTML；文件按标题和版本自动命名。下载默认包含个人记录，可按类别取消；本机草稿用于恢复，下载副本用于长期保存。Markdown 保留结构块与 metadata，JSON 是优先源格式。PDF 使用浏览器打印，排版与纸张大小取决于打印设置。

宣传页 promo.html 使用实际阅读器嵌入预览。promo-motion.html 播放 64 秒横竖两版产品推介片，支持章节定位、暂停和静音。画面取自实际产品笔记，H264/AAC MP4、纸页海报和配乐位于 promo/，源素材包与生成脚本一并交付。音乐为原创程序合成。

chat-start.html 提供可复制的完整生成指令。Agent 的 Skill 路线直接构建文件；ChatGPT、DeepSeek 等文字对话输出导入稿，阅读器负责导出离线 HTML。是否能直接构建附件取决于对话环境的文件与执行工具。

历史成果与过程文件已按日期归档到工作区 `../archives/2026-10-23-cleanup/`；SHA-256 清单见其中 `manifest.json`。当前目录保留最终阅读器、产品笔记、横竖推广视频及可重建它们的源文件。

成书按内容实际字符保留文楷 Unicode 字库分片；空白导入器保留完整分片以接受新主题。系统宋体与黑体选项不额外嵌入字体。离线合集不再内套各本 ZIP；只保留各本 HTML。
