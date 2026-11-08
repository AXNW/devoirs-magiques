// Activité « Potions d'addition ».
// Voir README.md (section « Ajouter une activité ») pour le contrat d'une activité.

import { randInt, shuffle, weightedPick } from '../rng.js';
import { h } from '../ui/dom.js';

// ⚠️ Les numéros de niveau sont enregistrés dans les sauvegardes : pour en insérer
// un, ajouter une migration dans store.js (voir la migration 2).
const LEVELS = [
  { id: 1,  label: 'Jusqu’à 5',                  params: { kind: 'sum', max: 5 } },
  { id: 2,  label: 'Jusqu’à 7',                  params: { kind: 'sum', max: 7 } },
  { id: 3,  label: 'Jusqu’à 10',                 params: { kind: 'sum', max: 10 } },
  { id: 4,  label: 'Doubles et amis de 10',      params: { kind: 'friends' } },
  { id: 5,  label: 'Passer la dizaine (8 + 5)',  params: { kind: 'sum', min: 11, max: 18, maxTerm: 9 } },
  { id: 6,  label: 'Jusqu’à 15',                 params: { kind: 'sum', min: 6, max: 15 } },
  { id: 7,  label: 'Jusqu’à 20',                 params: { kind: 'sum', min: 10, max: 20 } },
  { id: 8,  label: 'Dizaines + unités (23 + 4)', params: { kind: 'two', second: 'one', carry: false } },
  { id: 9,  label: 'Grands nombres (23 + 14)',   params: { kind: 'two', second: 'two', carry: false } },
  { id: 10, label: 'Avec retenue (27 + 15)',     params: { kind: 'two', second: 'any', carry: true } },
];

// Clé indépendante de l'ordre : 3+4 et 4+3 sont le même calcul.
export const keyOf = (a, b) => (a <= b ? `${a}+${b}` : `${b}+${a}`);
const hasZero = (key) => key.startsWith('0+');

// Toutes les paires (a, b) possibles pour un niveau.
export function buildPool(params) {
  const pool = [];
  if (params.kind === 'sum') {
    const min = params.min ?? 0;
    const maxTerm = params.maxTerm ?? params.max;
    for (let a = 0; a <= maxTerm; a++) {
      for (let b = 0; b <= maxTerm; b++) {
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

// Liste des calculs d'un niveau, pour suivre la maîtrise calcul par calcul.
// null quand le niveau en contient trop (nombres à 2 chiffres) : on se base alors sur les sans-fautes.
export function levelFacts(params) {
  if (params.kind === 'two') return null;
  return [...new Set(buildPool(params).map(([a, b]) => keyOf(a, b)))];
}

function makeQuestion(a, b) {
  return { a, b, prompt: `${a} + ${b}`, answer: a + b, key: keyOf(a, b) };
}

/**
 * Génère `count` questions pour un niveau.
 * - les calculs ratés récemment (`missed`) reviennent en priorité (30 % max) ;
 * - puis les calculs pas encore sus, avec quelques calculs sus en révision ;
 * - pas de doublon tant que le niveau offre assez de calculs différents ;
 * - « + 0 » limité, jamais deux fois le même calcul d'affilée ;
 * - l'ordre des termes varie (3 + 4 ou 4 + 3).
 */
export function generate(params, { rng = Math.random, count = 10, missed = {}, isMastered = () => false } = {}) {
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

  // 2) Calculs pas encore sus d'abord, en gardant au moins 2 révisions de calculs sus.
  const rest = keys.filter((k) => !used.has(k));
  const fresh = shuffle(rng, rest.filter((k) => !isMastered(k)));
  const known = shuffle(rng, rest.filter((k) => isMastered(k)));
  const slots = count - chosen.length;
  const review = Math.min(known.length, slots, Math.max(2, slots - fresh.length));
  let queue = [
    ...fresh.slice(0, slots - review), ...known.slice(0, review),
    ...fresh.slice(slots - review), ...known.slice(review),
  ];

  // 3) Compléter (on autorise les répétitions si le niveau est petit).
  while (chosen.length < count) {
    if (!queue.length) queue = shuffle(rng, keys);
    const k = queue.shift();
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

// Message adapté à une erreur fréquente (ou null si rien de particulier).
export function diagnose(q, input) {
  const n = Number(input);
  const answer = String(q.answer);
  if (answer.length === 2 && answer[0] !== answer[1] && input === answer[1] + answer[0]) {
    return 'Les bons chiffres, mais dans le désordre ! Lequel vient en premier ?';
  }
  const big = Math.max(q.a, q.b);
  const small = Math.min(q.a, q.b);
  if (q.answer <= 20 && small > 0 && n === q.answer - 1) {
    return `Tout près ! On ne recompte pas le ${big} : pars de ${big} et avance de ${small}.`;
  }
  if (q.answer <= 20 && n === q.answer + 1) return 'Tout près ! Tu as fait un pas de trop, recompte doucement.';
  if (q.answer > 20 && Math.abs(n - q.answer) === 1) return 'Tout près ! Vérifie bien les unités.';
  return null;
}

// Phrase lue à voix haute par le bouton 🔊.
export function speak(q) {
  return `Combien font ${q.a} plus ${q.b} ?`;
}

// ---- Représentations visuelles --------------------------------------------

// Boîtes de 10 (2 rangées de 5), comme en classe. `groups` = [{ n, cls }].
export function tenFrames(groups, { highlightEmpty = false } = {}) {
  const cells = [];
  for (const g of groups) for (let i = 0; i < g.n; i++) cells.push(g.cls);
  const frames = Math.max(1, Math.ceil(cells.length / 10));
  return h('div', { class: 'tenframes' },
    Array.from({ length: frames }, (_, f) => h('div', { class: 'tenframe' },
      Array.from({ length: 10 }, (_, i) => {
        const cls = cells[f * 10 + i];
        return h('span', { class: `cell ${cls ?? (highlightEmpty ? 'gap' : 'empty')}` });
      }))));
}

// Ligne numérique : le chat part de `start` et fait `hops` bonds (🏁 = arrivée, en option).
export function numberLine(start, hops, { flag = false } = {}) {
  const from = Math.max(0, start - 2);
  const to = start + hops + 2;
  const cells = [];
  for (let n = from; n <= to; n++) {
    const isStart = n === start;
    const isHop = n > start && n <= start + hops;
    cells.push(h('div', { class: `nl-cell ${isStart ? 'start' : ''} ${isHop ? 'hop' : ''}` },
      h('span', { class: 'nl-mark' }, isStart ? '🐈' : flag && n === start + hops ? '🏁' : isHop ? '🐾' : ''),
      h('span', { class: 'nl-num' }, n)));
  }
  return h('div', { class: 'numline' }, cells);
}

// Addition posée en colonnes pour les nombres à 2 chiffres (comme au CE1).
export function renderQuestion(q, answerEl) {
  if (q.a < 10) return null;
  const digits = (n) => {
    const s = String(n);
    return [s.length > 1 ? s[0] : '', s[s.length - 1]];
  };
  const [ta, ua] = digits(q.a);
  const [tb, ub] = digits(q.b);
  const cell = (t, cls = '') => h('span', { class: `col-cell ${cls}` }, t);
  return h('div', { class: 'column-op', 'aria-label': `${q.a} plus ${q.b}` },
    cell(''), cell('d', 'col-head'), cell('u', 'col-head'),
    cell(''), cell(ta), cell(ua),
    cell('+', 'col-sign'), cell(tb), cell(ub),
    h('span', { class: 'col-line' }),
    h('span', { class: 'col-answer' }, answerEl));
}

// Indice après la 1re erreur : une stratégie, sans donner la réponse.
export function renderHint(q) {
  const big = Math.max(q.a, q.b);
  const small = Math.min(q.a, q.b);

  if (small === 0) {
    return h('div', { class: 'hint' }, h('p', {}, 'Astuce : ajouter 0, c’est n’ajouter rien du tout !'));
  }
  if (q.a >= 10 && q.answer > 20) {
    return h('div', { class: 'hint' },
      h('p', {}, `Astuce : commence par les unités (${q.a % 10} + ${q.b % 10}), puis les dizaines.`));
  }
  if (big <= 9 && q.answer > 10) {
    return h('div', { class: 'hint' },
      h('p', {}, `Astuce : complète d’abord jusqu’à 10 ! Il manque ${10 - big} pour remplir la boîte, ensuite il reste ${small - (10 - big)}.`),
      tenFrames([{ n: big, cls: 'a' }], { highlightEmpty: true }));
  }
  if (q.answer <= 20) {
    return h('div', { class: 'hint' },
      h('p', {}, `Astuce : mets ${big} dans ta tête et avance de ${small}. Où arrive le chat ?`),
      numberLine(big, small));
  }
  return null;
}

// Aide complète après la 2e erreur (avec la réponse).
export function renderHelp(q) {
  if (q.answer <= 20 && q.a <= 20 && q.b <= 20) {
    return h('div', { class: 'help help-count' },
      h('p', {}, `${q.a} jetons violets et ${q.b} jetons dorés :`),
      tenFrames([{ n: q.a, cls: 'a' }, { n: q.b, cls: 'b' }]),
      q.answer > 10 ? h('p', {}, `Une boîte pleine, c’est 10. 10 + ${q.answer - 10} = ${q.answer}`) : null,
      h('p', { class: 'help-result' }, `${q.a} + ${q.b} = `, h('strong', { class: 'help-answer' }, q.answer)));
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

// Page du grimoire : la table d'addition. Un calcul su y apparaît en doré avec son résultat.
export function renderGrimoire(act, { isMastered }) {
  const allowed = LEVELS.filter((l) => l.id <= act.ceiling);
  const maxSum = Math.max(5, ...allowed.map((l) => (l.params.kind === 'sum' ? l.params.max : l.params.kind === 'friends' ? 10 : 0)));
  const n = Math.min(10, maxSum);
  const head = [h('th', {}, '+'), ...Array.from({ length: n + 1 }, (_, b) => h('th', {}, b))];
  const rows = Array.from({ length: n + 1 }, (_, a) => h('tr', {},
    h('th', {}, a),
    Array.from({ length: n + 1 }, (_, b) => {
      if (a + b > n) return h('td', { class: 'out' });
      if (a === 0 && b === 0) return h('td', { class: 'out' }, '·');
      const k = keyOf(a, b);
      if (isMastered(k)) return h('td', { class: 'known', title: `${a} + ${b} = ${a + b}` }, a + b);
      if (act.missed[k]) return h('td', { class: 'missed', title: 'À retravailler' }, '?');
      if (act.facts?.[k]?.seen) return h('td', { class: 'learning', title: 'En cours' }, '✨');
      return h('td', { class: 'unseen' }, '?');
    })));
  return h('div', { class: 'grimoire-table-wrap' },
    h('table', { class: 'grimoire-table' }, h('thead', {}, h('tr', {}, head)), h('tbody', {}, rows)),
    h('p', { class: 'legend' },
      h('span', { class: 'lg known' }, '7'), ' je le sais ',
      h('span', { class: 'lg learning' }, '✨'), ' en cours ',
      h('span', { class: 'lg missed' }, '?'), ' à retravailler ',
      h('span', { class: 'lg unseen' }, '?'), ' pas encore vu'));
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
  levelFacts,
  diagnose,
  speak,
  renderQuestion,
  renderHint,
  renderHelp,
  renderGrimoire,
};
