// Règles de récompense : fonctions pures (aucun accès au DOM ni au stockage),
// faciles à tester. Elles reçoivent un état et renvoient un nouvel état.

import { RANKS, FAMILIARS, MASTERY_STREAK, CAT_OPTIONS } from './config.js';
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

// ---- Maîtrise calcul par calcul ----

export function isMastered(act, key) {
  return (act.facts?.[key]?.streak ?? 0) >= MASTERY_STREAK;
}

// { mastered, total, ratio, needed } pour un niveau, ou null si l'activité ne suit pas ce niveau.
export function levelMastery(act, activity, levelId, threshold = 80) {
  const level = activity.levels[levelId - 1];
  const keys = level && activity.levelFacts?.(level.params);
  if (!keys || !keys.length) return null;
  const mastered = keys.filter((k) => isMastered(act, k)).length;
  const needed = Math.max(0, Math.ceil((keys.length * threshold) / 100) - mastered);
  return { mastered, total: keys.length, ratio: mastered / keys.length, needed };
}

// Remplissage d'une fiole de niveau (0 à 1) : la meilleure des deux voies de déblocage.
export function levelProgress(act, activity, levelId, settings) {
  const m = levelMastery(act, activity, levelId, settings.masteryToUnlock);
  const byMastery = m ? m.ratio / (settings.masteryToUnlock / 100) : 0;
  const byPerfects = (act.perfects?.[levelId] || 0) / settings.perfectsToUnlock;
  return Math.min(1, Math.max(byMastery, byPerfects));
}

// Activité proposée par le gros bouton « Jouer » : la dernière jouée, sinon la première.
export function recommendedActivity(state, activities) {
  const last = [...state.history].reverse().find((x) => activities.some((a) => a.id === x.activity));
  return activities.find((a) => a.id === last?.activity) ?? activities[0];
}

// ---- Personnalisation du chat ----

export function isItemUnlocked(state, item) {
  return !item.unlock || item.unlock(state);
}

// Options du chat débloquées entre deux états : [{ category, id, label }].
export function newlyUnlockedItems(before, after) {
  const out = [];
  for (const [category, { items }] of Object.entries(CAT_OPTIONS)) {
    for (const item of items) {
      if (item.unlock && !item.unlock(before) && item.unlock(after)) out.push({ category, id: item.id, label: item.label });
    }
  }
  return out;
}

// Couleurs de chapeau disponibles : une par rang atteint.
export function hatColorsUnlocked(state) {
  return RANKS.filter((r) => state.wallet.totalStars >= r.min);
}

// Couleur du chapeau : celle choisie (si le rang est atteint), sinon celle du rang actuel.
export function hatColorFor(state) {
  const chosen = state.profile.cat?.hatColor;
  const unlocked = hatColorsUnlocked(state);
  return unlocked.find((r) => r.hat === chosen)?.hat ?? rankInfo(state.wallet.totalStars).rank.hat;
}

// ---- Rythme quotidien ----

export function exercisesOn(state, day = new Date()) {
  const d = day.toDateString();
  return state.history.filter((x) => new Date(x.date).toDateString() === d).length;
}

export function dailyLimitReached(state, now = new Date()) {
  const limit = state.settings.dailyLimit;
  return limit > 0 && exercisesOn(state, now) >= limit;
}

// Calculs : série de réussites (maîtrise) et calculs ratés (reproposés plus souvent,
// oubliés peu à peu quand ils sont réussis).
function updateFacts(act, answers) {
  for (const a of answers) {
    const fact = (act.facts[a.key] ??= { streak: 0, seen: 0 });
    fact.seen += 1;
    fact.streak = a.firstTry ? Math.min(fact.streak + 1, 99) : 0;
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

  updateFacts(act, answers);

  // Déblocage du niveau suivant (jamais au-delà du plafond fixé par le parent) :
  // assez de calculs sus dans le niveau, OU assez de sans-fautes.
  let levelUnlocked = null;
  if (hats === 3) act.perfects[level] = (act.perfects[level] || 0) + 1;
  const limit = Math.min(act.ceiling, activity.levels.length);
  if (act.unlocked < limit) {
    const byPerfects = (act.perfects[act.unlocked] || 0) >= settings.perfectsToUnlock;
    const mastery = levelMastery(act, activity, act.unlocked, settings.masteryToUnlock);
    const byMastery = mastery !== null && mastery.needed === 0;
    if (byPerfects || byMastery) {
      act.unlocked += 1;
      s.stats.levelUps += 1;
      levelUnlocked = activity.levels[act.unlocked - 1];
    }
  }

  // Anti-frustration : après 2 exercices difficiles d'affilée, proposer le niveau d'avant.
  act.lowStreak = hats === 0 ? act.lowStreak + 1 : 0;
  const suggestEasier = level > 1 && act.lowStreak >= 2 ? activity.levels[level - 2] : null;

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

  // Rythme : suggestion de pause, limite du jour.
  const today = exercisesOn(s, now);
  const pauseHint = settings.dailyPauseHint > 0 && today % settings.dailyPauseHint === 0;
  const limitReached = dailyLimitReached(s, now);

  return {
    state: s,
    events: {
      hats, success, gemEarned, levelUnlocked, newFamiliars, rankUp, suggestEasier, today, pauseHint, limitReached,
      newItems: newlyUnlockedItems(prev, s),
    },
  };
}

// Exercice abandonné en cours de route : on garde les étoiles gagnées et les
// calculs à retravailler, mais l'exercice ne compte ni pour les gemmes ni pour les niveaux.
export function applyAbandon(prev, { stars = 0, answers = [] }, activity) {
  const s = structuredClone(prev);
  const rankBefore = rankInfo(s.wallet.totalStars).index;
  s.wallet.totalStars += stars;
  updateFacts(activityState(s, activity), answers);
  const newFamiliars = unlockFamiliars(s);
  const after = rankInfo(s.wallet.totalStars);
  return { state: s, events: { newFamiliars, rankUp: after.index > rankBefore ? after.rank : null } };
}

// Choisir sa récompense (au lieu du hasard) pour `gemsToChoose` gemmes.
export function applyChoice(prev, prizeIndex, now = new Date()) {
  const s = structuredClone(prev);
  const cost = s.settings.gemsToChoose;
  const prize = s.prizes[prizeIndex];
  if (!cost || s.wallet.gems < cost || !prize || prize.respin) return null;
  s.wallet.gems -= cost;
  s.wheelHistory.unshift({ date: now.toISOString(), emoji: prize.emoji, label: prize.label, used: false, chosen: true });
  if (s.wheelHistory.length > MAX_WHEEL_HISTORY) s.wheelHistory.length = MAX_WHEEL_HISTORY;
  return { state: s, prize, newFamiliars: unlockFamiliars(s) };
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
