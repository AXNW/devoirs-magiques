// Barre de progression : le chat marche vers la boule de cristal,
// chaque case se remplit d'une étoile (1er essai), d'une étincelle (2e essai)
// ou d'un petit nuage (raté).

import { h } from './dom.js';

const ICONS = { pending: '', current: '', star: '⭐', half: '✨', miss: '☁️' };

export function createProgress(count) {
  const slots = Array.from({ length: count }, () => h('span', { class: 'slot pending' }));
  const cat = h('span', { class: 'walker', 'aria-hidden': 'true' }, '🐈');
  const ball = h('span', { class: 'goal', 'aria-hidden': 'true' }, '🔮');
  const el = h('div', { class: 'progress' },
    h('div', { class: 'track' }, cat, h('div', { class: 'slots' }, slots)),
    ball,
  );

  return {
    el,
    current(i) {
      slots.forEach((s, idx) => s.classList.toggle('current', idx === i));
      cat.style.left = `calc(${((i + 0.5) / count) * 100}% - 0.6em)`;
    },
    set(i, status) {
      slots[i].className = `slot ${status}`;
      slots[i].textContent = ICONS[status];
    },
    combo(on) {
      ball.classList.toggle('glow', on);
    },
  };
}
