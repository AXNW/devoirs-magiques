// Activité « Potions mystères » : le terme manquant (3 + ? = 7).
// Elle prépare la soustraction. Elle réutilise les calculs de l'addition.

import { h } from '../ui/dom.js';
import { generate as generateAdditions, levelFacts, tenFrames, numberLine, renderGrimoire } from './addition.js';

const LEVELS = [
  { id: 1, label: 'Jusqu’à 5',       params: { kind: 'sum', max: 5 } },
  { id: 2, label: 'Jusqu’à 7',       params: { kind: 'sum', max: 7 } },
  { id: 3, label: 'Jusqu’à 10',      params: { kind: 'sum', max: 10 } },
  { id: 4, label: 'Les amis de 10',  params: { kind: 'sum', min: 10, max: 10 } },
  { id: 5, label: 'Jusqu’à 20',      params: { kind: 'sum', min: 11, max: 20, maxTerm: 10 } },
];

// Transforme a + b en « a + ? = s » ou « ? + b = s ».
export function toMystery(q, rng = Math.random) {
  const hideFirst = rng() < 0.3; // le plus souvent, c'est le 2e terme qui manque
  const known = hideFirst ? q.b : q.a;
  const answer = hideFirst ? q.a : q.b;
  return {
    ...q,
    hideFirst,
    known,
    sum: q.a + q.b,
    answer,
    prompt: hideFirst ? `? + ${q.b} = ${q.a + q.b}` : `${q.a} + ? = ${q.a + q.b}`,
  };
}

export function generate(params, opts = {}) {
  const rng = opts.rng ?? Math.random;
  return generateAdditions(params, opts).map((q) => toMystery(q, rng));
}

export function check(q, input) {
  return input !== '' && Number(input) === q.answer;
}

export function renderQuestion(q, answerEl) {
  const part = (x) => h('span', { class: 'q-prompt' }, x);
  return h('div', { class: 'mystery-line' },
    q.hideFirst ? answerEl : part(q.a),
    h('span', { class: 'q-eq' }, '+'),
    q.hideFirst ? part(q.b) : answerEl,
    h('span', { class: 'q-eq' }, '='),
    part(q.sum));
}

export function speak(q) {
  return q.hideFirst ? `Combien plus ${q.b} égale ${q.sum} ?` : `${q.a} plus combien égale ${q.sum} ?`;
}

export function diagnose(q, input) {
  const n = Number(input);
  if (n === q.sum) return `${q.sum}, c’est le résultat ! On cherche ce qu’il faut ajouter à ${q.known} pour arriver à ${q.sum}.`;
  if (n === q.known + q.sum) return `Tu as additionné ${q.known} et ${q.sum}. On cherche plutôt combien il manque pour aller de ${q.known} à ${q.sum}.`;
  if (Math.abs(n - q.answer) === 1) return `Tout près ! Compte bien les bonds de ${q.known} jusqu’à ${q.sum}.`;
  return null;
}

export function renderHint(q) {
  if (q.answer === 0) return h('div', { class: 'hint' }, h('p', {}, `Astuce : on est déjà à ${q.sum}… faut-il encore ajouter quelque chose ?`));
  return h('div', { class: 'hint' },
    h('p', {}, `Astuce : pars de ${q.known} et avance jusqu’au drapeau ${q.sum}. Combien de bonds fais-tu ?`),
    numberLine(q.known, q.answer, { flag: true }));
}

export function renderHelp(q) {
  return h('div', { class: 'help help-count' },
    h('p', {}, `${q.known} jetons violets… et il manque ${q.answer} jetons dorés pour arriver à ${q.sum} :`),
    tenFrames([{ n: q.known, cls: 'a' }, { n: q.answer, cls: 'b' }]),
    h('p', { class: 'help-result' }, `${q.hideFirst ? q.answer : q.known} + ${q.hideFirst ? q.known : q.answer} = ${q.sum}, il manquait `,
      h('strong', { class: 'help-answer' }, q.answer)));
}

export default {
  id: 'mystere',
  title: 'Potions mystères',
  subtitle: 'Trouve l’ingrédient qui manque : 3 + ? = 7',
  icon: '🔮',
  levels: LEVELS,
  defaultCeiling: 2,
  maxInputLength: 2,
  generate,
  check,
  levelFacts,
  renderQuestion,
  speak,
  diagnose,
  renderHint,
  renderHelp,
  renderGrimoire,
};
