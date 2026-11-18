# Paper Notebook — entry point for AI and coding agents

Paper Notebook turns study materials into an illustrated, interactive notebook.
The required artifact is one offline HTML file with the original reader and
editable notebook data embedded.

## Conversation model with tools and file attachments

1. Reuse an attached Paper Notebook ZIP if one is present. Otherwise fetch
   [the portable runtime ZIP](https://burntroses.github.io/paper-notebook/downloads/paper-notebook-conversation.zip).
   Check the [runtime manifest](https://burntroses.github.io/paper-notebook/downloads/runtime.json)
   when reusing a previously extracted runtime.
2. Read `paper-notebook/START-HERE.md` and follow its links to the skill,
   content schema, brief and quality workflow. Use the bundled Node CLI or
   the Python standard-library tools in the extracted package.
3. Build and verify the HTML against the authored source and bundled reader,
   record the required chapter review and finalize the result. Attach the
   actual HTML file to the conversation.
4. If fetching fails, ask for [the upload ZIP](https://burntroses.github.io/paper-notebook/downloads/paper-notebook-upload.zip).
   Both the outer ZIP and its inner `paper-notebook-conversation.zip` work.
   After upload, use the existing materials and answers. If the conversation
   cannot create and return files, say so and suggest a file-capable session.

## Coding agent with a workspace

Read [AGENTS.md](https://raw.githubusercontent.com/BurntRoses/paper-notebook/main/AGENTS.md)
and the [Paper Notebook skill](https://raw.githubusercontent.com/BurntRoses/paper-notebook/main/skills/paper-notebook/SKILL.md)
in the [repository](https://github.com/BurntRoses/paper-notebook).
Follow the skill, build, verify and leave the finalized HTML in the workspace.
