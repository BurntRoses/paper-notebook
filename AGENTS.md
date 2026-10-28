# Paper Notebook agent entry

Use `skills/paper-notebook/SKILL.md` to generate or update a notebook. Read only the supporting references needed for the task. The schema and component catalog are the single source of truth; do not invent a separate HTML application for each notebook.

Deliver one complete, title-and-version named single-file reader HTML by default, with source and selected records embedded. Keep JSON and ZIP available as advanced build/export formats; attach them only when requested. Run the validator and builder. Do not claim that a document, source, image or browser path has been verified unless it was actually checked.

The shipped reader is the required product, not a visual suggestion. Never write a replacement HTML/CSS/JS app after a download/build failure. Keep the authored data, obtain the portable runtime or request its upload using the preset response, and resume with the supplied builder. Before delivery, run `node tools/notebook.mjs verify <artifact.html> --source notebook.json` (portable package: `node scripts/notebook.mjs verify ...`); Python environments may use `scripts/verify_reader.py`. Both compare the output with the unchanged bundled template.

Preserve stable IDs during updates and include `extensions.baseRevision`. Personal notes, ink, answers and questions are separate user data. Ask for an image redraw decision only when it is relevant; explain token use. Use deterministic SVG for diagrams and preserve the geometry, labels, units and provenance of technical figures.

For development: TypeScript + Vite; run the meaningful model/roundtrip tests and one consolidated browser pass after substantive feature work. Respect existing licenses. Do not add accounts, cloud generation or a hosted AI billing service to this offline toolkit.
