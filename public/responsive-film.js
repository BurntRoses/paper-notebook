/* Keep both native media buffers warm; rotation does not reload either source. */
(() => {
  let video = document.querySelector('[data-responsive-film]');
  if (!video) return;
  const status = document.querySelector('.film-status');
  const orientation = matchMedia('(orientation: portrait)');
  const initial = orientation.matches ? 'portrait' : 'landscape';
  const alternate = initial === 'portrait' ? 'landscape' : 'portrait';
  const spare = video.cloneNode(false);
  spare.removeAttribute('id');
  spare.removeAttribute('data-responsive-film');
  spare.hidden = true;
  spare.controls = false;
  spare.setAttribute('aria-hidden', 'true');
  video.after(spare);
  const players = { [initial]: video, [alternate]: spare };
  let active = initial, request = 0, switching = false, wantedTime = 0, wantedPlay = false, controller;
  const message = text => { if (status) status.textContent = text; };
  const remember = player => {
    if (player === video && !switching) { wantedTime = player.currentTime; wantedPlay = !player.paused; }
  };
  const waitFor = (player, events, ready, signal) => new Promise((resolve, reject) => {
    const clean = () => {
      events.forEach(name => player.removeEventListener(name, check));
      player.removeEventListener('error', fail);
      signal.removeEventListener('abort', abort);
    };
    const check = () => { if (ready()) { clean(); resolve(); } };
    const fail = () => { clean(); reject(player.error); };
    const abort = () => { clean(); reject(new DOMException('Source switch cancelled', 'AbortError')); };
    events.forEach(name => player.addEventListener(name, check));
    player.addEventListener('error', fail);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort(); else if (player.error) fail(); else check();
  });
  for (const [name, player] of Object.entries(players)) {
    player.dataset.orientation = name;
    player.poster = `promo/story/film-${name}-poster-1.png`;
    player.src = `promo/paper-notebook-film${name === 'portrait' ? '-portrait' : ''}.mp4`;
    player.preload = 'auto';
    for (const event of ['play', 'pause', 'timeupdate', 'ended']) player.addEventListener(event, () => remember(player));
    player.addEventListener('waiting', () => { if (player === video && !player.paused) message('正在缓冲…'); });
    player.addEventListener('playing', () => { if (player === video && !switching) message(''); });
    player.addEventListener('canplay', () => { if (player === video && !switching) message(''); });
    player.addEventListener('error', () => { if (player === video) message('影片加载失败，请刷新重试。'); });
    player.load();
  }
  async function adapt() {
    const next = orientation.matches ? 'portrait' : 'landscape';
    if (next === active) return;
    remember(video);
    const token = ++request;
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    switching = true;
    const previous = video;
    previous.pause();
    previous.hidden = true;
    previous.removeAttribute('aria-busy');
    previous.controls = false;
    previous.removeAttribute('id');
    previous.setAttribute('aria-hidden', 'true');
    video = players[next];
    active = next;
    const player = video;
    player.id = 'film-player';
    player.hidden = false;
    player.controls = true;
    player.removeAttribute('aria-hidden');
    player.setAttribute('aria-busy', 'true');
    message('影片加载中…');
    try {
      await waitFor(player, ['loadedmetadata'], () => player.readyState >= 1, signal);
      const target = Math.min(wantedTime, Math.max(0, player.duration - .05));
      if (target > 0) {
        await waitFor(player, ['progress', 'loadeddata', 'canplay', 'canplaythrough'], () => {
          for (let i = 0; i < player.seekable.length; i++) {
            if (player.seekable.start(i) <= target && player.seekable.end(i) >= target) return true;
          }
          return false;
        }, signal);
      }
      if (token !== request) return;
      player.currentTime = target;
      // play() also drives the seek on browsers that suspend paused media.
      await Promise.all([
        waitFor(player, ['seeked', 'loadeddata'], () => !player.seeking && player.readyState >= 2, signal),
        wantedPlay ? player.play() : Promise.resolve(),
      ]);
      if (token === request) message('');
    } catch (error) {
      if (token === request) message(error?.name === 'NotAllowedError' ? '点击影片继续播放。' : '影片暂时无法播放，请稍后重试。');
    } finally {
      if (token === request) { player.removeAttribute('aria-busy'); switching = false; remember(player); }
    }
  }
  orientation.addEventListener('change', adapt);
})();
