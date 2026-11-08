// Pavé numérique géant cliquable (en plus du clavier).

import { h } from './dom.js';

export function createNumpad({ onDigit, onDelete, onSubmit }) {
  const key = (label, cls, fn, aria) =>
    h('button', { class: `key ${cls}`, type: 'button', 'aria-label': aria || label, onClick: (e) => { e.currentTarget.blur(); fn(); } }, label);

  const keys = [];
  for (const d of [7, 8, 9, 4, 5, 6, 1, 2, 3]) keys.push(key(String(d), 'digit', () => onDigit(String(d))));
  keys.push(key('⌫', 'del', onDelete, 'Effacer'));
  keys.push(key('0', 'digit', () => onDigit('0')));
  keys.push(key('✔', 'ok', onSubmit, 'Valider'));

  return h('div', { class: 'numpad' }, keys);
}
