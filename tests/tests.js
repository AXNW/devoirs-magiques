// Tests des fonctions pures. Ils tournent dans le navigateur (tests/index.html)
// ou avec Node : `node tests/tests.js`.

import addition, { buildPool, keyOf } from '../js/activities/addition.js';
import { hatsFor, starsFor, rankInfo, applyExerciseResult, applySpin } from '../js/rewards.js';
import { defaultState, migrate, activityState, maxPlayableLevel, SCHEMA_VERSION } from '../js/store.js';
import { makeSeededRng, weightedPick } from '../js/rng.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function assert(cond, msg = 'assertion échouée') { if (!cond) throw new Error(msg); }
const eq = (a, b, msg) => assert(a === b, `${msg ?? ''} attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`);

// ---- Additions ----

const levelChecks = {
  sum: (q, p) => q.answer <= p.max && q.answer >= (p.min ?? 0),
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
  assert(buildPool(addition.levels[8].params).every(([a, b]) => (a % 10) + (b % 10) >= 10));
  assert(buildPool(addition.levels[6].params).every(([a, b]) => (a % 10) + b <= 9 && b <= 9));
});

test('check accepte la bonne réponse uniquement', () => {
  const q = { a: 3, b: 4, answer: 7 };
  assert(addition.check(q, '7'));
  assert(!addition.check(q, '8'));
  assert(!addition.check(q, ''));
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

// ---- Sauvegarde ----

test('migration : état vide, état partiel, version future', () => {
  eq(migrate(null).version, SCHEMA_VERSION);
  const partial = migrate({ version: 1, wallet: { gems: 4 } });
  eq(partial.wallet.gems, 4);
  eq(partial.wallet.totalStars, 0);
  eq(partial.settings.exercisesPerGem, 10);
  let threw = false;
  try { migrate({ version: SCHEMA_VERSION + 1 }); } catch { threw = true; }
  assert(threw, 'une version future doit être refusée');
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
