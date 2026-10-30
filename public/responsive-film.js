/* Prefer HD in auto mode; manual quality stays selected through playback and rotation. */
(() => {
  const video = document.querySelector('[data-responsive-film]');
  if (!video) return;
  const status = document.querySelector('.film-status');
  const selector = document.querySelector('[data-film-quality]');
  const orientation = matchMedia('(orientation: portrait)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const revision = '2.9';
  const hdCopies = new Map(), attempted = new Set();
  let active = '', quality = '', mode = 'auto', request = 0, switching = false;
  let wantedTime = 0, wantedPlay = false, sourceController, upgradeController, stallTimer;
  const message = text => { if (status) status.textContent = text; };
  const slowNetwork = () => connection?.saveData || /(^|-)2g$|^3g$/.test(connection?.effectiveType || '') || (connection?.downlink > 0 && connection.downlink < 2);
  const url = (direction, level) => `promo/paper-notebook-film${direction === 'portrait' ? '-portrait' : ''}${level === 'low' ? '-low' : ''}.mp4?v=${revision}`;
  const poster = direction => `promo/story/film-${direction}-poster-1.webp?v=${revision}`;
  const preferred = direction => mode !== 'auto' ? mode : hdCopies.has(direction) || location.protocol === 'file:' || !slowNetwork() ? 'high' : 'low';
  const updateQuality = () => {
    video.dataset.qualityMode = mode;
    if (!selector) return;
    selector.value = mode;
    selector.querySelector('[value="auto"]').textContent = `自动 · ${quality === 'high' ? '高清 720p' : '流畅 540p'}`;
  };
  const remember = () => { if (!switching && !video.error) { wantedTime = video.currentTime; wantedPlay = !video.paused; } };
  const bufferAhead = () => {
    for (let i = 0; i < video.buffered.length; i++) {
      if (video.buffered.start(i) <= video.currentTime + .1 && video.buffered.end(i) >= video.currentTime) return video.buffered.end(i) - video.currentTime;
    }
    return 0;
  };
  const cancelUpgrade = () => { upgradeController?.abort(); upgradeController = undefined; };
  const waitFor = (names, ready, signal) => new Promise((resolve, reject) => {
    const clean = () => { names.forEach(n => video.removeEventListener(n, check)); video.removeEventListener('error', fail); signal.removeEventListener('abort', abort); };
    const check = () => { if (ready()) { clean(); resolve(); } };
    const fail = () => { clean(); reject(video.error); };
    const abort = () => { clean(); reject(new DOMException('Cancelled', 'AbortError')); };
    names.forEach(n => video.addEventListener(n, check)); video.addEventListener('error', fail); signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort(); else check();
  });
  const stillFrame = () => {
    if (video.readyState < 2 || !video.videoWidth) return;
    try {
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0); return canvas.toDataURL('image/jpeg', .85);
    } catch { return; }
  };

  async function changeSource(direction, level, reason = 'orientation', retryPlay = false) {
    remember();
    const initial = !active, token = ++request, time = wantedTime, play = wantedPlay || retryPlay;
    const frame = reason === 'quality' ? stillFrame() : undefined;
    sourceController?.abort(); sourceController = new AbortController(); const { signal } = sourceController;
    clearTimeout(stallTimer); switching = true; active = direction; quality = level; video.pause();
    video.dataset.orientation = direction; video.dataset.quality = level;
    updateQuality();
    video.poster = frame || poster(direction); video.preload = 'auto';
    video.src = level === 'high' && hdCopies.has(direction) ? hdCopies.get(direction) : url(direction, level);
    video.load();
    if (initial) {
      switching = false;
      if (mode === 'auto' && level === 'high') stallTimer = setTimeout(() => { if (quality === 'high' && video.readyState < 2) void downgrade(); }, 5000);
      return;
    }
    video.setAttribute('aria-busy', 'true');
    if (reason !== 'quality') message('正在加载视频…');
    try {
      await waitFor(['loadedmetadata'], () => video.readyState >= 1, signal);
      if (token !== request) return;
      const target = Math.min(time, Math.max(0, video.duration - .05));
      if (target > 0) {
        await waitFor(['progress', 'loadeddata', 'canplay'], () => {
          for (let i = 0; i < video.seekable.length; i++) if (video.seekable.start(i) <= target && video.seekable.end(i) >= target) return true;
          return false;
        }, signal);
        video.currentTime = target;
      }
      await Promise.all([waitFor(['seeked', 'loadeddata', 'canplay'], () => !video.seeking && video.readyState >= 2, signal), play ? video.play() : Promise.resolve()]);
      if (token === request) message('');
    } catch (error) {
      if (token !== request) return;
      if (error?.name === 'NotAllowedError') message('点击播放继续。');
      else if (mode === 'auto' && level === 'high') { switching = false; void downgrade(); }
      else message('视频加载失败，可点击下方按钮重试。');
    } finally {
      if (token === request) {
        switching = false; video.removeAttribute('aria-busy'); video.poster = poster(direction); remember(); maybeUpgrade();
      }
    }
  }

  async function maybeUpgrade() {
    if (mode !== 'auto' || switching || quality !== 'low' || upgradeController || attempted.has(active) || slowNetwork() || location.protocol === 'file:' || video.ended || bufferAhead() < 10 || video.duration - video.currentTime < 12) return;
    const direction = active, controller = new AbortController(); upgradeController = controller; attempted.add(direction);
    const started = performance.now(); let received = 0, requiredRate = 200 * 1024;
    // Stop the background transfer if it cannot sustain HD or competes with playback.
    const monitor = setInterval(() => {
      const elapsed = (performance.now() - started) / 1000;
      if ((elapsed >= 2 && received / elapsed < requiredRate) || (!video.paused && bufferAhead() < 4)) controller.abort();
    }, 250);
    try {
      const response = await fetch(url(direction, 'high'), { signal: controller.signal, priority: 'low' });
      if (!response.ok) throw new Error('HD unavailable');
      const length = Number(response.headers.get('content-length'));
      if (length && video.duration) requiredRate = Math.max(160 * 1024, length / video.duration * 2.5);
      const stream = response.body.getReader(), chunks = [];
      while (true) { const { value, done } = await stream.read(); if (done) break; chunks.push(value); received += value.byteLength; }
      if (controller.signal.aborted) return;
      hdCopies.set(direction, URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' })));
      if (mode === 'auto' && active === direction && quality === 'low' && !switching) await changeSource(direction, 'high', 'quality');
    } catch { /* The low stream remains available throughout a failed upgrade. */ }
    finally { clearInterval(monitor); if (upgradeController === controller) upgradeController = undefined; }
  }

  async function downgrade() {
    if (mode !== 'auto' || !active || quality !== 'high' || switching) return;
    cancelUpgrade(); await changeSource(active, 'low', 'quality');
  }
  selector?.addEventListener('change', () => {
    if (!['auto', 'high', 'low'].includes(selector.value)) return;
    mode = selector.value; updateQuality(); cancelUpgrade(); clearTimeout(stallTimer);
    if (mode === 'auto') {
      attempted.delete(active);
      if (quality === 'low' && !slowNetwork() && !hdCopies.has(active) && !video.error) { maybeUpgrade(); return; }
    }
    const level = preferred(active);
    if (level !== quality || video.error) void changeSource(active, level, 'quality');
  });
  function adapt(retryPlay = false) {
    const next = orientation.matches ? 'portrait' : 'landscape';
    if (!retryPlay && next === active) return;
    cancelUpgrade();
    if (retryPlay) attempted.delete(next);
    void changeSource(next, preferred(next), 'orientation', retryPlay);
  }
  for (const name of ['play', 'pause', 'timeupdate', 'ended']) video.addEventListener(name, remember);
  for (const name of ['progress', 'canplay', 'playing', 'timeupdate']) video.addEventListener(name, maybeUpgrade);
  for (const name of ['canplay', 'playing']) video.addEventListener(name, () => { clearTimeout(stallTimer); if (!switching) message(''); });
  video.addEventListener('waiting', () => {
    if (video.paused || switching || bufferAhead() >= 4) return;
    message('正在缓冲…'); cancelUpgrade();
    if (mode === 'auto' && quality === 'high' && !hdCopies.has(active)) { clearTimeout(stallTimer); stallTimer = setTimeout(() => void downgrade(), 2500); }
  });
  video.addEventListener('error', () => { if (!switching) { if (mode === 'auto' && quality === 'high') void downgrade(); else message('视频加载失败，可点击下方按钮重试。'); } });
  document.querySelector('.film-retry')?.addEventListener('click', () => adapt(true));
  orientation.addEventListener('change', () => adapt());
  connection?.addEventListener('change', () => { if (mode !== 'auto') return; if (slowNetwork()) { cancelUpgrade(); if (!hdCopies.has(active)) void downgrade(); } else { attempted.delete(active); maybeUpgrade(); } });
  window.addEventListener('pagehide', cancelUpgrade);
  adapt();
})();
