/* Load the visible film first. A hidden second film must not compete for bandwidth. */
(() => {
  const video=document.querySelector('[data-responsive-film]');
  if(!video)return;
  const status=document.querySelector('.film-status'),orientation=matchMedia('(orientation: portrait)');
  let active='',request=0,switching=false,wantedTime=0,wantedPlay=false,controller;
  const message=text=>{if(status)status.textContent=text};
  const remember=()=>{if(!switching){wantedTime=video.currentTime;wantedPlay=!video.paused}};
  for(const name of ['play','pause','timeupdate','ended'])video.addEventListener(name,remember);
  video.addEventListener('waiting',()=>{if(!video.paused)message('正在缓冲…')});
  video.addEventListener('playing',()=>message(''));
  video.addEventListener('canplay',()=>{if(!switching)message('')});
  video.addEventListener('error',()=>message('视频加载失败，可点击下方按钮重试。'));
  const retry=document.querySelector('.film-retry');
  retry?.addEventListener('click',()=>{remember();active='';void adapt(true)});
  const waitFor=(names,ready,signal)=>new Promise((resolve,reject)=>{
    const clean=()=>{names.forEach(n=>video.removeEventListener(n,check));video.removeEventListener('error',fail);signal.removeEventListener('abort',abort)};
    const check=()=>{if(ready()){clean();resolve()}};
    const fail=()=>{clean();reject(video.error)};
    const abort=()=>{clean();reject(new DOMException('Cancelled','AbortError'))};
    names.forEach(n=>video.addEventListener(n,check));video.addEventListener('error',fail);signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted)abort();else check();
  });
  async function adapt(retryPlay=false){
    const next=orientation.matches?'portrait':'landscape';if(next===active)return;
    remember();const initial=!active&&!video.src,token=++request;controller?.abort();controller=new AbortController();const {signal}=controller;
    const time=wantedTime,play=wantedPlay||retryPlay;
    switching=true;active=next;video.pause();video.dataset.orientation=next;video.poster=`promo/story/film-${next}-poster-1.webp`;
    video.preload='auto';video.src=`promo/paper-notebook-film${next==='portrait'?'-portrait':''}.mp4?v=2.4`;
    video.load();
    // Native playback starts as soon as data arrives; the first load never waits
    // for the complete film or an alternate orientation.
    if(initial){switching=false;return}
    video.setAttribute('aria-busy','true');message('正在加载视频…');
    try{
      await waitFor(['loadedmetadata'],()=>video.readyState>=1,signal);
      if(token!==request)return;
      const target=Math.min(time,Math.max(0,video.duration-.05));
      if(target>0){await waitFor(['progress','loadeddata','canplay'],()=>{for(let i=0;i<video.seekable.length;i++)if(video.seekable.start(i)<=target&&video.seekable.end(i)>=target)return true;return false},signal);video.currentTime=target;}
      await Promise.all([waitFor(['seeked','loadeddata','canplay'],()=>!video.seeking&&video.readyState>=2,signal),play?video.play():Promise.resolve()]);
      if(token===request)message('');
    }catch(error){if(token===request)message(error?.name==='NotAllowedError'?'点击播放继续。':'视频加载失败，可点击下方按钮重试。');}
    finally{if(token===request){switching=false;video.removeAttribute('aria-busy');remember();}}
  }
  orientation.addEventListener('change',()=>void adapt());void adapt();
})();
