// Accueil : mascotte, rang, gemmes, familiers et activités.

import { h, pick } from '../ui/dom.js';
import { createTalkingMascot } from '../ui/mascot.js';
import { getState, update, activityState, maxPlayableLevel } from '../store.js';
import { rankInfo, gemProgress } from '../rewards.js';
import { ACTIVITIES } from '../activities/registry.js';
import { FAMILIARS } from '../config.js';
import { play } from '../sound.js';

const GREETINGS = [
  'On fait un peu de magie ?',
  'Mes moustaches frétillent : c’est l’heure des potions !',
  'Choisis une potion, je t’attends !',
  'Miaou ! Prêt pour un nouveau sortilège ?',
];

export function render(root, ctx) {
  const s = getState();
  const rank = rankInfo(s.wallet.totalStars);
  const gem = gemProgress(s);
  const canSpin = s.wallet.gems >= s.settings.gemsPerSpin;

  const talk = createTalkingMascot({ size: 150, hatColor: rank.rank.hat });
  const name = s.profile.name.trim();
  talk.say(`${name ? `Bonjour ${name} ! ` : 'Bonjour ! '}${pick(GREETINGS)}`);

  const header = h('header', { class: 'home-header' },
    h('h1', { class: 'title' }, 'L’École des Chats Sorciers'),
    talk.el,
  );

  const rankCard = h('div', { class: 'card stat-card' },
    h('div', { class: 'stat-label' }, 'Mon rang'),
    h('div', { class: 'stat-value' }, '🎩 ', rank.rank.name),
    h('div', { class: 'bar' }, h('div', { class: 'bar-fill', style: { width: `${rank.progress * 100}%` } })),
    h('div', { class: 'stat-hint' },
      rank.next ? `⭐ ${fmt(s.wallet.totalStars)} — encore ${fmt(rank.next.min - s.wallet.totalStars)} pour devenir ${rank.next.name}` : `⭐ ${fmt(s.wallet.totalStars)} étoiles !`),
  );

  const gemCard = h('div', { class: `card stat-card ${canSpin ? 'glow' : ''}` },
    h('div', { class: 'stat-label' }, 'Gemmes de lune'),
    h('div', { class: 'stat-value' }, '💎 × ', String(s.wallet.gems)),
    h('div', { class: 'bar' }, h('div', { class: 'bar-fill gem', style: { width: `${(gem.done / gem.needed) * 100}%` } })),
    h('div', { class: 'stat-hint' }, `${gem.done} / ${gem.needed} exercices réussis pour la prochaine gemme`),
    h('button', { class: `btn ${canSpin ? '' : 'btn-soft'}`, onClick: () => ctx.navigate('#/roue') }, '🎡 Roue du Destin'),
  );

  const famCard = h('div', { class: 'card stat-card' },
    h('div', { class: 'stat-label' }, 'Mes familiers'),
    h('div', { class: 'stat-value' }, '🐾 ', `${s.collection.length} / ${FAMILIARS.length}`),
    h('div', { class: 'fam-preview' },
      FAMILIARS.map((f) => h('span', { class: s.collection.includes(f.id) ? '' : 'locked' }, s.collection.includes(f.id) ? f.emoji : '❔'))),
    h('button', { class: 'btn btn-soft', onClick: () => ctx.navigate('#/familiers') }, 'Voir ma collection'),
  );

  const activities = h('section', { class: 'activities' },
    h('h2', {}, 'Choisis ta potion'),
    ACTIVITIES.map((activity) => activityCard(activity, s, ctx)),
  );

  const footer = h('footer', { class: 'home-footer' },
    h('button', {
      class: 'icon-btn',
      'aria-label': s.settings.sound ? 'Couper le son' : 'Activer le son',
      onClick: (e) => {
        update((st) => { st.settings.sound = !st.settings.sound; });
        e.currentTarget.textContent = getState().settings.sound ? '🔊' : '🔇';
        play('click');
      },
    }, s.settings.sound ? '🔊' : '🔇'),
    h('button', { class: 'icon-btn parent-btn', onClick: () => ctx.navigate('#/parent') }, '🔒 Espace parent'),
  );

  root.append(header, h('div', { class: 'stats' }, rankCard, gemCard, famCard), activities, footer);
}

function activityCard(activity, s, ctx) {
  // Lecture seule : activityState crée l'entrée si besoin sur une copie.
  const act = s.activities[activity.id] ?? activityState(structuredClone(s), activity);
  const max = maxPlayableLevel(act, activity);
  const visible = activity.levels.filter((l) => l.id <= Math.min(act.ceiling, activity.levels.length));
  const nextNeeded = s.settings.perfectsToUnlock - (act.perfects[act.unlocked] || 0);
  const canUnlockMore = act.unlocked < Math.min(act.ceiling, activity.levels.length);

  return h('article', { class: 'card activity' },
    h('div', { class: 'activity-head' },
      h('span', { class: 'activity-icon' }, activity.icon),
      h('div', {},
        h('h3', {}, activity.title),
        h('p', { class: 'muted' }, activity.subtitle)),
    ),
    h('div', { class: 'levels' },
      visible.map((lvl) => {
        const open = lvl.id <= max;
        return h('button', {
          class: `level ${open ? '' : 'locked'} ${lvl.id === max ? 'recommended' : ''}`,
          disabled: !open,
          onClick: () => ctx.navigate(`#/exercice/${activity.id}/${lvl.id}`),
        },
        h('span', { class: 'level-num' }, open ? `Niveau ${lvl.id}` : '🔒'),
        h('span', { class: 'level-label' }, lvl.label),
        act.perfects[lvl.id] ? h('span', { class: 'level-hats' }, `🎩 × ${act.perfects[lvl.id]}`) : null);
      }),
    ),
    canUnlockMore
      ? h('p', { class: 'muted unlock-hint' }, `✨ Encore ${Math.max(0, nextNeeded)} exercice${nextNeeded > 1 ? 's' : ''} à 3 chapeaux au niveau ${act.unlocked} pour ouvrir le suivant !`)
      : null,
  );
}

function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}
