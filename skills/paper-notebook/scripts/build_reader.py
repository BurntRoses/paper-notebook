"""Build offline Paper Notebook files in Python-only chat environments.
Uses the shipped reader and schema; no network, pip or JavaScript runtime needed.
"""
import argparse
import html
import json
from pathlib import Path
import re
import zipfile
import unicodedata
from verify_reader import verify
from study_quality import check_study_marks


def validate(value, rule, schema, path='$'):
    if '$ref' in rule:
        target = schema
        for key in rule['$ref'][2:].split('/'):
            target = target[key]
        validate(value, target, schema, path)
    types = {'object': lambda x:isinstance(x,dict), 'array':lambda x:isinstance(x,list),
             'string':lambda x:isinstance(x,str), 'boolean':lambda x:isinstance(x,bool),
             'integer':lambda x:isinstance(x,int) and not isinstance(x,bool),
             'number':lambda x:isinstance(x,(int,float)) and not isinstance(x,bool), 'null':lambda x:x is None}
    def fail(message):raise ValueError(f'{path}: {message}')
    if 'type' in rule and not any(types[t](value) for t in ([rule['type']] if isinstance(rule['type'],str) else rule['type'])):fail('incorrect type')
    if 'const' in rule and value != rule['const']:fail('incorrect constant')
    if 'enum' in rule and value not in rule['enum']:fail('unknown option')
    for sub in rule.get('allOf',[]):validate(value,sub,schema,path)
    if 'if' in rule:
        try:validate(value,rule['if'],schema,path)
        except ValueError:validate(value,rule.get('else',{}),schema,path)
        else:validate(value,rule.get('then',{}),schema,path)
    if isinstance(value,dict):
        for key in rule.get('required',[]):
            if key not in value:fail('missing '+key)
        for key,item in value.items():
            props=rule.get('properties',{})
            if key in props:validate(item,props[key],schema,path+'.'+key)
            elif rule.get('additionalProperties') is False:fail('unexpected '+key)
            elif isinstance(rule.get('additionalProperties'),dict):validate(item,rule['additionalProperties'],schema,path+'.'+key)
    if isinstance(value,list):
        if len(value)<rule.get('minItems',0) or len(value)>rule.get('maxItems',float('inf')):fail('array size')
        if rule.get('uniqueItems') and len({json.dumps(v,sort_keys=True) for v in value})!=len(value):fail('duplicate array item')
        for i,item in enumerate(value):validate(item,rule.get('items',{}),schema,f'{path}[{i}]')
    if isinstance(value,str):
        if len(value)<rule.get('minLength',0) or len(value)>rule.get('maxLength',float('inf')):fail('text length')
        if 'pattern' in rule and not re.search(rule['pattern'],value):fail('text pattern')
    if isinstance(value,(int,float)) and not isinstance(value,bool):
        if value<rule.get('minimum',float('-inf')) or value>rule.get('maximum',float('inf')):fail('number range')
        if 'exclusiveMinimum' in rule and value<=rule['exclusiveMinimum']:fail('number must be greater than minimum')


def check_references(doc):
    ids=set()
    def add(item):
        if item['id'] in ids:raise ValueError('duplicate ID: '+item['id'])
        ids.add(item['id'])
    add(doc['notebook'])
    for source in doc['notebook']['sources']:add(source)
    assets={a['id'] for a in doc['assets']}
    for asset in doc['assets']:
        add(asset)
        if not re.match(r'^data:image/(png|jpeg|webp|gif|avif|svg\+xml);(base64|charset=utf-8),',asset['data'],re.I):raise ValueError('image must be embedded: '+asset['id'])
    pages=[]
    for chapter in doc['notebook']['chapters']:
        add(chapter)
        for page in chapter['pages']:
            add(page);pages.append(page);blockids={b['id'] for b in page['blocks']}
            for cue in page.get('cues',[]):
                add(cue)
                if cue.get('blockId') and cue['blockId'] not in blockids:raise ValueError('missing cue block')
            for block in page['blocks']:
                add(block)
                for key in ['items','steps','options','pairs']:
                    for item in block.get(key,[]):add(item)
                if block['type']=='image' and block.get('assetId') not in assets:raise ValueError('missing image asset')
                if block['type']=='diagram':
                    nodes={n['id'] for n in block.get('nodes',[])}
                    if len(nodes)!=len(block.get('nodes',[])) or any(e['from'] not in nodes or e['to'] not in nodes for e in block.get('edges',[])):raise ValueError('invalid diagram edge or node')
                if block.get('questionType') in ['single','multiple','truefalse']:
                    options={v['id'] for v in block.get('options',[])};solution=block.get('solution',[])
                    if not solution or any(v not in options for v in solution) or (block['questionType']!='multiple' and len(solution)!=1):raise ValueError('invalid exercise solution')
    if len(pages)>500 or sum(len(p['blocks']) for p in pages)>5000:raise ValueError('split into smaller notebooks')
    for key in ['notes','annotations','doubts']:
        for item in doc['userState'][key]:add(item)


def artifact_stem(title, revision):
    name=re.sub(r'[<>:"/\\|?*\x00-\x1f\x7f]', '-',unicodedata.normalize('NFKC', title))
    name=re.sub(r'[\s-]+','-',name).strip('. -')[:72] or '学习笔记'
    if re.match(r'^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)',name,re.I):name='笔记-'+name
    return name+'-v'+str(max(1,revision))


def slim_fonts(template, doc):
    if not any(p['blocks'] for c in doc['notebook']['chapters'] for p in c['pages']):return template
    points={ord(c) for c in json.dumps(doc,ensure_ascii=False)}
    def face(match):
        value=match[0]
        if not re.search(r"font-family:\s*[\"']?StudyHand\b",value):return value
        ranges=re.search(r'unicode-range:\s*([^;}]+)',value,re.I)
        if not ranges or re.search(r'U\+20-7E\b',ranges[1],re.I):return value
        for item in ranges[1].split(','):
            m=re.fullmatch(r'U\+([\da-f]+)(?:-([\da-f]+))?',item.strip(),re.I)
            if not m:return value
            lo=int(m[1],16);hi=int(m[2] or m[1],16)
            if any(lo<=p<=hi for p in points):return value
        return ''
    return re.sub(r'@font-face\s*\{[^{}]*\}',face,template)


def build(source, template, schema_path, notices, output, allow_unmarked=False):
    doc=json.loads(source.read_text(encoding='utf-8-sig'),parse_constant=lambda v:(_ for _ in ()).throw(ValueError('invalid JSON number: '+v)))
    schema=json.loads(schema_path.read_text(encoding='utf-8'))
    validate(doc,schema,schema);check_references(doc)
    study_marks=check_study_marks(doc, allow_unmarked)
    template_text=template.read_text(encoding='utf-8')
    if re.search(r'src=[\"\'][^\"\']*/src/',template_text):raise ValueError('Use the bundled reader.html template')
    data=json.dumps(doc,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
    result,count=re.subn(r'(<script\b[^>]*\bid=[\"\']notebook-data[\"\'][^>]*>)[\s\S]*?(</script>)',lambda m:m[1]+data+m[2],template_text)
    if count!=1:raise ValueError('Expected one notebook-data slot')
    result=re.sub(r'<title>[^<]*</title>',lambda m:'<title>'+html.escape(doc['notebook']['title'])+' · Paper Notebook</title>',result,count=1)
    result=slim_fonts(result,doc)
    stem=artifact_stem(doc['notebook']['title'],doc['notebook']['revision'])
    text=json.dumps(doc,ensure_ascii=False,indent=2)
    notice=notices.read_text(encoding='utf-8')
    output.mkdir(parents=True,exist_ok=True)
    (output/(stem+'.html')).write_text(result,encoding='utf-8');(output/'notebook.json').write_text(text,encoding='utf-8')
    reader_check=verify(output/(stem+'.html'),template,source,allow_unmarked)
    with zipfile.ZipFile(output/(stem+'.zip'),'w',zipfile.ZIP_DEFLATED) as bundle:
        bundle.writestr(stem+'.html',result);bundle.writestr('notebook.json',text);bundle.writestr('THIRD_PARTY_NOTICES.txt',notice);bundle.writestr('打开我-README.txt','打开 '+stem+'.html 即可离线阅读；notebook.json 保留源数据。\nPaper Notebook · https://github.com/BurntRoses/paper-notebook')
    report={'id':doc['notebook']['id'],'revision':doc['notebook']['revision'],'schemaValidated':True,'coreReferencesChecked':True,'bundledReaderMatches':reader_check['bundledReaderMatches'],'studyMarks':study_marks,'browserInspected':False,'htmlBytes':len(result.encode()),'html':stem+'.html','zip':stem+'.zip'}
    (output/'build-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    return report


if __name__=='__main__':
    base=Path(__file__).resolve().parents[1]
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path);parser.add_argument('--out',type=Path,default=Path('output'))
    parser.add_argument('--template',type=Path,default=base/'assets/reader.html')
    parser.add_argument('--schema',type=Path,default=base/'references/notebook.schema.json')
    parser.add_argument('--notices',type=Path,default=base/'assets/THIRD_PARTY_NOTICES.txt')
    parser.add_argument('--allow-unmarked',action='store_true',help='Only for an explicit request for unmarked content')
    a=parser.parse_args()
    try:print(json.dumps(build(a.source,a.template,a.schema,a.notices,a.out,a.allow_unmarked),ensure_ascii=False))
    except (ValueError,KeyError,OSError) as error:parser.exit(1,str(error)+'\n')
