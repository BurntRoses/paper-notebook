# 纸间 · Paper Notebook

用 AI 将讲义、书页和题目整理成图文学习笔记。公式、图解和例题配合讲解，阅读时可圈画重点、批注图片、记录疑问。

[在线试读](https://burntroses.github.io/paper-notebook/#read) · [制作笔记](https://burntroses.github.io/paper-notebook/#create) · [功能演示](https://burntroses.github.io/paper-notebook/#film) · [English](README.en.md)

![图文笔记中的参数计算、预测曲线和页边批注](public/promo/paper-landscape-3.jpg?v=3.19)

## 主要功能

- **图文讲解**：按章节组织概念、公式、推导、图表和例题，配合重点标记与页边提示。
- **页内交互**：调整参数查看曲线、残差与右栏指标，逐步查看代码执行行与变量变化。
- **文字圈画**：选中文字即可加粗、改色、划线或圈注，支持撤销和重做。
- **图像批注**：放大配图，直接画线、圈点、添加箭头和文字说明。
- **页边便签**：在右栏或底栏双击添加便签，一键换色，长内容可折叠。
- **练习与答疑**：作答后查看反馈，收藏原句与疑问，导出学习记录交给 AI 补充讲解。
- **阅读与保存**：切换单页、双页或连续阅读，调整纸张、字体和行距；下载包含批注的 HTML，或导出 PDF。

在线试读提供机器学习、复利、统计、文学、商学和编程六类笔记。

## 开始使用

1. 打开[制作页面](https://burntroses.github.io/paper-notebook/#create)，复制指令。
2. 将指令与讲义、PDF、图片或题目一起发给支持代码执行和文件生成的 AI。
3. 回答学习目标和基础等问题，下载生成的 HTML，打开后即可阅读和批注。

也可以直接发送：

```text
请阅读 https://github.com/BurntRoses/paper-notebook ，按仓库指引为我制作学习笔记。
```

已有笔记可导入阅读器继续使用。批注、便签、书签和作答会随下载副本一起保存；需要继续学习时，可导出疑问和相关原文，请 AI 补充解释或例题。

## 文档

[使用说明](docs/first-use.md) · [笔记制作规范](skills/paper-notebook/SKILL.md) · [内容组件](docs/components.md) · [文件与导出](docs/delivery.md)

<details>
<summary>本地开发与命令行</summary>

需要 Node.js 20.19+。

```sh
npm install
npm run build:pages
npm run preview -- --outDir output/site --port 4173
```

浏览器打开 `http://localhost:4173/`。完整工具包使用 `npm run build` 构建；安装到编程智能体使用 `npm run install-skill`。

```sh
node tools/notebook.mjs validate notebook.json
node tools/notebook.mjs build notebook.json --out output/tutorial
node tools/notebook.mjs verify output/tutorial/<成品文件名>.html --source notebook.json
npm test
```

[数据协议](docs/content-contract.md) · [部署说明](docs/hosting.md) · [测试与验证](docs/verification.md)

</details>

## 许可

[MIT](LICENSE)。第三方资源及许可见 [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt) 和 [licenses](licenses/)。
