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
    anchors=dict(declared=0,resolved=0,exact=0,blockLevel=0,degraded=0)
    by_kind, marked_pages, unmarked_pages, invalid_targets = {}, [], [], []
    total = text_blocks = 0
    missing_bold_pages, missing_color_pages = [], []
    for chapter in document['notebook']['chapters']:
        for page in chapter['pages']:
            for cue in page.get('cues',[]):
                anchors['declared']+=1
                source=next((b for b in page['blocks'] if b['id']==cue.get('blockId')),None)
                location=page['id']+'.cues.'+cue['id']
                if not source:raise ValueError(location+'.blockId: reference a block on this page')
                if cue.get('anchor'):
                    if cue['anchor'] not in block_text(source):raise ValueError(location+'.anchor: must match source text')
                    anchors['exact']+=1
                elif source['type'] in ['image','diagram','chart']:anchors['blockLevel']+=1
                else:raise ValueError(location+'.anchor: missing exact source phrase; anchors must not be silently removed')
                anchors['resolved']+=1
            page_marks, has_text = 0, False
            page_kinds = set()
            for block in page['blocks']:
                for i,e in enumerate(block.get('study',{}).get('explanations',[])):
                    if e['text'] not in block.get('text',''):raise ValueError(f"{page['id']}.{block['id']}.study.explanations.{i}.text: must match code/source text")
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
                    page_kinds.add(mark['kind'])
            if page_marks:
                marked_pages.append(page['id'])
            elif has_text:
                unmarked_pages.append(page['id'])
            if has_text and 'bold' not in page_kinds:
                missing_bold_pages.append(page['id'])
            if has_text and 'red' not in page_kinds:
                missing_color_pages.append(page['id'])
    required = text_blocks > 0 and not allow_unmarked
    if invalid_targets:
        raise ValueError('Authored study mark must match actual block text: ' + '; '.join(invalid_targets))
    if required and not total:
        raise ValueError('No authored study marks in this tutorial. Add sparse study.marks anchored to exact source phrases before delivery. Use --allow-unmarked only when the user explicitly requested unmarked content.')
    if required and (not by_kind.get('bold') or not by_kind.get('red')):raise ValueError('Tutorial emphasis requires authored bold and colored core concepts across the document; there is no per-page quota.')
    return {'anchors':anchors,'valid': True, 'required': required, 'total': total, 'byKind': by_kind,
            'markedPages': marked_pages, 'unmarkedPages': unmarked_pages, 'invalidTargets': invalid_targets,
            'typography': {'bold': by_kind.get('bold', 0), 'coloredText': by_kind.get('red', 0),
                           'missingBoldPages': missing_bold_pages, 'missingColorPages': missing_color_pages}}
