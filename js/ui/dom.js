// Petits utilitaires pour construire l'interface sans framework.

// h('button', { class: 'btn', onClick: fn }, 'Texte', autreElement)
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (typeof v !== 'string' && k in el) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  appendChildren(el, children);
  return el;
}

export function appendChildren(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

let toastTimer = null;
export function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// Fenêtre modale simple. buttons = [{ label, class, onClick }]
// Renvoie une fonction close().
export function showModal(content, buttons = []) {
  const close = () => overlay.remove();
  const overlay = h('div', { class: 'modal-overlay' },
    h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
      content,
      h('div', { class: 'modal-actions' },
        buttons.map((b) => h('button', {
          class: b.class || 'btn',
          onClick: () => { close(); b.onClick?.(); },
        }, b.label)),
      ),
    ),
  );
  document.body.append(overlay);
  overlay.querySelector('.modal-actions button')?.focus();
  return close;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}
