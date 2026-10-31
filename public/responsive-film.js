/* Keep quality selection inside the player and preserve it through rotation. */
(() => {
  const video = document.querySelector('[data-responsive-film]');
  if (!video) return;
  const status = document.querySelector('.film-status');
  const selector = document.querySelector('[data-film-quality]');
  const menu = document.querySelector('[data-film-quality-menu]');
  const choices = [...document.querySelectorAll('[data-quality-choice]')];
  // Native video controls do not expose a cross-browser quality menu. Use one
  // integrated control bar so quality remains available in player fullscreen.
  const screen = document.createElement('div'); screen.className = 'film-screen';
  video.before(screen); screen.append(video);
  const controls = document.createElement('div'); controls.className = 'film-controls';
  controls.innerHTML = '<button type="button" data-film-play aria-label="播放">▶</button><span class="film-time" data-film-time>0:00 / 1:04</span><input class="film-progress" data-film-progress type="range" min="0" max="64" step="0.1" value="0" aria-label="播放进度"><button type="button" data-film-mute aria-label="静音">♪</button><button type="button" data-film-fullscreen aria-label="全屏">⛶</button>';
  if (selector) controls.insertBefore(selector.parentElement, controls.lastElementChild);
  screen.append(controls); video.controls = false;
  const playButton = controls.querySelector('[data-film-play]'), muteButton = controls.querySelector('[data-film-mute]');
  const glyph = path => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const glyphs = {
    play: glyph('<path d="m9 5 11 7-11 7z" fill="currentColor" stroke="none"/>'),
    pause: glyph('<path d="M8 5v14M16 5v14" stroke-width="3"/>'),
    volume: glyph('<path d="M11 4 5 9H2v6h3l6 5zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'),
    muted: glyph('<path d="M11 4 5 9H2v6h3l6 5zM16 9l6 6m0-6-6 6"/>'),
    fullscreen: glyph('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'),
  };
  controls.querySelector('[data-film-fullscreen]').innerHTML = glyphs.fullscreen;
  const progress = controls.querySelector('[data-film-progress]'), timeLabel = controls.querySelector('[data-film-time]');
  const clock = value => `${Math.floor((value || 0) / 60)}:${String(Math.floor((value || 0) % 60)).padStart(2, '0')}`;
  const syncControls = () => {
    playButton.innerHTML = video.paused ? glyphs.play : glyphs.pause; playButton.setAttribute('aria-label', video.paused ? '播放' : '暂停');
    muteButton.innerHTML = video.muted ? glyphs.muted : glyphs.volume; muteButton.setAttribute('aria-label', video.muted ? '取消静音' : '静音');
    progress.max = String(video.duration || 64); progress.value = String(video.currentTime || 0);
    timeLabel.textContent = `${clock(video.currentTime)} / ${clock(video.duration || 64)}`;
  };
  playButton.addEventListener('click', () => { if (video.paused) void video.play().catch(() => {}); else video.pause(); });
  video.addEventListener('click', () => playButton.click());
  muteButton.addEventListener('click', () => { video.muted = !video.muted; });
  progress.addEventListener('input', () => { if (Number.isFinite(video.duration)) video.currentTime = Number(progress.value); });
  controls.querySelector('[data-film-fullscreen]').addEventListener('click', () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (screen.requestFullscreen) void screen.requestFullscreen();
    else video.webkitEnterFullscreen?.();
  });
  for (const event of ['play', 'pause', 'timeupdate', 'durationchange', 'volumechange', 'loadedmetadata']) video.addEventListener(event, syncControls);
  syncControls();
  const orientation = matchMedia('(orientation: portrait)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const revision = '3.2';
  const hdCopies = new Map(), attempted = new Set();
  let active = '', quality = '', mode = 'auto', request = 0, switching = false;
  let wantedTime = 0, wantedPlay = false, sourceController, upgradeController, stallTimer;
  const message = text => { if (status) status.textContent = text; };
  const slowNetwork = () => connection?.saveData || /(^|-)2g$|^3g$/.test(connection?.effectiveType || '') || (connection?.downlink > 0 && connection.downlink < 2);
  const url = (direction, level) => `promo/paper-notebook-film${direction === 'portrait' ? '-portrait' : ''}${level === '540' ? '-low' : level === '1080' ? '-1080' : ''}.mp4?v=${revision}`;
  const poster = direction => `promo/story/film-${direction}-poster-1.webp?v=${revision}`;
  const preferred = direction => mode !== 'auto' ? mode : hdCopies.has(direction) || location.protocol === 'file:' || !slowNetwork() ? '1080' : '540';
  const updateQuality = () => {
    video.dataset.qualityMode = mode;
    if (!selector) return;
    const selected = choices.find(item => item.dataset.qualityChoice === mode);
    selector.setAttribute('aria-label', `视频清晰度：${mode === 'auto' ? `自动，当前 ${quality || '1080'}p` : `${mode}p`}`);
    selector.setAttribute('aria-expanded', String(menu && !menu.hidden));
    const label = selector.querySelector('[data-quality-label]');
    if (label) label.textContent = mode === 'auto' ? `自动 · ${quality || '1080'}p` : `${mode}p`;
    choices.forEach(item => item.setAttribute('aria-checked', String(item === selected)));
    const autoQuality = menu?.querySelector('[data-auto-quality]');
    if (autoQuality) autoQuality.textContent = `${quality || '1080'}p`;
  };
  const closeMenu = () => { if (menu) menu.hidden = true; updateQuality(); };
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
    video.src = level === '1080' && hdCopies.has(direction) ? hdCopies.get(direction) : url(direction, level);
    video.load();
    if (initial) {
      switching = false;
      if (mode === 'auto' && level === '1080') stallTimer = setTimeout(() => { if (quality === '1080' && video.readyState < 2) void fallback(); }, 5000);
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
      else if (mode === 'auto' && level !== '540') { switching = false; void fallback(level === '1080' ? '720' : '540'); }
      else message('视频加载失败，可点击下方按钮重试。');
    } finally {
      if (token === request) {
        switching = false; video.removeAttribute('aria-busy'); video.poster = poster(direction); remember(); maybeUpgrade();
      }
    }
  }

  async function maybeUpgrade() {
    if (mode !== 'auto' || switching || quality !== '540' || upgradeController || attempted.has(active) || slowNetwork() || location.protocol === 'file:' || video.ended || bufferAhead() < 10 || video.duration - video.currentTime < 12) return;
    const direction = active, controller = new AbortController(); upgradeController = controller; attempted.add(direction);
    const started = performance.now(); let received = 0, requiredRate = 200 * 1024;
    // Stop the background transfer if it cannot sustain HD or competes with playback.
    const monitor = setInterval(() => {
      const elapsed = (performance.now() - started) / 1000;
      if ((elapsed >= 2 && received / elapsed < requiredRate) || (!video.paused && bufferAhead() < 4)) controller.abort();
    }, 250);
    try {
      const response = await fetch(url(direction, '1080'), { signal: controller.signal, priority: 'low' });
      if (!response.ok) throw new Error('HD unavailable');
      const length = Number(response.headers.get('content-length'));
      if (length && video.duration) requiredRate = Math.max(160 * 1024, length / video.duration * 2.5);
      const stream = response.body.getReader(), chunks = [];
      while (true) { const { value, done } = await stream.read(); if (done) break; chunks.push(value); received += value.byteLength; }
      if (controller.signal.aborted) return;
      hdCopies.set(direction, URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' })));
      if (mode === 'auto' && active === direction && quality === '540' && !switching) await changeSource(direction, '1080', 'quality');
    } catch { /* The low stream remains available throughout a failed upgrade. */ }
    finally { clearInterval(monitor); if (upgradeController === controller) upgradeController = undefined; }
  }

  async function fallback(level = quality === '1080' ? '720' : '540') {
    if (mode !== 'auto' || !active || quality === '540' || switching) return;
    cancelUpgrade(); await changeSource(active, level, 'quality');
  }
  selector?.addEventListener('click', () => { if (menu) menu.hidden = !menu.hidden; updateQuality(); });
  choices.forEach(choice => choice.addEventListener('click', () => {
    if (!['auto', '1080', '720', '540'].includes(choice.dataset.qualityChoice)) return;
    mode = choice.dataset.qualityChoice; closeMenu(); cancelUpgrade(); clearTimeout(stallTimer);
    if (mode === 'auto') {
      attempted.delete(active);
      if (quality === '540' && !slowNetwork() && !hdCopies.has(active) && !video.error) { maybeUpgrade(); return; }
    }
    const level = preferred(active);
    if (level !== quality || video.error) void changeSource(active, level, 'quality');
  }));
  document.addEventListener('click', event => { if (menu && !menu.parentElement.contains(event.target)) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (!menu || menu.hidden) return;
    if (event.key === 'Escape') { closeMenu(); selector?.focus(); return; }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const options = choices, current = options.indexOf(document.activeElement);
    const next = (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    event.preventDefault(); options[next].focus();
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
    if (mode === 'auto' && quality !== '540' && !hdCopies.has(active)) { clearTimeout(stallTimer); stallTimer = setTimeout(() => void fallback(), 2500); }
  });
  video.addEventListener('error', () => { if (!switching) { if (mode === 'auto' && quality !== '540') void fallback(); else message('视频加载失败，可点击下方按钮重试。'); } });
  document.querySelector('.film-retry')?.addEventListener('click', () => adapt(true));
  orientation.addEventListener('change', () => adapt());
  connection?.addEventListener('change', () => { if (mode !== 'auto') return; if (slowNetwork()) { cancelUpgrade(); if (!hdCopies.has(active)) void fallback('540'); } else { attempted.delete(active); maybeUpgrade(); } });
  window.addEventListener('pagehide', cancelUpgrade);
  adapt();
})();
