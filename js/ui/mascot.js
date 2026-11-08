// Le chat sorcier « Moustache » en SVG. Humeurs : idle, happy, oops.

import { h } from './dom.js';

const SVG = `
<svg viewBox="0 0 220 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g class="m-body">
    <path d="M44 118 L50 58 L92 92 Z" fill="var(--cat)"/>
    <path d="M176 118 L170 58 L128 92 Z" fill="var(--cat)"/>
    <path d="M54 104 L57 72 L80 92 Z" fill="#ff9ec7"/>
    <path d="M166 104 L163 72 L140 92 Z" fill="#ff9ec7"/>
    <ellipse cx="110" cy="135" rx="70" ry="60" fill="var(--cat)"/>
    <circle cx="70" cy="155" r="10" fill="#ff7eb6" opacity=".45"/>
    <circle cx="150" cy="155" r="10" fill="#ff7eb6" opacity=".45"/>
    <g class="m-eyes-open">
      <ellipse cx="85" cy="133" rx="13" ry="16" fill="#c6ff6b"/>
      <ellipse cx="135" cy="133" rx="13" ry="16" fill="#c6ff6b"/>
      <ellipse class="m-pupil" cx="86" cy="135" rx="5" ry="11" fill="#1b1035"/>
      <ellipse class="m-pupil" cx="136" cy="135" rx="5" ry="11" fill="#1b1035"/>
      <circle cx="90" cy="127" r="3.5" fill="#fff"/>
      <circle cx="140" cy="127" r="3.5" fill="#fff"/>
    </g>
    <g class="m-eyes-happy" fill="none" stroke="#c6ff6b" stroke-width="6" stroke-linecap="round">
      <path d="M72 138 Q85 120 98 138"/>
      <path d="M122 138 Q135 120 148 138"/>
    </g>
    <path d="M103 152 L117 152 L110 160 Z" fill="#ff9ec7"/>
    <path class="m-mouth" d="M96 164 Q103 172 110 164 Q117 172 124 164" fill="none" stroke="#1b1035" stroke-width="3" stroke-linecap="round"/>
    <g stroke="#e9e0ff" stroke-width="2.5" stroke-linecap="round" opacity=".8">
      <line x1="40" y1="150" x2="78" y2="156"/><line x1="40" y1="166" x2="78" y2="162"/>
      <line x1="180" y1="150" x2="142" y2="156"/><line x1="180" y1="166" x2="142" y2="162"/>
    </g>
  </g>
  <g class="m-hat">
    <path d="M52 92 Q108 -30 150 18 Q128 30 160 92 Z" fill="var(--hat)"/>
    <ellipse cx="108" cy="92" rx="70" ry="13" fill="var(--hat)"/>
    <ellipse cx="108" cy="90" rx="70" ry="9" fill="#000" opacity=".15"/>
    <path d="M62 80 Q108 64 156 80 L158 90 Q108 74 60 90 Z" fill="#ffcf4a"/>
    <text x="92" y="60" font-size="18">⭐</text>
    <text x="118" y="38" font-size="12">✨</text>
  </g>
  <g class="m-wand">
    <line x1="182" y1="200" x2="206" y2="150" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/>
    <text x="194" y="152" font-size="22">⭐</text>
    <circle cx="180" cy="198" r="12" fill="var(--cat)"/>
  </g>
</svg>`;

export function createMascot({ size = 140, hatColor = '#7b5cd6' } = {}) {
  const el = h('div', { class: 'mascot mood-idle', html: SVG });
  el.style.width = `${size}px`;
  el.style.setProperty('--hat', hatColor);
  return el;
}

let moodTimer = null;
export function setMood(el, mood, duration = 1200) {
  el.classList.remove('mood-idle', 'mood-happy', 'mood-oops');
  el.classList.add(`mood-${mood}`);
  clearTimeout(moodTimer);
  if (mood !== 'idle' && duration) {
    moodTimer = setTimeout(() => setMood(el, 'idle', 0), duration);
  }
}

// Mascotte + bulle de parole.
export function createTalkingMascot(opts) {
  const mascot = createMascot(opts);
  const bubble = h('div', { class: 'bubble' });
  const el = h('div', { class: 'talking-mascot' }, mascot, bubble);
  return {
    el,
    mascot,
    say(text) {
      bubble.textContent = text;
      bubble.classList.remove('pop');
      void bubble.offsetWidth; // relance l'animation
      bubble.classList.add('pop');
    },
    mood: (m, d) => setMood(mascot, m, d),
  };
}
