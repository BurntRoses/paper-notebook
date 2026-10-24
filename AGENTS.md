# Paper Notebook agent entry

Use `skills/paper-notebook/SKILL.md` to generate or update a notebook. Read only the supporting references needed for the task. The schema and component catalog are the single source of truth; do not invent a separate HTML application for each notebook.

Deliver one complete, title-and-version named single-file reader HTML by default, with source and selected records embedded. Keep JSON and ZIP available as advanced build/export formats; attach them only when requested. Run the validator and builder. Do not claim that a document, source, image or browser path has been verified unless it was actually checked.

Preserve stable IDs during updates and include `extensions.baseRevision`. Personal notes, ink, answers and questions are separate user data. Ask for an image redraw decision only when it is relevant; explain token use. Use deterministic SVG for diagrams and preserve the geometry, labels, units and provenance of technical figures.

For development: TypeScript + Vite; run the meaningful model/roundtrip tests and one consolidated browser pass after substantive feature work. Respect existing licenses. Do not add accounts, cloud generation or a hosted AI billing service to this offline toolkit.
