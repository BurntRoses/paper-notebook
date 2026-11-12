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
  // embedded reader until it is close, keeping initial bandwidth for the visible page.
  const footerStar=document.querySelector('.footer-star');
  if(footerStar){const visible=new IntersectionObserver(entries=>{footerStar.classList.toggle('is-visible',entries[0].isIntersecting&&!document.hidden);});visible.observe(footerStar);document.addEventListener('visibilitychange',()=>{footerStar.classList.toggle('is-visible',!document.hidden&&footerStar.getBoundingClientRect().top<innerHeight);});}
  const preview=document.querySelector('.reader-preview[data-src]');
  const tour=document.querySelector('#start-reader-tour'),tourStatus=document.querySelector('#preview-tour-status');
  const examples=[...document.querySelectorAll('[data-example]')],openPreview=document.querySelector('#preview-open');
  const jumpButtons=[...document.querySelectorAll('[data-jump-category]')],jumpMenu=document.querySelector('#preview-jump-menu'),jumpBar=document.querySelector('.learning-jump-bar');
  let jumpTrigger,jumpOpenTimer,jumpCloseTimer,jumpKeyboard=false;
  const jumpExpanders=new Map();
  const closeJumps=(restore=false)=>{clearTimeout(jumpOpenTimer);clearTimeout(jumpCloseTimer);if(jumpMenu)jumpMenu.hidden=true;if(jumpTrigger){jumpTrigger.setAttribute('aria-expanded','false');jumpExpanders.get(jumpTrigger)?.setAttribute('aria-expanded','false');if(restore)jumpTrigger.focus({preventScroll:true});}jumpTrigger=undefined;jumpKeyboard=false;};
  const syncJumps=busy=>{const targets=currentReader()?.getLearningJumps?.()||[];for(const control of jumpButtons){const expander=jumpExpanders.get(control);if(busy){control.disabled=true;if(expander)expander.disabled=true;continue;}const matches=targets.filter(t=>t.category===control.dataset.jumpCategory);control.hidden=!matches.length;control.parentElement.hidden=!matches.length;control.disabled=!matches.length;control.setAttribute('aria-label',control.textContent+'，'+matches.length+'项');if(expander){expander.hidden=matches.length<2;expander.disabled=control.disabled;expander.setAttribute('aria-expanded','false');}if(matches.length>1){control.setAttribute('aria-haspopup','menu');control.setAttribute('aria-controls','preview-jump-menu');control.setAttribute('aria-expanded','false');}else{control.removeAttribute('aria-haspopup');control.removeAttribute('aria-controls');control.removeAttribute('aria-expanded');}}};
  const loading=document.querySelector('.preview-loading'),retry=document.querySelector('.preview-retry');
  const setBusy=busy=>{
    if(preview){if(busy)preview.setAttribute('aria-busy','true');else preview.removeAttribute('aria-busy');}
    if(loading)loading.hidden=!busy;if(loading?.firstElementChild)loading.firstElementChild.textContent='正在载入示例…';if(retry)retry.hidden=true;
    closeJumps();syncJumps(busy);
    for(const b of examples){const pending=busy&&b.getAttribute('aria-pressed')==='true';b.toggleAttribute('data-loading',pending);if(pending)b.setAttribute('aria-busy','true');else b.removeAttribute('aria-busy');}
  };
  const failed=message=>{setBusy(false);if(tourStatus)tourStatus.textContent=message;if(retry){retry.hidden=false;loading.hidden=false;loading.firstElementChild.textContent=message;}};
  let previewObserver,generation=0,readerReady,retryExample,syncExamples=()=>{};
  let selectedExample=examples.find(option=>option.getAttribute('aria-pressed')==='true');
  const selectExample=option=>{
    for(const item of examples)item.setAttribute('aria-pressed',String(item===option));syncExamples();
    if(!option||!preview)return;
    preview.title=`试读：${option.dataset.exampleTitle}`;
    const title=document.querySelector('#preview-example-title');
    if(title)title.textContent=option.dataset.exampleTitle;
    if(openPreview)openPreview.href=`downloads/${option.dataset.example}.html?demo&v=3.25`;
  };
  const previewDocuments=new Map();
  const fetchPreview=name=>{
    let entry=previewDocuments.get(name);
    if(!entry){
      const controller=new AbortController();entry={controller,settled:false};
      const timeout=setTimeout(()=>controller.abort(),20000);
      entry.promise=fetch(`previews/${name}.json?v=3.21`,{signal:controller.signal,priority:'high'}).then(response=>{if(!response.ok)throw new Error('Preview unavailable');return response.json();}).then(document=>{entry.settled=true;return document;}).catch(error=>{if(previewDocuments.get(name)===entry)previewDocuments.delete(name);throw error;}).finally(()=>clearTimeout(timeout));
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
    previewObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting&&e.intersectionRect.height>=Math.min(120,e.boundingClientRect.height*.15)))void waitReader().catch(()=>{if(!generation)failed('示例加载失败，请重试。');});},{threshold:[0,.15],rootMargin:navigator.connection?.saveData||/2g|3g/.test(navigator.connection?.effectiveType||'')?'0px':'120px'});previewObserver.observe(preview);
  }
  for(const option of examples){
   let intentTimer;const prefetch=()=>{const connection=navigator.connection;if(currentReader()&&option.getAttribute('aria-pressed')!=='true'&&!connection?.saveData&&!/2g|3g/.test(connection?.effectiveType||'')&&!(connection?.downlink>0&&connection.downlink<2))void fetchPreview(option.dataset.example).catch(()=>{});};
   option.addEventListener('pointerenter',()=>{intentTimer=setTimeout(prefetch,120);},{passive:true});option.addEventListener('pointerleave',()=>clearTimeout(intentTimer),{passive:true});
   option.addEventListener('focus',()=>{intentTimer=setTimeout(prefetch,120);});option.addEventListener('blur',()=>clearTimeout(intentTimer));
   option.addEventListener('click',()=>void activateExample(option));
  }
  async function activateExample(option){
    if(!preview||option.getAttribute('aria-pressed')==='true')return;
    const token=++generation;cancelOtherPreviews(option.dataset.example);
    selectExample(option);
    if(tour)tour.disabled=true;if(tourStatus)tourStatus.textContent='';
    // Selecting the displayed book cancels an unfinished switch without
    // resetting its page, selection or in-progress annotation.
    if(option===selectedExample&&currentReader()){
      setBusy(false);if(tour)tour.disabled=false;return;
    }
    setBusy(true);
    try{
      const [document,reader]=await Promise.all([fetchPreview(option.dataset.example),waitReader()]);if(token!==generation)return;
      if(reader.profile.font==='hand')await preview.contentWindow.document.fonts.load('18px StudyHand',JSON.stringify(document.notebook));if(token!==generation)return;
      reader.openPreview(document);retryExample=undefined;selectedExample=option;preview.dataset.selectedExample=option.dataset.example;
      setBusy(false);if(tour)tour.disabled=false;
    }catch{
      if(token!==generation)return;
      setBusy(false);if(tour)tour.disabled=false;
      retryExample=option;failed('示例加载失败，请重试。');
      selectExample(selectedExample);
    }
  }
  const locateJump=target=>{
    const reader=currentReader();if(!reader)return;
    try{reader.goBlock(target.pageId,target.blockId);closeJumps(true);document.querySelector('.learning-preview-head').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});if(tourStatus)tourStatus.textContent='';}
    catch{if(tourStatus)tourStatus.textContent='暂时无法定位，请重新选择示例。';}
  };
  const jumpTargets=control=>currentReader()?.getLearningJumps?.().filter(t=>t.category===control.dataset.jumpCategory)||[];
  const openJumps=(control,keyboard=false,last=false)=>{
    if(control.disabled)return;const targets=jumpTargets(control);if(targets.length<2){closeJumps();return;}
    closeJumps();jumpTrigger=control;jumpKeyboard=keyboard;control.setAttribute('aria-expanded','true');jumpExpanders.get(control)?.setAttribute('aria-expanded','true');jumpMenu.replaceChildren();
    for(const target of targets){const item=document.createElement('button');item.type='button';item.setAttribute('role','menuitem');item.textContent=target.title;item.dataset.jumpBlock=target.blockId;item.addEventListener('click',()=>locateJump(target));jumpMenu.append(item);}
    jumpMenu.hidden=false;const bar=jumpBar.getBoundingClientRect(),anchor=control.getBoundingClientRect();jumpMenu.style.left=Math.max(0,Math.min(anchor.left-bar.left,bar.width-jumpMenu.offsetWidth))+'px';jumpMenu.style.top=(anchor.bottom-bar.top+4)+'px';
    if(keyboard)(last?jumpMenu.lastElementChild:jumpMenu.firstElementChild)?.focus({preventScroll:true});
  };
  for(const control of jumpButtons){
    const group=document.createElement('span');group.className='learning-jump';group.hidden=control.hidden;control.before(group);group.append(control);
    const expander=document.createElement('button');expander.type='button';expander.className='learning-jump-expand';expander.hidden=true;expander.innerHTML=icon('chevron');expander.setAttribute('aria-label','展开'+control.textContent+'列表');expander.setAttribute('aria-haspopup','menu');expander.setAttribute('aria-controls','preview-jump-menu');expander.setAttribute('aria-expanded','false');group.append(expander);jumpExpanders.set(control,expander);
    control.addEventListener('click',()=>{if(control.disabled)return;const target=jumpTargets(control)[0];closeJumps();if(target)locateJump(target);});
    expander.addEventListener('click',()=>{if(jumpTrigger===control&&!jumpMenu.hidden)closeJumps();else openJumps(control,true);});
    group.addEventListener('pointerenter',event=>{if(event.pointerType!=='mouse'||!matchMedia('(hover:hover)').matches)return;clearTimeout(jumpCloseTimer);clearTimeout(jumpOpenTimer);jumpOpenTimer=setTimeout(()=>openJumps(control),110);});
    group.addEventListener('pointerleave',()=>clearTimeout(jumpOpenTimer));
    for(const trigger of [control,expander])trigger.addEventListener('keydown',event=>{if(event.isComposing||event.altKey||event.ctrlKey||event.metaKey||!['ArrowDown','ArrowUp'].includes(event.key))return;event.preventDefault();event.stopPropagation();openJumps(control,true,event.key==='ArrowUp');});
  }
  jumpBar?.addEventListener('pointerenter',()=>clearTimeout(jumpCloseTimer));
  jumpBar?.addEventListener('pointerleave',()=>{clearTimeout(jumpOpenTimer);jumpCloseTimer=setTimeout(()=>{if(!jumpKeyboard||!jumpMenu.contains(document.activeElement))closeJumps();},180);});
  jumpBar?.addEventListener('keydown',event=>{
    if(event.isComposing||event.altKey||event.ctrlKey||event.metaKey||!jumpTrigger)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeJumps(true);return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key)||!jumpMenu.contains(event.target))return;
    event.preventDefault();const items=[...jumpMenu.querySelectorAll('button')],at=items.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?items.length-1:(at+(event.key==='ArrowUp'?-1:1)+items.length)%items.length;items[next]?.focus();
  });
  window.addEventListener('resize',()=>closeJumps());
  window.addEventListener('blur',()=>closeJumps());
  document.addEventListener('click',event=>{if(!jumpBar?.contains(event.target))closeJumps();});
  document.addEventListener('focusin',event=>{if(jumpTrigger&&!jumpBar?.contains(event.target))closeJumps();});
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
