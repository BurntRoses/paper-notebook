(()=>{
 const repo='https://github.com/BurntRoses/paper-notebook',current=location.pathname.split('/').pop()||'index.html';
 const link=(text,href,cls='')=>{const a=document.createElement('a');a.textContent=text;a.href=href;a.className=cls;if(/^https?:/.test(href)){a.target='_blank';a.rel='noopener noreferrer';}return a;};
 const nav=document.createElement('nav');nav.className='site-trail';nav.setAttribute('aria-label','Paper Notebook 页面导航');
 for(const [name,url]of [['项目首页','promo.html'],['开始阅读 / 示例','start.html'],['复制给 AI','chat-start.html'],['机器学习图解','downloads/machine-learning.html'],['演示影片','promo-motion.html']]){const a=link(name,url);if(current===url||(current==='index.html'&&url==='promo.html'))a.setAttribute('aria-current','page');nav.append(a);}
 nav.append(link('☆ 去 GitHub 留一颗 Star',repo,'site-star'));const header=document.querySelector('body>header,main>header');if(header)header.insertAdjacentElement('afterend',nav);else document.body.prepend(nav);
 const support=document.createElement('section');support.className='site-support';const copy=document.createElement('div'),title=document.createElement('strong'),p=document.createElement('p'),more=document.createElement('nav');title.textContent='这本小笔记，想认识更多好奇的人。';p.textContent='如果它让学习多了一点纸上灵感，欢迎去 GitHub 留一颗 Star。也可以带着建议来，让下一本更好读。';
 more.append(link('作者的 GitHub ↗','https://github.com/BurntRoses'),link('提个点子 ↗',repo+'/issues'),link('继续生成自己的笔记','chat-start.html'),link('打开空白阅读器','downloads/blank-notebook.html'));copy.append(title,p,more);support.append(copy,link('☆ 给小笔记一颗星 ↗',repo,'site-star'));
 const footer=document.querySelector('body>footer,main>footer');if(footer)footer.before(support);else(document.querySelector('main')||document.body).append(support);
})();
