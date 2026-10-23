# 素材与许可清单

The current reader uses `src/reader/surface.ts`, CSS paper textures and native SVG annotations. The legacy desktop renderer remains in the source archive; the reader does not load its Three.js physics. No remote bitmap is required at runtime.

| Output | Source / production | License | Editable production source |
| --- | --- | --- | --- |
| paper-cotton.webp | Existing demo derivative of ambientCG Paper001 | CC0 | assets/originals/Paper001_1K-JPG_Color.jpg; original source https://ambientcg.com/view?id=Paper001 |
| paper-cream.webp, paper-kraft.webp | Existing demo color variants | CC0 derivative | Existing handoff assets; paper colors in CSS |
| desk-oak.webp, desk-felt.webp, desk-night.webp | Existing project procedural textures | MIT, project-created | tools/build_materials.py; deterministic seed 20261019 |
| study-hand.woff2 | Existing LXGW WenKai subset | SIL OFL 1.1 | assets/WenKai-OFL-1.1.txt |
| 旧版灯具、文具与夹扣 | 历史版本 SVG/CSS | MIT | 工作区 archives/2026-10-23-cleanup/process-and-legacy.tar.gz |
| 结构图与圈画 | 原生 SVG 与当前笔迹引擎 | MIT | src/ui/blocks.ts, src/reader/ink.ts |

License references: [ambientCG](https://docs.ambientcg.com/license/), [Poly Haven](https://polyhaven.com/license). Poly Haven is a recommended source; no Poly Haven asset is currently bundled. Do not attribute generated textures to a downloaded source that was not used.

`licenses/` retains runtime dependency notices, font license, and MIT notices of the pinned Humanizer writing references. `THIRD_PARTY_NOTICES.txt` aggregates these into exported HTML and ZIP files. User uploads retain their own rights and provenance. Model redraws must retain the original asset relationship.

Rebuild textures with `python tools/build_materials.py` (Pillow + numpy). The font is a renamed subset of LXGW WenKai v1.530 retained from the previous package; missing glyphs fall back to the system serif font. `assets/manifest.json` records byte sizes and SHA-256 hashes.


## 阅读器 2.0 新资产

阅读器纸面复用已许可的纸张纹理，阴影和装订细节由 CSS 生成。海报直接从正式 PageSurface 导出；最终宣传片从正式纸页捕获图文与 SVG，按分镜编排动效，音效配合关键画面生成。制作源与复现命令见 docs/promo-production.md。无独立仿笔记本宣传画布或外部录音。

设计参考与读取结果见 docs/research/reader-design.md 和 reader-references.json。KaTeX 字体保留 WOFF2 以减少离线重复载荷，原 MIT 声明随运行时分发。旧桌面和便签源码收进根目录 archives 日期封存包，当前纸张、字体和纹理原件保留于 assets/，阅读器入口未加载其物理模块。
