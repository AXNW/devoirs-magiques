// Grimoire : ce que l'enfant sait déjà, niveau par niveau. Écran générique ;
// la page détaillée (ex. table d'addition) est fournie par l'activité.

import { h } from '../ui/dom.js';
import { getState, activityState } from '../store.js';
import { isMastered, levelMastery } from '../rewards.js';
import { getActivity } from '../activities/registry.js';
import { MASTERY_STREAK } from '../config.js';

export function render(root, ctx) {
  const activity = getActivity(ctx.params[0]);
  if (!activity) { ctx.navigate('#/accueil'); return null; }
  const s = getState();
  const act = s.activities[activity.id] ?? activityState(structuredClone(s), activity);
  const visible = activity.levels.filter((l) => l.id <= Math.min(act.ceiling, activity.levels.length));

  const levels = visible.map((lvl) => {
    const m = levelMastery(act, activity, lvl.id, s.settings.masteryToUnlock);
    if (!m) return null;
    const locked = lvl.id > act.unlocked;
    return h('div', { class: `grimoire-level ${locked ? 'locked' : ''}` },
      h('div', { class: 'grimoire-level-head' },
        h('strong', {}, locked ? `🔒 Niveau ${lvl.id}` : `Niveau ${lvl.id}`),
        h('span', { class: 'muted' }, lvl.label),
        h('span', { class: 'grimoire-count' }, `${m.mastered} / ${m.total}`)),
      h('div', { class: 'bar' }, h('div', { class: 'bar-fill', style: { width: `${m.ratio * 100}%` } })));
  });

  root.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Retour à l’accueil', onClick: () => ctx.navigate('#/accueil') }, '🏠'),
      h('div', { class: 'topbar-title' }, `📖 Mon grimoire · ${activity.title}`),
      h('span')),
    h('div', { class: 'grimoire' },
      h('div', { class: 'card' },
        h('p', { class: 'grimoire-intro' }, `Un calcul s’écrit en or dans ton grimoire quand tu l’as réussi ${MASTERY_STREAK} fois de suite du premier coup ✨`),
        activity.renderGrimoire?.(act, { isMastered: (k) => isMastered(act, k) })),
      levels.some(Boolean) ? h('div', { class: 'card grimoire-levels' }, h('h2', {}, 'Mes niveaux'), levels) : null,
    ),
  );
  return null;
}
