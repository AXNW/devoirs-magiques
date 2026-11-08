// Barre de progression : le chat de l'enfant avance vers la boule de cristal,
// chaque case se remplit d'une étoile (1er essai), d'une étincelle (2e essai)
// ou d'un petit nuage (raté).

import { h, clear } from './dom.js';
import { icon } from './icons.js';
import { createMascot } from './mascot.js';

const ICON_FOR = { star: 'star', half: 'sparkle', miss: 'cloud' };

export function createProgress(count, { hatColor } = {}) {
  const slots = Array.from({ length: count }, () => h('span', { class: 'slot pending' }));
  const walker = h('span', { class: 'walker', 'aria-hidden': 'true' }, createMascot({ size: 44, hatColor }));
  const ball = h('span', { class: 'goal' }, icon('ball', { size: '2.6rem' }));
  const el = h('div', { class: 'progress' },
    h('div', { class: 'track' }, walker, h('div', { class: 'slots' }, slots)),
    ball,
  );

  return {
    el,
    current(i) {
      slots.forEach((s, idx) => s.classList.toggle('current', idx === i));
      walker.style.left = `calc(${((i + 0.5) / count) * 100}% - 22px)`;
    },
    set(i, status) {
      slots[i].className = `slot ${status}`;
      clear(slots[i]);
      if (ICON_FOR[status]) slots[i].append(icon(ICON_FOR[status], { size: '1.4em' }));
    },
    combo(on) {
      ball.classList.toggle('glow', on);
    },
  };
}
