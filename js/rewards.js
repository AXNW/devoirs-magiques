// Règles de récompense : fonctions pures (aucun accès au DOM ni au stockage),
// faciles à tester. Elles reçoivent un état et renvoient un nouvel état.

import { RANKS, FAMILIARS } from './config.js';
import { activityState } from './store.js';
import { weightedPick } from './rng.js';

const MAX_HISTORY = 2000;
const MAX_WHEEL_HISTORY = 200;

// 1 étoile par bonne réponse du premier coup, ½ au deuxième essai.
export function starsFor(attempt) {
  return attempt === 1 ? 1 : attempt === 2 ? 0.5 : 0;
}

// 3 chapeaux = sans faute, 2 = au moins 80 %, 1 = au moins 60 %.
export function hatsFor(stars, total) {
  if (!total) return 0;
  const ratio = stars / total;
  if (ratio >= 1) return 3;
  if (ratio >= 0.8) return 2;
  if (ratio >= 0.6) return 1;
  return 0;
}

export function rankInfo(totalStars) {
  let index = 0;
  RANKS.forEach((r, i) => { if (totalStars >= r.min) index = i; });
  const rank = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  const progress = next ? (totalStars - rank.min) / (next.min - rank.min) : 1;
  return { index, rank, next, progress };
}

export function gemProgress(state) {
  return { done: state.wallet.successSinceLastGem, needed: state.settings.exercisesPerGem };
}

// Ajoute à la collection les familiers dont la condition est remplie. Modifie `s`.
export function unlockFamiliars(s) {
  const added = [];
  for (const f of FAMILIARS) {
    if (!s.collection.includes(f.id) && f.test(s)) {
      s.collection.push(f.id);
      added.push(f);
    }
  }
  return added;
}

// Calculs ratés : reproposés plus souvent, oubliés peu à peu quand ils sont réussis.
function updateMissed(act, answers) {
  for (const a of answers) {
    if (a.firstTry) {
      if (act.missed[a.key]) {
        act.missed[a.key] -= 1;
        if (act.missed[a.key] <= 0) delete act.missed[a.key];
      }
    } else {
      act.missed[a.key] = (act.missed[a.key] || 0) + 1;
    }
  }
}

/**
 * Enregistre la fin d'un exercice.
 * result = { level, stars, total, answers: [{ key, firstTry }] }
 */
export function applyExerciseResult(prev, result, activity, now = new Date()) {
  const s = structuredClone(prev);
  const { settings } = s;
  const act = activityState(s, activity);
  const { level, stars, total, answers = [] } = result;

  const hats = hatsFor(stars, total);
  const success = hats >= settings.successMinHats;
  const rankBefore = rankInfo(s.wallet.totalStars).index;

  s.wallet.totalStars += stars;
  s.stats.exercisesDone += 1;
  if (hats === 3) s.stats.perfectCount += 1;

  updateMissed(act, answers);

  // Déblocage du niveau suivant (jamais au-delà du plafond fixé par le parent).
  let levelUnlocked = null;
  if (hats === 3) {
    act.perfects[level] = (act.perfects[level] || 0) + 1;
    const limit = Math.min(act.ceiling, activity.levels.length);
    if (level === act.unlocked && act.perfects[level] >= settings.perfectsToUnlock && act.unlocked < limit) {
      act.unlocked += 1;
      s.stats.levelUps += 1;
      levelUnlocked = activity.levels[act.unlocked - 1];
    }
  }

  // Gemmes de lune.
  let gemEarned = false;
  if (success) {
    s.wallet.successSinceLastGem += 1;
    if (s.wallet.successSinceLastGem >= settings.exercisesPerGem) {
      s.wallet.successSinceLastGem = 0;
      s.wallet.gems += 1;
      s.wallet.gemsEarned += 1;
      gemEarned = true;
    }
  }

  s.history.push({ date: now.toISOString(), activity: activity.id, level, stars, total, hats });
  if (s.history.length > MAX_HISTORY) s.history.splice(0, s.history.length - MAX_HISTORY);

  const newFamiliars = unlockFamiliars(s);
  const after = rankInfo(s.wallet.totalStars);
  const rankUp = after.index > rankBefore ? after.rank : null;

  return { state: s, events: { hats, success, gemEarned, levelUnlocked, newFamiliars, rankUp } };
}

// Exercice abandonné en cours de route : on garde les étoiles gagnées et les
// calculs à retravailler, mais l'exercice ne compte ni pour les gemmes ni pour les niveaux.
export function applyAbandon(prev, { stars = 0, answers = [] }, activity) {
  const s = structuredClone(prev);
  const rankBefore = rankInfo(s.wallet.totalStars).index;
  s.wallet.totalStars += stars;
  updateMissed(activityState(s, activity), answers);
  const newFamiliars = unlockFamiliars(s);
  const after = rankInfo(s.wallet.totalStars);
  return { state: s, events: { newFamiliars, rankUp: after.index > rankBefore ? after.rank : null } };
}

// Fait tourner la roue. Renvoie null si pas assez de gemmes ou aucune récompense.
export function applySpin(prev, rng = Math.random, now = new Date()) {
  const s = structuredClone(prev);
  const cost = s.settings.gemsPerSpin;
  if (s.wallet.gems < cost || !s.prizes.length) return null;

  const index = weightedPick(rng, s.prizes, (p) => p.weight);
  const prize = s.prizes[index];
  s.wallet.gems -= cost;
  s.wallet.spins += 1;
  if (prize.respin) s.wallet.gems += cost;

  s.wheelHistory.unshift({
    date: now.toISOString(),
    emoji: prize.emoji,
    label: prize.label,
    used: !!prize.respin,
  });
  if (s.wheelHistory.length > MAX_WHEEL_HISTORY) s.wheelHistory.length = MAX_WHEEL_HISTORY;

  const newFamiliars = unlockFamiliars(s);
  return { state: s, index, prize, newFamiliars };
}
