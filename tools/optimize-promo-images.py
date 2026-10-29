"""Create the small website previews from the preserved production PNGs."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1] / 'public/promo'
for name in ['paper-landscape-2', 'paper-portrait-2', 'story/film-landscape-poster-1', 'story/film-portrait-poster-1']:
    source = root / (name + '.png')
    with Image.open(source) as image:
        image.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
        target = source.with_suffix('.webp')
        image.convert('RGB').save(target, 'WEBP', quality=88, method=6)
        print(f'{source.name}: {source.stat().st_size} -> {target.stat().st_size} bytes')
