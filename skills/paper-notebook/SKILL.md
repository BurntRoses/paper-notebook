---
name: paper-notebook
description: Create structured tutorials as single-file offline Paper Notebook readers after a short learning brief. Use for learning from supplied materials, linked answer books and updates to existing tutorials.
---

# Paper Notebook

Generate a tutorial with the shared reader. Deliver one clearly named offline HTML with editable source and selected learning records embedded. ZIP and JSON are optional advanced formats. Use title + revision filenames, no ambiguous final/final2 names or repeated media copies. Read [reader output](references/reader-output.md), [content contract](references/content-contract.md) and [components](references/components.md) before generation. The schema in `references/notebook.schema.json` is authoritative. Reuse the renderer; do not create a new application for each subject.

## Establish the brief: files first, then choices

1. If material status is unknown, the **first response only** asks the user to upload references (PDF, document, image, notes or question bank), or reply “没有文件 / no files”. Explain in that same response that without references you will retrieve reliable internet sources where available and create original explanations and diagrams; if retrieval is unavailable, say so. **End this response and wait. Do not ask for the field, topic, level or other brief details yet, and do not generate a tutorial.** Existing attachments or an explicit no-files answer satisfy this step; never ask again. If the user directly requests production with already sufficient instructions, preserve that authorization.
2. After files arrive or “no files” is confirmed, inspect what can be read. Use the host's native multiple-choice question control to ask for the missing field/topic first; provide concrete options suited to the files or request and allow free text. Then collect missing goal/scope, prior knowledge, difficulty, available time, course horizon, language/style, exercises and material fidelity (strict/guided/open) in short related batches. When no native choice control exists, offer concise numbered choices. Keep previous answers; do not repeatedly ask for information already provided. Default presentation is generous Cornell electronic paper; the reader lets users change fonts, spacing and theme.
3. Summarize the agreed scope briefly and produce the tutorial. Do not insert another approval loop. Read [learning routes](references/routes.md) and [tutorial writing rules](references/writing.md) to choose depth and structure; do not infer a learner level or exercise preference when genuinely unspecified.

Strict source mode preserves uploaded questions, answers, scope and order; disagreements or likely source typos stay visible rather than silently corrected.

Prefer supplied materials. Supplement from reliable primary sources when retrieval is available; record source IDs and locators. State unresolved information. For PDF, document, image or scan input, use [OCR material preparation](references/ocr-workflow.md); preserve raw extraction with page locators, verify uncertain symbols and record corrections and glossary separately. For visual material read [multimodal production](references/multimodal.md). Ask once about retaining original images, program treatment or model redraw when style conversion is relevant; explain token use before model redraw.

## Generate and check

Use [tutorial writing rules](references/writing.md). Explain the actual subject directly, with definitions, conditions, worked reasoning and sources. Avoid generic encouragement, assumptions of learner error, repeated conclusions, ornamental labels and mechanical “先……再……” instructions. Use subject-appropriate live-text blackboards, extracts, code containers and hand-drawn SVG relationships only where they carry useful content. Chinese prose generally avoids “把”, “被” and “不是……而是……”; preserve faithful quotations and required technical language.

Start from `assets/blank-notebook.json` (repository: `examples/blank-notebook.json`). Keep stable IDs; separate content and user state. Cornell cues link to actual blocks; summaries carry useful recall content. Only include exercises when requested. Verify numbers, units, formulas, diagrams, option IDs and solutions. Subjective work receives reference points, not deterministic marks.

An installed Skill contains a bundled CLI and reader; Node 20.19+ is sufficient:

```sh
node scripts/notebook.mjs validate notebook.json
node scripts/notebook.mjs build notebook.json --out output/my-tutorial
```

Run those paths relative to this Skill folder. In a toolkit checkout, use `node tools/notebook.mjs` instead; install dependencies and run `npm run build` only when no built runtime exists. Deliver only the actual `<title>-v<revision>.html` by default. It embeds fonts, assets, editable source and personal records. Keep JSON/ZIP build interfaces for optional advanced editing; provide those files only when requested. A4 portrait/landscape PDF is available through the reader's dedicated Export PDF panel and system print. Assets stay embedded without a duplicate assets folder. The builder removes unused Unicode font faces for authored notebooks; do not strip characters that appear in the content. Inspect the output, including mobile layout and exercised interactions. Report checks that could not run.

Keep the artifact focused on reading, annotations, exercises and saving records. Use the shipped compact common-character fonts; do not download or embed complete Unicode libraries for future editing. Uncommon characters must remain in the text and may use the system font. Obtain only media actually used in the lesson, directly from the source when needed, at a resolution suited to its displayed size; embed it before delivery. Keep technical labels and diagrams sharp. Do not include promotional videos, unused source images or duplicate copies of media. The saved HTML must not fetch resources to render its content.

For updates preserve `notebook.id` and existing entity IDs; include `extensions.baseRevision` equal to the source revision. Keep personal data in source. Removed or ambiguous text anchors remain visibly unresolved. Answer books use `notebook.parent` and `extensions.doubtLinks` from the contract.

## Delivery by environment

- Coding agents with repository and file tools work in the project checkout. Follow this Skill, validate and build with the project CLI, and leave the finished HTML artifact in the workspace.
- Conversation environments reuse accessible runtime files or automatically download `https://burntroses.github.io/paper-notebook/downloads/paper-notebook-conversation.zip`. Read `references/conversation-start.md`; `scripts/prepare_conversation.py` can acquire, verify and smoke-build the package. Ask for a manual ZIP upload only after an actual download failure or an explicit download restriction. Then build the authored `notebook.json` with Node or Python and attach the actual HTML. Once acquired, the package builds offline without dependency installation. Retain existing materials and answers.
- A conversation needs access to a runtime through direct download or existing files, either Node or Python, and file creation/attachment capabilities. Explain an explicitly missing capability before the brief and stop; do not substitute Markdown, TXT, HTML source in chat, or a claimed attachment. An unsuccessful network request is not proof of missing local file capabilities.

Read [conversation workflow](references/conversation-start.md) for chat-based file delivery. Markdown is an optional source/import format for material supplied by the user, never the final response for a notebook-generation request. Never invent attachments, build results or browser checks. Installation uses the complete package, including references, assets and scripts.
