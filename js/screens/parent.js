// Espace parent : protégé par une petite énigme d'adulte.

import { h, clear, toast, formatDate } from '../ui/dom.js';
import { getState, update, activityState, exportJson, importJson, resetAll } from '../store.js';
import { hatsFor, levelMastery, isMastered } from '../rewards.js';
import { ACTIVITIES } from '../activities/registry.js';
import { frenchVoices, voiceScore, onVoicesChanged, testVoice } from '../sound.js';

const clampInt = (v, min, max) => Math.min(max, Math.max(min, parseInt(v, 10) || min));

function saved() { toast('Enregistré ✓'); }

export function render(root, ctx) {
  if (!ctx.session.parentOk) renderGate(root, ctx);
  else renderPanel(root, ctx);
  return () => { ctx.session.parentOk = false; };
}

function renderGate(root, ctx) {
  const a = 6 + Math.floor(Math.random() * 4);
  const b = 6 + Math.floor(Math.random() * 4);
  const input = h('input', { type: 'number', inputmode: 'numeric', class: 'field', 'aria-label': 'Réponse' });
  const msg = h('p', { class: 'muted' });
  const tryIt = (e) => {
    e.preventDefault();
    if (Number(input.value) === a * b) {
      ctx.session.parentOk = true;
      clear(root);
      renderPanel(root, ctx);
    } else {
      msg.textContent = 'Ce n’est pas la bonne réponse.';
      input.value = '';
      input.focus();
    }
  };
  root.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Retour à l’accueil', onClick: () => ctx.navigate('#/accueil') }, '🏠'),
      h('div', { class: 'topbar-title' }, '🔒 Espace parent'), h('span')),
    h('form', { class: 'card gate', onSubmit: tryIt },
      h('p', {}, 'Réservé aux adultes. Combien font :'),
      h('p', { class: 'gate-q' }, `${a} × ${b} = ?`),
      input,
      h('button', { class: 'btn', type: 'submit' }, 'Entrer'),
      msg),
  );
  input.focus();
}

function section(title, ...children) {
  return h('section', { class: 'card parent-section' }, h('h2', {}, title), children);
}

function numberRow(label, value, min, max, onChange, help) {
  return h('label', { class: 'row' },
    h('span', {}, label, help ? h('small', { class: 'muted block' }, help) : null),
    h('input', {
      type: 'number', class: 'field small-field', min: String(min), max: String(max), value: String(value),
      onChange: (e) => { const v = clampInt(e.target.value, min, max); e.target.value = v; onChange(v); saved(); },
    }));
}

function renderPanel(root, ctx) {
  const s = getState();
  const rerender = () => { clear(root); renderPanel(root, ctx); };

  root.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Retour à l’accueil', onClick: () => ctx.navigate('#/accueil') }, '🏠'),
      h('div', { class: 'topbar-title' }, '🔓 Espace parent'), h('span')),
    h('div', { class: 'parent' },
      profileSection(s),
      voiceSection(s),
      activitiesSection(s),
      rhythmSection(s),
      rewardsSection(s, rerender),
      prizesSection(s, rerender),
      wheelHistorySection(s),
      statsSection(s),
      backupSection(rerender),
    ),
  );
}

function profileSection(s) {
  return section('👤 Profil',
    h('label', { class: 'row' },
      h('span', {}, 'Prénom de l’enfant', h('small', { class: 'muted block' }, 'Enregistré uniquement dans ce navigateur.')),
      h('input', {
        type: 'text', class: 'field', maxlength: '30', value: s.profile.name,
        onChange: (e) => { update((st) => { st.profile.name = e.target.value.trim(); }); saved(); },
      })),
    h('label', { class: 'row' },
      h('span', {}, 'Sons'),
      h('input', {
        type: 'checkbox', checked: s.settings.sound,
        onChange: (e) => { update((st) => { st.settings.sound = e.target.checked; }); saved(); },
      })),
  );
}

let stopVoiceWatch = () => {};

function voiceSection(s) {
  const select = h('select', {
    class: 'field voice-select',
    onChange: (e) => { update((st) => { st.settings.voiceName = e.target.value; }); saved(); testVoice(); },
  });
  const note = h('p', { class: 'muted small' });
  const fill = () => {
    const list = frenchVoices();
    const current = getState().settings.voiceName;
    select.replaceChildren(
      h('option', { value: '', selected: !current }, 'Automatique (la plus naturelle)'),
      ...list.map((v) => h('option', { value: v.name, selected: v.name === current },
        `${v.name}${voiceScore(v) >= 50 ? ' ★' : ''}`)));
    note.textContent = list.some((v) => voiceScore(v) >= 50)
      ? '★ = voix naturelle (meilleure qualité). Certaines ont besoin d’Internet.'
      : 'Aucune voix naturelle trouvée sur ce navigateur. Les voix « Natural » d’Edge sont les plus agréables : utilisez Edge (ou installez l’application depuis Edge).';
  };
  fill();
  stopVoiceWatch();
  stopVoiceWatch = onVoicesChanged(fill);
  return section('🔊 Voix',
    h('label', { class: 'row' },
      h('span', {}, 'Boutons de lecture à voix haute', h('small', { class: 'muted block' }, 'Décocher pour masquer tous les boutons 🔊.')),
      h('input', { type: 'checkbox', checked: s.settings.voiceEnabled !== false, onChange: (e) => { update((st) => { st.settings.voiceEnabled = e.target.checked; }); saved(); } })),
    h('label', { class: 'row' }, h('span', {}, 'Voix'), select),
    h('label', { class: 'row' },
      h('span', {}, 'Vitesse'),
      h('select', {
        class: 'field',
        onChange: (e) => { update((st) => { st.settings.voiceRate = Number(e.target.value); }); saved(); testVoice(); },
      },
      [['0.8', 'Lente'], ['0.95', 'Normale'], ['1.1', 'Rapide']].map(([v, l]) =>
        h('option', { value: v, selected: Number(v) === Number(s.settings.voiceRate) }, l)))),
    h('div', { class: 'row' }, note, h('button', { class: 'btn small', onClick: testVoice }, '▶️ Tester')),
  );
}

function activitiesSection(s) {
  const blocks = ACTIVITIES.map((activity) => {
    const act = s.activities[activity.id] ?? activityState(structuredClone(s), activity);
    const options = (selected) => activity.levels.map((l) =>
      h('option', { value: String(l.id), selected: l.id === selected }, `${l.id}. ${l.label}`));
    const setAct = (fn) => { update((st) => fn(activityState(st, activity))); saved(); };
    return h('div', { class: 'sub' },
      h('h3', {}, `${activity.icon} ${activity.title}`),
      h('label', { class: 'row' },
        h('span', {}, 'Plafond (niveau maximum autorisé)', h('small', { class: 'muted block' }, 'Ce que l’enfant a déjà appris en classe.')),
        h('select', { class: 'field', onChange: (e) => setAct((a) => { a.ceiling = Number(e.target.value); }) }, options(act.ceiling))),
      h('label', { class: 'row' },
        h('span', {}, 'Niveaux débloqués jusqu’à', h('small', { class: 'muted block' }, 'Se débloque tout seul avec les exercices à 3 chapeaux. Le plafond reste la limite.')),
        h('select', { class: 'field', onChange: (e) => setAct((a) => { a.unlocked = Number(e.target.value); }) }, options(act.unlocked))),
      h('div', { class: 'mastery-list' },
        activity.levels.filter((l) => l.id <= act.ceiling).map((l) => {
          const m = levelMastery(act, activity, l.id, s.settings.masteryToUnlock);
          return h('p', { class: 'small' }, `Niveau ${l.id} (${l.label}) : `,
            m ? `${m.mastered} / ${m.total} calculs sus` : `${act.perfects[l.id] || 0} sans-faute(s)`);
        })),
      activity.renderGrimoire
        ? h('details', { class: 'calc-map' },
          h('summary', {}, '🗺️ Carte des calculs'),
          activity.renderGrimoire(act, { isMastered: (k) => isMastered(act, k) }))
        : null,
    );
  });
  return section('🧪 Activités et difficulté',
    numberRow('Questions par exercice', s.settings.questionsPerExercise, 3, 30,
      (v) => update((st) => { st.settings.questionsPerExercise = v; })),
    numberRow('% de calculs sus pour débloquer un niveau', s.settings.masteryToUnlock, 10, 100,
      (v) => update((st) => { st.settings.masteryToUnlock = v; }),
      'Un calcul est « su » après 3 réussites du premier coup d’affilée.'),
    numberRow('… ou nombre de sans-fautes pour débloquer un niveau', s.settings.perfectsToUnlock, 1, 20,
      (v) => update((st) => { st.settings.perfectsToUnlock = v; })),
    blocks,
  );
}

function rhythmSection(s) {
  return section('⏰ Rythme',
    numberRow('Proposer une pause tous les N exercices', s.settings.dailyPauseHint, 0, 20,
      (v) => update((st) => { st.settings.dailyPauseHint = v; }), '0 = jamais. C’est une simple suggestion du chat.'),
    numberRow('Nombre maximum d’exercices par jour', s.settings.dailyLimit, 0, 50,
      (v) => update((st) => { st.settings.dailyLimit = v; }), '0 = illimité. Une fois la limite atteinte, les potions « se reposent » jusqu’au lendemain.'),
  );
}

function rewardsSection(s, rerender) {
  return section('💎 Gemmes de lune',
    numberRow('Chapeaux minimum pour un exercice « réussi »', s.settings.successMinHats, 0, 3,
      (v) => update((st) => { st.settings.successMinHats = v; }),
      '3 = sans faute, 2 = 80 %, 1 = 60 %, 0 = tout exercice terminé compte.'),
    numberRow('Exercices réussis pour gagner 1 gemme', s.settings.exercisesPerGem, 1, 100,
      (v) => update((st) => { st.settings.exercisesPerGem = v; })),
    numberRow('Gemmes pour un tour de roue', s.settings.gemsPerSpin, 1, 20,
      (v) => update((st) => { st.settings.gemsPerSpin = v; })),
    numberRow('Gemmes pour CHOISIR sa récompense', s.settings.gemsToChoose, 0, 50,
      (v) => update((st) => { st.settings.gemsToChoose = v; }),
      '0 = désactivé. Plus cher qu’un tour de roue, mais sans hasard.'),
    h('div', { class: 'row' },
      h('span', {}, `Gemmes actuelles : ${s.wallet.gems} (progression : ${s.wallet.successSinceLastGem} / ${s.settings.exercisesPerGem})`),
      h('span', { class: 'inline' },
        h('button', { class: 'btn btn-soft small', onClick: () => { update((st) => { st.wallet.gems = Math.max(0, st.wallet.gems - 1); }); rerender(); } }, '− 1'),
        h('button', { class: 'btn btn-soft small', onClick: () => { update((st) => { st.wallet.gems += 1; }); rerender(); } }, '+ 1'))),
  );
}

function prizesSection(s, rerender) {
  const rows = s.prizes.map((p, i) => {
    const set = (fn) => { update((st) => fn(st.prizes[i])); saved(); };
    return h('div', { class: 'prize-row' },
      h('input', { class: 'field emoji-field', value: p.emoji || '', 'aria-label': 'Emoji', onChange: (e) => set((x) => { x.emoji = e.target.value.trim(); }) }),
      h('input', { class: 'field', value: p.label, 'aria-label': 'Récompense', onChange: (e) => set((x) => { x.label = e.target.value.trim() || 'Récompense'; }) }),
      h('label', { class: 'inline', title: 'Poids : plus il est grand, plus la récompense sort souvent' }, 'Poids',
        h('input', { type: 'number', class: 'field small-field', min: '0', max: '20', value: String(p.weight ?? 1),
          onChange: (e) => { const v = clampInt(e.target.value, 0, 20); e.target.value = v; set((x) => { x.weight = v; }); } })),
      h('label', { class: 'inline', title: 'La gemme est rendue : l’enfant peut relancer' }, 'Relance',
        h('input', { type: 'checkbox', checked: !!p.respin, onChange: (e) => set((x) => { x.respin = e.target.checked; }) })),
      h('button', { class: 'icon-btn', 'aria-label': 'Supprimer', onClick: () => { update((st) => { st.prizes.splice(i, 1); }); rerender(); } }, '🗑️'),
    );
  });
  const total = s.prizes.reduce((a, p) => a + (Number(p.weight) || 0), 0);
  return section('🎡 Récompenses de la roue',
    h('p', { class: 'muted' }, 'Le poids règle la fréquence : une récompense de poids 2 sort deux fois plus souvent qu’une récompense de poids 1.'),
    rows,
    total ? h('p', { class: 'muted small' }, s.prizes.map((p) => `${p.emoji} ${Math.round(((Number(p.weight) || 0) / total) * 100)} %`).join(' · ')) : null,
    h('button', {
      class: 'btn small',
      onClick: () => { update((st) => { st.prizes.push({ id: `p${Date.now()}`, emoji: '🎁', label: 'Nouvelle récompense', weight: 1 }); }); rerender(); },
    }, '+ Ajouter une récompense'),
  );
}

function wheelHistorySection(s) {
  if (!s.wheelHistory.length) return section('📜 Bons gagnés', h('p', { class: 'muted' }, 'Aucun tour de roue pour l’instant.'));
  return section('📜 Bons gagnés',
    h('ul', { class: 'history' },
      s.wheelHistory.slice(0, 30).map((w, i) => h('li', {},
        h('label', { class: 'inline' },
          h('input', { type: 'checkbox', checked: !!w.used, onChange: (e) => { update((st) => { st.wheelHistory[i].used = e.target.checked; }); saved(); } }),
          h('span', { class: w.used ? 'used' : '' }, `${formatDate(w.date)} — ${w.emoji} ${w.label}${w.chosen ? ' (choisi)' : ''}`))))),
    h('p', { class: 'muted small' }, 'Cochez un bon une fois la récompense donnée.'),
  );
}

function statsSection(s) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toDateString());
  }
  const perDay = days.map((day) => s.history.filter((x) => new Date(x.date).toDateString() === day).length);
  const maxDay = Math.max(1, ...perDay);
  const recent = s.history.slice(-20);
  const avgHats = recent.length ? recent.reduce((a, x) => a + (x.hats ?? hatsFor(x.stars, x.total)), 0) / recent.length : 0;

  const missed = [];
  for (const activity of ACTIVITIES) {
    const act = s.activities[activity.id];
    if (!act) continue;
    for (const [k, n] of Object.entries(act.missed)) missed.push({ label: k.replace('+', ' + '), n, icon: activity.icon });
  }
  missed.sort((a, b) => b.n - a.n);

  return section('📊 Suivi',
    h('p', {}, `Exercices terminés : ${s.stats.exercisesDone} · étoiles : ${s.wallet.totalStars} · sans-fautes : ${s.stats.perfectCount}`),
    h('p', {}, `Moyenne des 20 derniers exercices : ${avgHats.toFixed(1).replace('.', ',')} chapeau(x) sur 3`),
    h('div', { class: 'week' },
      days.map((day, i) => h('div', { class: 'day' },
        h('div', { class: 'day-bar', style: { height: `${(perDay[i] / maxDay) * 80}px` } }),
        h('span', { class: 'day-n' }, String(perDay[i])),
        h('span', { class: 'muted small' }, new Date(day).toLocaleDateString('fr-FR', { weekday: 'short' }))))),
    h('h3', {}, 'Calculs à retravailler'),
    missed.length
      ? h('p', {}, missed.slice(0, 12).map((m) => h('span', { class: 'chip' }, `${m.icon} ${m.label} (×${m.n})`)))
      : h('p', { class: 'muted' }, 'Rien pour l’instant. 👍'),
  );
}

function backupSection(rerender) {
  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', class: 'hidden',
    onChange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        importJson(await file.text());
        toast('Sauvegarde restaurée ✓');
        rerender();
      } catch (err) {
        alert(`Import impossible : ${err.message}`);
      }
    },
  });
  return section('💾 Sauvegarde',
    h('p', { class: 'muted' }, 'La progression est enregistrée dans ce navigateur, sur cet ordinateur. Exportez-la de temps en temps : elle disparaît si les données du navigateur sont effacées.'),
    h('div', { class: 'inline wrap' },
      h('button', {
        class: 'btn small',
        onClick: () => {
          const blob = new Blob([exportJson()], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: `devoirs-magiques-${new Date().toISOString().slice(0, 10)}.json` });
          document.body.append(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        },
      }, '⬇️ Exporter'),
      h('button', { class: 'btn small', onClick: () => fileInput.click() }, '⬆️ Importer'),
      fileInput,
      h('button', {
        class: 'btn btn-danger small',
        onClick: () => {
          if (confirm('Tout effacer (progression, gemmes, réglages) ?') && confirm('Vraiment ? Cette action est définitive.')) {
            resetAll();
            toast('Tout a été réinitialisé');
            rerender();
          }
        },
      }, '🧹 Tout réinitialiser'),
    ),
  );
}
