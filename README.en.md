# Paper Notebook

A focused reader for structured tutorials created by your own agent. The agent writes and checks content; one shared renderer handles typography, layouts, diagrams, formulas, questions and optional exercises.

[Live site](https://burntroses.github.io/paper-notebook/) · [Generate a notebook](https://burntroses.github.io/paper-notebook/chat-start.html) · [Source](https://github.com/BurntRoses/paper-notebook)

Delivery is one clearly named offline HTML file. Fonts, media, editable source and selected records are embedded; advanced exports remain available for editing. Start by uploading references or replying “no files”; the AI ends that response and waits before asking topic and learning-brief choices. Without references, it uses reliable web sources when retrieval is available and original diagrams.

Cornell pages, generous line spacing, three font choices, a real dark theme, native charts and stable hand-drawn frame variants support structured textbook content.

Local IndexedDB drafts restore learning records; downloaded copies support long-term storage. No account or hosted generation is required.

## Generate a notebook

**AI entry point: [creation instructions](skills/paper-notebook/SKILL.md).** Select workspace building or [conversation file delivery](skills/paper-notebook/references/conversation-start.md) by available tools. External prompts contain one sentence; acquisition, validation and delivery rules stay in the repository.

Open [the generation page](https://burntroses.github.io/paper-notebook/chat-start.html) or the [prompt directory](skills/paper-notebook/prompts/README.md). Choose by available tools: a coding agent edits the repository and builds the HTML in its workspace; a conversation environment reuses available runtime files or downloads the portable ZIP itself, builds with Node or Python and attaches a downloadable HTML. A manual ZIP upload is a fallback after an actual download failure or an explicit download restriction. Workflow details stay in the repository. If the environment lacks file delivery tools, it must explain this before collecting learning preferences. Markdown, TXT and pasted source code cannot replace the HTML artifact.

## Local development

```sh
npm install
npm run build
npm run preview -- --port 4173
npm run install-skill
```

Open `dist/promo.html` for the product home, with reading, film and creation in one place. The film follows the screen ratio automatically; legacy entries redirect to the matching home section. The installer creates a self-contained Skill with references, reader assets and a bundled CLI. Existing installations are archived. Node 20.19+ is required; no MCP server registration is needed.

Ask: “Use Paper Notebook to create a tutorial about machine learning.” The project workflow collects only missing goals, prior knowledge, scope, time, language, material fidelity and exercise preferences. Choose the prompt route by available tools: coding agents edit the repository and leave a built HTML artifact; conversation environments with file creation and attachment tools use `paper-notebook-conversation.zip` and deliver one downloadable offline HTML. Markdown/TXT is never a substitute for the requested file. If a chat cannot create and attach files, it must say so.

```sh
node tools/notebook.mjs validate notebook.json
node tools/notebook.mjs build notebook.json --out output/tutorial
node tools/notebook.mjs verify output/tutorial/<title>-v<revision>.html --source notebook.json
```

The bundled reader is mandatory. If runtime acquisition fails, use the [preset download reply](skills/paper-notebook/references/responses/download-unavailable.zh-CN.txt) with the official ZIP link, then resume after the user uploads it unchanged. Never invent a replacement interface. The supplied Node and Python verifiers compare the complete reader shell and embedded source; local coding agents need only Node and can deliver a workspace file path. Chats that explicitly lack file delivery use the [preset capability reply](skills/paper-notebook/references/responses/file-delivery-unavailable.zh-CN.txt).

Read one landscape sheet in landscape and one portrait sheet in portrait, with horizontal ruling by default. Optional spread and continuous layouts are available. Source text stays fixed and read-only. Header and footer controls provide navigation, selected-text marks and annotation tools; notes, questions, answers and sources are grouped in the sidebar. Page transition presets are simulated, cover, slide and none. No cloth simulation is loaded.

Download a copy with all learning records included by default, or choose a public copy. HTML, JSON, ZIP and structured Markdown share the same protocol. Use the PDF panel for portrait or landscape A4, then save through system print.

Blackboards, extracts, hand-drawn relationship diagrams and syntax-colored code share live, selectable text. Up to three line-linked explanations connect concepts or code to short marginal notes. Nine annotation styles include emphasis dots and upper-right stars; click a mark to delete it. Same-range actions toggle or merge instead of stacking. Key passages collect source excerpts for review.

Updates preserve stable IDs and include `extensions.baseRevision`. Legacy data stays intact; unresolved stroke coordinates and text anchors appear in a visible relinking list.

MIT code; third-party notices remain in `licenses/`. The GitHub Pages workflow publishes the product pages, reader, media and downloads while preserving the offline release. See [hosting](docs/hosting.md), [first use](docs/first-use.md), [content contract](docs/content-contract.md), [components](docs/components.md) and [verification](docs/verification.md).

The public site uses an explicit publishing allowlist. Production scripts, storyboards, source bundles and verification reports remain in the repository and development release.

The primary deliverable is one automatically named `<title>-v<revision>.html`, with fonts, assets, editable source and selected study records embedded. ZIP, JSON, Markdown and page PNG are advanced exports. The separate PDF panel supports A4 portrait/landscape via system print with light paper, 12pt text and at least 12mm margins. Anchored marks reflow; freehand is preserved in original-page appendices.


Version 2.2 adds direct writing review, hand-drawn illustration guidelines, shared figure sizing/aspect ratios, stable image placeholders and smaller mark-history snapshots. Node and Python builders share advisory rules. See [upgrade notes](docs/upgrade-2.2.md) for sources, measurements and validation. External prompts remain one sentence per environment.
