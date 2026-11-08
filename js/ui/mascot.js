// Le chat sorcier de l'enfant, dessiné en SVG selon sa personnalisation
// (pelage, yeux, motif, chapeau, accessoire, baguette). Humeurs : idle, happy, oops.

import { h } from './dom.js';
import { canSpeak, speak, hasClips } from '../sound.js';
import { getState } from '../store.js';
import { hatColorFor } from '../rewards.js';
import { CAT_FURS, CAT_EYES } from '../config.js';

const PATTERNS = {
  none: '',
  stripes: `<g fill="var(--mark)">
      <path d="M98 100 L103 117 L108 100 Z"/><path d="M110 98 L114 114 L118 98 Z"/><path d="M121 100 L125 113 L129 101 Z"/>
      <path d="M41 128 L66 134 L42 140 Z"/><path d="M45 146 L66 146 L47 154 Z"/>
      <path d="M179 128 L154 134 L178 140 Z"/><path d="M175 146 L154 146 L173 154 Z"/></g>`,
  patch: '<ellipse cx="137" cy="131" rx="25" ry="23" fill="var(--mark)"/>',
  muzzle: '<ellipse cx="110" cy="162" rx="32" ry="21" fill="#fff8ee"/><ellipse cx="110" cy="178" rx="20" ry="9" fill="#fff8ee"/>',
  spots: `<g fill="var(--mark)">
      <circle cx="68" cy="112" r="7"/><circle cx="154" cy="108" r="5"/><circle cx="163" cy="152" r="8"/>
      <circle cx="58" cy="160" r="5"/><circle cx="128" cy="184" r="5"/><circle cx="84" cy="183" r="4"/></g>`,
};

const HATS = {
  none: '',
  wizard: `<path d="M52 92 Q108 -30 150 18 Q128 30 160 92 Z" fill="var(--hat)"/>
    <ellipse cx="108" cy="92" rx="70" ry="13" fill="var(--hat)"/>
    <ellipse cx="108" cy="90" rx="70" ry="9" fill="#000" opacity=".15"/>
    <path d="M62 80 Q108 64 156 80 L158 90 Q108 74 60 90 Z" fill="#ffcf4a"/>
    <path d="M100 44 l3.5 7 7.7 1.1-5.6 5.4 1.3 7.7-6.9-3.6-6.9 3.6 1.3-7.7-5.6-5.4 7.7-1.1z" fill="#ffcf4a"/>
    <circle cx="124" cy="30" r="2.5" fill="#fff"/><circle cx="84" cy="66" r="2" fill="#fff"/>`,
  witch: `<path d="M66 88 Q100 8 142 34 Q124 44 150 88 Z" fill="var(--hat)"/>
    <ellipse cx="108" cy="90" rx="88" ry="14" fill="var(--hat)"/>
    <ellipse cx="108" cy="88" rx="88" ry="9" fill="#000" opacity=".15"/>
    <path d="M70 74 Q108 62 148 74 L150 87 Q108 75 68 87 Z" fill="#1b1035" opacity=".55"/>
    <rect x="98" y="68" width="20" height="17" rx="3" fill="none" stroke="#ffcf4a" stroke-width="4"/>`,
  crown: `<path d="M62 94 L56 46 L82 70 L96 32 L110 64 L124 32 L138 70 L164 46 L158 94 Z" fill="#ffcf4a" stroke="#d99a00" stroke-width="3" stroke-linejoin="round"/>
    <rect x="60" y="82" width="100" height="12" rx="4" fill="#f2b705"/>
    <circle cx="96" cy="36" r="5" fill="var(--hat)"/><circle cx="124" cy="36" r="5" fill="var(--hat)"/>
    <circle cx="56" cy="48" r="4" fill="var(--hat)"/><circle cx="164" cy="48" r="4" fill="var(--hat)"/>
    <circle cx="110" cy="88" r="5" fill="var(--hat)"/><circle cx="84" cy="88" r="3.5" fill="#fff"/><circle cx="136" cy="88" r="3.5" fill="#fff"/>`,
};

// Accessoires autour du cou (dessinés par-dessus la tête) ou sur le visage.
const NECK = {
  bow: `<path d="M110 196 L84 182 L84 210 Z" fill="#e0457b"/><path d="M110 196 L136 182 L136 210 Z" fill="#e0457b"/>
    <circle cx="110" cy="196" r="7" fill="#ff7eb6"/>`,
  bell: `<path d="M60 184 Q110 206 160 184" stroke="#e0457b" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="110" cy="202" r="10" fill="#ffcf4a" stroke="#d99a00" stroke-width="2"/>
    <line x1="103" y1="205" x2="117" y2="205" stroke="#a67400" stroke-width="2"/><circle cx="110" cy="208" r="2" fill="#a67400"/>`,
  scarf: `<path d="M52 178 Q110 208 168 178 L170 194 Q110 222 50 194 Z" fill="#3f8efc"/>
    <path d="M136 198 L144 228 L160 224 L154 194 Z" fill="#3f8efc"/>
    <path d="M60 186 Q110 212 162 186" stroke="#fff" stroke-width="3" fill="none" stroke-dasharray="6 8" opacity=".8"/>`,
};
const FACE = {
  glasses: `<g fill="none" stroke="#1b1035" stroke-width="3.5">
      <circle cx="85" cy="133" r="20"/><circle cx="135" cy="133" r="20"/>
      <path d="M105 130 Q110 125 115 130"/><line x1="65" y1="129" x2="48" y2="122"/><line x1="155" y1="129" x2="172" y2="122"/></g>
    <path d="M74 122 Q80 117 88 119" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7"/>
    <path d="M124 122 Q130 117 138 119" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7"/>`,
};

const WANDS = {
  star: '<path d="M204 130 l4.4 9 9.9 1.4-7.2 7 1.7 9.8-8.8-4.6-8.8 4.6 1.7-9.8-7.2-7 9.9-1.4z" fill="#ffcf4a" stroke="#d99a00" stroke-width="1.5"/>',
  moon: '<path d="M210 132 a14 14 0 1 0 0 26 a11 11 0 1 1 0 -26z" fill="#ffe9a8" stroke="#d99a00" stroke-width="1.5"/>',
  heart: '<path d="M204 160 C188 150 190 134 198 134 C202 134 204 138 204 141 C204 138 206 134 210 134 C218 134 220 150 204 160Z" fill="#ff7eb6" stroke="#e0457b" stroke-width="1.5"/>',
};

function buildSvg(cat) {
  const neck = NECK[cat.accessory] ?? '';
  const face = FACE[cat.accessory] ?? '';
  return `
<svg viewBox="0 0 220 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g class="m-body">
    <path d="M44 118 L50 58 L92 92 Z" fill="var(--cat)"/>
    <path d="M176 118 L170 58 L128 92 Z" fill="var(--cat)"/>
    <path d="M54 104 L57 72 L80 92 Z" fill="#ff9ec7"/>
    <path d="M166 104 L163 72 L140 92 Z" fill="#ff9ec7"/>
    <ellipse cx="110" cy="135" rx="70" ry="60" fill="var(--cat)"/>
    ${PATTERNS[cat.pattern] ?? ''}
    <circle cx="70" cy="155" r="10" fill="#ff7eb6" opacity=".45"/>
    <circle cx="150" cy="155" r="10" fill="#ff7eb6" opacity=".45"/>
    <g class="m-eyes-open">
      <ellipse cx="85" cy="133" rx="13" ry="16" fill="var(--eyes)"/>
      <ellipse cx="135" cy="133" rx="13" ry="16" fill="var(--eyes)"/>
      <ellipse class="m-pupil" cx="86" cy="135" rx="5" ry="11" fill="#1b1035"/>
      <ellipse class="m-pupil" cx="136" cy="135" rx="5" ry="11" fill="#1b1035"/>
      <circle cx="90" cy="127" r="3.5" fill="#fff"/>
      <circle cx="140" cy="127" r="3.5" fill="#fff"/>
    </g>
    <g class="m-eyes-happy" fill="none" stroke="var(--eyes)" stroke-width="6" stroke-linecap="round">
      <path d="M72 138 Q85 120 98 138"/>
      <path d="M122 138 Q135 120 148 138"/>
    </g>
    ${face}
    <path d="M103 152 L117 152 L110 160 Z" fill="#ff9ec7"/>
    <path class="m-mouth" d="M96 164 Q103 172 110 164 Q117 172 124 164" fill="none" stroke="#1b1035" stroke-width="3" stroke-linecap="round"/>
    <g stroke="var(--whisker)" stroke-width="2.5" stroke-linecap="round" opacity=".8">
      <line x1="40" y1="150" x2="78" y2="156"/><line x1="40" y1="166" x2="78" y2="162"/>
      <line x1="180" y1="150" x2="142" y2="156"/><line x1="180" y1="166" x2="142" y2="162"/>
    </g>
    ${neck}
  </g>
  <g class="m-hat">${HATS[cat.hat] ?? HATS.wizard}</g>
  <g class="m-wand">
    <line x1="182" y1="200" x2="204" y2="152" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/>
    ${WANDS[cat.wand] ?? WANDS.star}
    <circle cx="180" cy="198" r="12" fill="var(--cat)"/>
  </g>
</svg>`;
}

export function catColors(cat = getState().profile.cat) {
  const fur = CAT_FURS.find((f) => f.id === cat?.fur) ?? CAT_FURS[0];
  const eyes = CAT_EYES.find((e) => e.id === cat?.eyes) ?? CAT_EYES[0];
  return { fur: fur.color, whisker: fur.whisker, mark: fur.mark, eyes: eyes.color };
}

// (Re)dessine le chat. `cat` et `hatColor` : par défaut, ceux choisis par l'enfant.
export function updateMascot(el, cat = getState().profile.cat, hatColor = hatColorFor(getState())) {
  const c = catColors(cat);
  el.innerHTML = buildSvg(cat);
  el.style.setProperty('--cat', c.fur);
  el.style.setProperty('--whisker', c.whisker);
  el.style.setProperty('--mark', c.mark);
  el.style.setProperty('--eyes', c.eyes);
  el.style.setProperty('--hat', hatColor);
}

export function createMascot({ size = 140, cat, hatColor } = {}) {
  const el = h('div', { class: 'mascot mood-idle' });
  el.style.width = `${size}px`;
  updateMascot(el, cat ?? getState().profile.cat, hatColor ?? hatColorFor(getState()));
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

// Mascotte + bulle de parole. Le bouton 🔊 n'apparaît que si la phrase est enregistrée.
export function createTalkingMascot(opts) {
  const mascot = createMascot(opts);
  const text = h('span', { class: 'bubble-text' });
  let clips = null;
  const speakBtn = h('button', {
    class: 'speak-btn', type: 'button', 'aria-label': 'Écouter', hidden: true,
    onClick: (e) => { e.currentTarget.blur(); speak(clips); },
  }, '🔊');
  const bubble = h('div', { class: 'bubble hidden' }, text, speakBtn);
  const el = h('div', { class: 'talking-mascot' }, mascot, bubble);
  return {
    el,
    mascot,
    // say('texte') ou say({ text, clips }) (voir js/voice/lines.js).
    say(message) {
      const isLine = typeof message === 'object' && message !== null;
      clips = isLine ? message.clips ?? null : null;
      text.textContent = isLine ? message.text : message;
      speakBtn.hidden = !(canSpeak() && hasClips(clips));
      bubble.classList.toggle('hidden', !text.textContent);
      bubble.classList.remove('pop');
      void bubble.offsetWidth; // relance l'animation
      bubble.classList.add('pop');
    },
    mood: (m, d) => setMood(mascot, m, d),
  };
}
