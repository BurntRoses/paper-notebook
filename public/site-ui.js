/* Native adaptation of 前端处方 StudioControls.ActionButton and
   studio/SegmentedControl. Shared state stays with the actual control. */
(() => {
  const paths = {
    moon: 'M20.5 14.3A9 9 0 0 1 9.7 3.5 9 9 0 1 0 20.5 14.3Z',
    sun: 'M12 3V1m0 22v-2M3 12H1m22 0h-2M5.6 5.6 4.2 4.2m15.6 15.6-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z',
    star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',
    check: 'm5 12 4 4L19 6',
    chevron: 'm7 10 5 5 5-5',
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.check}"/></svg>`;
  const actions = new WeakMap();
  async function action(button, task) {
    let state = actions.get(button);
    if (!state) {
      const original = document.createElement('span'); original.className = 'action-original';
      original.append(...button.childNodes);
      const feedback = document.createElement('span'); feedback.className = 'action-result'; feedback.setAttribute('aria-hidden', 'true');
      button.append(original, feedback); button.classList.add('action-feedback');
      state = {running: false, feedback, timer: 0}; actions.set(button, state);
    }
    if (state.running) return;
    clearTimeout(state.timer); state.running = true; button.disabled = true;
    button.dataset.state = 'busy'; button.setAttribute('aria-busy', 'true'); state.feedback.textContent = '复制中…';
    try {
      const result = await task();
      button.dataset.state = result.copied ? 'success' : 'manual';
      state.feedback.innerHTML = result.copied ? icon('check') + '<span>已复制</span>' : '<span>已选中文本</span>';
    } catch {
      button.dataset.state = 'error'; state.feedback.textContent = '重试复制';
    } finally {
      state.running = false; button.disabled = false; button.setAttribute('aria-busy', 'false');
      state.timer = setTimeout(() => { button.dataset.state = 'idle'; }, 2400);
    }
  }
  function roving(buttons, selected, activate) {
    const sync = () => buttons.forEach((b, i) => b.tabIndex = b === selected() || !selected() && i === 0 ? 0 : -1);
    for (const b of buttons) b.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.isComposing || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault(); const current = buttons.indexOf(b), rtl = getComputedStyle(b.parentElement).direction === 'rtl';
      const step = (e.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (current + step + buttons.length) % buttons.length;
      buttons[next].focus(); activate(buttons[next]); sync();
    });
    sync(); return sync;
  }
  window.NotebookSiteUI = {icon, action, roving};
})();
