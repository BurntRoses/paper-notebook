# Final production sources

`promo/story/` retains the eight production-reader pages in both orientations: clean paper PNGs, the exact native SVG annotations, DOM/raster geometry JSON, UI captures and provenance. These files are the current film's rebuild sources, not superseded drafts.

Run `node tools/prepare-product-assets.mjs` from the project root to generate transient full pages and ink reveal frames in ignored `output/promo/story/`, then use `python tools/render-product-film.py` (and `--portrait`) to compose the final movies. `--preview` renders the current posters and contact sheets. The final music WAV/MP3, movies and poster compositions remain in `public/promo/`.

See `docs/promo-production.md` for dependencies and a complete rebuild sequence.
