"""Validate native learning activities and the bounded expression data language."""
import math

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
            return
        parameters=activity['parameters'];ids=[p['id'] for p in parameters]
        if len(ids)!=len(set(ids)) or 'x' in ids:raise ValueError('parameters: duplicate IDs or reserved x')
        for p in parameters:
            if p['min']>=p['max'] or p['step']>p['max']-p['min'] or not p['min']<=p['value']<=p['max']:raise ValueError('parameters.'+p['id']+': check range, step and initial value')
        domain=activity['domain']
        if domain['min']>=domain['max']:raise ValueError('domain: maximum must exceed minimum')
        for point in activity.get('observations',[]):
            if not domain['min']<=point['x']<=domain['max']:raise ValueError('observations: point outside domain')
        values={p['id']:p['value'] for p in parameters}
        for i in range(33):
            for item in activity['series']+activity['outputs']:evaluate(item['expression'],dict(values,x=domain['min']+(domain['max']-domain['min'])*i/32))
    except (ValueError,KeyError,ZeroDivisionError,OverflowError,TypeError) as error:raise ValueError(path+'.exploration: '+str(error)) from error
