// Activité « Potions d'addition ».
// Voir README.md (section « Ajouter une activité ») pour le contrat d'une activité.

import { randInt, shuffle, weightedPick } from '../rng.js';
import { h } from '../ui/dom.js';

const LEVELS = [
  { id: 1, label: 'Jusqu’à 5',               params: { kind: 'sum', max: 5 } },
  { id: 2, label: 'Jusqu’à 7',               params: { kind: 'sum', max: 7 } },
  { id: 3, label: 'Jusqu’à 10',              params: { kind: 'sum', max: 10 } },
  { id: 4, label: 'Doubles et amis de 10',   params: { kind: 'friends' } },
  { id: 5, label: 'Jusqu’à 15',              params: { kind: 'sum', min: 6, max: 15 } },
  { id: 6, label: 'Jusqu’à 20',              params: { kind: 'sum', min: 10, max: 20 } },
  { id: 7, label: 'Dizaines + unités (23 + 4)', params: { kind: 'two', second: 'one', carry: false } },
  { id: 8, label: 'Grands nombres (23 + 14)',   params: { kind: 'two', second: 'two', carry: false } },
  { id: 9, label: 'Avec retenue (27 + 15)',     params: { kind: 'two', second: 'any', carry: true } },
];

// Clé indépendante de l'ordre : 3+4 et 4+3 sont le même calcul.
export const keyOf = (a, b) => (a <= b ? `${a}+${b}` : `${b}+${a}`);
const hasZero = (key) => key.startsWith('0+');

// Toutes les paires (a, b) possibles pour un niveau.
export function buildPool(params) {
  const pool = [];
  if (params.kind === 'sum') {
    const min = params.min ?? 0;
    for (let a = 0; a <= params.max; a++) {
      for (let b = 0; b <= params.max; b++) {
        const s = a + b;
        if (s > params.max || s < min || (a === 0 && b === 0)) continue;
        if (min > 0 && (a === 0 || b === 0)) continue;
        pool.push([a, b]);
      }
    }
  } else if (params.kind === 'friends') {
    for (let a = 1; a <= 9; a++) pool.push([a, 10 - a]);
    for (let a = 1; a <= 10; a++) pool.push([a, a]);
  } else if (params.kind === 'two') {
    const [bMin, bMax] = { one: [1, 9], two: [10, 99], any: [1, 99] }[params.second];
    for (let a = 10; a <= 99; a++) {
      for (let b = bMin; b <= bMax; b++) {
        if (a + b > 99) continue;
        const carry = (a % 10) + (b % 10) >= 10;
        if (carry !== params.carry) continue;
        pool.push([a, b]);
      }
    }
  }
  return pool;
}

function makeQuestion(a, b) {
  return { a, b, prompt: `${a} + ${b}`, answer: a + b, key: keyOf(a, b) };
}

/**
 * Génère `count` questions pour un niveau.
 * - les calculs ratés récemment (`missed`) reviennent en priorité (30 % max) ;
 * - pas de doublon tant que le niveau offre assez de calculs différents ;
 * - « + 0 » limité ;
 * - l'ordre des termes varie (3 + 4 ou 4 + 3).
 */
export function generate(params, { rng = Math.random, count = 10, missed = {} } = {}) {
  const variants = new Map();
  for (const [a, b] of buildPool(params)) {
    const k = keyOf(a, b);
    if (!variants.has(k)) variants.set(k, []);
    variants.get(k).push([a, b]);
  }
  const keys = [...variants.keys()];
  if (!keys.length) return [];

  const maxZeros = keys.length < count ? 2 : 1;
  const hasNonZero = keys.some((k) => !hasZero(k));
  const chosen = [];
  const used = new Set();
  let zeros = 0;

  const take = (k) => {
    chosen.push(k);
    used.add(k);
    if (hasZero(k)) zeros += 1;
  };

  // 1) Calculs à retravailler.
  const missedKeys = keys.filter((k) => missed[k] > 0);
  const maxMissed = Math.min(missedKeys.length, Math.ceil(count * 0.3));
  while (chosen.length < maxMissed) {
    const i = weightedPick(rng, missedKeys, (k) => missed[k]);
    take(missedKeys.splice(i, 1)[0]);
  }

  // 2) Compléter au hasard (on autorise les répétitions si le niveau est petit).
  let candidates = shuffle(rng, keys.filter((k) => !used.has(k)));
  while (chosen.length < count) {
    if (!candidates.length) candidates = shuffle(rng, keys);
    const k = candidates.pop();
    if (hasZero(k) && zeros >= maxZeros && hasNonZero) continue;
    take(k);
  }

  // Mélanger en évitant deux fois le même calcul d'affilée : à chaque pas,
  // on prend le calcul qui a le plus d'exemplaires restants (différent du précédent).
  const remaining = new Map();
  for (const k of shuffle(rng, chosen)) remaining.set(k, (remaining.get(k) || 0) + 1);
  const order = [];
  while (order.length < chosen.length) {
    const last = order[order.length - 1];
    let best = null;
    for (const [k, n] of remaining) {
      if (n > 0 && k !== last && (best === null || n > remaining.get(best))) best = k;
    }
    if (best === null) best = last; // impossible d'éviter la répétition
    order.push(best);
    remaining.set(best, remaining.get(best) - 1);
  }

  return order.map((k) => {
    const list = variants.get(k);
    const [a, b] = list[randInt(rng, 0, list.length - 1)];
    return makeQuestion(a, b);
  });
}

export function check(question, input) {
  return input !== '' && Number(input) === question.answer;
}

// Aide visuelle après deux erreurs.
export function renderHelp(q) {
  if (q.a <= 10 && q.b <= 10) {
    const group = (n, emoji) => {
      const chunks = [];
      for (let i = 0; i < n; i += 5) {
        chunks.push(h('span', { class: 'chunk' }, emoji.repeat(Math.min(5, n - i))));
      }
      return h('span', { class: 'group' }, n === 0 ? h('span', { class: 'chunk empty' }, 'rien') : chunks);
    };
    return h('div', { class: 'help help-count' },
      h('p', {}, 'Compte tous les poissons :'),
      h('div', { class: 'help-line' },
        group(q.a, '🐟'), h('span', { class: 'op' }, '+'), group(q.b, '🐠'),
        h('span', { class: 'op' }, '='), h('strong', { class: 'help-answer' }, q.answer)),
    );
  }

  const ta = Math.floor(q.a / 10), ua = q.a % 10;
  const tb = Math.floor(q.b / 10), ub = q.b % 10;
  const units = ua + ub;
  const carry = units >= 10 ? 1 : 0;
  const tens = ta + tb + carry;
  const lines = [
    h('p', {}, `Les unités : ${ua} + ${ub} = ${units}`),
    carry ? h('p', {}, `→ j’écris ${units % 10} et je retiens 1 dizaine`) : null,
    h('p', {}, `Les dizaines : ${ta} + ${tb}${carry ? ' + 1 (retenue)' : ''} = ${tens}`),
    h('p', { class: 'help-result' }, `${q.a} + ${q.b} = `, h('strong', { class: 'help-answer' }, q.answer)),
  ];
  return h('div', { class: 'help help-columns' }, lines);
}

export default {
  id: 'addition',
  title: 'Potions d’addition',
  subtitle: 'Mélange les nombres pour trouver le résultat',
  icon: '🧪',
  levels: LEVELS,
  defaultCeiling: 2, // « jusqu'à 7 » au départ, modifiable dans l'Espace parent
  maxInputLength: 3,
  generate,
  check,
  renderHelp,
};
