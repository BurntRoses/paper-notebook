# Conversation workflow

Use this workflow in a chat environment that can create and attach files. The required deliverable is one downloadable, self-contained offline HTML. Markdown may be used as source input, but is never the final response.

Before asking for materials or learning preferences, confirm that this environment can obtain the package, execute its Python builder, create a file and attach a real download. If a required capability is unavailable, explain the limitation immediately and stop. Do not collect a brief for a deliverable this environment cannot create.

## Prepare the brief

1. If reference-material status is unknown, the first response only asks the user to upload files or reply “没有文件”. Mention that reliable sources will be researched when possible if no files are supplied. End the turn and wait.
2. After material status is clear, inspect supplied files. Use the host's native choice controls when available; otherwise ask concise numbered questions. Ask only for missing topic, goal, prior knowledge, scope, time, language, difficulty, exercise preference and material fidelity. Keep prior answers.
3. Once the brief is sufficient, summarize scope briefly and begin. Do not add another approval step.

## Build the file

1. Obtain and extract the portable package from `https://burntroses.github.io/paper-notebook/downloads/paper-notebook-conversation.zip` when it is not already available. It contains the single-file reader template, shared schema, blank source, references and a Python standard-library builder.
2. Read `references/notebook.schema.json`, `references/content-contract.md`, `references/components.md`, `references/writing.md` and `references/reader-output.md`. Use `assets/blank-notebook.json` as the source. For updates, preserve notebook and entity IDs and set `extensions.baseRevision`.
3. Create `notebook.json` with the complete lesson, embedded visuals and verified sources. Follow the material/OCR rules in `references/ocr-workflow.md` when relevant. Keep personal study records separate from the authored lesson.
4. In the package directory, run `python scripts/build_reader.py notebook.json --out output`. Fix validation or build errors and rebuild. This builder uses only Python's standard library and the bundled reader/schema.
5. Attach the actual `output/<教程名>-v<版本>.html` file as the response download. The HTML must contain the reader, fonts, source data and assets, and work offline. Do not deliver Markdown/TXT, raw HTML text, JSON or ZIP by default. Do not claim a browser check unless one was run.

If the current conversation cannot download/use files, run Python, or attach a generated file, state that file delivery is unavailable here. Stop without substituting another format or pretending an attachment exists.
