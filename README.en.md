# Paper Notebook

Turn lecture notes, book pages and questions into illustrated study notes with AI. Read explanations alongside formulas, diagrams and worked examples, then mark passages, annotate figures and save questions.

[Try the reader](https://burntroses.github.io/paper-notebook/#read) · [Create a notebook](https://burntroses.github.io/paper-notebook/#create) · [Watch the demo](https://burntroses.github.io/paper-notebook/#film) · [中文](README.md)

![Parameter controls, prediction curves and margin annotations](public/promo/paper-landscape-3.jpg?v=3.19)

## Features

- **Illustrated lessons**: concepts, formulas, derivations, charts and worked examples organized into chapters, with key passages marked for review.
- **In-page activities**: adjust parameters to compare curves and calculated results, examine a process step by step, or read commentary alongside selected passages.
- **Text marks**: select a passage to apply bold, color, underlines or circles. Undo and redo your changes.
- **Figure annotations**: enlarge a figure and draw lines, circles, arrows or short labels on it.
- **Margin notes**: double-click the right or bottom margin to add a note. Choose a color and collapse longer notes.
- **Exercises and follow-up**: check answers, bookmark passages and save questions. Export them with the source context for further explanation from AI.
- **Reading and export**: choose single-page, two-page or continuous reading; adjust paper, fonts and spacing; save an annotated HTML or export a PDF.

The live reader includes examples in machine learning, compound interest, statistics, literature, business and programming.

## Get started

1. Open the [creation page](https://burntroses.github.io/paper-notebook/#create) and copy the instruction.
2. Send it with your lecture notes, PDFs, images or questions to an AI tool that can run code and create files.
3. Describe your learning goals and prior knowledge, then open the generated HTML to read and annotate it.

You can also send:

```text
Read https://github.com/BurntRoses/paper-notebook and follow the repository instructions to create study notes for me.
```

Import an existing notebook to keep working on it. Downloaded copies include your annotations, notes, bookmarks and answers. Export questions with the relevant passages when you want AI to expand an explanation or add examples.

## Documentation

[User guide](docs/first-use.md) · [Notebook creation instructions](skills/paper-notebook/SKILL.md) · [Content components](docs/components.md) · [Files and export](docs/delivery.md)

<details>
<summary>Local development and CLI</summary>

Requires Node.js 20.19+.

```sh
npm install
npm run build:pages
npm run preview -- --outDir output/site --port 4173
```

Open `http://localhost:4173/`. Use `npm run build` for the complete toolkit or `npm run install-skill` to install the Skill for a coding agent.

```sh
node tools/notebook.mjs validate notebook.json
node tools/notebook.mjs build notebook.json --out output/tutorial
node tools/notebook.mjs verify output/tutorial/<notebook-filename>.html --source notebook.json
npm test
```

[Content contract](docs/content-contract.md) · [Deployment](docs/hosting.md) · [Tests and verification](docs/verification.md)

</details>

## License

[MIT](LICENSE). Third-party resources and licenses are listed in [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt) and [licenses](licenses/).
