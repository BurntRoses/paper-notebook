# OCR 材料流程

将 PDF、文档、图片或扫描件交给生成器前，先建立逐页材料清单。每页至少保留：`sourceId`、原文件名、页码、原始 OCR 文本、识别不确定处、人工校正和统一术语。原始识别不可被校正文本覆盖；正文引用使用页码定位。

`scripts/ocr-material.mjs` 是离线材料提取器：macOS 使用 PDFKit 的文字层、Apple Vision 原生 OCR 和 textutil 文档提取；其他主机使用 `pdftoppm` 与 `tesseract`。macOS 原生脚本依赖系统 Swift。命令为 `node scripts/ocr-material.mjs 材料.pdf 输出目录`，输出带原文、页码、置信度与待核对行的 manifest.json。没有可用引擎时明确失败，不伪造识别结果。校正后再将清单中的文本交给 Paper Notebook 生成器。

题库、讲义和用户指定知识点可在生成前简报中选择 `materialFidelity: "strict"`。严格模式保持题目、答案、顺序和客观表述，OCR 校正只改正明确可证的识别错误，并在记录中保留原文和改动。

PDF 有可靠文字层时直接提取，扫描页才运行 OCR。DOCX 的 textutil 结果按段落区段定位，不能替代视觉页码；需要精确页引用时，使用对应 PDF 或文档渲染工具核对。识别置信度高也不代表公式正确。OCR 输出保持 `status: review`，公式符号、上下标、否定词、单位、题号和答案由生成 Agent 对照原件核实。
