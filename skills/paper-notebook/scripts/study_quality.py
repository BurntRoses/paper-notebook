"""Check authored emphasis without generating marks or changing the lesson."""


def block_text(block):
    if block['type'] == 'comparison':
        return '\n'.join(block.get('columns', []) + [cell for row in block.get('rows', []) for cell in row])
    primary = block.get('text') or block.get('question') or block.get('prompt') or block.get('latex') or ''
    items = block.get('items') if 'items' in block else block.get('steps', [])
    parts = [primary] + [item['text'] for item in items] + [block.get('result', '')]
    parts += [parameter['name'] + '：' + parameter['description'] for parameter in block.get('parameters', [])]
    return '\n'.join(part for part in parts if part)


def check_study_marks(document, allow_unmarked=False):
    by_kind, marked_pages, unmarked_pages, invalid_targets = {}, [], [], []
    total = text_blocks = 0
    for chapter in document['notebook']['chapters']:
        for page in chapter['pages']:
            page_marks, has_text = 0, False
            for block in page['blocks']:
                text = block_text(block)
                if text.strip():
                    text_blocks += 1
                    has_text = True
                for mark in block.get('study', {}).get('marks', []):
                    if not mark['text'].strip() or mark['text'] not in text:
                        invalid_targets.append(block['id'] + ': ' + mark['text'])
                        continue
                    total += 1
                    page_marks += 1
                    by_kind[mark['kind']] = by_kind.get(mark['kind'], 0) + 1
            if page_marks:
                marked_pages.append(page['id'])
            elif has_text:
                unmarked_pages.append(page['id'])
    required = text_blocks > 0 and not allow_unmarked
    if invalid_targets:
        raise ValueError('Authored study mark must match actual block text: ' + '; '.join(invalid_targets))
    if required and not total:
        raise ValueError('No authored study marks in this tutorial. Add sparse study.marks anchored to exact source phrases before delivery. Use --allow-unmarked only when the user explicitly requested unmarked content.')
    return {'valid': True, 'required': required, 'total': total, 'byKind': by_kind,
            'markedPages': marked_pages, 'unmarkedPages': unmarked_pages, 'invalidTargets': invalid_targets}
