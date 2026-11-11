(() => {
  const bind = (id, fieldId, statusId, detailsId) => {
    const button = document.querySelector(id), field = document.querySelector(fieldId), status = document.querySelector(statusId), details = document.querySelector(detailsId);
    if (!button || !field || !status || !details) return;
    button.setAttribute('aria-label', button.textContent.trim());
    button.setAttribute('aria-describedby', status.id);
    button.addEventListener('click', () => void NotebookSiteUI.action(button, async () => {
      let copied = false;
      try { await navigator.clipboard.writeText(field.value); copied = true; }
      catch {
        details.open = true; field.focus(); field.select();
        try { copied = document.execCommand('copy'); } catch {}
      }
      status.textContent = copied ? '已复制，请与材料和学习要求一起发送。' : '已选中完整指令，请按 Ctrl+C（Mac 用 ⌘C）复制。';
      status.dataset.state = copied ? 'success' : 'manual';
      return {copied};
    }));
  };
  bind('#copy-repository', '#repository-prompt', '#repository-status', '#agent-instructions');
  bind('#copy', '#prompt', '#status', '#chat-instructions');
})();
