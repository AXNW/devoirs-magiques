// Collection des familiers.

import { h } from '../ui/dom.js';
import { getState } from '../store.js';
import { FAMILIARS } from '../config.js';

export function render(root, ctx) {
  const s = getState();
  root.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Retour à l’accueil', onClick: () => ctx.navigate('#/accueil') }, '🏠'),
      h('div', { class: 'topbar-title' }, `🐾 Mes familiers · ${s.collection.length} / ${FAMILIARS.length}`),
      h('span'),
    ),
    h('div', { class: 'familiars' },
      FAMILIARS.map((f) => {
        const owned = s.collection.includes(f.id);
        return h('div', { class: `card familiar ${owned ? 'owned' : 'locked'}` },
          h('div', { class: 'familiar-emoji' }, owned ? f.emoji : '❔'),
          h('div', { class: 'familiar-name' }, owned ? f.name : '???'),
          h('div', { class: 'muted small' }, f.hint));
      }),
    ),
  );
  return null;
}
