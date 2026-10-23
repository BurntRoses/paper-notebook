---
name: paper-notebook
description: Create structured tutorials as single-file offline Paper Notebook readers after a short learning brief. Use for learning from supplied materials, linked answer books and updates to existing tutorials.
---

# Paper Notebook

Generate a tutorial with the shared reader. The primary deliverable is one offline HTML file; source JSON and ZIP allow later agent updates. Read [reader output](references/reader-output.md), [content contract](references/content-contract.md) and [components](references/components.md) before generation. The schema in `references/notebook.schema.json` is authoritative. Reuse the renderer; do not create a new application for each subject.

## Establish the brief

Collect the missing goal, prior knowledge, difficulty, available time, short-term overview or long-term course, materials, material fidelity (strict/guided/open), language, writing style and exercise preference in one concise batch. Group related questions and keep previously supplied answers. Strict source mode preserves uploaded question-bank questions, answers, scope and order; disagreements or likely source typos stay visible rather than silently corrected. Use the host's native question/choice control when available; otherwise use a compact numbered question. Existing answers count: do not ask again. Do not invent a learner level or exercise choice. Select a route with [learning routes](references/routes.md).

Prefer supplied materials. Supplement from reliable primary sources when retrieval is available; record source IDs and locators. State unresolved information. For PDF, document, image or scan input, use [OCR material preparation](references/ocr-workflow.md); preserve raw extraction with page locators, verify uncertain symbols and record corrections and glossary separately. For visual material read [multimodal production](references/multimodal.md). Ask once about retaining original images, program treatment or model redraw when style conversion is relevant; explain token use before model redraw.

## Generate and check

Use [tutorial writing rules](references/writing.md). Explain the actual subject directly, with definitions, conditions, worked reasoning and sources. Avoid generic encouragement, assumptions of learner error, repeated conclusions, ornamental labels and mechanical “先……再……” instructions. Use subject-appropriate live-text blackboards, extracts, code containers and hand-drawn SVG relationships only where they carry useful content. Chinese prose generally avoids “把”, “被” and “不是……而是……”; preserve faithful quotations and required technical language.

Start from `assets/blank-notebook.json` (repository: `examples/blank-notebook.json`). Keep stable IDs; separate content and user state. Cornell cues link to actual blocks; summaries carry useful recall content. Only include exercises when requested. Verify numbers, units, formulas, diagrams, option IDs and solutions. Subjective work receives reference points, not deterministic marks.

An installed Skill contains a bundled CLI and reader; Node 20.19+ is sufficient:

```sh
node scripts/notebook.mjs validate notebook.json
node scripts/notebook.mjs build notebook.json --out output/my-tutorial
```

Run those paths relative to this Skill folder. In a toolkit checkout, use `node tools/notebook.mjs` instead; install dependencies and run `npm run build` only when no built runtime exists. Deliver the actual `index.html`, `notebook.json` and `notebook.zip`. Inspect the output, including mobile layout and exercised interactions. Report checks that could not run.

For updates preserve `notebook.id` and existing entity IDs; include `extensions.baseRevision` equal to the source revision. Keep personal data in source. Removed or ambiguous text anchors remain visibly unresolved. Answer books use `notebook.parent` and `extensions.doubtLinks` from the contract.

For ChatGPT, DeepSeek or other conversation environments, read [chat import](references/chat-import.md). With file tools and Python, use `python scripts/build_reader.py notebook.json --out output` with this complete package; it reuses the bundled reader and validates against the shipped schema without dependencies. Deliver real downloadable HTML, JSON and ZIP links. DeepSeek and other text-only chats do not need native Skill installation. The portable prompt in `assets/chat-prompt.txt` describes the shared import format. With text only, output a complete importable Markdown/TXT using `notebook-block` JSON fences; the blank reader turns it into an offline notebook. Never invent attachments, build results or browser checks. Installation uses the complete package, including references, assets and scripts.
