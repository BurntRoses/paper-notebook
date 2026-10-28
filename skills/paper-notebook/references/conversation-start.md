# Conversation workflow

Use this workflow in a chat environment that can create and attach files. The required deliverable is one downloadable, self-contained offline HTML. Markdown may be used as source input, but is never the final response.

## Prepare the runtime before the brief

1. Look for the user-uploaded `paper-notebook-conversation.zip` in the conversation's accessible files and extract it with available file tools. File creation does not imply network access: use the attachment first. No repository clone, package installation or internet access is required once it is uploaded.
2. If the package is missing, give the user this download link: `https://burntroses.github.io/paper-notebook/downloads/paper-notebook-conversation.zip` and ask them to upload that ZIP. Do not ask them to upload existing course materials or repeat prior preference choices. Do not ask for an upload merely because an unrelated network request failed when the package is already attached.
3. Check for Node or Python and a real downloadable-file attachment tool. Either runtime is sufficient. In the extracted `paper-notebook/` directory, smoke-build the bundled `assets/blank-notebook.json` before asking learning questions:

   - Node: `node scripts/notebook.mjs validate assets/blank-notebook.json`, then `node scripts/notebook.mjs build assets/blank-notebook.json --out runtime-check`.
   - Python: `python scripts/build_reader.py assets/blank-notebook.json --out runtime-check` (use `python3` if that is the installed command).

4. If neither runtime or file attachment is available, explain the missing capability and stop. A missing package is resolved by a user upload; it does not imply that this environment cannot generate HTML. Do not claim a successful smoke build unless it ran.

## Prepare the brief

1. If reference-material status is unknown, the first response only asks the user to upload files or reply “没有文件”. Mention that reliable sources will be researched when possible if no files are supplied. End the turn and wait.
2. After material status is clear, inspect supplied files. Use the host's native choice controls when available; otherwise ask concise numbered questions. Ask only for missing topic, goal, prior knowledge, scope, time, language, difficulty, exercise preference and material fidelity. Keep prior answers.
3. Once the brief is sufficient, summarize scope briefly and begin. Do not add another approval step.

## Build the file

1. Use the extracted attachment. It contains the single-file reader template, shared schema, blank source, references, bundled Node CLI and Python standard-library builder.
2. Read `references/notebook.schema.json`, `references/content-contract.md`, `references/components.md`, `references/writing.md` and `references/reader-output.md`. Use `assets/blank-notebook.json` as the source. For updates, preserve notebook and entity IDs and set `extensions.baseRevision`.
3. Create `notebook.json` with the complete lesson, embedded visuals and verified sources. Follow the material/OCR rules in `references/ocr-workflow.md` when relevant. Keep personal study records separate from the authored lesson.
4. In the package directory, use the runtime verified above: `node scripts/notebook.mjs validate notebook.json` and `node scripts/notebook.mjs build notebook.json --out output`, or `python scripts/build_reader.py notebook.json --out output`. Fix validation or build errors and rebuild. Neither route needs network access or installed dependencies.
5. Read `output/build-report.json`, verify that the named HTML exists, is nonempty, embeds the exact authored JSON in the `notebook-data` script, and contains the bundled reader with no `/src/` or missing runtime references. Never attach the repository's source `index.html`, a downloaded error page, an empty template or a URL renamed as HTML. Open the actual HTML with network disabled when browser tools are available; check visible lesson content and report unrun checks truthfully.
6. Attach the actual generated `output/<教程名>-v<版本>.html` as the response download. Tell the user to save it and open the saved file in a browser; chat or operating-system previews may not execute its interactive reader. Markdown/TXT, raw HTML text, JSON and ZIP are not the final deliverable by default.

If the current conversation cannot access uploaded files, run either supported runtime or attach a generated file, state the specific missing capability. Do not substitute another format or pretend an attachment exists. Preserve completed work if the user needs to provide the missing package.
