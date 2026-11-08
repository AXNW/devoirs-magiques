// Petits sons générés avec la Web Audio API (aucun fichier audio).

import { getState } from './store.js';

let ctx = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(c, freq, start, duration, { type = 'sine', gain = 0.12 } = {}) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

const NOTES = { C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, C6: 1047, E6: 1319, G6: 1568 };

export function play(name, { combo = 0 } = {}) {
  if (!getState().settings.sound) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const up = Math.min(combo, 6) * 0.04 + 1; // le son monte avec le combo

  switch (name) {
    case 'click':
      tone(c, 880, t, 0.06, { gain: 0.05 });
      break;
    case 'correct':
      [NOTES.E5, NOTES.G5, NOTES.C6].forEach((f, i) => tone(c, f * up, t + i * 0.08, 0.25, { type: 'triangle' }));
      break;
    case 'oops': // son neutre et doux (pas de « buzzer » d'échec)
      tone(c, 440, t, 0.15, { type: 'sine', gain: 0.06 });
      tone(c, 494, t + 0.13, 0.2, { type: 'sine', gain: 0.06 });
      break;
    case 'win':
      [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6, NOTES.E6, NOTES.G6].forEach((f, i) =>
        tone(c, f, t + i * 0.1, 0.35, { type: 'triangle' }));
      break;
    case 'gem':
      [NOTES.G6, NOTES.E6, NOTES.C6, NOTES.E6, NOTES.G6].forEach((f, i) =>
        tone(c, f, t + i * 0.07, 0.3, { type: 'sine', gain: 0.1 }));
      break;
    case 'spin':
      for (let i = 0; i < 24; i++) tone(c, 1200, t + i * 0.04 * (1 + i / 12), 0.03, { type: 'square', gain: 0.03 });
      break;
    default:
      break;
  }
}

// ---- Lecture à voix haute (synthèse vocale du navigateur) -----------------

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function frenchVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => /^fr(-|_)FR/i.test(v.lang)) ?? voices.find((v) => /^fr/i.test(v.lang)) ?? null;
}

// Toujours déclenchée par un clic de l'enfant : elle fonctionne même si les sons sont coupés.
export function speak(text) {
  if (!canSpeak() || !text) return;
  const clean = text
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, '')
    .replace(/\+/g, ' plus ')
    .replace(/×/g, ' fois ')
    .replace(/=/g, ' égale ')
    .replace(/½/g, ' une demie ');
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = 'fr-FR';
  u.rate = 0.9;
  u.pitch = 1.1;
  const voice = frenchVoice();
  if (voice) u.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
