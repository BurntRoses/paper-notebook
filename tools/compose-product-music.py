"""Original 120 BPM product score. No downloaded loops or copyrighted samples.

32 bars: filtered intro / full groove / pluck development / marker rhythm /
bright subject montage / half-time break / return / three-note brand ending.
"""
from pathlib import Path
import json, math, os, subprocess, wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/promo'
CACHE=ROOT/'output/promo'
SR=48000
DURATION=64
BPM=120
BEAT=60/BPM
rng=np.random.default_rng(22102026)
track=np.zeros((int(SR*DURATION),2),dtype=np.float64)
accent_events=[]

def add(time, signal, gain=1, pan=0):
    start=int(time*SR)
    if start<0:return
    size=min(len(signal),len(track)-start)
    if size<=0:return
    mono=signal[:size]*gain
    track[start:start+size,0]+=mono*math.sqrt((1-pan)/2)
    track[start:start+size,1]+=mono*math.sqrt((1+pan)/2)

def note(midi,duration,kind='pluck'):
    t=np.arange(int(duration*SR))/SR
    f=440*2**((midi-69)/12)
    if kind=='rhodes':
        env=(1-np.exp(-t*210))*np.exp(-t*5.5)
        return (np.sin(2*np.pi*f*t+.48*np.sin(2*np.pi*f*2*t)*np.exp(-t*12))+.13*np.sin(2*np.pi*f*3*t)*np.exp(-t*10))*env
    if kind=='marimba':
        return (np.sin(2*np.pi*f*t)*np.exp(-t*11)+.34*np.sin(2*np.pi*f*3.99*t)*np.exp(-t*29)+.10*np.sin(2*np.pi*f*10.02*t)*np.exp(-t*42))*(1-np.exp(-t*800))
    if kind=='celesta':
        return (np.sin(2*np.pi*f*t)*np.exp(-t*4.3)+.23*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*11)+.09*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*19))*(1-np.exp(-t*520))
    if kind=='flute':
        env=(1-np.exp(-t*38))*np.exp(-t*7)
        return (np.sin(2*np.pi*f*t+.018*np.sin(2*np.pi*5.4*t))+.11*np.sin(4*np.pi*f*t))*env
    if kind=='bass':
        env=(1-np.exp(-t*150))*np.exp(-t*7)
        x=np.sin(2*np.pi*f*t)+.25*np.sin(4*np.pi*f*t)+.12*np.sin(6*np.pi*f*t)
        return np.tanh(x*1.3)*env
    if kind=='pad':
        env=np.minimum(1,t/.18)*np.minimum(1,(duration-t)/.6)
        return (np.sin(2*np.pi*f*t)+.32*np.sin(2*np.pi*f*1.002*t)+.12*np.sin(4*np.pi*f*t))*env*.5
    env=(1-np.exp(-t*320))*np.exp(-t*4.7)
    return (np.sin(2*np.pi*f*t+1.2*np.sin(2*np.pi*f*2*t)*np.exp(-t*13))+.16*np.sin(2*np.pi*f*3*t))*env

chords=[[57,60,64,67],[53,57,60,64],[48,55,60,64],[55,59,62,64]]
for bar in range(32):
    sec=bar*2
    section=bar//4
    chord=chords[bar%4]
    for j,m in enumerate(chord):add(sec,note(m,2.65,'pad'),.075 if section!=5 else .10,(j-1.5)/2)
    if bar<30:
        pattern=[0,1.5,2,2.75,3.5] if section not in [0,5] else [0,2.5]
        for beat in pattern:
            add(sec+beat*BEAT,note(chord[0]-12,.42,'bass'),.24 if section!=0 else .10,-.06)
    # A compact, repeatable hook. Variants follow each harmony; no random notes.
    top=[chord[0]+12,chord[2]+12,chord[3]+12,chord[2]+12,chord[1]+12,chord[2]+12]
    rhythm=[0,.75,1.5,2,2.75,3.5]
    for j,beat in enumerate(rhythm):
        if section==0 and j%2:continue
        if section==5 and j not in [0,3]:continue
        if bar>=30:continue
        gain=.095 if section in [1,2,3,4,6] else .055
        add(sec+beat*BEAT,note(top[j],.75),gain,(-.35 if j%2 else .35))
    for b in range(4):
        when=sec+b*BEAT
        if 2<=when<60 and section!=5:
            t=np.arange(int(.26*SR))/SR
            phase=2*np.pi*(46*t+88/32*(1-np.exp(-32*t)))
            kick=np.sin(phase)*np.exp(-t*17)+rng.uniform(-1,1,len(t))*.08*np.exp(-t*350)
            add(when,kick,.46)
        if b in [1,3] and when<60 and section not in [0,5]:
            t=np.arange(int(.16*SR))/SR
            noise=rng.uniform(-1,1,len(t));noise=noise-np.r_[0,noise[:-1]]*.7
            clap=noise*np.exp(-t*35)*(1+.35*np.sin(2*np.pi*70*t))
            add(when,clap,.12,.10)
    for step in range(8):
        when=sec+step*BEAT/2
        if when<2 or when>=60:continue
        if section==5 and step%2==0:continue
        t=np.arange(int((.07 if step%2 else .04)*SR))/SR
        noise=rng.uniform(-1,1,len(t));noise=noise-np.r_[0,noise[:-1]]
        add(when,noise*np.exp(-t*85),.026 if section in [0,5] else .045,.55 if step%2 else -.45)
    if bar%4==3 and 6<sec<56:
        for k in range(4):
            t=np.arange(int(.06*SR))/SR
            add(sec+1.5+k*.125,rng.uniform(-1,1,len(t))*np.exp(-t*65),.035,(-1)**k*.5)

# Short high-register timbres answer specific visual actions. Most last under
# half a second; sparse celesta notes leave room for reading and the main hook.
def accent(when,midi,kind,gain=.11,pan=0,duration=.6,action=''):
    add(when,note(midi,duration,kind),gain,pan)
    accent_events.append({'time':when,'midi':midi,'instrument':kind,'duration':duration,'action':action})
for when,midi in [(0.0,76),(.25,79),(.5,81)]:accent(when,midi,'marimba',.15,-.2+.4*when,action='opening Skill title')
for when,midi in [(1.3,81),(1.95,84),(2.6,88)]:accent(when,midi,'marimba',.12,(-.35 if midi%2 else .35),.4,'generation prompt strip')
for when in [8,16,32,48,56]:
    for j,midi in enumerate([69,72,76]):accent(when+j*.09,midi,'rhodes',.105,(j-1)*.35,.85,'new section')
for when,midi,kind,action in [
 (10.0,84,'flute','content relationship diagram'),
 (17.1,88,'celesta','blackboard formula'),(19.25,84,'marimba','worked calculation'),
 (24.9,88,'marimba','highlighter'),(25.5,91,'celesta','circle'),(26.3,93,'celesta','star'),
 (27.4,88,'marimba','key passage list'),
 (32.4,81,'flute','poetry extract'),(34.1,88,'celesta','business blackboard'),(36.5,91,'marimba','code explanation'),
 (41.3,84,'flute','strict material boundary'),(43.7,88,'marimba','generation route'),
 (48.5,88,'flute','landscape and portrait'),(52.1,91,'celesta','offline saved copy'),
 (57.8,84,'marimba','start action'),(60.0,88,'celesta','closing')]:
    accent(when,midi,kind,.105 if kind!='celesta' else .085,(-.25 if int(when*10)%2 else .3),.75 if kind=='celesta' else .48,action)
# The quiet fifth section uses an electric-piano answer instead of more drums.
for when,midi in [(40,72),(40.75,76),(42,79),(44,76),(45.5,72),(46.5,76)]:accent(when,midi,'rhodes',.075,-.12,.8,'half-time piano variation')

# Paper movement, pencil texture and transitions follow the editorial cuts.
for when in [0,7.65,15.65,23.65,31.65,39.65,47.65,55.65]:
    t=np.arange(int(.36*SR))/SR
    n=rng.uniform(-1,1,len(t))
    # Low-passed noise through a small symmetric kernel resembles paper friction.
    n=np.convolve(n,np.ones(11)/11,mode='same')
    add(when,n*np.sin(np.pi*np.minimum(1,t/.36))**2,.13,-.25)
for when in [25.0,25.8,26.6,27.4,28.2,29.0,30.2]:
    t=np.arange(int(.15*SR))/SR;n=rng.uniform(-1,1,len(t));n=np.convolve(n,np.ones(5)/5,mode='same')
    add(when,n*np.sin(np.pi*t/.15)*np.exp(-t*5),.06,.2)
for j,m in enumerate([69,76,81]):add(60+j*.38,note(m,2.6,'pad'),.16,(-.25+j*.25))

# Musical stereo delay, mild saturation and an ending with an actual decay.
delay=int(.375*SR)
track[delay:,0]+=track[:-delay,1]*.14
track[delay:,1]+=track[:-delay,0]*.12
fadein=np.minimum(1,np.arange(len(track))/SR/.08)
fadeout=np.minimum(1,np.maximum(0,(DURATION-np.arange(len(track))/SR)/1.4))
track=np.tanh(track*1.4)*fadein[:,None]*fadeout[:,None]
track-=track.mean(axis=0)
track*=.87/max(.01,np.abs(track).max())
CACHE.mkdir(parents=True,exist_ok=True)
OUT.mkdir(parents=True,exist_ok=True)
raw=CACHE/'product-film-music-raw.wav'
with wave.open(str(raw),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((track*32767).astype('<i2').tobytes())
ffmpeg=os.environ.get('FFMPEG','ffmpeg')
master=OUT/'product-film-music.wav'
subprocess.run([ffmpeg,'-y','-loglevel','error','-i',str(raw),'-af','loudnorm=I=-16:TP=-1.2:LRA=7','-ar',str(SR),str(master)],check=True)
subprocess.run([ffmpeg,'-y','-loglevel','error','-i',str(master),'-c:a','libmp3lame','-b:a','192k',str(OUT/'product-film-music.mp3')],check=True)
(OUT/'product-film-music.json').write_text(json.dumps({'title':'Paper / Pulse','duration':64,'bpm':120,'bars':32,'sampleRate':SR,'channels':2,'license':'CC0-1.0; original synthesized composition for this project','instruments':['FM pluck hook','warm chord pads','syncopated bass','kick','clap','stereo hi-hats','paper and pencil textures','Rhodes-style electric piano','marimba','celesta','short flute accents'],'arrangement':['filtered intro','full groove','melodic development','marker rhythm','subject montage lift','half-time break','full return','three-note brand ending'],'master':'-16 LUFS target, -1.2 dBTP target','accentCues':accent_events,'accentDesign':'Sparse short high-register timbres at actual fragment, ink and feature reveals; quiet piano contrast at 40s'},ensure_ascii=False,indent=2))
print(master)
