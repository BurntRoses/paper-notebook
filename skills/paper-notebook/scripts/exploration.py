"""Validate native learning activities and the bounded expression data language."""
import math,json

ARITY={'sub':2,'div':2,'pow':2,'ln':1,'exp':1,'abs':1}
def evaluate(expr, values, depth=0):
    if depth>16:raise ValueError('expression: maximum depth 16')
    if isinstance(expr,(int,float)) and not isinstance(expr,bool):result=expr
    elif isinstance(expr,str):
        if expr not in values:raise ValueError('expression: unknown variable '+expr)
        result=values[expr]
    else:
        op=expr['op'];args=expr['args']
        if op in ARITY and len(args)!=ARITY[op]:raise ValueError('expression: incorrect arity for '+op)
        a=[evaluate(e,values,depth+1) for e in args]
        operations={'add':lambda:sum(a),'sub':lambda:a[0]-a[1],'mul':lambda:math.prod(a),'div':lambda:a[0]/a[1],'pow':lambda:math.pow(a[0],a[1]),'ln':lambda:math.log(a[0]),'exp':lambda:math.exp(a[0]),'abs':lambda:abs(a[0]),'min':lambda:min(a),'max':lambda:max(a)}
        result=operations[op]()
    if not math.isfinite(result) or abs(result)>1e15:raise ValueError('expression: result outside finite calculation range')
    return result

def validate_exploration(activity, path):
    try:
        if activity['kind']!='plot':
            ids=[f['id'] for f in activity['frames']]
            if len(ids)!=len(set(ids)):raise ValueError('frames: duplicate IDs')
            if activity.get('trace'):
                trace=activity['trace']
                if activity['kind']!='sequence':raise ValueError('trace: use sequence for execution traces')
                for i,f in enumerate(activity['frames']):
                    line=f.get('line')
                    if isinstance(line,bool) or not isinstance(line,int) or not 0<=line<=len(trace['code']):raise ValueError(f'frames.{i}.line: must reference a code line; 0 means not started')
                    if 'variables' not in f:raise ValueError(f'frames.{i}.variables: complete variable snapshot required')
                    names=[v['name'] for v in f['variables']]
                    if len(names)!=len(set(names)):raise ValueError(f'frames.{i}.variables: duplicate variable names')
                    for v in f['variables']:
                        if v.get('display')=='set' and (not isinstance(v['value'],list) or len({json.dumps(x) for x in v['value']})!=len(v['value'])):raise ValueError(f'frames.{i}.variables: set values must be unique')
                    if 'cursor' in f:
                        values=next((v['value'] for v in f['variables'] if v['name']==trace.get('input')),None)
                        if not isinstance(values,list) or not 0<=f['cursor']<len(values):raise ValueError(f'frames.{i}.cursor: must reference an input element')
                if not any(f['variables']!=activity['frames'][i-1]['variables'] for i,f in enumerate(activity['frames']) if i):raise ValueError('frames: execution trace must contain variable changes')
            return
        parameters=activity['parameters'];ids=[p['id'] for p in parameters]
        if len(ids)!=len(set(ids)) or 'x' in ids:raise ValueError('parameters: duplicate IDs or reserved x')
        for p in parameters:
            if p['min']>=p['max'] or p['step']>p['max']-p['min'] or not p['min']<=p['value']<=p['max']:raise ValueError('parameters.'+p['id']+': check range, step and initial value')
        domain=activity['domain']
        if domain['min']>=domain['max']:raise ValueError('domain: maximum must exceed minimum')
        for point in activity.get('observations',[]):
            if not domain['min']<=point['x']<=domain['max']:raise ValueError('observations: point outside domain')
        regression=activity.get('regression')
        if regression:
            if regression['slope']==regression['intercept'] or any(k not in ids for k in regression.values()):raise ValueError('regression: bind distinct slope and intercept parameters')
            if len(activity.get('observations',[]))<2 or len({p['x'] for p in activity.get('observations',[])})<2:raise ValueError('regression: two distinct x values required')
        values={p['id']:p['value'] for p in parameters}
        for i in range(33):
            x=domain['min']+(domain['max']-domain['min'])*i/32
            for item in activity['series']+activity['outputs']:evaluate(item['expression'],dict(values,x=x))
            if regression and abs(evaluate(activity['series'][0]['expression'],dict(values,x=x))-(values[regression['slope']]*x+values[regression['intercept']]))>1e-8:raise ValueError('regression: first series must match the linear model')
    except (ValueError,KeyError,ZeroDivisionError,OverflowError,TypeError) as error:raise ValueError(path+'.exploration: '+str(error)) from error
