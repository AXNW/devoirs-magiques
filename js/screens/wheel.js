// Roue du Destin : on dépense des Gemmes de lune pour gagner une récompense.

import { h, showModal } from '../ui/dom.js';
import { celebrate } from '../ui/confetti.js';
import { getState, setState } from '../store.js';
import { applySpin, applyChoice } from '../rewards.js';
import { play } from '../sound.js';

const COLORS = ['#7b5cd6', '#3f8efc', '#e0457b', '#2bb673', '#f2b705', '#ff7a1a', '#9b6dff', '#14b8c4'];
const SPIN_MS = 4500;

function point(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}

// Angles en degrés, 0 = en haut, sens des aiguilles d'une montre.
function segments(prizes) {
  const weights = prizes.map((p) => Math.max(0, Number(p.weight) || 0));
  const total = weights.reduce((a, b) => a + b, 0) || prizes.length;
  let start = 0;
  return prizes.map((p, i) => {
    const size = ((total === prizes.length && !weights.some(Boolean) ? 1 : weights[i]) / total) * 360;
    const seg = { prize: p, start, end: start + size, color: COLORS[i % COLORS.length] };
    start += size;
    return seg;
  });
}

function wheelSvg(segs) {
  const c = 150, r = 140;
  const parts = segs.map((sg) => {
    if (sg.end - sg.start <= 0) return '';
    const [x1, y1] = point(c, c, r, sg.start);
    const [x2, y2] = point(c, c, r, sg.end);
    const large = sg.end - sg.start > 180 ? 1 : 0;
    const path = segs.length === 1
      ? `<circle cx="${c}" cy="${c}" r="${r}" fill="${sg.color}"/>`
      : `<path d="M${c} ${c} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${sg.color}" stroke="#1b1035" stroke-width="3"/>`;
    const mid = (sg.start + sg.end) / 2;
    const [tx, ty] = point(c, c, r * 0.68, mid);
    const emoji = String(sg.prize.emoji || '🎁').replace(/[<>&"]/g, '');
    return `${path}<text x="${tx}" y="${ty}" font-size="30" text-anchor="middle" dominant-baseline="central" transform="rotate(${mid} ${tx} ${ty})">${emoji}</text>`;
  }).join('');
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${c}" cy="${c}" r="${r + 6}" fill="#ffcf4a"/>
    ${parts}
    <circle cx="${c}" cy="${c}" r="26" fill="#1b1035" stroke="#ffcf4a" stroke-width="5"/>
    <text x="${c}" y="${c}" font-size="26" text-anchor="middle" dominant-baseline="central">🐱</text>
  </svg>`;
}

export function render(root, ctx) {
  let s = getState();
  let rotation = 0;
  let spinning = false;
  const timers = [];

  const gemsEl = h('span', { class: 'wheel-gems' });
  const spinBtn = h('button', { class: 'btn btn-magic big', onClick: spin }, '✨ Tourner la roue');
  const chooseBtn = h('button', { class: 'btn', onClick: openChoice });
  const chooseHint = h('p', { class: 'muted small' });
  const hint = h('p', { class: 'muted' });
  const disc = h('div', { class: 'wheel-disc' });
  const segs = segments(s.prizes);
  disc.innerHTML = wheelSvg(segs);

  function refresh() {
    s = getState();
    gemsEl.textContent = `💎 × ${s.wallet.gems}`;
    const cost = s.settings.gemsPerSpin;
    const ok = s.wallet.gems >= cost && s.prizes.length > 0;
    spinBtn.disabled = !ok || spinning;
    if (!s.prizes.length) hint.textContent = 'Demande à un adulte d’ajouter des récompenses dans l’Espace parent.';
    else if (s.wallet.gems < cost) hint.textContent = `Il faut ${cost} gemme${cost > 1 ? 's' : ''} pour tourner la roue. Réussis des exercices pour en gagner !`;
    else hint.textContent = `Un tour coûte ${cost} gemme${cost > 1 ? 's' : ''}.`;

    // Choisir sa récompense : plus cher, mais sans hasard.
    const choose = s.settings.gemsToChoose;
    const choosable = s.prizes.some((p) => !p.respin);
    chooseBtn.hidden = !choose || !choosable;
    chooseHint.hidden = chooseBtn.hidden;
    chooseBtn.textContent = `🎁 Choisir ma récompense (${choose} 💎)`;
    chooseBtn.disabled = spinning || s.wallet.gems < choose;
    chooseHint.textContent = s.wallet.gems < choose
      ? `Avec ${choose} gemmes, tu pourras choisir toi-même ta récompense !`
      : 'Tu peux aussi garder tes gemmes pour choisir ta récompense.';
  }

  function showVoucher(prize, newFamiliars, chosen = false) {
    play('win');
    celebrate(60);
    showModal(
      h('div', { class: 'voucher' },
        h('p', { class: 'voucher-title' }, '📜 Bon magique 📜'),
        h('div', { class: 'voucher-emoji' }, prize.emoji || '🎁'),
        h('p', { class: 'voucher-label' }, prize.label),
        prize.respin
          ? h('p', { class: 'muted' }, 'Ta gemme t’est rendue : tu peux retourner la roue !')
          : h('p', { class: 'muted' }, `${chosen ? 'Excellent choix ! ' : ''}Montre ce bon à un adulte pour recevoir ta récompense.`),
        newFamiliars.map((f) => h('p', { class: 'news' }, `${f.emoji} Nouveau familier : ${f.name} !`)),
      ),
      [{ label: 'Super !', class: 'btn' }],
    );
  }

  function openChoice() {
    if (spinning) return;
    const st = getState();
    const close = showModal(
      h('div', {},
        h('p', { class: 'modal-title' }, 'Quelle récompense veux-tu ?'),
        h('div', { class: 'choice-list' },
          st.prizes.map((p, i) => (p.respin ? null : h('button', {
            class: 'choice',
            onClick: () => {
              const res = applyChoice(getState(), i);
              close();
              if (!res) return;
              setState(res.state);
              refresh();
              showVoucher(res.prize, res.newFamiliars, true);
            },
          }, h('span', { class: 'choice-emoji' }, p.emoji || '🎁'), p.label))))),
      [{ label: 'Je réfléchis encore', class: 'btn btn-soft' }],
    );
  }

  function spin() {
    if (spinning) return;
    const res = applySpin(getState());
    if (!res) return;
    setState(res.state); // enregistré avant l'animation
    spinning = true;
    refresh();

    const seg = segs[res.index];
    const width = seg.end - seg.start;
    const target = seg.start + width / 2 + (Math.random() - 0.5) * width * 0.6;
    const current = ((rotation % 360) + 360) % 360;
    const delta = (((360 - target) - current) % 360 + 360) % 360;
    rotation += 360 * 6 + delta;
    disc.style.transition = `transform ${SPIN_MS}ms cubic-bezier(.17,.67,.15,1)`;
    disc.style.transform = `rotate(${rotation}deg)`;
    play('spin');

    timers.push(setTimeout(() => {
      spinning = false;
      refresh();
      showVoucher(res.prize, res.newFamiliars);
    }, SPIN_MS + 200));
  }

  root.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Retour à l’accueil', onClick: () => !spinning && ctx.navigate('#/accueil') }, '🏠'),
      h('div', { class: 'topbar-title' }, '🎡 La Roue du Destin'),
      gemsEl,
    ),
    h('div', { class: 'wheel-layout' },
      h('div', { class: 'wheel' }, h('div', { class: 'wheel-pointer', 'aria-hidden': 'true' }, '▼'), disc),
      h('div', { class: 'card wheel-side' },
        h('h2', {}, 'Ce que tu peux gagner'),
        h('ul', { class: 'prize-list' },
          segs.map((sg) => h('li', {}, h('span', { class: 'dot', style: { background: sg.color } }), `${sg.prize.emoji || '🎁'} ${sg.prize.label}`))),
        spinBtn,
        hint,
        chooseBtn,
        chooseHint,
      ),
    ),
  );
  refresh();

  return () => timers.forEach(clearTimeout);
}
