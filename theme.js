(() => {
  'use strict';

  const STORAGE_KEY = 'krj-theme';
  const DARK_CLASS = 'krj-dark-mode';

  // Runs at document_start so a saved dark preference applies before first paint.
  if (localStorage.getItem(STORAGE_KEY) === 'dark') {
    document.documentElement.classList.add(DARK_CLASS);
  }

  function isDark() {
    return document.documentElement.classList.contains(DARK_CLASS);
  }

  function updateIcon(btn) {
    btn.textContent = isDark() ? '☀️' : '\u{1F319}';
    btn.title = isDark() ? 'Switch to light mode' : 'Switch to dark mode';
    btn.setAttribute('aria-label', btn.title);
  }

  function injectToggle() {
    if (document.getElementById('krj-theme-toggle')) return;
    const inspect = document.querySelector('[data-test-subj="openInspectorButton"]');
    if (!inspect) return;
    const btn = document.createElement('button');
    btn.id = 'krj-theme-toggle';
    btn.type = 'button';
    btn.className = 'euiButtonEmpty euiButtonEmpty--primary euiButtonEmpty--small euiHeaderLink';
    updateIcon(btn);
    btn.addEventListener('click', () => {
      document.documentElement.classList.toggle(DARK_CLASS);
      localStorage.setItem(STORAGE_KEY, isDark() ? 'dark' : 'light');
      updateIcon(btn);
    });
    inspect.after(btn);
  }

  let debounce = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(injectToggle, 150);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  injectToggle();
})();
