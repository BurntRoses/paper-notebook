"""Deterministic motion design from actual notebook pages, not a UI recording.

All visible words, code, diagrams, blackboards and marks are crops of the
production reader. This compositor only choreographs those paper assets.
"""
from pathlib import Path
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import argparse, json, math, os, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'production/promo/story'
ASSETS=ROOT/'output/promo/story'
POSTERS=ROOT/'public/promo/story'
OUT=ROOT/'public/promo'
parser=argparse.ArgumentParser()
parser.add_argument('--portrait',action='store_true')
parser.add_argument('--preview',action='store_true')
args=parser.parse_args()
PORTRAIT=args.portrait
ORIENTATION='portrait' if PORTRAIT else 'landscape'
W,H=(1080,1920) if PORTRAIT else (1920,1080)
FPS=30
DURATION=64
meta=json.loads((ASSETS/f'{ORIENTATION}.json').read_text())
bases=[Image.open(SOURCE/f'{ORIENTATION}-{i+1}.png').convert('RGBA') for i in range(8)]
fulls=[Image.open(ASSETS/f'{ORIENTATION}-{i+1}-full.png').convert('RGBA') for i in range(8)]
MARGIN=.075*W

def clamp(v,a=0,b=1):return max(a,min(b,v))
def ease(v):return 1-(1-clamp(v))**3
def smooth(v):v=clamp(v);return v*v*(3-2*v)

# The background is the notebook's own paper and ruling, sampled from a blank
# part of its second page. No independently painted imitation page is used.
paper=Image.open(SOURCE/f'blank-{ORIENTATION}.png').convert('RGBA')
blank=paper.crop((int(paper.width*.12),int(paper.height*.26),int(paper.width*.92),int(paper.height*.78)))
BG=Image.new('RGBA',(W,H),(250,247,232,255))
for y in range(0,H,blank.height):
    for x in range(0,W,blank.width):BG.alpha_composite(blank,(x,y))
shade=Image.new('RGBA',(W,H),(0,0,0,0))
sd=ImageDraw.Draw(shade)
for x in range(0,30):sd.line((x,0,x,H),fill=(123,100,57,max(0,17-x//2)))
BG.alpha_composite(shade)

@lru_cache(maxsize=5)
def ink_frame(page,step):return Image.open(ASSETS/f'ink-{ORIENTATION}-{page+1}/{step:03d}.png').convert('RGBA')

def page_at(page,t):
    step=round(80*clamp((t-.9)/4.9))
    source=bases[page].copy();source.alpha_composite(ink_frame(page,step));return source

def region(page,kind,source=None,pad=8):
    p=meta[page]
    if kind=='heading':b=p['heading']
    elif kind=='header':b=p['header']
    else:b=next(v for v in p['blocks'] if v['id']==kind)
    box=(max(0,math.floor(b['x']-pad)),max(0,math.floor(b['y']-pad)),min(bases[page].width,math.ceil(b['x']+b['width']+pad)),min(bases[page].height,math.ceil(b['y']+b['height']+pad)))
    return (source or fulls[page]).crop(box)

def brand(page):
    pic=region(page,'heading',bases[page],0).convert('RGB')
    mask=pic.convert('L').point(lambda x:255 if x<145 else 0)
    box=mask.getbbox()
    if box:pic=pic.crop((max(0,box[0]-8),max(0,box[1]-8),min(pic.width,box[2]+8),min(pic.height,box[3]+8)))
    return pic.convert('RGBA')

BRANDS={1:brand(1),7:brand(7)}
HEADINGS={i:brand(i) for i in range(8)}
UIS={o:Image.open(SOURCE/f'ui-{o}.png').convert('RGBA') for o in ['landscape','portrait']}

def paste(frame,pic,cx,cy,width,height,angle=0,alpha=1,shadow=False):
    ratio=min(width/pic.width,height/pic.height)
    size=(max(1,round(pic.width*ratio)),max(1,round(pic.height*ratio)))
    if size!=pic.size:pic=pic.resize(size,Image.Resampling.BICUBIC)
    if alpha<1:pic=pic.copy();pic.putalpha(pic.getchannel('A').point(lambda v:round(v*clamp(alpha))))
    if abs(angle)>.02:pic=pic.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
    x,y=round(cx-pic.width/2),round(cy-pic.height/2)
    if shadow:
        sh=Image.new('RGBA',(pic.width+40,pic.height+40),(0,0,0,0));sh.paste((70,56,34,36),(20,20),pic.getchannel('A'))
        sh=sh.filter(ImageFilter.GaussianBlur(12));frame.alpha_composite(sh,(x-15,y-9))
    frame.alpha_composite(pic,(x,y))

def arrive(frame,pic,t,start,cx,cy,width,height,side=0,angle=0,shadow=False):
    if t<start:return
    e=ease((t-start)/.85)
    drift=(1-e)*(.23*W if side else 48)
    paste(frame,pic,cx+(side*drift if side else 0),cy+(drift if not side else 0),width*(.97+.03*e),height,angle*(1-e*.75),e,shadow)

def header(frame,scene,t):
    pic=HEADINGS[scene]
    intro=(1-ease(t/1.4)) if scene==0 else 0
    arrive(frame,pic,t,-.3,W*.50,H*((.105 if PORTRAIT else .125)+intro*.12),W*(.88+intro*.04),H*((.14 if PORTRAIT else .15)+intro*.08))

def panel(frame,page,block,source,t,start,y,height,width=.86,side=0,angle=0):
    arrive(frame,region(page,block,source),t,start,W*.50,H*y,W*width,H*height,side,angle)

def render_scene(scene,t):
    frame=BG.copy();source=page_at(scene,t)
    if scene not in [1,7]:header(frame,scene,t)
    if scene==0:
        panel(frame,0,'pain-context',source,t,.05,.25 if PORTRAIT else .29,.17,.88)
        # The source code's three real two-line paragraphs, measured in the DOM.
        # They pile in on the beat, then settle into one reading column.
        for k,box in enumerate(meta[0]['fragments']):
            pic=source.crop((int(box['x']),int(box['y']),int(box['x']+box['width']),int(box['y']+box['height'])))
            start=1.65+k*.65;e=ease((t-start)/.9)
            align=smooth((t-5)/1.25)
            angle=([1,-1.1,.7][k])*(1-align)
            y=H*((.43+k*.115) if PORTRAIT else (.46+k*.13))
            x=W*(.5+([-.025,.025,-.015][k])*(1-align))
            if t>=start:paste(frame,pic,x+(1-e)*W*(-1 if k%2 else 1)*.65,y,W*.86,H*.10,angle,e,True)
        panel(frame,0,'pain-need',source,t,5.3,.86 if PORTRAIT else .91,.10,.88)
    elif scene==1:
        arrive(frame,BRANDS[1],t,.1,W*.5,H*(.18 if PORTRAIT else .19),W*.79,H*.13)
        panel(frame,1,'idea-statement',source,t,.7,.39 if PORTRAIT else .42,.24,.88)
        panel(frame,1,'idea-map',source,t,2.1,.63 if PORTRAIT else .65,.25 if PORTRAIT else .20,.90,1)
        panel(frame,1,'idea-value',source,t,4.4,.86 if PORTRAIT else .86,.10,.82)
    elif scene==2:
        panel(frame,2,'structure-condition',source,t,.55,.25 if PORTRAIT else .28,.12,.88)
        # The real blackboard moves into focus, rather than a separate formula card.
        pop=1+.025*math.sin(clamp((t-1.4)/2)*math.pi)
        panel(frame,2,'structure-formula',source,t,1.4,.48,.27,.90*pop,-1,-1.3)
        panel(frame,2,'structure-example',source,t,3.6,.78 if PORTRAIT else .79,.29 if PORTRAIT else .28,.86,1)
    elif scene==3:
        panel(frame,3,'marks-select',source,t,.55,.27 if PORTRAIT else .30,.15,.89)
        panel(frame,3,'marks-examples',source,t,1.35,.45 if PORTRAIT else .47,.14,.89)
        panel(frame,3,'marks-map',source,t,2.5,.65 if PORTRAIT else .65,.22 if PORTRAIT else .16,.89,1)
        panel(frame,3,'marks-return',source,t,3.6,.85 if PORTRAIT else .85,.16,.89)
    elif scene==4:
        blocks=['subjects-poem','subjects-business','subjects-code']
        if PORTRAIT:
            for k,b in enumerate(blocks):panel(frame,4,b,source,t,.7+k*1.4,.30+k*.245,.23,.88,(-1 if k%2 else 1),(-.8 if k%2 else .8))
        else:
            focus=smooth((t-2.4)/.7)+smooth((t-4.8)/.7)
            for k,b in enumerate(blocks):
                weight=1-clamp(abs(k-focus))
                x=W*(.49+(-.37 if k<focus else .42)*(1-weight))
                y=H*(.58+.11*(1-weight))
                pic=region(4,b,source)
                if t>=.7+k*.25:
                    alpha=.48+.52*weight
                    e=ease((t-(.7+k*.25))/.8)
                    paste(frame,pic,x+(1-e)*W*.3,y,W*(.23+.53*weight),H*(.24+.35*weight),(-4 if k<focus else 4)*(1-weight),alpha*e,weight<.8)
    elif scene==5:
        panel(frame,5,'fit-brief',source,t,.55,.28 if PORTRAIT else .31,.19,.88)
        panel(frame,5,'fit-source',source,t,1.7,.47 if PORTRAIT else .49,.12,.90,-1)
        panel(frame,5,'fit-boundary',source,t,2.8,.63 if PORTRAIT else .64,.16,.88)
        panel(frame,5,'fit-map',source,t,4,.84,.21 if PORTRAIT else .16,.90,1)
    elif scene==6:
        # The same source page rendered separately in landscape and portrait.
        other=UIS['landscape' if PORTRAIT else 'portrait']
        current=UIS[ORIENTATION]
        e=ease((t-.7)/1.2)
        if PORTRAIT:
            paste(frame,other,W*(.50-(1-e)*.9),H*.37,W*.86,H*.28,-1.5*e,1,True)
            paste(frame,current,W*(.59+(1-e)*.8),H*.67,W*.56,H*.43,1.4*e,1,True)
            panel(frame,6,'focus-offline',source,t,4.8,.92,.10,.90)
        else:
            paste(frame,current,W*(.37-(1-e)*.8),H*.58,W*.64,H*.71,-1.2*e,1,True)
            paste(frame,other,W*(.80+(1-e)*.6),H*.57,W*.28,H*.72,1.6*e,1,True)
            panel(frame,6,'focus-offline',source,t,4.7,.92,.10,.84)
    elif scene==7:
        arrive(frame,BRANDS[7],t,0,W*.5,H*(.20 if PORTRAIT else .22),W*.78,H*.14)
        panel(frame,7,'start-message',source,t,.7,.41,.20,.88)
        panel(frame,7,'start-actions',source,t,1.45,.65,.25,.85)
        panel(frame,7,'start-close',source,t,2.7,.87,.12,.86)
    if scene!=7:
        zoom=1+.025*smooth(t/7.8)
        size=(round(W*zoom),round(H*zoom))
        frame=frame.resize(size,Image.Resampling.BICUBIC)
        left,top=(size[0]-W)//2,(size[1]-H)//2
        frame=frame.crop((left,top,left+W,top+H))
    return frame

def render(time):
    scene=min(7,int(time//8));local=time-scene*8
    frame=render_scene(scene,local+.35)
    # Paper-cover wipes, vertical slips and a match cut alternate across beats.
    if scene<7 and local>7.5:
        q=smooth((local-7.5)/.5)
        upcoming=render_scene(scene+1,.35)
        mask=Image.new('L',(W,H),0);d=ImageDraw.Draw(mask)
        if scene%3==0:
            edge=W*(1-q)
            d.polygon([(edge,0),(W,0),(W,H),(max(0,edge-W*.12),H)],fill=255)
        elif scene%3==1:
            edge=H*(1-q);d.rectangle((0,edge,W,H),fill=255)
        else:
            d.rectangle((0,0,W*q,H),fill=255)
        frame=Image.composite(upcoming,frame,mask)
    return frame.convert('RGB')

contacts=ROOT/'docs/screenshots'
contacts.mkdir(parents=True,exist_ok=True)
times=[.8,3.5,6,9,12,17.5,20,25.5,28,33,35,37.5,42,45.5,50,54,58,61.5]
thumb=(270,480) if PORTRAIT else (480,270)
contact=Image.new('RGB',(thumb[0]*3,(thumb[1]+24)*6),'#e9e5d9')
draw=ImageDraw.Draw(contact)
for i,time in enumerate(times):
    pic=render(time);pic.thumbnail(thumb,Image.Resampling.LANCZOS)
    x,y=(i%3)*thumb[0],(i//3)*(thumb[1]+24)
    contact.paste(pic,(x,y));draw.text((x+8,y+thumb[1]+5),f'{time:04.1f}s',fill='#415956')
contact.save(contacts/f'product-film-{ORIENTATION}-contact.png')
if args.preview:
    POSTERS.mkdir(parents=True,exist_ok=True)
    for scene in range(8):render(6.2 if scene==0 else scene*8+4).save(POSTERS/f'film-{ORIENTATION}-poster-{scene+1}.png')
    print(contacts/f'product-film-{ORIENTATION}-contact.png');sys.exit(0)

ffmpeg=os.environ.get('FFMPEG','ffmpeg')
name='paper-notebook-film'+('-portrait' if PORTRAIT else '')
OUT.mkdir(parents=True,exist_ok=True)
output=OUT/(name+'.mp4')
temporary=OUT/(name+'.rendering.mp4')
cmd=[ffmpeg,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(OUT/'product-film-music.wav'),'-t',str(DURATION),'-vf',f'scale={720 if PORTRAIT else 1280}:{1280 if PORTRAIT else 720}:flags=lanczos','-c:v','libx264','-preset','slow','-crf','26','-maxrate','1100k','-bufsize','2200k','-g',str(FPS*2),'-pix_fmt','yuv420p','-c:a','aac','-b:a','80k','-movflags','+faststart',str(temporary)]
process=subprocess.Popen(cmd,stdin=subprocess.PIPE)
try:
    for n in range(DURATION*FPS):
        process.stdin.write(render(n/FPS).tobytes())
        if n%(FPS*8)==0:print(f'{ORIENTATION}: {n/FPS:.0f}/{DURATION}s',flush=True)
    process.stdin.close()
    if process.wait()!=0:raise RuntimeError('ffmpeg failed')
except BaseException:
    process.kill();temporary.unlink(missing_ok=True);raise
temporary.replace(output)
manifest={'orientation':ORIENTATION,'width':720 if PORTRAIT else 1280,'height':1280 if PORTRAIT else 720,'fps':FPS,'duration':DURATION,'frames':DURATION*FPS,'notebookId':'paper-notebook-product-story','source':'examples/product-notebook.json','productionSource':'production/promo/story','renderCache':'output/promo/story','motion':'Native paper fragments, camera reframing, SVG stroke/clip reveals, beat-aligned paper wipes','screenRecording':False,'music':'product-film-music.wav','script':'product-film-script.json','file':output.name,'encoding':{'video':'H.264','crf':26,'preset':'slow','maxrate':'1100 kb/s','buffer':'2200 kb/s','keyframeSeconds':2,'audio':'AAC 80 kb/s','fastStart':True},'bytes':output.stat().st_size}
(OUT/(name+'.json')).write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(output,flush=True)
