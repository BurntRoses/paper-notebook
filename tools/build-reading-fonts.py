"""Rebuild compact web fonts from the retained WenKai sources.

Developer-only: fonttools[woff]. Generated WOFF2 files are checked in; normal
Node/Python notebook builds need no font tooling or network access.
"""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from hashlib import sha256
import json
import shutil
from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/fonts'
DESTINATION = SOURCE / 'reading'
CHUNK = 64


def unicode_ranges(points):
    runs = []
    for point in sorted(points):
        if runs and point == runs[-1][1] + 1:
            runs[-1][1] = point
        else:
            runs.append([point, point])
    return ','.join(f'U+{a:X}' + (f'-{b:X}' if a != b else '') for a, b in runs)


def build_piece(task):
    source, filename, points = task
    font = TTFont(source, recalcTimestamp=False)
    options = subset.Options()
    options.recalc_timestamp = False
    worker = subset.Subsetter(options=options)
    worker.populate(unicodes=points)
    worker.subset(font)
    target = DESTINATION / filename
    font.save(target)
    # Subsetting must retain exact cmap coverage and outline geometry/metrics.
    original = TTFont(source)
    result = TTFont(target)
    assert set(points) <= set(result.getBestCmap())  # shaping closure can retain mirrored partners
    for point in points:
        a = original.getBestCmap()[point]
        b = result.getBestCmap()[point]
        assert original['hmtx'][a] == result['hmtx'][b]
        assert original['glyf'][a].getCoordinates(original['glyf'])[0] == result['glyf'][b].getCoordinates(result['glyf'])[0]
    return filename, points, target.stat().st_size


def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    # GB2312 includes common Chinese characters, symbols and kana. Retain the
    # previous UI core plus Greek/Cyrillic and common scientific symbols.
    allowed = set()
    for first in range(0xA1, 0xF8):
        for second in range(0xA1, 0xFF):
            try:
                allowed.update(map(ord, bytes([first, second]).decode('gb2312')))
            except UnicodeDecodeError:
                pass
    for start, end in [(0x20, 0x250), (0x370, 0x530), (0x2000, 0x2070), (0x2190, 0x2300)]:
        allowed.update(range(start, end))
    core_source = SOURCE / 'wenkai-reading-core.woff2'
    core = sorted(TTFont(core_source).getBestCmap())
    allowed.update(core)
    shutil.copyfile(core_source, DESTINATION / 'core.woff2')
    pieces = [('core.woff2', core, core_source.stat().st_size)]
    tasks = []
    all_points = set(core)
    for source in sorted(SOURCE.glob('wenkai-reading-[0-9][0-9].woff2')):
        points = sorted(set(TTFont(source).getBestCmap()) & allowed)
        all_points.update(points)
        for index in range(0, len(points), CHUNK):
            tasks.append((str(source), f'{source.stem[-2:]}-{index // CHUNK:02}.woff2', points[index:index + CHUNK]))
    with ProcessPoolExecutor(max_workers=4) as workers:
        pieces.extend(workers.map(build_piece, tasks))
    css = '\n'.join("@font-face{font-family:StudyHand;src:url('../../assets/fonts/reading/" + name + "') format('woff2');font-weight:400;font-display:swap;unicode-range:" + unicode_ranges(points) + ';}' for name, points, size in pieces) + '\n'
    (ROOT / 'src/reader/fonts.css').write_text(css)
    report = {'policy': 'GB2312, existing UI core, Greek/Cyrillic and common scientific symbols; other characters remain in text and use system fonts', 'chunkGlyphs': CHUNK, 'coverage': len(all_points), 'bytes': sum(size for name, points, size in pieces), 'outlineAndMetricsVerified': True, 'files': [{'path': 'assets/fonts/reading/' + name, 'glyphs': len(points), 'bytes': size, 'sha256': sha256((DESTINATION / name).read_bytes()).hexdigest()} for name, points, size in pieces]}
    (DESTINATION / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'files'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
