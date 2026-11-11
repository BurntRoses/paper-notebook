"""Apply explicit page replacements with optimistic concurrency; preserve all other data."""
import argparse
from copy import deepcopy
from datetime import datetime,timezone
import hashlib,json
from pathlib import Path

def page_hash(page):return hashlib.sha256(json.dumps(page,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def patch_pages(document,patch):
    if patch.get('notebookId')!=document['notebook']['id'] or patch.get('baseRevision')!=document['notebook']['revision']:raise ValueError('Patch notebookId/baseRevision does not match current source')
    result=deepcopy(document);pages={p['id']:p for c in result['notebook']['chapters'] for p in c['pages']};seen=set()
    for entry in patch['pages']:
        pid=entry['pageId'];original=pages.get(pid)
        if pid in seen or not original:raise ValueError(pid+': duplicate or missing patch page')
        if page_hash(original)!=entry['baseSHA256']:raise ValueError(pid+': page changed since patch was authored')
        replacement=entry['page']
        if replacement.get('id')!=pid:raise ValueError(pid+': preserve page ID')
        original.clear();original.update(deepcopy(replacement));seen.add(pid)
    result.setdefault('extensions',{})['baseRevision']=document['notebook']['revision'];result['notebook']['revision']+=1;result['userState']['updatedAt']=datetime.now(timezone.utc).isoformat().replace('+00:00','Z');return result
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source',type=Path);p.add_argument('--patch',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
    try:
        result=patch_pages(json.loads(a.source.read_text()),json.loads(a.patch.read_text()));
        from build_reader import validate,check_references
        from study_quality import check_study_marks
        schema=json.loads((Path(__file__).resolve().parents[1]/'references/notebook.schema.json').read_text());validate(result,schema,schema);check_references(result);check_study_marks(result)
        a.out.write_text(json.dumps(result,ensure_ascii=False,indent=2));print(a.out)
    except (KeyError,ValueError,OSError) as e:p.exit(1,str(e)+'\n')
