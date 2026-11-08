// Sauvegarde dans le localStorage du navigateur, avec un schéma versionné.
//
// Pour faire évoluer le format : incrémenter SCHEMA_VERSION et ajouter une
// fonction dans MIGRATIONS qui transforme l'ancien format vers le nouveau.
// Les champs simplement ajoutés à defaultState() sont complétés automatiquement.

import { DEFAULT_SETTINGS, DEFAULT_PRIZES } from './config.js';

export const STORAGE_KEY = 'devoirs-magiques';
export const SCHEMA_VERSION = 2;

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    profile: {
      name: '',
      cat: { name: 'Moustache', fur: 'nuit', eyes: 'vert', pattern: 'none', hat: 'wizard', hatColor: 'auto', accessory: 'none', wand: 'star' },
    },
    settings: { ...DEFAULT_SETTINGS },
    prizes: DEFAULT_PRIZES.map((p) => ({ ...p })),
    activities: {},
    wallet: { gems: 0, successSinceLastGem: 0, totalStars: 0, gemsEarned: 0, spins: 0 },
    stats: { exercisesDone: 0, perfectCount: 0, levelUps: 0 },
    collection: [],
    history: [],
    wheelHistory: [],
  };
}

const MIGRATIONS = {
  // v2 : insertion du niveau d'addition « Passer la dizaine » en position 5.
  2: (s) => {
    const shift = (n) => (Number(n) >= 5 ? Number(n) + 1 : Number(n));
    const a = s.activities?.addition;
    if (a) {
      a.unlocked = shift(a.unlocked ?? 1);
      a.ceiling = shift(a.ceiling ?? 2);
      a.perfects = Object.fromEntries(Object.entries(a.perfects ?? {}).map(([k, v]) => [shift(k), v]));
    }
    for (const h of s.history ?? []) {
      if (h.activity === 'addition') h.level = shift(h.level);
    }
    return s;
  },
};

function isPlainObject(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function fillDefaults(target, defaults) {
  for (const [key, value] of Object.entries(defaults)) {
    if (target[key] === undefined) target[key] = structuredClone(value);
    else if (isPlainObject(value) && isPlainObject(target[key])) fillDefaults(target[key], value);
  }
  return target;
}

export function migrate(raw) {
  if (!isPlainObject(raw)) return defaultState();
  let s = structuredClone(raw);
  let v = Number(s.version) || 1;
  if (v > SCHEMA_VERSION) {
    throw new Error('Cette sauvegarde vient d’une version plus récente de l’application.');
  }
  while (v < SCHEMA_VERSION) {
    v += 1;
    s = MIGRATIONS[v](s);
  }
  s.version = SCHEMA_VERSION;
  return fillDefaults(s, defaultState());
}

// État d'une activité (créé à la première utilisation).
export function activityState(state, activity) {
  if (!state.activities[activity.id]) {
    state.activities[activity.id] = {
      ceiling: activity.defaultCeiling ?? activity.levels.length,
      unlocked: 1,
      perfects: {},
      missed: {},
    };
  }
  const act = state.activities[activity.id];
  act.perfects ??= {};
  act.missed ??= {};
  act.facts ??= {};      // { '3+4': { streak, seen } }
  act.lowStreak ??= 0;   // exercices difficiles d'affilée
  return act;
}

// Niveau maximum jouable : débloqué ET sous le plafond fixé par le parent.
export function maxPlayableLevel(actState, activity) {
  return Math.max(1, Math.min(actState.unlocked, actState.ceiling, activity.levels.length));
}

// ---- Accès au localStorage -------------------------------------------------

let state = null;

function storageGet() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

export function load() {
  const raw = storageGet();
  try {
    state = migrate(raw ? JSON.parse(raw) : null);
  } catch (e) {
    console.error('Sauvegarde illisible, on repart de zéro (copie conservée).', e);
    if (raw) storageSet(`${STORAGE_KEY}:illisible:${Date.now()}`, raw);
    state = defaultState();
  }
  return state;
}

export function getState() {
  return state ?? load();
}

export function save() {
  if (!storageSet(STORAGE_KEY, JSON.stringify(state))) {
    console.warn('Impossible d’enregistrer dans le navigateur.');
  }
}

export function setState(next) {
  state = next;
  save();
}

export function update(mutator) {
  mutator(getState());
  save();
}

export function exportJson() {
  return JSON.stringify(getState(), null, 2);
}

export function importJson(text) {
  state = migrate(JSON.parse(text));
  save();
}

export function resetAll() {
  state = defaultState();
  save();
}
