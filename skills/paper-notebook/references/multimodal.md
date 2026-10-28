# Material and image decisions

For PDFs, documents, photographs and scans, run OCR page by page before layout. Preserve raw text and page locators, record confidence or uncertain characters, then keep corrections and the controlled terminology list separate from the raw source. In strict question-bank or handout mode, source wording, answers and order are authoritative; never silently rewrite them.

Inventory uploaded files before searching. Record source, locator, rights and whether each asset is original or derived. With no network, use supplied evidence and deterministic drawings; state missing evidence. With network access, prefer primary documentation and reusable assets with explicit licenses.

Use editable diagrams for processes, dependencies, comparisons and measurements. `diagram` nodes/edges suit small relationship maps; create structured SVG assets for technical geometry or data plots. Keep the underlying numbers, coordinates and units in `extensions` or source files. Do not replace measured data with a decorative curve.

Use photos for identification and complex real scenes. Ask once about visual treatment when uniform style would help: retain original; programmatic pencil treatment; model redraw (may consume tokens). Keep originals and use `originalAssetId` on derivatives. Programmatic filters also need a readability check, especially for small labels. A redraw is not evidence of scientific accuracy.

After transformation compare object count, direction, proportions, units, labels and relationships to the original. Keep important text as editable blocks or SVG text; never trust generated lettering for formulas or dimensions. Set `verified` only after a real check, and record unresolved differences in the caption. Give images meaningful alt text.

Source materials: ambientCG and Poly Haven provide CC0 assets; their license pages are linked in `docs/assets.md`. Other materials retain their own conditions. Include actual required notices with distributed files.

## Plan useful illustrations before drafting

For each concept, ask what a picture reveals: a spatial relation, change over time, data pattern, causal path, hierarchy or comparison. Write a short visual plan beside the outline, then produce actual figures. A systematic tutorial normally has one explanatory illustration every one or two content pages where the subject supports it. Tables count separately. A photograph, cover ornament or repeated three-box arrow is not a substitute for an explanatory figure.

Default to a restrained hand-drawn appearance: paper palette, pencil contours, light hatching, clear live-text labels and numbered callouts. Use a mixture of coordinate plots, annotated objects, regions, timelines, branching processes and local details as appropriate. The nine native node shapes are available for small maps; use custom SVG for spatial or technical structures. Precise plots keep exact data coordinates, tick positions and scales. Set `figure.style: "precise"` for geometry where a secondary pencil contour would obscure the measurement.

Choose production by the information needed:

- SVG / native `diagram` / `chart`: preferred for relationships, math, data, geometry and clean technical labels. Supply a `viewBox`, accessible title/alt, explicit dimensions and a meaningful caption. Keep source numbers and units.
- Image generation, when the host provides it: use for concepts that benefit from illustrated objects, complex scenes or organic structure. Generate only images used in the lesson, request paper/pencil style, and typeset labels/formulas separately. Inspect the result before embedding; a plausible-looking image is not evidence. Do not call a nonexistent image tool or promise an uncreated image. Use SVG when it conveys the same knowledge clearly.
- Existing photographs/scans: retain useful originals and provenance. Follow the earlier one-time redraw choice for user-supplied visuals. Do not generate a raster copy of a diagram that already works as SVG.

Use `figure` presets from the component catalog. Plan ratio and available column width before generating a bitmap. Small details suit 1:1; object-plus-label diagrams suit 4:3 or 3:2; horizontal processes suit 16:9; vertical anatomy or timelines suit 3:4. `auto` fits an SVG's own geometry. A wide technical figure should use a `reading` page; `full` fills that page's content column. Do not shrink long labels to fit a narrow Cornell column.

For raster assets set `width` and `height` to the actual pixel dimensions. The reader reserves the complete figure viewport before lazy decoding, so image load does not alter pagination. Use `contain`; never crop arrows, scales, legends or captions. Default to roughly 800–1600 pixels on the long edge at the intended display size. Prefer compact WebP/JPEG for photos and SVG for diagrams. Check small labels after compression. A typical teaching illustration should stay below 300 KB; larger assets need a concrete detail benefit. Do not embed unused variants, complete font libraries or hidden source images merely for possible future editing.

Review the build report's `contentReview.visuals` and `assets`: actual illustrations, tables, pages without figures, unused assets and large assets. Remove low-value unused media unless required for source tracing; report material size tradeoffs rather than silently sacrificing legibility. Finish with offline HTML inspection at desktop and mobile sizes, including delayed image decoding and export/reopen.
