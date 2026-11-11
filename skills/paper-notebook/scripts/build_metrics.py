"""Source counts, capacity warnings and declared bundled-font coverage."""
import re
from study_quality import block_text
from editorial_metrics import reader_fields

def build_metrics(d,template=''):
    pages=[p for c in d['notebook']['chapters'] for p in c['pages']];blocks=[b for p in pages for b in p['blocks']];ranges=[]
    for face in re.findall(r'@font-face\s*\{[^{}]*\}',template):
        if re.search(r'font-family:\s*["\']?StudyHand\b',face):
            value=re.search(r'unicode-range:\s*([^;}]+)',face,re.I)
            if value:
                for hit in re.finditer(r'U\+([\da-f]+)(?:-([\da-f]+))?',value[1],re.I):ranges.append((int(hit[1],16),int(hit[2] or hit[1],16)))
    locations={}
    for p in pages:
        fields=[(p['id'],p['title'])]+[(v['id'],v['text']) for v in p.get('cues',[])]
        for b in p['blocks']:fields.extend([(b['id'],block_text(b))]+[(b['id']+'.'+k,v) for k,v in reader_fields(b)])
        for loc,value in fields:
            for c in dict.fromkeys(value):
                if not c.isspace() and ranges and not any(lo<=ord(c)<=hi for lo,hi in ranges):
                    if loc not in locations.setdefault(c,[]):locations[c].append(loc)
    warnings=[]
    for kind,used,limit in [('pages',len(pages),500),('blocks',len(blocks),5000)]:
        if used>=limit*.8:warnings.append(dict(kind=kind,used=used,limit=limit,action=f'Split the source into volumes before the {limit}-'+('page' if kind=='pages' else 'block')+' limit.'))
    return dict(statistics=dict(pages=len(pages),blocks=len(blocks),characters=sum(len(block_text(b).encode('utf-16-le'))//2 for b in blocks),figures=sum(b['type'] in ['image','diagram','chart'] for b in blocks),tables=sum(b['type']=='comparison' for b in blocks),marks=sum(len(b.get('study',{}).get('marks',[])) for b in blocks)),capacity=dict(limits=dict(pages=500,blocks=5000),warnings=warnings),fonts=dict(checked=bool(ranges),basis='Bundled StudyHand unicode-range; uncovered characters use system fallback, not proven missing glyphs.',fallbackCharacters=[dict(character=c,codePoint='U+'+format(ord(c),'04X'),locations=locs) for c,locs in locations.items()]))
