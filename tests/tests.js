// Tests des fonctions pures. Ils tournent dans le navigateur (tests/index.html)
// ou avec Node : `node tests/tests.js`.

import addition, { buildPool, keyOf, diagnose, levelFacts } from '../js/activities/addition.js';
import { digitFromKeyEvent } from '../js/screens/exercise.js';
import mystery, { toMystery } from '../js/activities/mystery.js';
import problems, { STORIES } from '../js/activities/problems.js';
import { ACTIVITIES } from '../js/activities/registry.js';
import { voiceScore } from '../js/sound.js';
import { hatsFor, starsFor, rankInfo, applyExerciseResult, applySpin, applyAbandon, applyChoice, isMastered, levelMastery, levelProgress, dailyLimitReached, recommendedActivity } from '../js/rewards.js';
import { defaultState, migrate, activityState, maxPlayableLevel, SCHEMA_VERSION } from '../js/store.js';
import { makeSeededRng, weightedPick } from '../js/rng.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function assert(cond, msg = 'assertion échouée') { if (!cond) throw new Error(msg); }
const eq = (a, b, msg) => assert(a === b, `${msg ?? ''} attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`);

// ---- Additions ----

const levelChecks = {
  sum: (q, p) => q.answer <= p.max && q.answer >= (p.min ?? 0) && q.a <= (p.maxTerm ?? 99) && q.b <= (p.maxTerm ?? 99),
  friends: (q) => q.answer === 10 || q.a === q.b,
  two: (q, p) => q.answer <= 99 && ((q.a % 10) + (q.b % 10) >= 10) === p.carry && q.a >= 10,
};

test('chaque niveau génère des questions dans ses bornes', () => {
  const rng = makeSeededRng(42);
  for (const lvl of addition.levels) {
    for (let run = 0; run < 40; run++) {
      const qs = addition.generate(lvl.params, { rng, count: 10 });
      eq(qs.length, 10, `niveau ${lvl.id} :`);
      for (const q of qs) {
        assert(levelChecks[lvl.params.kind](q, lvl.params), `niveau ${lvl.id} hors bornes : ${q.prompt} = ${q.answer}`);
        eq(q.answer, q.a + q.b);
        assert(!(q.a === 0 && q.b === 0), '0 + 0 interdit');
      }
    }
  }
});

test('niveau « jusqu’à 7 » : jamais de résultat > 7', () => {
  const rng = makeSeededRng(7);
  for (let run = 0; run < 200; run++) {
    for (const q of addition.generate(addition.levels[1].params, { rng })) assert(q.answer <= 7, q.prompt);
  }
});

test('pas de doublon quand le niveau offre assez de calculs', () => {
  const rng = makeSeededRng(3);
  for (const lvl of addition.levels.slice(2)) {
    for (let run = 0; run < 30; run++) {
      const keys = addition.generate(lvl.params, { rng }).map((q) => q.key);
      eq(new Set(keys).size, keys.length, `doublon au niveau ${lvl.id} : ${keys}`);
    }
  }
});

test('« + 0 » limité et pas deux fois le même calcul d’affilée', () => {
  const rng = makeSeededRng(5);
  for (const lvl of addition.levels.slice(0, 3)) {
    for (let run = 0; run < 50; run++) {
      const qs = addition.generate(lvl.params, { rng });
      const zeros = qs.filter((q) => q.a === 0 || q.b === 0).length;
      assert(zeros <= 2, `trop de zéros au niveau ${lvl.id}`);
      for (let i = 1; i < qs.length; i++) assert(qs[i].key !== qs[i - 1].key, `répétition d’affilée ${qs[i].key}`);
    }
  }
});

test('les calculs ratés reviennent en priorité', () => {
  const rng = makeSeededRng(11);
  for (let run = 0; run < 50; run++) {
    const keys = addition.generate(addition.levels[1].params, { rng, missed: { '3+4': 3 } }).map((q) => q.key);
    assert(keys.includes('3+4'), 'le calcul raté 3+4 devrait être proposé');
  }
});

test('keyOf ne dépend pas de l’ordre', () => {
  eq(keyOf(4, 3), '3+4');
  eq(keyOf(3, 4), '3+4');
});

test('retenue : le pool du niveau 9 ne contient que des retenues', () => {
  assert(buildPool(addition.levels[9].params).every(([a, b]) => (a % 10) + (b % 10) >= 10));
  assert(buildPool(addition.levels[7].params).every(([a, b]) => (a % 10) + b <= 9 && b <= 9));
});

test('niveau « passer la dizaine » : termes ≤ 9, résultat entre 11 et 18', () => {
  const pool = buildPool(addition.levels[4].params);
  assert(pool.length > 0);
  assert(pool.every(([a, b]) => a <= 9 && b <= 9 && a + b >= 11 && a + b <= 18));
  eq(levelFacts(addition.levels[4].params).length, 20);
});

test('levelFacts : calculs uniques par niveau, null pour les grands nombres', () => {
  eq(levelFacts(addition.levels[1].params).length, 19);
  eq(levelFacts(addition.levels[8].params), null);
});

test('génération : priorité aux calculs pas encore sus, avec des révisions', () => {
  const rng = makeSeededRng(21);
  const keys = levelFacts(addition.levels[2].params);
  const notKnown = new Set(keys.filter((k) => !hasZeroKey(k)).slice(0, 5));
  for (let run = 0; run < 30; run++) {
    const got = addition.generate(addition.levels[2].params, { rng, isMastered: (k) => !notKnown.has(k) }).map((q) => q.key);
    for (const k of notKnown) assert(got.includes(k), `${k} (pas su) devrait être proposé`);
    assert(got.filter((k) => !notKnown.has(k)).length >= 2, 'au moins 2 révisions');
  }
});

test('check accepte la bonne réponse uniquement', () => {
  const q = { a: 3, b: 4, answer: 7 };
  assert(addition.check(q, '7'));
  assert(!addition.check(q, '8'));
  assert(!addition.check(q, ''));
});

test('messages ciblés : nombre de départ recompté, pas de trop, chiffres inversés', () => {
  assert(diagnose({ a: 6, b: 2, answer: 8 }, '7').includes('pars de 6'), 'oubli du surcomptage');
  assert(diagnose({ a: 6, b: 2, answer: 8 }, '9').includes('pas de trop'));
  assert(diagnose({ a: 9, b: 4, answer: 13 }, '31').includes('désordre'));
  eq(diagnose({ a: 6, b: 2, answer: 8 }, '3'), null);
  eq(diagnose({ a: 34, b: 5, answer: 39 }, '38'), 'Tout près ! Vérifie bien les unités.');
});

test('clavier : rangée AZERTY sans Maj et pavé numérique', () => {
  eq(digitFromKeyEvent({ code: 'Digit7', key: 'è' }), '7');
  eq(digitFromKeyEvent({ code: 'Digit0', key: 'à' }), '0');
  eq(digitFromKeyEvent({ code: 'Numpad3', key: 'PageDown' }), '3');
  eq(digitFromKeyEvent({ code: '', key: '5' }), '5');
  eq(digitFromKeyEvent({ code: 'KeyA', key: 'a' }), null);
});

const hasZeroKey = (k) => k.startsWith('0+');

test('potions mystères : a + ? = s cohérent et dans les bornes', () => {
  const rng = makeSeededRng(8);
  for (const lvl of mystery.levels) {
    for (let run = 0; run < 30; run++) {
      for (const q of mystery.generate(lvl.params, { rng })) {
        eq(q.known + q.answer, q.sum, q.prompt);
        assert(q.sum <= lvl.params.max && q.sum >= (lvl.params.min ?? 0), `hors bornes ${q.prompt}`);
        assert(q.prompt.includes('?'), q.prompt);
        assert(mystery.check(q, String(q.answer)));
      }
    }
  }
  const q = toMystery({ a: 3, b: 4, answer: 7, key: '3+4' }, () => 0.9);
  eq(q.prompt, '3 + ? = 7'); eq(q.answer, 4);
  assert(mystery.diagnose(q, '7').includes('résultat'));
  assert(mystery.diagnose(q, '10').includes('additionné'));
});

test('énigmes : énoncés accordés au singulier et au pluriel', () => {
  for (const st of STORIES) {
    const one = st.text(1, 1);
    assert(!/\b1 \S+s\b/.test(one), `pluriel avec 1 : ${one}`);
    assert(st.text(3, 2).includes('3') && st.text(3, 2).includes('2'));
  }
  eq(STORIES[0].text(1, 2).startsWith('Le chat a 1 poisson.'), true);
  const rng = makeSeededRng(4);
  for (const lvl of problems.levels) {
    for (const q of problems.generate(lvl.params, { rng })) {
      assert(q.a >= 1 && q.b >= 1, 'pas de 0 dans une histoire');
      assert(q.answer <= lvl.params.max, q.prompt);
      assert(typeof q.text === 'string' && q.text.length > 20);
    }
  }
});

test('registre : identifiants uniques et contrat minimal respecté', () => {
  const ids = ACTIVITIES.map((a) => a.id);
  eq(new Set(ids).size, ids.length);
  for (const a of ACTIVITIES) {
    assert(typeof a.generate === 'function' && typeof a.check === 'function' && typeof a.renderHelp === 'function', a.id);
    a.levels.forEach((l, i) => eq(l.id, i + 1, `${a.id} : niveaux numérotés 1, 2, 3…`));
  }
});

// ---- Récompenses ----

test('étoiles et chapeaux', () => {
  eq(starsFor(1), 1); eq(starsFor(2), 0.5);
  eq(hatsFor(10, 10), 3);
  eq(hatsFor(9.5, 10), 2);
  eq(hatsFor(8, 10), 2);
  eq(hatsFor(7.5, 10), 1);
  eq(hatsFor(6, 10), 1);
  eq(hatsFor(5.5, 10), 0);
});

test('rangs', () => {
  eq(rankInfo(0).rank.name, 'Chaton apprenti');
  eq(rankInfo(30).rank.name, 'Apprenti sorcier');
  assert(rankInfo(15).progress === 0.5);
});

const answers = (n, firstTry = true) => Array.from({ length: n }, (_, i) => ({ key: `0+${i}`, firstTry }));

test('10 exercices réussis = 1 gemme ; un échec ne compte pas', () => {
  let s = defaultState();
  for (let i = 0; i < 9; i++) s = applyExerciseResult(s, { level: 1, stars: 8, total: 10, answers: [] }, addition).state;
  eq(s.wallet.gems, 0);
  s = applyExerciseResult(s, { level: 1, stars: 3, total: 10, answers: [] }, addition).state; // raté
  eq(s.wallet.successSinceLastGem, 9);
  const r = applyExerciseResult(s, { level: 1, stars: 6, total: 10, answers: [] }, addition);
  assert(r.events.gemEarned);
  eq(r.state.wallet.gems, 1);
  eq(r.state.wallet.successSinceLastGem, 0);
});

test('3 sans-fautes débloquent le niveau suivant, jamais au-delà du plafond', () => {
  let s = defaultState();
  activityState(s, addition).ceiling = 2;
  let last;
  for (let i = 0; i < 3; i++) { last = applyExerciseResult(s, { level: 1, stars: 10, total: 10, answers: answers(10) }, addition); s = last.state; }
  eq(last.events.levelUnlocked?.id, 2);
  eq(s.activities.addition.unlocked, 2);
  for (let i = 0; i < 5; i++) s = applyExerciseResult(s, { level: 2, stars: 10, total: 10, answers: [] }, addition).state;
  eq(s.activities.addition.unlocked, 2, 'plafond dépassé');
  eq(maxPlayableLevel(s.activities.addition, addition), 2);
  // Le parent relève le plafond : le prochain sans-faute débloque.
  s.activities.addition.ceiling = 4;
  s = applyExerciseResult(s, { level: 2, stars: 10, total: 10, answers: [] }, addition).state;
  eq(s.activities.addition.unlocked, 3);
});

test('les calculs ratés sont mémorisés puis oubliés', () => {
  let s = defaultState();
  s = applyExerciseResult(s, { level: 1, stars: 9, total: 10, answers: [{ key: '2+3', firstTry: false }] }, addition).state;
  eq(s.activities.addition.missed['2+3'], 1);
  s = applyExerciseResult(s, { level: 1, stars: 10, total: 10, answers: [{ key: '2+3', firstTry: true }] }, addition).state;
  eq(s.activities.addition.missed['2+3'], undefined);
});

test('familiers débloqués', () => {
  const r = applyExerciseResult(defaultState(), { level: 1, stars: 10, total: 10, answers: [] }, addition);
  const ids = r.events.newFamiliars.map((f) => f.id);
  assert(ids.includes('pompon') && ids.includes('moustache'), ids.join(','));
});

test('l’état d’origine n’est pas modifié', () => {
  const s = defaultState();
  applyExerciseResult(s, { level: 1, stars: 10, total: 10, answers: [] }, addition);
  eq(s.stats.exercisesDone, 0);
});

test('abandon : étoiles gardées, sans compter pour les gemmes ni les niveaux', () => {
  const s = defaultState();
  const r = applyAbandon(s, { stars: 4.5, answers: [{ key: '2+3', firstTry: false }] }, addition);
  eq(r.state.wallet.totalStars, 4.5);
  eq(r.state.stats.exercisesDone, 0);
  eq(r.state.wallet.successSinceLastGem, 0);
  eq(r.state.activities.addition.missed['2+3'], 1);
});

test('maîtrise : série de réussites, remise à zéro en cas d’erreur', () => {
  let s = defaultState();
  const ok = { level: 1, stars: 10, total: 10, answers: [{ key: '2+3', firstTry: true }] };
  s = applyExerciseResult(s, ok, addition).state;
  s = applyExerciseResult(s, ok, addition).state;
  assert(!isMastered(s.activities.addition, '2+3'));
  s = applyExerciseResult(s, ok, addition).state;
  assert(isMastered(s.activities.addition, '2+3'));
  s = applyExerciseResult(s, { ...ok, answers: [{ key: '2+3', firstTry: false }] }, addition).state;
  assert(!isMastered(s.activities.addition, '2+3'));
});

test('déblocage par maîtrise : 80 % des calculs sus suffisent, même sans sans-faute', () => {
  const s = defaultState();
  const act = activityState(s, addition);
  const keys = levelFacts(addition.levels[0].params);
  const enough = Math.ceil(keys.length * 0.8);
  keys.slice(0, enough - 1).forEach((k) => { act.facts[k] = { streak: 3, seen: 3 }; });
  let r = applyExerciseResult(s, { level: 1, stars: 6, total: 10, answers: [] }, addition);
  eq(r.state.activities.addition.unlocked, 1, 'pas encore assez');
  eq(levelMastery(r.state.activities.addition, addition, 1).needed, 1);
  r.state.activities.addition.facts[keys[enough - 1]] = { streak: 3, seen: 3 };
  r = applyExerciseResult(r.state, { level: 1, stars: 6, total: 10, answers: [] }, addition);
  eq(r.state.activities.addition.unlocked, 2);
  eq(r.events.levelUnlocked.id, 2);
});

test('anti-frustration : 2 exercices difficiles proposent le niveau d’avant', () => {
  let s = defaultState();
  activityState(s, addition).unlocked = 3;
  activityState(s, addition).ceiling = 3;
  const hard = { level: 3, stars: 2, total: 10, answers: [] };
  let r = applyExerciseResult(s, hard, addition);
  eq(r.events.suggestEasier, null);
  r = applyExerciseResult(r.state, hard, addition);
  eq(r.events.suggestEasier?.id, 2);
  r = applyExerciseResult(r.state, { ...hard, stars: 8 }, addition);
  eq(r.events.suggestEasier, null, 'remis à zéro après un bon exercice');
  eq(applyExerciseResult(defaultState(), { level: 1, stars: 0, total: 10 }, addition).events.suggestEasier, null);
});

test('rythme : pause suggérée tous les N exercices, limite du jour', () => {
  let s = defaultState();
  s.settings.dailyPauseHint = 2;
  s.settings.dailyLimit = 3;
  const ex = { level: 1, stars: 8, total: 10, answers: [] };
  let r = applyExerciseResult(s, ex, addition);
  assert(!r.events.pauseHint && !r.events.limitReached);
  r = applyExerciseResult(r.state, ex, addition);
  assert(r.events.pauseHint, 'pause au 2e exercice');
  r = applyExerciseResult(r.state, ex, addition);
  assert(r.events.limitReached && dailyLimitReached(r.state));
  assert(!dailyLimitReached(r.state, new Date(Date.now() + 86400000)), 'la limite repart le lendemain');
});

// ---- Roue ----

test('tirage pondéré : respecte les poids, ignore les poids nuls', () => {
  const rng = makeSeededRng(1);
  const items = [{ weight: 1 }, { weight: 3 }, { weight: 0 }];
  const counts = [0, 0, 0];
  for (let i = 0; i < 20000; i++) counts[weightedPick(rng, items)]++;
  eq(counts[2], 0);
  const ratio = counts[1] / counts[0];
  assert(ratio > 2.7 && ratio < 3.3, `ratio ${ratio}`);
});

test('roue : coûte des gemmes, refuse sans gemme, relance rembourse', () => {
  const s = defaultState();
  eq(applySpin(s), null);
  s.wallet.gems = 1;
  s.prizes = [{ emoji: '📺', label: 'Télé', weight: 1 }];
  const r = applySpin(s);
  eq(r.state.wallet.gems, 0);
  eq(r.state.wheelHistory[0].label, 'Télé');
  s.prizes = [{ emoji: '🔮', label: 'Relance', weight: 1, respin: true }];
  eq(applySpin(s).state.wallet.gems, 1);
});

test('choisir sa récompense : coûte gemsToChoose, refuse la relance et le manque de gemmes', () => {
  const s = defaultState();
  s.prizes = [{ emoji: '📺', label: 'Télé', weight: 1 }, { emoji: '🔮', label: 'Relance', weight: 1, respin: true }];
  s.wallet.gems = 2;
  eq(applyChoice(s, 0), null, 'pas assez de gemmes');
  s.wallet.gems = 3;
  eq(applyChoice(s, 1), null, 'la relance ne se choisit pas');
  const r = applyChoice(s, 0);
  eq(r.state.wallet.gems, 0);
  eq(r.state.wheelHistory[0].label, 'Télé');
  assert(r.state.wheelHistory[0].chosen);
  s.settings.gemsToChoose = 0;
  eq(applyChoice(s, 0), null, 'désactivé');
});

test('fiole de niveau : meilleure des deux voies, plafonnée à 1', () => {
  const s = defaultState();
  const act = activityState(s, addition);
  eq(levelProgress(act, addition, 1, s.settings), 0);
  act.perfects[1] = 1;
  assert(Math.abs(levelProgress(act, addition, 1, s.settings) - 1 / 3) < 1e-9);
  for (const k of levelFacts(addition.levels[0].params)) act.facts[k] = { streak: 3, seen: 3 };
  eq(levelProgress(act, addition, 1, s.settings), 1);
});

test('bouton Jouer : dernière activité jouée, sinon la première', () => {
  const other = { id: 'autre' };
  const s = defaultState();
  eq(recommendedActivity(s, [addition, other]).id, 'addition');
  s.history.push({ activity: 'autre', level: 1 });
  eq(recommendedActivity(s, [addition, other]).id, 'autre');
  s.history.push({ activity: 'disparue', level: 1 });
  eq(recommendedActivity(s, [addition, other]).id, 'autre');
});

test('voix : les voix naturelles passent avant les voix système', () => {
  const natural = { name: 'Microsoft Denise Online (Natural) - French (France)', lang: 'fr-FR', localService: false };
  const google = { name: 'Google français', lang: 'fr-FR', localService: false };
  const robot = { name: 'Microsoft Hortense - French (France)', lang: 'fr-FR', localService: true };
  const list = [robot, google, natural].sort((a, b) => voiceScore(b) - voiceScore(a));
  eq(list.map((v) => v.name.split(' ')[1]).join(','), 'Denise,français,Hortense');
});

// ---- Sauvegarde ----

test('migration : état vide, état partiel, version future', () => {
  eq(migrate(null).version, SCHEMA_VERSION);
  const partial = migrate({ version: 1, wallet: { gems: 4 } });
  eq(partial.wallet.gems, 4);
  eq(partial.wallet.totalStars, 0);
  eq(partial.settings.exercisesPerGem, 10);
  eq(migrate({ version: 2, profile: { name: 'X' } }).profile.cat.name, 'Moustache');
  let threw = false;
  try { migrate({ version: SCHEMA_VERSION + 1 }); } catch { threw = true; }
  assert(threw, 'une version future doit être refusée');
});

test('migration v1 → v2 : les niveaux d’addition ≥ 5 sont décalés', () => {
  const s = migrate({
    version: 1,
    activities: { addition: { unlocked: 6, ceiling: 9, perfects: { 2: 1, 5: 2 }, missed: {} } },
    history: [{ activity: 'addition', level: 7 }, { activity: 'addition', level: 3 }],
  });
  eq(s.activities.addition.unlocked, 7);
  eq(s.activities.addition.ceiling, 10);
  eq(s.activities.addition.perfects[6], 2);
  eq(s.activities.addition.perfects[2], 1);
  eq(s.history[0].level, 8);
  eq(s.history[1].level, 3);
  const young = migrate({ version: 1, activities: { addition: { unlocked: 2, ceiling: 2, perfects: {}, missed: {} } } });
  eq(young.activities.addition.ceiling, 2);
});

// ---- Lancement ----

export function runAll() {
  return tests.map(({ name, fn }) => {
    try { fn(); return { name, ok: true }; } catch (e) { return { name, ok: false, error: e.message }; }
  });
}

if (typeof document === 'undefined') {
  const results = runAll();
  for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.ok ? '' : ` — ${r.error}`}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} tests OK`);
  if (failed) globalThis.process?.exit(1);
}
