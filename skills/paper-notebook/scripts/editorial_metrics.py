"""Observable text distributions; none of these counts certify writing quality."""
import re
from study_quality import block_text

def reader_fields(b):
    values=[]
    for key in ['title','text','question','prompt','result','explanation','caption','alt','xLabel','yLabel','attribution']:
        if not (key=='text' and b['type'] in ['quote','code']):values.append((key,b.get(key)))
    for key in ['items','steps','options']:
        for i,v in enumerate(b.get(key,[])):values.append((f'{key}.{i}',v['text']))
    for i,p in enumerate(b.get('parameters',[])):
        for key in ['name','description']:values.append((f'parameters.{i}.{key}',p[key]))
    for i,v in enumerate(b.get('columns',[])+[v for row in b.get('rows',[]) for v in row]):values.append((f'cells.{i}',v))
    for i,v in enumerate(b.get('nodes',[])+b.get('edges',[])+b.get('series',[])):values.append((f'labels.{i}',v.get('label')))
    for i,p in enumerate(b.get('pairs',[])):
        for key in ['left','right']:values.append((f'pairs.{i}.{key}',p[key]))
    study=b.get('study',{})
    for key in ['aside','label']:values.append(('study.'+key,study.get(key)))
    for i,e in enumerate(study.get('explanations',[])):values.append((f'study.explanations.{i}',e['note']))
    if b.get('exploration'):
        a=b['exploration']
        if a['kind']=='plot':
            values.extend((f'exploration.parameters.{i}',v['label']) for i,v in enumerate(a['parameters']))
            values.extend([('exploration.domain',a['domain']['label']),('exploration.yLabel',a['yLabel'])])
            values.extend((f'exploration.labels.{i}',v['label']) for i,v in enumerate(a['series']+a['outputs']))
        else:
            for i,f in enumerate(a['frames']):
                values.extend([(f'exploration.frames.{i}.label',f['label']),(f'exploration.frames.{i}.text',f['text'])])
                values.extend((f'exploration.frames.{i}.facts.{j}',v['label']+'：'+v['value']) for j,v in enumerate(f.get('facts',[])))
    return [(k,v) for k,v in values if isinstance(v,str) and v]

def editorial_metrics(d):
    entries=[];pages=[p for c in d['notebook']['chapters'] for p in c['pages']]
    for c in d['notebook']['chapters']:
        entries.append((c['id']+'.title',c['title']))
        for p in c['pages']:
            entries.extend((p['id']+'.'+k,p[k]) for k in ['title','subtitle','summary'] if p.get(k))
            entries.extend((v['id'],v['text']) for v in p.get('cues',[]))
            for b in p['blocks']:entries.extend((b['id']+'.'+k,v) for k,v in reader_fields(b))
    prose=[(loc,re.sub(r'```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]*?\$\$|\$[^$\n]+\$|https?://[^\s)]+','',s)) for loc,s in entries]
    text='\n'.join(v for _,v in prose);characters=len(text)
    rnd=lambda n:int(n*10+.5)/10
    frequency=[dict(phrase=phrase,count=text.count(phrase),per10000=rnd(text.count(phrase)*10000/max(1,characters))) for phrase in ['这','这个','这里','一个','可以','需要','并','同时','所以','因此','把','让','使']]
    lengths=[len(v.strip()) for _,s in prose for v in re.split(r'[。！？!?]+',s) if v.strip()]
    paragraphs=[len(v.strip()) for _,s in prose for v in re.split(r'\n\s*\n',s) if v.strip()];ordered=sorted(paragraphs);seen={}
    for loc,s in prose:
        for sentence in re.split(r'[。！？!?]+',s):
            key=re.sub(r'\s','',sentence)
            if len(key)>=18:seen.setdefault(key,[]).append(loc)
    repetitions=[dict(text=s,locations=locs) for s,locs in seen.items() if len(locs)>1]
    terminology=d.get('extensions',{}).get('terminology',[])
    consistency=dict(terminology=[dict(term=t['term'],variants=[dict(form=form,locations=[loc for loc,s in prose if form in s]) for form in [t['term']]+[v for v in t.get('aliases',[]) if isinstance(v,str)]]) for t in terminology if isinstance(t,dict) and isinstance(t.get('term'),str)],chapterReferences=[dict(location=loc,phrase=hit[0],chapter=int(hit[1]),inRange=1<=int(hit[1])<=len(d['notebook']['chapters'])) for loc,s in prose for hit in re.finditer(r'第\s*(\d+)\s*章',s)])
    cues=[v for p in pages for v in p.get('cues',[])];figures=sum(b['type'] in ['image','diagram','chart'] for p in pages for b in p['blocks']);brief=d['notebook'].get('brief')
    return dict(consistency=consistency,basis='Observable signals for editorial review; zero matches is not editorial approval.',characters=characters,frequency=frequency,
        sentences=dict(count=len(lengths),mean=rnd(sum(lengths)/max(1,len(lengths))),bins=dict(upTo15=sum(n<=15 for n in lengths),from16To30=sum(15<n<=30 for n in lengths),from31To40=sum(30<n<=40 for n in lengths),over40=sum(n>40 for n in lengths))),
        paragraphs=dict(count=len(paragraphs),mean=rnd(sum(paragraphs)/max(1,len(paragraphs))),median=(ordered[(len(ordered)-1)//2]+ordered[len(ordered)//2])/2 if ordered else 0),repetitions=repetitions,
        cues=dict(total=len(cues),questions=sum(bool(re.search(r'[？?]\s*$',v['text'])) for v in cues),unique=len(set(re.sub(r'\s','',v['text']) for v in cues)),pagesWithout=[p['id'] for p in pages if not p.get('cues')]),
        figures=dict(total=figures,pages=len(pages),pagesPerFigure=rnd(len(pages)/figures) if figures else None),
        brief={k:brief.get(k,'') for k in ['termPolicy','languageStyle','scope','materialFidelity']} if brief else None,
        chapters=[dict(chapterId=c['id'],pages=len(c['pages']),characters=sum(len(block_text(b).encode('utf-16-le'))//2 for p in c['pages'] for b in p['blocks'])) for c in d['notebook']['chapters']])
