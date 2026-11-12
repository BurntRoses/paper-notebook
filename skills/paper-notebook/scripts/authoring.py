"""Small authoring helpers. No silent repair, global ID counter or fixed metadata.
Use the standard builder and finalize gate; this module does not create a reader.
"""
from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path
from uuid import uuid4
from build_reader import build, validate, check_references
from study_quality import block_text, check_study_marks

def entity_id(prefix):return prefix+'-'+uuid4().hex

def emphasize(block, phrase, kinds=('bold','red'), color='#285f9e'):
    if not phrase or phrase not in block_text(block):raise ValueError(block['id']+'.study.marks.text: phrase must match actual block text')
    result=deepcopy(block);marks=result.setdefault('study',{}).setdefault('marks',[])
    for kind in kinds:
        mark=dict(text=phrase,kind=kind)
        if kind=='red':mark['color']=color
        if mark not in marks:marks.append(mark)
    return result

def code(text, *, title=None, language='python', explanations=None, id=None):
    block=dict(id=id or entity_id('code'),type='code',text=text,language=language)
    if title:block['title']=title
    if explanations:
        if len(explanations)>3:raise ValueError(block['id']+'.study.explanations: maximum 3; split this code block to retain all explanations')
        for i,e in enumerate(explanations):
            if not e.get('text') or e['text'] not in text:raise ValueError(f"{block['id']}.study.explanations.{i}.text: phrase must match code text")
        block['study']=dict(explanations=deepcopy(explanations))
    return block

def exercise(question, options, answer, *, explanation='', id=None):
    bid=id or entity_id('exercise');choices=[dict(id=bid+'-option-'+str(i+1),text=text) for i,text in enumerate(options)]
    if isinstance(answer,str) and len(answer)==1 and 'a'<=answer.lower()<='z':index=ord(answer.lower())-ord('a')
    elif isinstance(answer,int) and not isinstance(answer,bool):index=answer
    else:raise ValueError(bid+'.answer: use a zero-based option index or letter a, b, c…')
    if not 0<=index<len(choices):raise ValueError(f'{bid}.answer: {answer!r} is outside {len(choices)} options')
    return dict(id=bid,type='exercise',question=question,questionType='single',options=choices,solution=[choices[index]['id']],explanation=explanation)

def page(title, blocks, *, cues=None, id=None, **fields):
    pid=id or entity_id('page');lookup={b.get('id'):b for b in blocks}
    if None in lookup or len(lookup)!=len(blocks):raise ValueError(pid+'.blocks.id: every block needs a unique ID')
    notes=[]
    for i,cue in enumerate(cues or []):
        item=deepcopy(cue);item.setdefault('id',entity_id('cue'));block=lookup.get(item.get('blockId'));loc=f'{pid}.cues.{i}'
        if block is None:raise ValueError(loc+'.blockId: reference a block in this page')
        if item.get('anchor'):
            if item['anchor'] not in block_text(block):raise ValueError(loc+'.anchor: phrase must match source text')
        elif block['type'] not in ['image','diagram','chart']:raise ValueError(loc+'.anchor: an exact source phrase is required')
        notes.append(item)
    return dict(id=pid,title=title,blocks=deepcopy(blocks),cues=notes,**fields)

def write(document, output, *, allow_unmarked=False):
    """Author metadata belongs to the caller; revision is never silently reset."""
    base=Path(__file__).resolve().parents[1];doc=deepcopy(document)
    doc['userState']['updatedAt']=datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
    schema=json.loads((base/'references/notebook.schema.json').read_text());validate(doc,schema,schema);check_references(doc);check_study_marks(doc,allow_unmarked)
    output=Path(output);output.mkdir(parents=True,exist_ok=True);source=output/'notebook.json';source.write_text(json.dumps(doc,ensure_ascii=False,indent=2))
    return build(source,base/'assets/reader.html',base/'references/notebook.schema.json',base/'assets/THIRD_PARTY_NOTICES.txt',output,allow_unmarked)


def exploration(title, activity, *, id=None):
    """Native calculations or a verified code/state trace."""
    from exploration import validate_exploration
    bid=id or entity_id('exploration')
    if activity.get('kind')!='plot' and not (activity.get('kind')=='sequence' and activity.get('trace')):
        raise ValueError(bid+'.exploration: text-only panels use prose/quote blocks; sequence requires code and variable snapshots')
    validate_exploration(activity,bid)
    return dict(id=bid,type='exploration',title=title,exploration=deepcopy(activity))
