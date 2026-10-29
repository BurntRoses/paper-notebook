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
    link('制作我的笔记', '#create'),
    link('试读一本', '#read'),
    link('观看演示', '#film'),
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
  header.replaceChildren(brand, shortcuts);
  // Native iframe lazy loading may fetch several screens ahead. Defer the
  // embedded reader until it is close, keeping initial bandwidth for the film.
  const preview=document.querySelector('.reader-preview[data-src]');
  if(preview){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){preview.src=preview.dataset.src;delete preview.dataset.src;observer.disconnect();}},{rootMargin:'180px'});observer.observe(preview);}

})();
