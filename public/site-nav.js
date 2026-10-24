(()=>{
 const home='./',repo='https://github.com/BurntRoses/paper-notebook',isCreate=location.pathname.endsWith('/chat-start.html');
 const link=(name,href,cls='')=>{const a=document.createElement('a');a.textContent=name;a.href=href;a.className=cls;if(href.startsWith('https:')){a.target='_blank';a.rel='noopener noreferrer'}return a};
 const header=document.querySelector('body>header,main>header')||document.body.prepend(document.createElement('header'))||document.querySelector('header');header.className='site-header';header.replaceChildren();
 const brand=link('Paper Notebook',home,'site-brand'),nav=document.createElement('nav');nav.setAttribute('aria-label','主导航');
 const create=link('制作笔记','chat-start.html');if(isCreate)create.setAttribute('aria-current','page');nav.append(link('试读',home+'#read'),create,link('GitHub ☆',repo,'site-star'));header.append(brand,nav);
})();
