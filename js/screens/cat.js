// « Mon chat » : l'enfant personnalise son chat sorcier. Certaines options se
// débloquent avec la progression (voir CAT_OPTIONS dans config.js).

import { h, toast } from '../ui/dom.js';
import { createTalkingMascot, updateMascot, setMood } from '../ui/mascot.js';
import { getState, update } from '../store.js';
import { isItemUnlocked, hatColorsUnlocked, hatColorFor } from '../rewards.js';
import { CAT_FURS, CAT_EYES, CAT_OPTIONS, RANKS } from '../config.js';
import { LINES, line, pickLine, catNameKey } from '../voice/lines.js';
import { play } from '../sound.js';

export function render(root, ctx) {
  const s = getState();
  const cat = () => getState().profile.cat;
  const talk = createTalkingMascot({ size: 210 });
  const lockHint = h('p', { class: 'lock-hint', 'aria-live': 'polite' });

  const intro = () => {
    const key = catNameKey(cat().name);
    talk.say(key
      ? { text: `${LINES.cat.my_name_is} ${cat().name} ! ${LINES.cat.pretty}`, clips: ['cat_my_name_is', key, 'cat_pretty'] }
      : line('cat', 'intro_generic'));
  };
  intro();

  const setCat = (fn) => {
    update((st) => fn(st.profile.cat));
    updateMascot(talk.mascot);
    setMood(talk.mascot, 'happy');
    talk.say(pickLine('cat_happy'));
    lockHint.textContent = '';
    play('click');
  };

  const showLocked = (hint) => {
    talk.say(line('cat', 'locked'));
    setMood(talk.mascot, 'oops');
    lockHint.textContent = `🔒 ${hint}`;
  };

  // Groupe de boutons à choix unique ; `isSelected(item)` et `choose(item)`.
  const choices = (items, { isSelected, choose, render: draw, className = '' }) => {
    const group = h('div', { class: `choices ${className}`, role: 'radiogroup' });
    const refresh = () => group.querySelectorAll('[role="radio"]').forEach((b, i) => {
      const on = isSelected(items[i]);
      b.classList.toggle('selected', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    items.forEach((item) => {
      const locked = item.locked ?? false;
      group.append(h('button', {
        class: `choice-btn ${locked ? 'locked' : ''}`,
        type: 'button',
        role: 'radio',
        title: locked ? `🔒 ${item.hint}` : item.label,
        'aria-label': locked ? `${item.label} (à débloquer : ${item.hint})` : item.label,
        onClick: () => {
          if (locked) { showLocked(item.hint); return; }
          choose(item);
          refresh();
        },
      }, draw(item, locked)));
    });
    refresh();
    return group;
  };

  // ---- Nom ----
  const names = Object.values(LINES.names);
  const customInput = h('input', {
    class: 'field cat-name', type: 'text', maxlength: '16', placeholder: 'Un autre nom…', 'aria-label': 'Autre nom',
    value: catNameKey(s.profile.cat.name) ? '' : s.profile.cat.name,
    onChange: (e) => {
      const value = e.target.value.trim();
      if (!value) return;
      setCat((c) => { c.name = value; });
      nameGroup.querySelectorAll('.choice-btn').forEach((b) => { b.classList.remove('selected'); b.setAttribute('aria-checked', 'false'); });
      intro();
      toast('Enregistré ✓');
    },
  });
  const nameGroup = choices(names.map((n) => ({ id: n, label: n })), {
    className: 'name-choices',
    isSelected: (item) => cat().name === item.id,
    choose: (item) => { setCat((c) => { c.name = item.id; }); customInput.value = ''; intro(); },
    render: (item) => item.label,
  });

  // ---- Couleurs ----
  const swatch = (color) => h('span', { class: 'swatch-dot', style: { background: color } });
  const furGroup = choices(CAT_FURS, {
    className: 'swatch-choices',
    isSelected: (f) => cat().fur === f.id,
    choose: (f) => setCat((c) => { c.fur = f.id; }),
    render: (f) => [swatch(f.color), h('span', { class: 'choice-label' }, f.label)],
  });
  const eyesGroup = choices(CAT_EYES, {
    className: 'swatch-choices',
    isSelected: (e) => cat().eyes === e.id,
    choose: (e) => setCat((c) => { c.eyes = e.id; }),
    render: (e) => [swatch(e.color), h('span', { class: 'choice-label' }, e.label)],
  });

  // Couleur du chapeau : « selon mon rang » ou la couleur d'un rang déjà atteint.
  const unlockedColors = new Set(hatColorsUnlocked(s).map((r) => r.hat));
  const hatColorItems = [
    { id: 'auto', label: 'Selon mon rang', color: null },
    ...RANKS.map((r) => ({ id: r.hat, label: r.name, color: r.hat, locked: !unlockedColors.has(r.hat), hint: `Atteins le rang ${r.name} (${r.min} ⭐)` })),
  ];
  const hatColorGroup = choices(hatColorItems, {
    className: 'swatch-choices',
    isSelected: (it) => (cat().hatColor ?? 'auto') === it.id,
    choose: (it) => setCat((c) => { c.hatColor = it.id; }),
    render: (it, locked) => [
      it.color ? swatch(it.color) : h('span', { class: 'swatch-dot auto', style: { background: hatColorFor(getState()) } }, '★'),
      h('span', { class: 'choice-label' }, locked ? '🔒' : it.label),
    ],
  });

  // ---- Options à débloquer (motif, chapeau, accessoire, baguette) ----
  const optionGroups = Object.entries(CAT_OPTIONS).map(([field, { title, items }]) => {
    const list = items.map((it) => ({ ...it, locked: !isItemUnlocked(s, it) }));
    return [
      h('h2', {}, title),
      choices(list, {
        isSelected: (it) => cat()[field] === it.id,
        choose: (it) => setCat((c) => { c[field] = it.id; }),
        render: (it, locked) => [h('span', { class: 'choice-label' }, it.label), locked ? h('span', { class: 'lock' }, '🔒') : null],
      }),
    ];
  });

  const total = Object.values(CAT_OPTIONS).flatMap((g) => g.items).filter((it) => it.unlock);
  const owned = total.filter((it) => isItemUnlocked(s, it)).length;

  root.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Retour à l’accueil', onClick: () => ctx.navigate('#/accueil') }, '🏠'),
      h('div', { class: 'topbar-title' }, '🎨 Mon chat sorcier'),
      h('span', { class: 'topbar-count', title: 'Options débloquées' }, `🔓 ${owned}/${total.length}`)),
    h('div', { class: 'cat-layout' },
      h('div', { class: 'cat-preview' }, talk.el, lockHint),
      h('div', { class: 'card cat-options' },
        h('h2', {}, 'Son nom'), nameGroup, customInput,
        h('p', { class: 'muted small' }, '🔊 Je sais dire les noms de la liste. Un autre nom s’affiche, mais je ne peux pas le prononcer.'),
        h('h2', {}, 'Son pelage'), furGroup,
        h('h2', {}, 'Ses yeux'), eyesGroup,
        optionGroups,
        h('h2', {}, 'La couleur du chapeau'), hatColorGroup,
        h('p', { class: 'muted small' }, '🔒 Les options fermées se débloquent en faisant des potions, en gagnant des étoiles, des gemmes et des familiers !'),
        h('button', { class: 'btn', onClick: () => ctx.navigate('#/accueil') }, 'C’est parfait !'))),
  );
  return null;
}
