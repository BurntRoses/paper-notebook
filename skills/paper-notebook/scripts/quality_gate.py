"""Source-bound editorial review and final delivery gate. Never invent review evidence."""
import argparse
import hashlib
import json
from pathlib import Path
from content_review import review_content
from build_metrics import build_metrics
from build_reader import validate,check_references
from verify_reader import verify

def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def review_template(d,source_hash,rules_hash):
    content=review_content(d);seen=set();decisions=[]
    for w in content['writing']['warnings']+content['teaching']['warnings']:
        key=(w['rule'],w['location'])
        if key not in seen:decisions.append(dict(rule=key[0],location=key[1],decision=''));seen.add(key)
    return dict(sourceSHA256=source_hash,rulesSHA256=rules_hash,chapters=[dict(chapterId=c['id'],writing='',teaching='',facts='',brief='') for c in d['notebook']['chapters']],decisions=decisions,browser=dict(inspected=False,reason=''))

def finalize(artifact,source,review_file,base,allow_unmarked=False):
    d=json.loads(source.read_text(encoding='utf-8-sig'));schema=json.loads((base/'references/notebook.schema.json').read_text())
    validate(d,schema,schema);check_references(d)
    proof=verify(artifact,base/'assets/reader.html',source,allow_unmarked)
    review=json.loads(review_file.read_text());source_hash=digest(source);rules_hash=digest(base/'references/chinese-writing.md')
    if review.get('sourceSHA256')!=source_hash or review.get('rulesSHA256')!=rules_hash:raise ValueError('Editorial review is stale: source or mandatory writing rules changed.')
    for c in d['notebook']['chapters']:
        entry=next((v for v in review.get('chapters',[]) if v['chapterId']==c['id']),{})
        for key in ['writing','teaching','facts','brief']:
            if not entry.get(key,'').strip():raise ValueError(c['id']+'.'+key+': record the actual editorial finding before delivery')
    for finding in review_template(d,source_hash,rules_hash)['decisions']:
        if not any(v['rule']==finding['rule'] and v['location']==finding['location'] and v.get('decision','').strip() for v in review.get('decisions',[])):raise ValueError(finding['location']+': review finding '+finding['rule']+' needs a decision')
    browser=review.get('browser',{});artifact_hash=digest(artifact)
    if browser.get('inspected'):
        if browser.get('artifactSHA256')!=artifact_hash or browser.get('sourceSHA256')!=source_hash or browser.get('issues')!=[] or not browser.get('viewports') or not browser.get('checkedSheets') or browser.get('checkedSheets')!=browser.get('expectedSheets'):raise ValueError('Browser inspection is stale, incomplete, or contains layout failures.')
    elif not browser.get('reason','').strip():raise ValueError('Record why browser inspection could not run.')
    report=dict(deliveryReady=True,editorialReview='recorded',browserInspected=bool(browser.get('inspected')),sourceSHA256=source_hash,rulesSHA256=rules_hash,artifactSHA256=artifact_hash,browser=browser,proof=proof)
    artifact.with_suffix('.delivery.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));return report

def main():
    base=Path(__file__).resolve().parents[1];p=argparse.ArgumentParser(description=__doc__);p.add_argument('command',choices=['review','finalize']);p.add_argument('input',type=Path);p.add_argument('--source',type=Path);p.add_argument('--review',type=Path);p.add_argument('--allow-unmarked',action='store_true');args=p.parse_args()
    try:
        if args.command=='review':
            d=json.loads(args.input.read_text(encoding='utf-8-sig'));sh=digest(args.input);rh=digest(base/'references/chinese-writing.md')
            result=dict(sourceSHA256=sh,**build_metrics(d),contentReview=review_content(d),review=review_template(d,sh,rh))
        else:
            if not args.source or not args.review:raise ValueError('finalize requires --source and --review')
            result=finalize(args.input,args.source,args.review,base,args.allow_unmarked)
        print(json.dumps(result,ensure_ascii=False,indent=2))
    except (ValueError,KeyError,OSError) as e:p.exit(1,str(e)+'\n')
if __name__=='__main__':main()
