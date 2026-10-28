"""Reject a custom HTML shell even when it contains valid notebook JSON."""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import re

DATA = re.compile(r'(<script\b[^>]*\bid=["\']notebook-data["\'][^>]*>)([\s\S]*?)(</script>)')
FACE = re.compile(r'@font-face\s*\{[^{}]*\}')


def reading_faces(text):
    return [m[0] for m in FACE.finditer(text)
            if re.search(r'font-family:\s*["\']?StudyHand\b', m[0])]


def shell(text):
    text, count = DATA.subn(lambda m: m[1] + m[3], text)
    if count != 1:
        raise ValueError('Expected exactly one notebook-data slot')
    text = re.sub(r'<title>[^<]*</title>', '<title></title>', text, count=1)
    return FACE.sub(lambda m: '' if re.search(r'font-family:\s*["\']?StudyHand\b', m[0]) else m[0], text)


def verify(artifact, template, source=None):
    original = template.read_text(encoding='utf-8')
    html = artifact.read_text(encoding='utf-8')
    if not all(marker in original for marker in ['page-surface', 'reader-content', 'StudyHand']):
        raise ValueError('The reference must be the bundled Paper Notebook assets/reader.html')
    if shell(html) != shell(original):
        raise ValueError('Reader shell differs from the bundled template. Do not deliver a custom HTML/CSS/JS reader; rebuild with the supplied builder.')
    allowed = set(reading_faces(original))
    actual = reading_faces(html)
    core = [face for face in allowed if re.search(r'U\+20-7E\b', face, re.I)]
    if not actual or any(face not in allowed for face in actual) or any(face not in actual for face in core):
        raise ValueError('The bundled reading fonts were removed or replaced')
    embedded = json.loads(DATA.search(html)[2])
    if source is not None and embedded != json.loads(source.read_text(encoding='utf-8-sig')):
        raise ValueError('Embedded notebook data differs from the authored source')
    return {'valid': True, 'bundledReaderMatches': True,
            'sourceMatches': source is not None,
            'readerShellSHA256': sha256(shell(original).encode()).hexdigest(),
            'htmlBytes': artifact.stat().st_size}


if __name__ == '__main__':
    base = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('artifact', type=Path)
    parser.add_argument('--template', type=Path, default=base / 'assets/reader.html')
    parser.add_argument('--source', type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.artifact, args.template, args.source)))
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, str(error) + '\n')
