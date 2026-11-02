# 纸张样式

`extensions.readerProfile.paperStyle` 默认设为 `auto`，依据每页 `subject` 选择材质。手动选择后整册使用同一材质；明暗模式与 `paper.ruling` 独立保存。

| 样式 | 颜色与纹理 | 自动匹配 |
| --- | --- | --- |
| white / 素白 | 暖白，极浅纸纹 | code |
| ivory / 象牙 | 浅米白，细纸纹 | business |
| cotton / 棉纹 | 中性暖白，轻微棉纹 | general 或未指定 |
| mist / 雾蓝 | 冷白，底部页边浅网格 | stem |
| sage / 浅青 | 青白，底部页边浅色晕染 | 手动选择 |
| inkwash / 淡墨 | 暖白，底部页边淡山形 | literature |

材质使用现有小幅 WebP 纸纹和原创 SVG，随离线阅读器内嵌。图案位于正文和底栏之外的下方页边。换纸与明暗切换只更新样式，保留当前纸页、圈画和阅读位置。覆盖翻页仅合成移动的正面，仿真模式才创建折页背面与折痕层。

设计参考：[Xournal++](https://github.com/xournalpp/xournalpp) 的纸色与纸面规则分离、[Koodo Reader](https://github.com/koodo-reader/koodo-reader) 的阅读配色设置。本文采用这些交互原则，材质与界面代码由本项目实现。
