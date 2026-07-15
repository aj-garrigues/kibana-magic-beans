(() => {
  'use strict';

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // Index of the brace that closes the object starting at `start`, or -1.
  // String/escape aware so braces inside quoted values don't confuse the count.
  function findJsonEnd(text, start) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) return i;
    }
    return -1;
  }

  function renderValue(value, indent) {
    if (value === null) return '<span class="krj-null">null</span>';
    switch (typeof value) {
      case 'string':
        return '<span class="krj-str">' + escapeHtml(JSON.stringify(value)) + '</span>';
      case 'number':
        return '<span class="krj-num">' + value + '</span>';
      case 'boolean':
        return '<span class="krj-bool">' + value + '</span>';
    }
    const pad = '  '.repeat(indent);
    const padIn = '  '.repeat(indent + 1);
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      return '[\n' + value.map((v) => padIn + renderValue(v, indent + 1)).join(',\n') + '\n' + pad + ']';
    }
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    return '{\n' + keys.map((k) =>
      padIn + '<span class="krj-key">"' + escapeHtml(k) + '"</span>: ' + renderValue(value[k], indent + 1)
    ).join(',\n') + '\n' + pad + '}';
  }

  // Re-wrap Kibana's search-hit terms in <mark>, operating on text nodes only
  // so markup and class names can never be corrupted by a match.
  function applyHighlights(root, terms) {
    if (terms.length === 0) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
      const text = node.nodeValue;
      if (!terms.some((t) => text.includes(t))) continue;
      const frag = document.createDocumentFragment();
      let i = 0;
      while (i < text.length) {
        let at = -1;
        let term = null;
        for (const t of terms) {
          const idx = text.indexOf(t, i);
          if (idx !== -1 && (at === -1 || idx < at)) { at = idx; term = t; }
        }
        if (at === -1) { frag.appendChild(document.createTextNode(text.slice(i))); break; }
        if (at > i) frag.appendChild(document.createTextNode(text.slice(i, at)));
        const mark = document.createElement('mark');
        mark.textContent = term;
        frag.appendChild(mark);
        i = at + term.length;
      }
      node.parentNode.replaceChild(frag, node);
    }
  }

  // Turn "prefix : {json}" cell content into a labeled, colored <pre>.
  // Returns false (leaving the cell untouched) unless the JSON parses cleanly.
  function beautifyContainer(container) {
    const text = container.textContent;
    const start = text.indexOf('{');
    if (start === -1) return false;
    const end = findJsonEnd(text, start);
    if (end === -1) return false;
    let parsed;
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch {
      return false;
    }
    const terms = [...new Set([...container.querySelectorAll('mark')].map((m) => m.textContent).filter(Boolean))];
    const prefix = text.slice(0, start).trim();
    const suffix = text.slice(end + 1).trim();

    const wrap = document.createElement('div');
    if (prefix) {
      const label = document.createElement('span');
      label.className = 'krj-prefix';
      label.textContent = prefix;
      wrap.appendChild(label);
    }
    const pre = document.createElement('pre');
    pre.className = 'krj-json';
    pre.innerHTML = renderValue(parsed, 0);
    wrap.appendChild(pre);
    if (suffix) {
      const rest = document.createElement('div');
      rest.textContent = suffix;
      wrap.appendChild(rest);
    }
    applyHighlights(wrap, terms);
    container.replaceChildren(wrap);
    return true;
  }

  function findMsgColumnIndex(table) {
    const headers = [...table.querySelectorAll('thead th')];
    return headers.findIndex((th) => th.textContent.trim() === 'msg');
  }

  function processTables() {
    for (const table of document.querySelectorAll('table.kbnDocTable, table[data-test-subj="docTable"]')) {
      const msgIdx = findMsgColumnIndex(table);
      for (const row of table.querySelectorAll('tr[data-test-subj="docTableRow"]')) {
        if (row.dataset.krjDone) continue;
        row.dataset.krjDone = '1';
        let container = null;
        if (msgIdx >= 0 && row.cells[msgIdx]) {
          container = row.cells[msgIdx].querySelector('.truncate-by-height') || row.cells[msgIdx];
        } else {
          // Default Document (_source) view: msg lives in a <dt>/<dd> pair.
          const dl = row.querySelector('dl.source');
          if (dl) {
            const dt = [...dl.querySelectorAll('dt')].find((d) => d.textContent.trim() === 'msg:');
            container = dt ? dt.nextElementSibling : null;
          }
        }
        if (container && beautifyContainer(container)) {
          const clamp = container.closest('.truncate-by-height') || container;
          clamp.classList.add('krj-cell');
        }
      }
    }
  }

  // Kibana's dark mode is a page setting, not an OS one. The body background
  // is transparent, so infer the theme from the text color: light text = dark theme.
  function detectTheme() {
    const rgb = getComputedStyle(document.body).color.match(/\d+/g);
    if (!rgb) return;
    const [r, g, b] = rgb.map(Number);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    document.body.classList.toggle('krj-dark', luminance > 128);
  }

  let debounce = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      detectTheme();
      processTables();
    }, 150);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  detectTheme();
  processTables();
})();
