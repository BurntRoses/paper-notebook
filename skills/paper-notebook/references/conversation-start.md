# Conversation workflow

Use this workflow in a chat environment that can create and attach files. The required deliverable is one downloadable, self-contained offline HTML. Markdown may be used as source input, but is never the final response.

## Prepare the runtime before the brief

1. Check for a file execution environment with Node or Python and a real downloadable-file attachment capability. Either runtime is sufficient. If those capabilities are explicitly unavailable, explain the specific limitation before collecting preferences. Do not infer missing file capabilities from a failed web request.
2. Reuse an accessible extracted runtime or `paper-notebook-conversation.zip` already provided by the user. Otherwise download `https://burntroses.github.io/paper-notebook/downloads/paper-notebook-conversation.zip` into the execution environment yourself. Use a direct HTTP download or supported file-fetch tool; a repository/search-page excerpt is not the complete file. Do not route the HTML or base64 font data through chat text. No repository clone or dependency installation is needed.
3. Validate that the downloaded bytes form a complete ZIP, extract it, and read its `START-HERE.md`. The repository helper `scripts/prepare_conversation.py` downloads or reuses the archive, verifies its required files and smoke-builds with Python; its direct source is `https://raw.githubusercontent.com/BurntRoses/paper-notebook/main/skills/paper-notebook/scripts/prepare_conversation.py`. If the first download fails transiently, make at most one retry or use another available direct-download tool. Only after an actual package download fails, or the environment explicitly forbids external downloads, ask the user to download that ZIP and upload it. State the observed limitation briefly and retain existing materials and answers. An unrelated search failure is not evidence that this download is blocked.
4. In the extracted `paper-notebook/` directory, smoke-build the bundled `assets/blank-notebook.json` before asking learning questions, unless the preparation helper already completed that check:

   - Node: `node scripts/notebook.mjs validate assets/blank-notebook.json`, then `node scripts/notebook.mjs build assets/blank-notebook.json --out runtime-check`.
   - Python: `python scripts/build_reader.py assets/blank-notebook.json --out runtime-check` (use `python3` if that is the installed command).

5. A successful preparation report permits generation without a manual upload. A missing package alone does not imply that this environment cannot generate HTML. Do not claim a successful download or smoke build unless it ran. Once acquired, the package builds offline.

When Python is available, save the helper from its direct source and run `python prepare_conversation.py --out paper-notebook-runtime`. It returns a JSON report after a real smoke build. Use `--archive /path/to/uploaded.zip` only when a package is already available or automatic acquisition failed. A `runtime_invalid` report means verification or building failed; fix that error instead of treating it as a missing attachment. Node-only environments can download/extract with their file tools and use the bundled Node commands above.

## Prepare the brief

1. If reference-material status is unknown, the first response only asks the user to upload files or reply “没有文件”. Mention that reliable sources will be researched when possible if no files are supplied. End the turn and wait.
2. After material status is clear, inspect supplied files. Use the host's native choice controls when available; otherwise ask concise numbered questions. Ask only for missing topic, goal, prior knowledge, scope, time, language, difficulty, exercise preference and material fidelity. Keep prior answers.
3. Once the brief is sufficient, summarize scope briefly and begin. Do not add another approval step.

## Build the file

1. Use the extracted runtime, whether downloaded automatically or supplied as an attachment. It contains the single-file reader template, shared schema, blank source, references, bundled Node CLI and Python standard-library builder.
2. Read `references/notebook.schema.json`, `references/content-contract.md`, `references/components.md`, `references/writing.md` and `references/reader-output.md`. Use `assets/blank-notebook.json` as the source. For updates, preserve notebook and entity IDs and set `extensions.baseRevision`.
3. Create `notebook.json` with the complete lesson, embedded visuals and verified sources. Follow the material/OCR rules in `references/ocr-workflow.md` when relevant. Keep personal study records separate from the authored lesson.
4. In the package directory, use the runtime verified above: `node scripts/notebook.mjs validate notebook.json` and `node scripts/notebook.mjs build notebook.json --out output`, or `python scripts/build_reader.py notebook.json --out output`. Fix validation or build errors and rebuild. Neither route needs network access or installed dependencies.
5. Read `output/build-report.json`, verify that the named HTML exists, is nonempty, embeds the exact authored JSON in the `notebook-data` script, and contains the bundled reader with no `/src/` or missing runtime references. Never attach the repository's source `index.html`, a downloaded error page, an empty template or a URL renamed as HTML. Open the actual HTML with network disabled when browser tools are available; check visible lesson content and report unrun checks truthfully.
6. Attach the actual generated `output/<教程名>-v<版本>.html` as the response download. Tell the user to save it and open the saved file in a browser; chat or operating-system previews may not execute its interactive reader. Markdown/TXT, raw HTML text, JSON and ZIP are not the final deliverable by default.

If the current conversation cannot obtain the runtime through either direct download or accessible files, run either supported runtime or attach a generated file, state the specific missing capability. Do not substitute another format or pretend an attachment exists. Preserve completed work if the user needs to provide the missing package.
