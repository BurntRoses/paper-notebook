"""Advisory writing/figure/asset review. Shared rules; source is never modified."""
import json
from pathlib import Path
import re
from study_quality import block_text

RULES = json.loads((Path(__file__).resolve().parents[1] / 'references/writing-rules.json').read_text(encoding='utf-8'))
LITERALS = re.compile(r'```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]*?\$\$|\$[^$\n]+\$|https?://[^\s)]+')

def units(text):
    return len(text.encode('utf-16-le', errors='surrogatepass')) // 2


def review_content(doc):
    warnings, pages = [], []
    def inspect(value, location):
        if not isinstance(value, str):
            return
        safe = LITERALS.sub(lambda m: ' ' * len(m[0]), value)
        for rule in RULES:
            for hit in re.finditer(rule['pattern'], safe):
                start = units(value[:hit.start()])
                raw = value.encode('utf-16-le', errors='surrogatepass')
                context = raw[max(0, start-20)*2:(start+units(hit[0])+40)*2].decode('utf-16-le', errors='surrogatepass')
                warnings.append(dict(rule=rule['id'], location=location, at=start, phrase=hit[0], context=context, guidance=rule['guidance']))
    book = doc['notebook']
    inspect(book['title'], 'notebook.title');inspect(book.get('subtitle'), 'notebook.subtitle')
    for i, goal in enumerate(book['goals']):inspect(goal, 'goals.'+str(i))
    image_ids = set()
    for chapter in book['chapters']:
        inspect(chapter['title'], chapter['id']+'.title')
        for page in chapter['pages']:
            for key in ['title', 'subtitle', 'summary']:inspect(page.get(key), page['id']+'.'+key)
            for cue in page.get('cues', []):inspect(cue['text'], cue['id'])
            characters = figures = tables = 0
            for b in page['blocks']:
                characters += units(block_text(b));figures += b['type'] in ['image','diagram','chart'];tables += b['type']=='comparison'
                if b['type']=='image':image_ids.add(b.get('assetId'))
                if b['type'] in ['quote','code']:continue
                for key in ['title','text','question','prompt','result','explanation','caption','alt','xLabel','yLabel']:inspect(b.get(key), b['id']+'.'+key)
                for key in ['items','steps','options']:
                    for item in b.get(key, []):inspect(item['text'], item['id'])
                for i, p in enumerate(b.get('parameters', [])):
                    for key in ['name','description']:inspect(p[key], f"{b['id']}.parameters.{i}.{key}")
                for i, cell in enumerate(b.get('columns', [])+[v for row in b.get('rows', []) for v in row]):inspect(cell, f"{b['id']}.cells.{i}")
                labels = b.get('nodes', [])+b.get('edges', [])+b.get('series', [])
                for i, label in enumerate(labels):inspect(label.get('label'), f"{b['id']}.labels.{i}")
                for pair in b.get('pairs', []):
                    for key in ['left','right']:inspect(pair[key], pair['id']+'.'+key)
                study=b.get('study', {})
                for key in ['aside','label']:inspect(study.get(key), b['id']+'.study.'+key)
                for i, e in enumerate(study.get('explanations', [])):inspect(e['note'], f"{b['id']}.study.explanations.{i}")
            pages.append(dict(pageId=page['id'], characters=characters, figures=figures, tables=tables))
    assets = sorted([dict(assetId=a['id'], used=a['id'] in image_ids, bytes=(len(a['data'])-a['data'].index(',')-1)*3//4 if ';base64,' in a['data'] else len(a['data'].encode())) for a in doc['assets']], key=lambda a: -a['bytes'])
    visual_warnings=[]
    if any(p['characters']>=300 and pages[i-1]['characters']>=300 and not p['figures'] and not pages[i-1]['figures'] for i,p in enumerate(pages) if i>0):visual_warnings.append('连续讲解缺少实际配图；按关系、空间、数值等教学需要增加图解。表格单独计数。')
    for a in assets:
        if not a['used']:visual_warnings.append(a['assetId']+': 未引用素材，检查是否仍供原图追溯。')
        if a['bytes']>300000:visual_warnings.append(a['assetId']+': 素材超过 300 KB，核对显示尺寸与文字清晰度后压缩。')
    return dict(advisory=True, automaticRewrite=False, writing=dict(warnings=warnings), visuals=dict(pages=pages,figures=sum(p['figures'] for p in pages),tables=sum(p['tables'] for p in pages),warnings=visual_warnings), assets=assets)
