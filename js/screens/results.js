// Écran de fin d'exercice : chapeaux, étoiles, gemmes, nouveautés.

import { h } from '../ui/dom.js';
import { createTalkingMascot } from '../ui/mascot.js';
import { celebrate } from '../ui/confetti.js';
import { icon } from '../ui/icons.js';
import { getState } from '../store.js';
import { gemProgress, hatColorFor } from '../rewards.js';
import { getActivity } from '../activities/registry.js';
import { play } from '../sound.js';
import { LINES, line, num } from '../voice/lines.js';

// Les messages (qui valorisent l'effort, quel que soit le résultat) sont dans js/voice/lines.js.

export function render(root, ctx) {
  const r = ctx.session.lastResult;
  if (!r) { ctx.navigate('#/accueil'); return null; }
  const s = getState();
  const activity = getActivity(r.activityId);
  const gem = gemProgress(s);
  const canSpin = s.wallet.gems >= s.settings.gemsPerSpin;

  const talk = createTalkingMascot({ size: 130 });
  if (r.limitReached) talk.say(line('results_extra', 'limit'));
  else if (r.pauseHint) talk.say({ text: `${r.today} ${LINES.results_extra.pause}`, clips: [num(r.today), 'results_extra_pause'] });
  else if (r.suggestEasier) talk.say(line('results_extra', 'easier'));
  else talk.say(line('results', r.hats));
  if (r.hats >= 2) talk.mood('happy', 3000);

  const hats = h('div', { class: 'hats', 'aria-label': `${r.hats} chapeaux sur 3` },
    [1, 2, 3].map((n) => {
      const el = icon('hat', { size: '5rem', color: hatColorFor(s), className: `hat ${n <= r.hats ? 'on' : 'off'}` });
      el.style.animationDelay = `${n * 0.25}s`;
      return el;
    }));

  const news = [];
  if (r.gemEarned) news.push(h('div', { class: 'news gem-news' }, '💎 Tu gagnes une Gemme de lune ! Tu peux faire tourner la Roue du Destin !'));
  if (r.levelUnlocked) news.push(h('div', { class: 'news' }, `🔓 Nouveau niveau débloqué : ${r.levelUnlocked.label} !`));
  if (r.rankUp) news.push(h('div', { class: 'news' }, `🎩 Tu deviens ${r.rankUp.name} !`));
  for (const f of r.newFamiliars) news.push(h('div', { class: 'news' }, `${f.emoji} Nouveau familier : ${f.name} !`));
  for (const it of r.newItems ?? []) {
    news.push(h('button', { class: 'news news-btn', onClick: () => ctx.navigate('#/mon-chat') }, `🎨 Nouveau pour ton chat : ${it.label} ! Essayer →`));
  }
  const playable = !r.limitReached;

  root.append(
    h('div', { class: 'results card' },
      h('h1', { class: 'title' }, r.hats === 3 ? 'Sans-faute !' : 'Potion terminée !'),
      talk.el,
      hats,
      h('p', { class: 'score' }, `⭐ ${String(r.stars).replace('.', ',')} étoile${r.stars > 1 ? 's' : ''} sur ${r.total}`),
      r.success
        ? h('div', { class: 'gem-progress' },
          h('div', { class: 'bar' }, h('div', { class: 'bar-fill gem', style: { width: `${(gem.done / gem.needed) * 100}%` } })),
          h('p', { class: 'muted' }, r.gemEarned ? 'Le compteur repart pour une nouvelle gemme !' : `💎 ${gem.done} / ${gem.needed} exercices réussis avant ta prochaine Gemme de lune`))
        : h('p', { class: 'muted' }, `Cette fois, le compteur de gemmes n’avance pas (il faut ${s.settings.successMinHats} chapeau${s.settings.successMinHats > 1 ? 'x' : ''}). Avec un peu d’entraînement, ça va venir !`),
      news,
      h('div', { class: 'actions' },
        playable && r.suggestEasier
          ? h('button', { class: 'btn', onClick: () => ctx.navigate(`#/exercice/${r.activityId}/${r.suggestEasier.id}`) }, `🌱 S’échauffer au niveau ${r.suggestEasier.id}`)
          : null,
        playable ? h('button', { class: `btn ${r.suggestEasier ? 'btn-soft' : ''}`, onClick: () => ctx.navigate(`#/exercice/${r.activityId}/${r.level}`) }, '🔁 Rejouer') : null,
        playable && r.levelUnlocked
          ? h('button', { class: 'btn', onClick: () => ctx.navigate(`#/exercice/${r.activityId}/${r.levelUnlocked.id}`) }, `🚀 Essayer le niveau ${r.levelUnlocked.id}`)
          : null,
        canSpin ? h('button', { class: 'btn btn-magic', onClick: () => ctx.navigate('#/roue') }, '🎡 Tourner la roue') : null,
        h('button', { class: 'btn btn-soft', onClick: () => ctx.navigate('#/accueil') }, '🏠 Accueil'),
      ),
      activity ? h('p', { class: 'muted small' }, `${activity.icon} ${activity.title} · Niveau ${r.level}`) : null,
    ),
  );

  if (r.hats >= 2 || r.gemEarned || r.levelUnlocked) {
    play(r.gemEarned ? 'gem' : 'win');
    celebrate(r.hats === 3 || r.gemEarned ? 70 : 35);
  }
  return null;
}
