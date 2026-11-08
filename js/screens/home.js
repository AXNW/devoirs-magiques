// Accueil : un gros bouton « Jouer », la mascotte, et le reste en retrait.

import { h } from '../ui/dom.js';
import { createTalkingMascot } from '../ui/mascot.js';
import { getState, update, activityState, maxPlayableLevel } from '../store.js';
import { rankInfo, gemProgress, levelMastery, levelProgress, dailyLimitReached, recommendedActivity } from '../rewards.js';
import { ACTIVITIES } from '../activities/registry.js';
import { FAMILIARS } from '../config.js';
import { play } from '../sound.js';
import { line, pickLine, catNameKey } from '../voice/lines.js';

const LIQUIDS = ['#9b6dff', '#3f8efc', '#2bb673', '#ffcf4a', '#ff7eb6', '#ff7a1a', '#14b8c4', '#e0457b', '#7b5cd6', '#4ee1a0'];

// Le panneau des niveaux reste ouvert si l'enfant l'a ouvert pendant cette visite.
let levelsOpen = false;

const readAct = (s, activity) => s.activities[activity.id] ?? activityState(structuredClone(s), activity);

export function render(root, ctx) {
  const s = getState();
  const rank = rankInfo(s.wallet.totalStars);
  const gem = gemProgress(s);
  const canSpin = s.wallet.gems >= s.settings.gemsPerSpin;
  const resting = dailyLimitReached(s);

  // ---- Pastilles du haut ----
  const chips = h('div', { class: 'chips' },
    h('div', { class: 'chip-stat', title: rank.next ? `Encore ${rank.next.min - s.wallet.totalStars} ⭐ pour devenir ${rank.next.name}` : 'Rang maximum !' },
      h('span', {}, `🎩 ${rank.rank.name}`),
      h('span', { class: 'mini-bar' }, h('span', { style: { width: `${rank.progress * 100}%` } }))),
    h('button', { class: `chip-stat ${canSpin ? 'glow' : ''}`, onClick: () => ctx.navigate('#/roue'), 'aria-label': `${s.wallet.gems} gemmes, aller à la roue` },
      `💎 ${s.wallet.gems}`, canSpin ? h('span', { class: 'chip-cta' }, '🎡 Roue !') : null),
    h('button', { class: 'chip-stat', onClick: () => ctx.navigate('#/familiers'), 'aria-label': 'Mes familiers' },
      `🐾 ${s.collection.length}/${FAMILIARS.length}`),
    h('button', {
      class: 'chip-stat sound-chip',
      'aria-label': s.settings.sound ? 'Couper le son' : 'Activer le son',
      onClick: (e) => {
        update((st) => { st.settings.sound = !st.settings.sound; });
        e.currentTarget.textContent = getState().settings.sound ? '🔊' : '🔇';
        play('click');
      },
    }, s.settings.sound ? '🔊' : '🔇'),
  );

  // ---- Mascotte ----
  const talk = createTalkingMascot({ size: 170 });
  const name = s.profile.name.trim();
  const catName = s.profile.cat.name || 'Moustache';
  // Le prénom de l'enfant s'affiche mais n'est pas prononcé (il n'est jamais enregistré).
  // Le nom du chat est prononcé s'il fait partie des noms enregistrés.
  const greet = pickLine('greetings');
  const nameKey = catNameKey(catName);
  talk.say(resting ? line('home', 'resting') : {
    text: `${name ? `Bonjour ${name} ! ` : 'Bonjour ! '}C’est moi, ${catName}. ${greet.text}`,
    clips: nameKey ? ['home_hello', 'home_its_me', nameKey, ...greet.clips] : ['home_hello_generic', ...greet.clips],
  });

  // ---- Gros bouton Jouer ----
  const activity = recommendedActivity(s, ACTIVITIES);
  const act = readAct(s, activity);
  const level = activity.levels[maxPlayableLevel(act, activity) - 1];
  const playBtn = h('button', {
    class: 'play-btn',
    disabled: resting,
    onClick: () => ctx.navigate(`#/exercice/${activity.id}/${level.id}`),
  },
  h('span', { class: 'play-main' }, resting ? '😴 À demain !' : '✨ Jouer'),
  h('span', { class: 'play-sub' }, `${activity.icon} ${activity.title} · Niveau ${level.id} : ${level.label}`));

  const gemLine = h('div', { class: 'gem-line' },
    h('div', { class: 'bar' }, h('div', { class: 'bar-fill gem', style: { width: `${(gem.done / gem.needed) * 100}%` } })),
    h('p', { class: 'muted' }, `💎 ${gem.done} / ${gem.needed} potions réussies avant la prochaine Gemme de lune`));

  // ---- Boutons secondaires et panneau des niveaux ----
  const panel = h('section', { class: `levels-panel ${levelsOpen ? '' : 'hidden'}` },
    ACTIVITIES.map((a) => activityLevels(a, s, ctx, resting)));
  const levelsBtn = h('button', {
    class: 'btn btn-soft', 'aria-expanded': levelsOpen ? 'true' : 'false',
    onClick: () => {
      levelsOpen = !levelsOpen;
      panel.classList.toggle('hidden', !levelsOpen);
      levelsBtn.setAttribute('aria-expanded', levelsOpen ? 'true' : 'false');
      if (levelsOpen) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  }, '🧪 Choisir un niveau');

  root.append(
    chips,
    h('h1', { class: 'title' }, 'L’École des Chats Sorciers'),
    h('div', { class: 'home-hero' }, talk.el, playBtn, gemLine),
    h('div', { class: 'home-actions' },
      levelsBtn,
      activity.renderGrimoire ? h('button', { class: 'btn btn-soft', onClick: () => ctx.navigate(`#/grimoire/${activity.id}`) }, '📖 Mon grimoire') : null,
      h('button', { class: 'btn btn-soft', onClick: () => ctx.navigate('#/mon-chat') }, `🎨 ${catName}`)),
    panel,
    h('footer', { class: 'home-footer' },
      h('button', { class: 'icon-btn parent-btn', onClick: () => ctx.navigate('#/parent') }, '🔒 Espace parent')),
  );
}

// Les niveaux d'une activité, sous forme de fioles qui se remplissent.
function activityLevels(activity, s, ctx, resting) {
  const act = readAct(s, activity);
  const max = maxPlayableLevel(act, activity);
  const visible = activity.levels.filter((l) => l.id <= Math.min(act.ceiling, activity.levels.length));
  const canUnlockMore = act.unlocked < Math.min(act.ceiling, activity.levels.length);
  const mastery = canUnlockMore ? levelMastery(act, activity, act.unlocked, s.settings.masteryToUnlock) : null;
  const perfectsLeft = Math.max(0, s.settings.perfectsToUnlock - (act.perfects[act.unlocked] || 0));

  let hint = null;
  if (mastery) {
    hint = mastery.needed === 0
      ? `✨ Tu connais assez de calculs du niveau ${act.unlocked} ! Termine une potion pour ouvrir le suivant.`
      : `✨ Niveau ${act.unlocked} : tu connais ${mastery.mastered} calculs sur ${mastery.total}. Encore ${mastery.needed} à apprendre pour ouvrir le suivant (ou ${perfectsLeft} sans-faute${perfectsLeft > 1 ? 's' : ''}) !`;
  } else if (canUnlockMore) {
    hint = `✨ Encore ${perfectsLeft} sans-faute${perfectsLeft > 1 ? 's' : ''} au niveau ${act.unlocked} pour ouvrir le suivant !`;
  }

  return h('article', { class: 'card activity' },
    h('div', { class: 'activity-head' },
      h('span', { class: 'activity-icon' }, activity.icon),
      h('div', {}, h('h2', {}, activity.title), h('p', { class: 'muted' }, activity.subtitle))),
    h('div', { class: 'flasks' },
      visible.map((lvl) => {
        const open = lvl.id <= max;
        const p = open ? levelProgress(act, activity, lvl.id, s.settings) : 0;
        return h('button', {
          class: `flask ${open ? '' : 'locked'} ${lvl.id === max ? 'current' : ''} ${p >= 1 ? 'full' : ''}`,
          disabled: !open || resting,
          'aria-label': `Niveau ${lvl.id} : ${lvl.label}${open ? '' : ' (fermé)'}`,
          onClick: () => ctx.navigate(`#/exercice/${activity.id}/${lvl.id}`),
        },
        h('span', { class: 'flask-glass' },
          h('span', { class: 'flask-liquid', style: { height: `${Math.max(p, open ? 0.06 : 0) * 100}%`, background: LIQUIDS[(lvl.id - 1) % LIQUIDS.length] } }),
          h('span', { class: 'flask-icon' }, open ? (p >= 1 ? '⭐' : '') : '🔒')),
        h('span', { class: 'flask-num' }, `Niveau ${lvl.id}`),
        h('span', { class: 'flask-label' }, lvl.label));
      })),
    hint ? h('p', { class: 'muted unlock-hint' }, hint) : null,
  );
}
