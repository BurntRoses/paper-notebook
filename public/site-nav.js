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
  const theme=document.createElement('button');theme.type='button';theme.className='site-theme';theme.setAttribute('aria-label','切换明暗模式');
  let savedTheme;try{savedTheme=localStorage.getItem('paper-notebook-site-theme');}catch{}
  const applyTheme=dark=>{document.documentElement.dataset.siteTheme=dark?'dark':'light';theme.textContent=dark?'☀':'☾';theme.setAttribute('aria-pressed',String(dark));const frame=document.querySelector('.reader-preview');try{const reader=frame?.contentWindow?.reader;if(reader&&reader.profile.theme!==(dark?'paper-night':'paper-light')){reader.profile.theme=dark?'paper-night':'paper-light';reader.render(reader.anchor());}}catch{}};
  applyTheme(savedTheme?savedTheme==='dark':matchMedia('(prefers-color-scheme:dark)').matches);
  theme.addEventListener('click',()=>{const dark=document.documentElement.dataset.siteTheme!=='dark';applyTheme(dark);try{localStorage.setItem('paper-notebook-site-theme',dark?'dark':'light');}catch{}});
  const star=link('☆ GitHub','https://github.com/BurntRoses/paper-notebook','site-star site-star-button');star.setAttribute('aria-label','给 GitHub 项目加星');
  const shortcuts = document.createElement('div');
  shortcuts.className = 'site-shortcuts';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'site-menu-toggle';
  button.textContent = '快速开始 ＋';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'site-menu');
  const nav = document.createElement('nav');
  nav.id = 'site-menu';
  nav.hidden = true;
  nav.setAttribute('aria-label', '快捷入口');
  nav.append(
    link('制作笔记', '#create'),
    link('在线试读', '#read'),
    link('功能演示', '#film'),
    link('GitHub ☆', 'https://github.com/BurntRoses/paper-notebook', 'site-star'),
  );
  const close = () => { nav.hidden = true; button.setAttribute('aria-expanded', 'false'); };
  button.addEventListener('click', () => {
    nav.hidden = !nav.hidden;
    button.setAttribute('aria-expanded', String(!nav.hidden));
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) close(); });
  document.addEventListener('click', event => { if (!shortcuts.contains(event.target)) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !nav.hidden) { close(); button.focus(); }
  });
  shortcuts.addEventListener('focusout', event => { if (!shortcuts.contains(event.relatedTarget)) close(); });
  shortcuts.append(button, nav);
  const actions=document.createElement('div');actions.className='site-header-actions';actions.append(theme,star,shortcuts);header.replaceChildren(brand,actions);
  // Native iframe lazy loading may fetch several screens ahead. Defer the
  // embedded reader until it is close, keeping initial bandwidth for the film.
  const preview=document.querySelector('.reader-preview[data-src]');
  const tour=document.querySelector('#start-reader-tour'),tourStatus=document.querySelector('#preview-tour-status');
  const examples=[...document.querySelectorAll('[data-example]')],openPreview=document.querySelector('#preview-open');
  let previewObserver,generation=0;
  const previewDocuments=new Map();
  const fetchPreview=name=>{
    if(!previewDocuments.has(name))previewDocuments.set(name,fetch(`previews/${name}.json?v=3.2`).then(response=>{if(!response.ok)throw new Error('Preview unavailable');return response.json();}).catch(error=>{previewDocuments.delete(name);throw error;}));
    return previewDocuments.get(name);
  };
  const loadPreview=()=>{
    if(!preview?.dataset.src)return;
    preview.setAttribute('aria-busy','true');preview.src=preview.dataset.src;delete preview.dataset.src;previewObserver?.disconnect();
  };
  const currentReader=()=>{
    try{return preview?.contentWindow?.location.href===preview?.src?preview.contentWindow.reader:undefined;}catch{return;}
  };
  const waitReader=async()=>{
    loadPreview();
    for(let attempt=0;attempt<100;attempt++){
      const reader=currentReader();if(reader?.openPreview){await preview.contentWindow.document.fonts.ready;return reader;}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw new Error('Reader unavailable');
  };
  if(preview){
    preview.addEventListener('load',()=>{
      if(!currentReader())return;
      preview.removeAttribute('aria-busy');if(tour)tour.disabled=false;
      applyTheme(document.documentElement.dataset.siteTheme==='dark');
    });
    previewObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))loadPreview();},{rootMargin:'180px'});previewObserver.observe(preview);
  }
  for(const option of examples){
   option.addEventListener('pointerenter',()=>{if(currentReader())void fetchPreview(option.dataset.example).catch(()=>{});},{passive:true});
   option.addEventListener('focus',()=>{if(currentReader())void fetchPreview(option.dataset.example).catch(()=>{});});
   option.addEventListener('click',async()=>{
    if(!preview||option.getAttribute('aria-pressed')==='true')return;
    const token=++generation;
    for(const item of examples)item.setAttribute('aria-pressed',String(item===option));
    preview.title=`试读：${option.dataset.exampleTitle}`;
    const path=`downloads/${option.dataset.example}.html?demo&v=3.2`;
    if(openPreview)openPreview.href=path;
    if(tour)tour.disabled=true;if(tourStatus)tourStatus.textContent='';
    preview.setAttribute('aria-busy','true');
    try{
      const [document,reader]=await Promise.all([fetchPreview(option.dataset.example),waitReader()]);if(token!==generation)return;
      reader.openPreview(document);preview.dataset.selectedExample=option.dataset.example;
      preview.removeAttribute('aria-busy');if(tour)tour.disabled=false;
      applyTheme(window.document.documentElement.dataset.siteTheme==='dark');
    }catch{
      if(token!==generation)return;
      preview.removeAttribute('aria-busy');if(tour)tour.disabled=false;
      if(tourStatus)tourStatus.textContent='加载失败，请重试。';
      option.setAttribute('aria-pressed','false');
    }
   });
  }
  tour?.addEventListener('click',async()=>{
    const token=generation;
    tour.disabled=true;if(tourStatus)tourStatus.textContent='正在加载…';
    loadPreview();
    for(let attempt=0;attempt<70;attempt++){
      if(token!==generation)return;
      const reader=currentReader();
      if(reader){await preview.contentWindow.document.fonts.ready;if(token!==generation)return;reader.startTour();if(tourStatus)tourStatus.textContent='';tour.disabled=false;return;}
      await new Promise(resolve=>setTimeout(resolve,200));
    }
    tour.disabled=false;if(tourStatus)tourStatus.textContent='加载失败，请重试或单独打开。';
  });
})();
