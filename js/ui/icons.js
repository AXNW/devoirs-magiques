// Illustrations SVG intégrées : rendu identique sur tous les ordinateurs,
// contrairement aux emojis qui changent selon Windows et le navigateur.

import { h } from './dom.js';

const ICONS = {
  star: `<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="#ffcf4a" stroke="#d99a00" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 8.5l1.2-2.3" stroke="#fff6d0" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  sparkle: `<svg viewBox="0 0 24 24"><path d="M12 2c.8 4.6 2.4 6.9 7 8-4.6 1.1-6.2 3.4-7 8-.8-4.6-2.4-6.9-7-8 4.6-1.1 6.2-3.4 7-8z" fill="#6ec8ff" stroke="#fff" stroke-width="1"/><circle cx="19" cy="18" r="1.6" fill="#fff"/><circle cx="5" cy="4.5" r="1.2" fill="#fff"/></svg>`,
  cloud: `<svg viewBox="0 0 24 24"><path d="M7 18h10.5a3.8 3.8 0 0 0 .4-7.6A5.5 5.5 0 0 0 7.4 9.2 4.4 4.4 0 0 0 7 18z" fill="#cbbdf0" opacity=".8"/></svg>`,
  ball: `<svg viewBox="0 0 48 48"><ellipse cx="24" cy="43" rx="13" ry="3.5" fill="#000" opacity=".25"/><path d="M13 44h22l-3-6H16z" fill="#8a5a2b"/><circle cx="24" cy="22" r="17" fill="url(#bg)" stroke="#e9e0ff" stroke-width="1.5"/><circle cx="17" cy="15" r="4.5" fill="#fff" opacity=".55"/><path d="M28 24l1 2.4 2.6.3-2 1.7.6 2.6-2.2-1.4-2.2 1.4.6-2.6-2-1.7 2.6-.3z" fill="#ffcf4a"/><defs><radialGradient id="bg" cx=".4" cy=".35"><stop offset="0" stop-color="#e3d4ff"/><stop offset=".55" stop-color="#9b6dff"/><stop offset="1" stop-color="#4b2a8f"/></radialGradient></defs></svg>`,
  hat: `<svg viewBox="0 0 64 64"><path d="M32 4C26 18 21 32 18 46h28C43 33 39 20 32 4z" fill="var(--hat, #7b5cd6)"/><path d="M32 4c3 3 9 4 12 2-3 3-8 4-12-2z" fill="var(--hat, #7b5cd6)"/><ellipse cx="32" cy="48" rx="26" ry="7" fill="var(--hat, #7b5cd6)"/><ellipse cx="32" cy="47" rx="26" ry="5" fill="#000" opacity=".15"/><path d="M19.5 39h25l1.4 6H18z" fill="#ffcf4a"/><path d="M31 20l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z" fill="#ffcf4a"/></svg>`,
};

// Élément <span> contenant l'icône. `color` personnalise le chapeau.
export function icon(name, { size = '1em', color, className = '' } = {}) {
  const el = h('span', { class: `icon icon-${name} ${className}`, html: ICONS[name] ?? '', 'aria-hidden': 'true' });
  el.style.width = size;
  el.style.height = size;
  if (color) el.style.setProperty('--hat', color);
  return el;
}
