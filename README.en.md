# Paper Notebook

A focused reader for structured tutorials created by your own agent. The agent writes and checks content; one shared renderer handles typography, layouts, diagrams, formulas, questions and optional exercises.

[Live site](https://burntroses.github.io/paper-notebook/) · [Generate a notebook](https://burntroses.github.io/paper-notebook/chat-start.html) · [Source](https://github.com/BurntRoses/paper-notebook)

The primary deliverable is a single offline HTML file. Local IndexedDB drafts restore learning records; downloaded copies support long-term storage. No account or hosted generation is required.

## Start

```sh
npm install
npm run build
npm run preview -- --port 4173
npm run install-skill
```

Open `/start.html`, `/promo.html` or `/promo-motion.html`. The installer creates a self-contained Skill with references, reader assets and a bundled CLI. Existing installations are archived. Node 20.19+ is required; no MCP server registration is needed.

Ask: “I want to learn machine learning. Use Paper Notebook to create a tutorial.” The agent collects missing goals, prior knowledge, difficulty, writing style, short-term or course scope, time, material fidelity and exercise preference. Strict source mode preserves supplied questions, answers, order and objective claims. OCR retains raw recognition, page references, uncertainties, corrections and terminology separately. Native choice controls depend on the host. ChatGPT, DeepSeek and other text-only chats can use the copyable prompt at `chat-start.html` to output complete Markdown/TXT for import into the blank reader. Chats with Python and file tools can build real HTML/JSON/ZIP files using `paper-notebook-chat.zip`; a plain text chat does not install the Skill or create attachments.

```sh
node tools/notebook.mjs validate notebook.json
node tools/notebook.mjs build notebook.json --out output/tutorial
```

Read one landscape sheet in landscape and one portrait sheet in portrait, with horizontal ruling by default. Optional spread and continuous layouts are available. Source text stays fixed and read-only. Header and footer controls provide navigation, selected-text marks and annotation tools; notes, questions, answers and sources are grouped in the sidebar. Page transition presets are simulated, cover, slide and none. No cloth simulation is loaded.

Download a copy with all learning records included by default, or choose a public copy. HTML, JSON, ZIP and structured Markdown share the same protocol. Print to PDF from the browser.

Blackboards, extracts, hand-drawn relationship diagrams and syntax-colored code share live, selectable text. Up to three line-linked explanations connect concepts or code to short marginal notes. Nine annotation styles include emphasis dots and upper-right stars; click a mark to delete it. Same-range actions toggle or merge instead of stacking. Key passages collect source excerpts for review.

Updates preserve stable IDs and include `extensions.baseRevision`. Legacy data stays intact; unresolved stroke coordinates and text anchors appear in a visible relinking list.

MIT code; third-party notices remain in `licenses/`. The GitHub Pages workflow publishes the product pages, reader, media and downloads while preserving the offline release. See [hosting](docs/hosting.md), [first use](docs/first-use.md), [content contract](docs/content-contract.md), [components](docs/components.md) and [verification](docs/verification.md).

## Workspace organization

`dist/` is the final offline reader, static promotion pages and downloads. `public/promo/` contains only final media and posters. `production/promo/story/` retains native page captures, SVG and geometry for rebuilding the film. `output/` is ignored scratch space and can be regenerated. Superseded editor sources, operation recordings and intermediate QA artifacts are in the parent workspace’s `archives/2026-10-23-cleanup/` with SHA-256 provenance.
