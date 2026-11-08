// Moteur d'exercice GÉNÉRIQUE : il fonctionne avec n'importe quelle activité
// qui respecte le contrat (generate / check / renderHelp, et en option diagnose / speak).

import { h, clear, showModal, pick, toast } from '../ui/dom.js';
import { createTalkingMascot } from '../ui/mascot.js';
import { createProgress } from '../ui/progress.js';
import { createNumpad } from '../ui/numpad.js';
import { sparkle } from '../ui/confetti.js';
import { getState, setState, activityState, maxPlayableLevel } from '../store.js';
import { applyExerciseResult, applyAbandon, starsFor, rankInfo } from '../rewards.js';
import { getActivity } from '../activities/registry.js';
import { play, speak, canSpeak, stopSpeaking } from '../sound.js';

// Féliciter l'effort et la méthode plutôt qu'un « talent ».
const PRAISE = [
  'Miaou-gique !',
  'Bravo, tu as bien compté !',
  'Abracadabra, c’est juste !',
  'Bien joué !',
  'Ronron de fierté !',
  'Tu as pris ton temps, bravo !',
  'Ça, c’est de l’entraînement !',
];
const RETRY = ['Presque ! Essaie encore 💪', 'Pas tout à fait. Recompte doucement !', 'Oups, la potion a fait pschitt… Réessaie !'];

// Touche physique → chiffre. Fonctionne en AZERTY sans Maj (rangée du haut)
// et sur le pavé numérique.
export function digitFromKeyEvent(e) {
  const m = /^(?:Digit|Numpad)([0-9])$/.exec(e.code || '');
  if (m) return m[1];
  return /^[0-9]$/.test(e.key) ? e.key : null;
}

export function render(root, ctx) {
  const [activityId, levelParam] = ctx.params;
  const activity = getActivity(activityId);
  if (!activity) { ctx.navigate('#/accueil'); return null; }

  const state = getState();
  const act = state.activities[activity.id] ?? activityState(structuredClone(state), activity);
  const maxLevel = maxPlayableLevel(act, activity);
  const level = Math.min(Math.max(parseInt(levelParam, 10) || maxLevel, 1), maxLevel);
  const levelDef = activity.levels[level - 1];
  const count = state.settings.questionsPerExercise;
  const questions = activity.generate(levelDef.params, { count, missed: act.missed });

  let index = 0;
  let input = '';
  let attempt = 1;
  let stars = 0;
  let combo = 0;
  let mode = 'answer'; // answer | retype | wait | done
  const answers = [];
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  // ---- Interface ----
  const progress = createProgress(count);
  const talk = createTalkingMascot({ size: 110, hatColor: rankInfo(state.wallet.totalStars).rank.hat });
  const promptEl = h('span', { class: 'q-prompt' });
  const answerEl = h('span', { class: 'q-answer', 'aria-live': 'polite' });
  const listenBtn = canSpeak()
    ? h('button', {
      class: 'speak-btn q-speak', type: 'button', 'aria-label': 'Écouter le calcul',
      onClick: (e) => { e.currentTarget.blur(); const q = questions[index]; speak(activity.speak?.(q) ?? q.prompt); },
    }, '🔊')
    : null;
  const questionEl = h('div', { class: 'question' }, promptEl, h('span', { class: 'q-eq' }, '='), answerEl);
  const feedbackEl = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const helpEl = h('div', { class: 'help-zone' });
  const numpad = createNumpad({ onDigit: addDigit, onDelete: removeDigit, onSubmit: submit });

  const topBar = h('div', { class: 'topbar' },
    h('button', { class: 'icon-btn', 'aria-label': 'Retour à l’accueil', onClick: askQuit }, '🏠'),
    h('div', { class: 'topbar-title' }, `${activity.icon} ${activity.title} · Niveau ${level}`),
    h('div', { class: 'topbar-count' }),
  );

  root.append(
    topBar,
    progress.el,
    h('div', { class: 'exercise' },
      h('div', { class: 'exercise-left' }, talk.el),
      h('div', { class: 'exercise-main card' }, listenBtn, questionEl, feedbackEl, helpEl),
      h('div', { class: 'exercise-pad' }, numpad),
    ),
  );

  function showQuestion() {
    const q = questions[index];
    promptEl.textContent = q.prompt;
    input = '';
    attempt = 1;
    mode = 'answer';
    clear(helpEl);
    feedbackEl.textContent = '';
    feedbackEl.className = 'feedback';
    questionEl.classList.remove('correct', 'retype');
    progress.current(index);
    topBar.querySelector('.topbar-count').textContent = `${index + 1} / ${count}`;
    renderInput();
    if (index === 0) talk.say('Écris le résultat, puis appuie sur Entrée ✔');
  }

  function renderInput() {
    answerEl.textContent = input || '?';
    answerEl.classList.toggle('empty', !input);
  }

  function addDigit(d) {
    if (mode === 'wait' || mode === 'done') return;
    if (input.length >= (activity.maxInputLength || 3)) return;
    input = input === '0' ? d : input + d;
    play('click');
    renderInput();
  }

  function removeDigit() {
    if (mode === 'wait' || mode === 'done') return;
    input = input.slice(0, -1);
    renderInput();
  }

  // Petit balancement doux (pas de secousse brutale).
  function wobble() {
    questionEl.classList.remove('wobble');
    void questionEl.offsetWidth;
    questionEl.classList.add('wobble');
  }

  function submit() {
    if (mode === 'wait' || mode === 'done' || input === '') return;
    const q = questions[index];
    const ok = activity.check(q, input);

    if (mode === 'retype') {
      if (ok) { play('correct'); next(); }
      else { play('oops'); wobble(); input = ''; renderInput(); }
      return;
    }

    if (ok) {
      const gained = starsFor(attempt);
      stars += gained;
      combo += 1;
      answers.push({ key: q.key, firstTry: attempt === 1 });
      progress.set(index, attempt === 1 ? 'star' : 'half');
      progress.combo(combo >= 3);
      questionEl.classList.add('correct');
      feedbackEl.className = 'feedback good';
      feedbackEl.textContent = attempt === 1 ? `${pick(PRAISE)} +1 ⭐` : 'Bien rattrapé ! +½ ⭐';
      talk.say(combo >= 3 ? `${combo} bonnes réponses d’affilée ! La boule de cristal brille 🔮` : pick(PRAISE));
      talk.mood('happy');
      play('correct', { combo });
      sparkle(answerEl, combo >= 3 ? 22 : 12);
      mode = 'wait';
      later(next, 1100);
      return;
    }

    play('oops');
    wobble();
    talk.mood('oops');
    if (attempt === 1) {
      const hint = activity.diagnose?.(q, input);
      attempt = 2;
      input = '';
      renderInput();
      feedbackEl.className = 'feedback retry';
      feedbackEl.textContent = hint ?? pick(RETRY);
      talk.say(hint ? 'Essaie encore, tu y es presque 🐾' : 'Prends ton temps, tu peux compter sur tes doigts 🐾');
      return;
    }

    // Deuxième erreur : on montre comment faire, puis l'enfant recopie la réponse.
    combo = 0;
    progress.combo(false);
    answers.push({ key: q.key, firstTry: false });
    progress.set(index, 'miss');
    mode = 'retype';
    input = '';
    renderInput();
    questionEl.classList.add('retype');
    feedbackEl.className = 'feedback retry';
    feedbackEl.textContent = 'Regarde, on le fait ensemble 👇 puis écris la réponse.';
    talk.say('Ce n’est pas grave, c’est comme ça qu’on apprend !');
    clear(helpEl).append(activity.renderHelp(q));
  }

  function next() {
    index += 1;
    if (index >= count) finish();
    else showQuestion();
  }

  function finish() {
    mode = 'done';
    const { state: newState, events } = applyExerciseResult(getState(), { level, stars, total: count, answers }, activity);
    setState(newState);
    ctx.session.lastResult = { activityId: activity.id, level, stars, total: count, ...events };
    ctx.navigate('#/resultats');
  }

  function quit() {
    mode = 'done';
    if (stars > 0 || answers.length) {
      const { state: newState } = applyAbandon(getState(), { stars, answers }, activity);
      setState(newState);
      if (stars > 0) toast(`Tes ${String(stars).replace('.', ',')} ⭐ sont gardées !`);
    }
    ctx.navigate('#/accueil');
  }

  function askQuit() {
    if (index === 0 && attempt === 1 && mode === 'answer') { ctx.navigate('#/accueil'); return; }
    showModal(
      h('div', {},
        h('p', { class: 'modal-title' }, 'Tu veux faire une pause ?'),
        h('p', { class: 'muted' }, 'Tes étoiles sont gardées. Pour remplir le compteur de gemmes, il faudra finir une potion entière.')),
      [
        { label: 'Je continue', class: 'btn' },
        { label: 'Pause', class: 'btn btn-soft', onClick: quit },
      ],
    );
  }

  function onKey(e) {
    if (document.querySelector('.modal-overlay')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const digit = digitFromKeyEvent(e);
    if (digit !== null) { addDigit(digit); e.preventDefault(); }
    else if (e.key === 'Backspace' || e.key === 'Delete') { removeDigit(); e.preventDefault(); }
    else if (e.key === 'Enter') { submit(); e.preventDefault(); }
  }

  document.addEventListener('keydown', onKey);
  showQuestion();

  return () => {
    document.removeEventListener('keydown', onKey);
    timers.forEach(clearTimeout);
    stopSpeaking();
    document.querySelector('.modal-overlay')?.remove();
  };
}
