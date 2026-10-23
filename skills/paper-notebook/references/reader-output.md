# Reader output

The product is an offline reader for AI-generated structured learning content. Generate useful concepts, conditions, reasoning, examples, diagrams, formulas, exercises and sources with the shared renderer. Do not generate conversational product introductions, decorative slogans, duplicate labels, movable text boxes or a custom app for each subject.

## Pages and reading controls

Landscape displays one landscape sheet; portrait displays one portrait sheet. Double-page and continuous modes are optional. Default ruling is horizontal lines. Normal content flows into continuation sheets with stable source IDs and UTF-16 text offsets. Oversized technical objects remain accessible in scrolling viewports.

`Page.layout`: reading, cornell, grid or exam. Cornell uses optional `cues: [{id,text,blockId?}]` and `summary`; cues refer to actual blocks and summaries state useful recall points. Legacy free layouts remain readable but have no drag or editing controls.

`extensions.readerProfile` supports layout auto/single/spread/scroll; shape auto/portrait/landscape; direction horizontal/vertical; transition turn/cover/slide/none; theme paper-light/paper-night; motion full/reduced. Default auto means one sheet matching viewport orientation. OS reduced-motion takes precedence. The reader uses preset transitions, with no freely deformable cloth physics.

Controls stay in the header and footer. Source text is read-only. Selected-text actions support highlight, underline, circle, wave, box, bracket, check, star and emphasis dots. Authored study marks are deterministic; clicking a mark opens a small inspector, and the same action on the same range is merged or toggled instead of stacking duplicates. Notes, questions, answers and sources are grouped in the sidebar. Avoid repeated toolbars, conversational introductions and product descriptions on lesson pages.

Use `study.visual` for a small number of subject-appropriate treatments: `blackboard` for a formula or decisive principle, `extract` for a quotation or definition, and `sketch` for a relationship diagram. Keep the text live and the treatment subordinate to the explanation. Pages may set `subject` to `stem`, `literature`, `business`, `code` or `general` to tune diagrams, quotations, code containers and emphasis.

Use at most three `study.explanations: [{text,note}]` when a key concept or code expression needs a line-linked explanation. Each text must occur in the actual block. Notes sit beside the relevant line or below it on narrow pages; keep explanations brief enough to read with their source. Code syntax coloring preserves exact text, indentation and selector offsets. Stars and check marks sit at the upper-right text edge in the interline space; avoid covering letter centers.

Before generation, use the brief interview to capture goal, prior knowledge, language style, time horizon, route, material fidelity, references and terminology. For a PDF, document, image or scan, OCR page by page, retain the raw recognition with page locators, list uncertain characters and corrections separately, then build a controlled glossary. In `strict` material fidelity, preserve supplied questions, answers, order and objective claims; do not silently repair or supplement them. The brief is source metadata, not a replacement for evidence.

## Saving and delivery

User records remain separate from lesson content. IndexedDB restores local drafts. Downloads include all personal records by default; users may choose a public copy. Preserve legacy original stroke samples and visibly mark unresolved coordinates or text anchors instead of guessing.

Generated HTML must open from file:// with networking disabled. Fonts, runtime, media and formulas stay embedded. Deliver HTML, source JSON and ZIP. Validate, build, inspect desktop/tablet/phone layouts, exercise an actual quiz, export a personal copy, reopen offline and export again. State physical-device checks that were not performed.
