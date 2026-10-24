# Paper Notebook

A focused reader for structured tutorials created by your own agent. The agent writes and checks content; one shared renderer handles typography, layouts, diagrams, formulas, questions and optional exercises.

[Live site](https://burntroses.github.io/paper-notebook/) · [Generate a notebook](https://burntroses.github.io/paper-notebook/chat-start.html) · [Source](https://github.com/BurntRoses/paper-notebook)

Delivery is one clearly named offline HTML file. Fonts, media, editable source and selected records are embedded; advanced exports remain available for editing. Start by uploading references or replying “no files”; the AI ends that response and waits before asking topic and learning-brief choices. Without references, it uses reliable web sources when retrieval is available and original diagrams.

Cornell pages, generous line spacing, three font choices, a real dark theme, native charts and stable hand-drawn frame variants support structured textbook content.

Local IndexedDB drafts restore learning records; downloaded copies support long-term storage. No account or hosted generation is required.

## Generate a notebook

Open [the generation page](https://burntroses.github.io/paper-notebook/chat-start.html). Choose **Copy for Agent** or **Copy for a web chat**, then send the complete prompt and follow its request for reference files or “no files” before choosing your topic. The Agent prompt includes the repository, Skill and runtime URLs so the agent can retrieve its tools. The web-chat prompt includes the complete import format; paste the model’s answer into the blank reader.

## Local development

```sh
npm install
npm run build
npm run preview -- --port 4173
npm run install-skill
```

Open `dist/promo.html` for the product home, with reading, film and creation in one place. The film follows the screen ratio automatically; legacy entries redirect to the matching home section. The installer creates a self-contained Skill with references, reader assets and a bundled CLI. Existing installations are archived. Node 20.19+ is required; no MCP server registration is needed.

Ask: “I want to learn machine learning. Use Paper Notebook to create a tutorial.” The agent collects missing goals, prior knowledge, difficulty, writing style, short-term or course scope, time, material fidelity and exercise preference. Strict source mode preserves supplied questions, answers, order and objective claims. OCR retains raw recognition, page references, uncertainties, corrections and terminology separately. Native choice controls depend on the host. ChatGPT, DeepSeek and other text-only chats can use the copyable prompt at `chat-start.html` to output complete Markdown/TXT for import into the blank reader. Chats with Python and file tools can build real HTML/JSON/ZIP files using `paper-notebook-chat.zip`; a plain text chat does not install the Skill or create attachments.

```sh
node tools/notebook.mjs validate notebook.json
node tools/notebook.mjs build notebook.json --out output/tutorial
```

Read one landscape sheet in landscape and one portrait sheet in portrait, with horizontal ruling by default. Optional spread and continuous layouts are available. Source text stays fixed and read-only. Header and footer controls provide navigation, selected-text marks and annotation tools; notes, questions, answers and sources are grouped in the sidebar. Page transition presets are simulated, cover, slide and none. No cloth simulation is loaded.

Download a copy with all learning records included by default, or choose a public copy. HTML, JSON, ZIP and structured Markdown share the same protocol. Use the PDF panel for portrait or landscape A4, then save through system print.

Blackboards, extracts, hand-drawn relationship diagrams and syntax-colored code share live, selectable text. Up to three line-linked explanations connect concepts or code to short marginal notes. Nine annotation styles include emphasis dots and upper-right stars; click a mark to delete it. Same-range actions toggle or merge instead of stacking. Key passages collect source excerpts for review.

Updates preserve stable IDs and include `extensions.baseRevision`. Legacy data stays intact; unresolved stroke coordinates and text anchors appear in a visible relinking list.

MIT code; third-party notices remain in `licenses/`. The GitHub Pages workflow publishes the product pages, reader, media and downloads while preserving the offline release. See [hosting](docs/hosting.md), [first use](docs/first-use.md), [content contract](docs/content-contract.md), [components](docs/components.md) and [verification](docs/verification.md).

The public site uses an explicit publishing allowlist. Production scripts, storyboards, source bundles and verification reports remain in the repository and development release.

The primary deliverable is one automatically named `<title>-v<revision>.html`, with fonts, assets, editable source and selected study records embedded. ZIP, JSON, Markdown and page PNG are advanced exports. The separate PDF panel supports A4 portrait/landscape via system print with light paper, 12pt text and at least 12mm margins. Anchored marks reflow; freehand is preserved in original-page appendices.
