// « Mon chat » : l'enfant choisit le nom, le pelage et les yeux de son chat sorcier.

import { h, toast } from '../ui/dom.js';
import { createTalkingMascot, applyCatColors, setMood } from '../ui/mascot.js';
import { getState, update } from '../store.js';
import { rankInfo } from '../rewards.js';
import { CAT_FURS, CAT_EYES } from '../config.js';
import { play } from '../sound.js';

export function render(root, ctx) {
  const s = getState();
  const talk = createTalkingMascot({ size: 200, hatColor: rankInfo(s.wallet.totalStars).rank.hat });
  const intro = () => talk.say(`Je m’appelle ${getState().profile.cat.name || 'Moustache'} ! Tu me fais beau ?`);
  intro();

  const setCat = (fn) => {
    update((st) => fn(st.profile.cat));
    applyCatColors(talk.mascot, getState().profile.cat);
    setMood(talk.mascot, 'happy');
    play('click');
  };

  const swatches = (list, current, field) => h('div', { class: 'swatches', role: 'radiogroup' },
    list.map((item) => h('button', {
      class: `swatch ${item.id === current ? 'selected' : ''}`,
      type: 'button',
      role: 'radio',
      'aria-checked': item.id === current ? 'true' : 'false',
      'aria-label': item.label,
      title: item.label,
      style: { background: item.color },
      onClick: (e) => {
        e.currentTarget.parentElement.querySelectorAll('.swatch').forEach((b) => {
          b.classList.toggle('selected', b === e.currentTarget);
          b.setAttribute('aria-checked', b === e.currentTarget ? 'true' : 'false');
        });
        setCat((c) => { c[field] = item.id; });
      },
    })));

  const nameInput = h('input', {
    class: 'field cat-name', type: 'text', maxlength: '16', value: s.profile.cat.name, 'aria-label': 'Nom du chat',
    onChange: (e) => {
      const name = e.target.value.trim() || 'Moustache';
      e.target.value = name;
      setCat((c) => { c.name = name; });
      intro();
      toast('Enregistré ✓');
    },
  });

  root.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Retour à l’accueil', onClick: () => ctx.navigate('#/accueil') }, '🏠'),
      h('div', { class: 'topbar-title' }, '🎨 Mon chat sorcier'),
      h('span')),
    h('div', { class: 'cat-layout' },
      h('div', { class: 'cat-preview' }, talk.el),
      h('div', { class: 'card cat-options' },
        h('h2', {}, 'Son nom'), nameInput,
        h('h2', {}, 'Son pelage'), swatches(CAT_FURS, s.profile.cat.fur, 'fur'),
        h('h2', {}, 'Ses yeux'), swatches(CAT_EYES, s.profile.cat.eyes, 'eyes'),
        h('p', { class: 'muted' }, '🎩 La couleur du chapeau change quand tu gagnes un nouveau rang de sorcier !'),
        h('button', { class: 'btn', onClick: () => ctx.navigate('#/accueil') }, 'C’est parfait !'))),
  );
  return null;
}
