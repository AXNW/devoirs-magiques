// Activité « Énigmes du grimoire » : petits problèmes illustrés (additions).
// Le bouton 🔊 lit l'énoncé, utile pour un lecteur débutant.

import { h } from '../ui/dom.js';
import { generate as generateAdditions, levelFacts, tenFrames } from './addition.js';

const LEVELS = [
  { id: 1, label: 'Jusqu’à 5',  params: { kind: 'sum', min: 2, max: 5 } },
  { id: 2, label: 'Jusqu’à 7',  params: { kind: 'sum', min: 3, max: 7 } },
  { id: 3, label: 'Jusqu’à 10', params: { kind: 'sum', min: 4, max: 10 } },
  { id: 4, label: 'Jusqu’à 20', params: { kind: 'sum', min: 11, max: 20, maxTerm: 10 } },
];

const pl = (n, one, many) => `${n} ${n > 1 ? many : one}`;

// Chaque énoncé : texte, emojis des deux groupes et unité de la réponse.
export const STORIES = [
  {
    text: (a, b) => `Le chat a ${pl(a, 'poisson', 'poissons')}. Il en pêche encore ${b}. Combien de poissons a-t-il en tout ?`,
    first: '🐟', second: '🐟', unit: 'poissons',
  },
  {
    text: (a, b) => `Dans le chaudron, il y a ${pl(a, 'étoile', 'étoiles')}. On en ajoute ${b}. Combien d’étoiles y a-t-il maintenant ?`,
    first: '⭐', second: '⭐', unit: 'étoiles',
  },
  {
    text: (a, b) => `${pl(a, 'balai vole', 'balais volent')} dans le ciel. ${pl(b, 'autre balai arrive', 'autres balais arrivent')}. Combien de balais volent en tout ?`,
    first: '🧹', second: '🧹', unit: 'balais',
  },
  {
    text: (a, b) => `Sur la branche, il y a ${pl(a, 'hibou', 'hiboux')}. ${pl(b, 'hibou vient', 'hiboux viennent')} les rejoindre. Combien de hiboux y a-t-il sur la branche ?`,
    first: '🦉', second: '🦉', unit: 'hiboux',
  },
  {
    text: (a, b) => `Tu as ${pl(a, 'bonbon magique', 'bonbons magiques')}. Ton ami t’en donne ${b}. Combien de bonbons as-tu maintenant ?`,
    first: '🍬', second: '🍬', unit: 'bonbons',
  },
  {
    text: (a, b) => `Sur l’étagère, il y a ${pl(a, 'potion bleue', 'potions bleues')} et ${pl(b, 'potion rose', 'potions roses')}. Combien de potions y a-t-il en tout ?`,
    first: '🧪', second: '⚗️', unit: 'potions',
  },
  {
    text: (a, b) => `Dans le jardin, il y a ${pl(a, 'citrouille', 'citrouilles')}. Il en pousse ${b} de plus. Combien de citrouilles y a-t-il maintenant ?`,
    first: '🎃', second: '🎃', unit: 'citrouilles',
  },
];

export function generate(params, opts = {}) {
  const rng = opts.rng ?? Math.random;
  let last = -1;
  return generateAdditions(params, opts).map((q) => {
    let i = Math.floor(rng() * STORIES.length);
    if (i === last) i = (i + 1) % STORIES.length; // varier les histoires
    last = i;
    const story = STORIES[i];
    return { ...q, story: i, text: story.text(q.a, q.b), prompt: `${q.a} + ${q.b}` };
  });
}

export function check(q, input) {
  return input !== '' && Number(input) === q.answer;
}

// Les objets en petits paquets de 5 pour qu'ils soient faciles à compter.
function picture(n, emoji, cls) {
  const groups = [];
  for (let i = 0; i < n; i += 5) groups.push(h('span', { class: 'pic-group' }, emoji.repeat(Math.min(5, n - i))));
  return h('span', { class: `pic ${cls}` }, groups);
}

export function renderQuestion(q, answerEl) {
  const story = STORIES[q.story];
  return h('div', { class: 'problem' },
    h('p', { class: 'problem-text' }, q.text),
    h('div', { class: 'problem-picture', 'aria-hidden': 'true' },
      picture(q.a, story.first, 'first'), h('span', { class: 'pic-plus' }, '+'), picture(q.b, story.second, 'second')),
    h('div', { class: 'problem-answer' }, 'Réponse : ', answerEl, ` ${story.unit}`));
}

export function speak(q) {
  return q.text;
}

export function diagnose(q, input) {
  const n = Number(input);
  if (n === q.a || n === q.b) return 'Attention, ça c’est un seul des deux groupes ! On veut savoir combien il y en a en tout.';
  if (Math.abs(n - q.answer) === 1) return 'Tout près ! Recompte doucement les images.';
  return null;
}

export function renderHint(q) {
  return h('div', { class: 'hint' },
    h('p', {}, `Astuce : « en tout », « de plus », « maintenant »… on ajoute ! Le calcul, c’est ${q.a} + ${q.b}.`));
}

export function renderHelp(q) {
  return h('div', { class: 'help help-count' },
    h('p', {}, `On ajoute les deux groupes : ${q.a} + ${q.b}`),
    tenFrames([{ n: q.a, cls: 'a' }, { n: q.b, cls: 'b' }]),
    h('p', { class: 'help-result' }, `${q.a} + ${q.b} = `, h('strong', { class: 'help-answer' }, q.answer), ` ${STORIES[q.story].unit}`));
}

export default {
  id: 'enigmes',
  title: 'Énigmes du grimoire',
  subtitle: 'De petites histoires à résoudre',
  icon: '📜',
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
};
