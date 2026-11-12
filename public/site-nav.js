(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const link = (name, href, className = '') => {
    const a = document.createElement('a');
    a.textContent = name;
    a.href = href;
    a.className = className;
    if (href.startsWith('https:')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  };
  const brand = link('Paper Notebook', './', 'site-brand');
  const {icon, roving} = window.NotebookSiteUI;
  const theme = document.createElement('button'); theme.type='button'; theme.className='site-theme'; theme.setAttribute('aria-label','切换明暗模式');
  const systemTheme = matchMedia('(prefers-color-scheme:dark)');
  let savedTheme; try { savedTheme=localStorage.getItem('paper-notebook-site-theme'); } catch {}
  const applyTheme = dark => {
    document.documentElement.dataset.siteTheme=dark?'dark':'light'; theme.innerHTML=icon(dark?'sun':'moon'); theme.setAttribute('aria-pressed',String(dark)); theme.title=dark?'切换浅色模式':'切换深色模式';
    const frame=document.querySelector('.reader-preview');
    try { const reader=frame?.contentWindow?.reader; if(reader&&reader.profile.theme!==(dark?'paper-night':'paper-light')) {reader.profile.theme=dark?'paper-night':'paper-light';reader.refreshAppearance();} } catch {}
  };
  applyTheme(savedTheme?savedTheme==='dark':systemTheme.matches);
  theme.addEventListener('click',()=>{savedTheme=document.documentElement.dataset.siteTheme==='dark'?'light':'dark';applyTheme(savedTheme==='dark');try{localStorage.setItem('paper-notebook-site-theme',savedTheme);}catch{}});
  systemTheme.addEventListener('change',event=>{if(!savedTheme)applyTheme(event.matches);});
  const star=link('GitHub','https://github.com/BurntRoses/paper-notebook','site-star site-star-button'); star.insertAdjacentHTML('afterbegin',icon('star'));star.setAttribute('aria-label','给 GitHub 项目加星');
  const shortcuts=document.createElement('div');shortcuts.className='site-shortcuts';
  const button=document.createElement('button');button.type='button';button.className='site-menu-toggle';button.innerHTML='<span>快速开始</span>'+icon('chevron');
  button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','site-menu');
  const nav=document.createElement('nav');nav.id='site-menu';nav.hidden=true;nav.setAttribute('aria-label','快捷入口');
  nav.append(link('制作笔记','#create'),link('在线试读','#read'),link('功能演示','#film'));
  const close=(restore=false)=>{nav.hidden=true;button.setAttribute('aria-expanded','false');if(restore)button.focus({preventScroll:true});};
  const open=()=>{nav.hidden=false;button.setAttribute('aria-expanded','true');};
  button.addEventListener('click',()=>{if(nav.hidden)open();else close();});
  button.addEventListener('keydown',event=>{if(event.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey||!['ArrowDown','ArrowUp'].includes(event.key))return;event.preventDefault();open();const links=nav.querySelectorAll('a');links[event.key==='ArrowDown'?0:links.length-1]?.focus();});
  nav.addEventListener('keydown',event=>{
    if(event.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey||!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    event.preventDefault();const links=[...nav.querySelectorAll('a')],current=links.indexOf(document.activeElement);
    const next=event.key==='Home'?0:event.key==='End'?links.length-1:(current+(event.key==='ArrowDown'?1:-1)+links.length)%links.length;links[next]?.focus();
  });
  nav.addEventListener('click',event=>{const target=event.target.closest('a');if(!target)return;close();const section=document.querySelector(target.hash);if(section){section.tabIndex=-1;section.focus({preventScroll:true});}});
  document.addEventListener('click',event=>{if(!shortcuts.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!nav.hidden){event.preventDefault();close(true);}});
  // focusin fires after the destination is known, including WebKit pointer focus.
  document.addEventListener('focusin',event=>{if(!shortcuts.contains(event.target))close();});
  shortcuts.append(button,nav);
  const actions=document.createElement('div');actions.className='site-header-actions';actions.append(theme,star,shortcuts);header.replaceChildren(brand,actions);
  // Native iframe lazy loading may fetch several screens ahead. Defer the
  // embedded reader until it is close, keeping initial bandwidth for the film.
  const footerStar=document.querySelector('.footer-star');
  if(footerStar){const visible=new IntersectionObserver(entries=>{footerStar.classList.toggle('is-visible',entries[0].isIntersecting&&!document.hidden);});visible.observe(footerStar);document.addEventListener('visibilitychange',()=>{footerStar.classList.toggle('is-visible',!document.hidden&&footerStar.getBoundingClientRect().top<innerHeight);});}
  const preview=document.querySelector('.reader-preview[data-src]');
  const tour=document.querySelector('#start-reader-tour'),tourStatus=document.querySelector('#preview-tour-status');
  const examples=[...document.querySelectorAll('[data-example]')],openPreview=document.querySelector('#preview-open');
  const loading=document.querySelector('.preview-loading'),retry=document.querySelector('.preview-retry');
  const setBusy=busy=>{if(preview){if(busy)preview.setAttribute('aria-busy','true');else preview.removeAttribute('aria-busy');}if(loading)loading.hidden=!busy;if(loading?.firstElementChild)loading.firstElementChild.textContent='正在载入示例…';if(retry)retry.hidden=true;for(const b of examples)b.toggleAttribute('data-loading',busy&&b.getAttribute('aria-pressed')==='true');};
  const failed=message=>{setBusy(false);if(tourStatus)tourStatus.textContent=message;if(retry){retry.hidden=false;loading.hidden=false;loading.firstElementChild.textContent=message;}};
  let previewObserver,generation=0,readerReady,retryExample,syncExamples=()=>{};
  let selectedExample=examples.find(option=>option.getAttribute('aria-pressed')==='true');
  const selectExample=option=>{
    for(const item of examples)item.setAttribute('aria-pressed',String(item===option));syncExamples();
    if(!option||!preview)return;
    preview.title=`试读：${option.dataset.exampleTitle}`;
    if(openPreview)openPreview.href=`downloads/${option.dataset.example}.html?demo&v=3.19`;
  };
  const previewDocuments=new Map();
  const fetchPreview=name=>{
    let entry=previewDocuments.get(name);
    if(!entry){
      const controller=new AbortController();entry={controller,settled:false};
      const timeout=setTimeout(()=>controller.abort(),20000);
      entry.promise=fetch(`previews/${name}.json?v=3.19`,{signal:controller.signal,priority:'high'}).then(response=>{if(!response.ok)throw new Error('Preview unavailable');return response.json();}).then(document=>{entry.settled=true;return document;}).catch(error=>{if(previewDocuments.get(name)===entry)previewDocuments.delete(name);throw error;}).finally(()=>clearTimeout(timeout));
      previewDocuments.set(name,entry);
    }
    return entry.promise;
  };
  const cancelOtherPreviews=name=>{
    for(const [key,entry] of previewDocuments)if(key!==name&&!entry.settled){previewDocuments.delete(key);entry.controller.abort();}
  };
  const loadPreview=()=>{
    if(!preview?.dataset.src)return;
    setBusy(true);preview.src=preview.dataset.src;delete preview.dataset.src;previewObserver?.disconnect();
  };
  const currentReader=()=>{
    try{return preview?.contentWindow?.location.href===preview?.src?preview.contentWindow.reader:undefined;}catch{return;}
  };
  const waitReader=()=>{
    const current=currentReader();if(current?.openPreview)return preview.contentWindow.document.fonts.ready.then(()=>current);
    if(readerReady)return readerReady;
    readerReady=new Promise((resolve,reject)=>{
      let settled=false,timer;
      const clean=()=>{clearTimeout(timer);preview?.removeEventListener('load',loaded);preview?.removeEventListener('error',failed);};
      const fail=()=>{if(settled)return;settled=true;clean();reject(new Error('Reader unavailable'));};
      const loaded=()=>{
        const reader=currentReader();if(!reader?.openPreview){fail();return;}
        clearTimeout(timer);
        preview.contentWindow.document.fonts.ready.then(()=>{if(settled)return;settled=true;clean();resolve(reader);},fail);
      };
      const failed=()=>fail();
      preview?.addEventListener('load',loaded);preview?.addEventListener('error',failed);
      timer=setTimeout(fail,30000);loadPreview();
      if(currentReader()?.openPreview)loaded();
    }).then(reader=>{readerReady=undefined;return reader;},error=>{readerReady=undefined;if(preview&&!currentReader())preview.dataset.src=preview.src;throw error;});
    return readerReady;
  };
  if(preview){
    preview.addEventListener('load',()=>{
      if(!currentReader())return;
      if(!generation){setBusy(false);if(selectedExample)preview.dataset.selectedExample=selectedExample.dataset.example;if(tour)tour.disabled=false;}
      applyTheme(document.documentElement.dataset.siteTheme==='dark');
    });
    previewObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))void waitReader().catch(()=>{if(!generation)failed('示例加载失败，请重试。');});},{rootMargin:'180px'});previewObserver.observe(preview);
  }
  for(const option of examples){
   option.addEventListener('pointerenter',()=>{if(currentReader())void fetchPreview(option.dataset.example).catch(()=>{});},{passive:true});
   option.addEventListener('focus',()=>{if(currentReader())void fetchPreview(option.dataset.example).catch(()=>{});});
   option.addEventListener('click',()=>void activateExample(option));
  }
  async function activateExample(option,targetBlock){
    if(!preview||option.getAttribute('aria-pressed')==='true'&&!targetBlock)return;
    const token=++generation;cancelOtherPreviews(option.dataset.example);
    selectExample(option);
    if(tour)tour.disabled=true;if(tourStatus)tourStatus.textContent='';
    // Selecting the displayed book cancels an unfinished switch without
    // resetting its page, selection or in-progress annotation.
    if(option===selectedExample&&currentReader()){
      setBusy(false);if(tour)tour.disabled=false;if(targetBlock)locateActivity(currentReader(),targetBlock);return;
    }
    setBusy(true);
    try{
      const [document,reader]=await Promise.all([fetchPreview(option.dataset.example),waitReader()]);if(token!==generation)return;
      reader.openPreview(document);retryExample=undefined;selectedExample=option;preview.dataset.selectedExample=option.dataset.example;
      setBusy(false);if(tour)tour.disabled=false;if(targetBlock)locateActivity(reader,targetBlock);
    }catch{
      if(token!==generation)return;
      setBusy(false);if(tour)tour.disabled=false;
      retryExample=option;failed('示例加载失败，请重试。');
      selectExample(selectedExample);
    }
  }
  function locateActivity(reader,id){const page=reader.d.notebook.chapters.flatMap(c=>c.pages).find(p=>p.blocks.some(b=>b.id===id));if(!page)throw new Error('Activity unavailable');reader.goBlock(page.id,id);document.querySelector('#read').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  for(const action of document.querySelectorAll('[data-learn-example]'))action.addEventListener('click',async()=>{const option=examples.find(b=>b.dataset.example===action.dataset.learnExample);if(!option)return;action.disabled=true;action.setAttribute('aria-busy','true');const status=document.querySelector('#learning-status');if(status)status.textContent='正在打开…';try{await activateExample(option,action.dataset.learnBlock);if(status)status.textContent=preview.dataset.selectedExample===option.dataset.example?'已打开示例，可在纸页内操作。':'加载失败，请重试。';}finally{action.disabled=false;action.removeAttribute('aria-busy');}});
  syncExamples=roving(examples,()=>examples.find(b=>b.getAttribute('aria-pressed')==='true'),b=>b.click());
  retry?.addEventListener('click',()=>{
    const wanted=retryExample||examples.find(b=>b.getAttribute('aria-pressed')==='true');retryExample=undefined;
    if(!currentReader()){setBusy(true);void waitReader().then(()=>{setBusy(false);if(tour)tour.disabled=false;}).catch(()=>failed('示例加载失败，请重试。'));}
    else if(wanted){wanted.setAttribute('aria-pressed','false');wanted.click();}
  });
  tour?.addEventListener('click',async()=>{
    const token=generation;
    tour.disabled=true;if(tourStatus)tourStatus.textContent='正在加载…';
    try{
      const reader=await waitReader();if(token!==generation)return;
      reader.startTour();if(tourStatus)tourStatus.textContent='';tour.disabled=false;
    }catch{
      if(token!==generation)return;
      tour.disabled=false;if(tourStatus)tourStatus.textContent='加载失败，请重试或单独打开。';
    }
  });
})();
