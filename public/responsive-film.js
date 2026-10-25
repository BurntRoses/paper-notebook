/* The film follows the screen and retains its position through rotation. */
(()=>{
 const video=document.querySelector('[data-responsive-film]');if(!video)return;
 const status=document.querySelector('.film-status'),orientation=matchMedia('(orientation: portrait)');
 const sources={landscape:'promo/paper-notebook-film.mp4',portrait:'promo/paper-notebook-film-portrait.mp4'};
 let active='',request=0,switching=false,wantedTime=0,wantedPlay=false,controller;
 const remember=()=>{if(!switching){wantedTime=video.currentTime;wantedPlay=!video.paused}};
 video.addEventListener('play',remember);video.addEventListener('pause',remember);video.addEventListener('timeupdate',remember);video.addEventListener('ended',remember);
 async function adapt(){
  const next=orientation.matches?'portrait':'landscape';if(next===active)return;
  remember();const token=++request;controller?.abort();controller=new AbortController();const {signal}=controller;
  switching=true;active=next;video.pause();video.dataset.orientation=next;video.poster=`promo/story/film-${next}-poster-1.png`;video.src=sources[next];
  if(status)status.textContent='';
  // Initial load shows a poster without fetching the film.
  if(!wantedTime&&!wantedPlay){video.preload='none';video.load();switching=false;video.removeAttribute('aria-busy');return}
  video.preload='metadata';video.setAttribute('aria-busy','true');
  if(status)status.textContent='影片加载中…';
  const loaded=new Promise((resolve,reject)=>{video.addEventListener('loadedmetadata',resolve,{once:true,signal});video.addEventListener('error',reject,{once:true,signal});signal.addEventListener('abort',reject,{once:true})});
  video.load();
  try{
   await loaded;if(token!==request)return;
   const target=Math.min(wantedTime,Math.max(0,video.duration-.05));
   // Some static servers do not support byte ranges. Wait for a seekable range
   // instead of silently seeking back to zero while only metadata is loaded.
   let seeked=Promise.resolve();
   if(target>0){
    await new Promise((resolve,reject)=>{
     const clean=()=>events.forEach(name=>video.removeEventListener(name,check));
     const check=()=>{for(let i=0;i<video.seekable.length;i++)if(video.seekable.start(i)<=target&&video.seekable.end(i)>=target){clean();resolve();return}};
     const events=['progress','loadeddata','canplay','canplaythrough','durationchange'];
     events.forEach(name=>video.addEventListener(name,check));signal.addEventListener('abort',()=>{clean();reject()},{once:true});check();
     // A non-Range server needs to download up to the target first.
     if(!video.seekable.length||video.seekable.end(video.seekable.length-1)<target)video.preload='auto';
    });
    if(token!==request)return;
    seeked=new Promise((resolve,reject)=>{video.addEventListener('seeked',resolve,{once:true,signal});signal.addEventListener('abort',reject,{once:true})});
    video.currentTime=target;
   }
   // Starting playback also drives buffering. Waiting for seeked first stalls
   // source changes on slow connections while the previous frame is paused.
   await Promise.all([seeked,wantedPlay?video.play():Promise.resolve()]);
   if(token===request&&status)status.textContent='';
  }catch(error){if(token===request&&status)status.textContent=error?.name==='NotAllowedError'?'点击影片继续播放。':'影片暂时无法播放，请稍后重试。'}
  finally{if(token===request){switching=false;video.removeAttribute('aria-busy');controller.abort()}}
 }
 orientation.addEventListener('change',adapt);void adapt();
})();
