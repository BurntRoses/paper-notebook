"""Export the reader's title glyph outlines, without raster screenshot scaling."""
from pathlib import Path
from xml.sax.saxutils import escape
import json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'production/promo/story/titles'
OUT.mkdir(parents=True, exist_ok=True)
pages = json.loads((ROOT / 'examples/product-notebook.json').read_text())['notebook']['chapters'][0]['pages']
fonts = []
needed = set(''.join(page['title'] for page in pages))
for path in [ROOT / 'assets/fonts/reading/core.woff2', *sorted((ROOT / 'assets/fonts/reading').glob('[0-9]*.woff2'))]:
    font = TTFont(path)
    cmap = font.getBestCmap()
    if needed.intersection(map(chr, cmap)):
        fonts.append((font, cmap))
        needed.difference_update(map(chr, cmap))
    if not needed:
        break
if needed:
    raise ValueError('Missing title glyphs: ' + ''.join(sorted(needed)))

for page in pages:
    x = 0
    outlines = []
    bounds = []
    for char in page['title']:
        font, cmap = next((font, cmap) for font, cmap in fonts if ord(char) in cmap)
        glyphs = font.getGlyphSet()
        name = cmap[ord(char)]
        scale = 36 / font['head'].unitsPerEm
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        if pen.getCommands():
            outlines.append(f'<path transform="translate({x:.5f} 0) scale({scale} {-scale})" stroke-width="{.25 / scale:.5f}" d="{pen.getCommands()}"/>')
            box = BoundsPen(glyphs)
            glyphs[name].draw(box)
            a, b, c, d = box.bounds
            bounds.append((x + a * scale, -d * scale, x + c * scale, -b * scale))
        x += font['hmtx'][name][0] * scale + .36
    left = min(box[0] for box in bounds) - 8
    top = min(box[1] for box in bounds) - 8
    width = max(box[2] for box in bounds) - left + 8
    height = max(box[3] for box in bounds) - top + 8
    # The reader uses this regular face with a 600 CSS weight. A small matching
    # outline stroke retains that visual weight without borrowing a new font.
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:.5f}" height="{height:.5f}" viewBox="{left:.5f} {top:.5f} {width:.5f} {height:.5f}"><title>{escape(page["title"])}</title><g fill="#2b5268" stroke="#2b5268" stroke-linejoin="round">' + ''.join(outlines) + '</g></svg>'
    target = OUT / (page['id'] + '.svg')
    target.write_text(svg)
    print(target.relative_to(ROOT))
