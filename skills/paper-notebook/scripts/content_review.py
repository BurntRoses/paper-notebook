"""Advisory writing/figure/asset review. Shared rules; source is never modified."""
import json
from pathlib import Path
import re
from study_quality import block_text
from editorial_metrics import editorial_metrics

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
            for cue in page.get('cues', []):
                inspect(cue.get('title'), cue['id']+'.title');inspect(cue['text'], cue['id'])
            characters = figures = tables = 0
            for b in page['blocks']:
                characters += units(block_text(b));figures += b['type'] in ['image','diagram','chart'];tables += b['type']=='comparison'
                if b['type']=='image':image_ids.add(b.get('assetId'))
                for key in ['title','text','question','prompt','result','explanation','caption','alt','xLabel','yLabel']:
                    if not (key=='text' and b['type'] in ['quote','code']):inspect(b.get(key), b['id']+'.'+key)
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
    for i,p in enumerate(pages):
        if i and p['characters']>=300 and pages[i-1]['characters']>=300 and not p['figures'] and not pages[i-1]['figures']:visual_warnings.append(pages[i-1]['pageId']+', '+p['pageId']+': 连续讲解缺少实际配图；核对这两页是否需要图解。表格单独计数。')
    for a in assets:
        if not a['used']:visual_warnings.append(a['assetId']+': 未引用素材，检查是否仍供原图追溯。')
        if a['bytes']>300000:visual_warnings.append(a['assetId']+': 素材超过 300 KB，核对显示尺寸与文字清晰度后压缩。')
    summary=[]
    for rule in dict.fromkeys(w["rule"] for w in warnings):
        items=[w for w in warnings if w["rule"]==rule]
        summary.append(dict(rule=rule,severity="review",count=len(items),locations=list(dict.fromkeys(w["location"] for w in items)),samples=items[:5]))
    return dict(advisory=True, automaticRewrite=False, writing=dict(warnings=warnings,summary=summary),metrics=editorial_metrics(doc), teaching=review_teaching(doc), visuals=dict(pages=pages,figures=sum(p['figures'] for p in pages),tables=sum(p['tables'] for p in pages),warnings=visual_warnings), assets=assets)


def review_teaching(doc):
    warnings, seen, notes, titled = [], set(), 0, 0
    def compact(text):return re.sub(r'\s', '', text)
    def warn(rule, location, guidance):warnings.append(dict(rule=rule, location=location, guidance=guidance))
    for chapter in doc['notebook']['chapters']:
        for page in chapter['pages']:
            for cue in page.get('cues', []):
                notes += 1;titled += bool(cue.get('title'))
                source = next((b for b in page['blocks'] if b['id']==cue.get('blockId')), None)
                body = compact(cue['text'])
                if source is None:warn('margin-source', cue['id'], '将页边讲解关联到本页实际内容块。')
                elif source['type'] not in ['image','diagram','chart']:
                    if not cue.get('anchor'):warn('margin-anchor', cue['id'], '为文字注释补充所解释的原句 anchor，使说明随原句对齐和续页。')
                    if units(body)>=14 and body in compact(block_text(source)):warn('margin-copy', cue['id'], '右栏与正文逐字重复；补充定义含义、短例子、推理依据或省略此条。')
                if body in seen and body:warn('margin-repeat', cue['id'], '重复的页边说明应就近保留一次。')
                if not body:warn('margin-empty', cue['id'], '页边注释需要完整的说明内容。')
                seen.add(body)
            for block in page['blocks']:
                used = set()
                for mark in block.get('study', {}).get('marks', []):
                    key = (mark['text'], mark['kind'], mark.get('color', ''))
                    if key in used:warn('emphasis-repeat', block['id'], '同一原句的同类作者标记重复，只需保留一次。')
                    used.add(key)
                    if units(mark['text'])>48:warn('emphasis-length', block['id'], '强调范围较长，检查能否收窄到核心概念、关系或决定性条件。')
    return dict(marginNotes=notes, titledNotes=titled, warnings=warnings)
