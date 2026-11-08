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
// La qualité dépend des voix installées. On choisit automatiquement la plus naturelle :
// voix « Natural / Online » d'Edge, puis « Google français » de Chrome, puis les voix système.

const hasSynth = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
let voices = [];

function loadVoices() {
  voices = window.speechSynthesis.getVoices();
}
if (hasSynth()) {
  loadVoices();
  // Les voix arrivent souvent après le chargement de la page.
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export function voiceScore(v) {
  const name = v.name.toLowerCase();
  let score = 0;
  if (/natural|neural|naturelle/.test(name)) score += 100;
  if (/online/.test(name)) score += 40;
  if (/google/.test(name)) score += 50;
  if (/premium|enhanced|améliorée/.test(name)) score += 30;
  if (/^fr[-_]fr/i.test(v.lang)) score += 10;
  if (v.localService === false) score += 5;
  return score;
}

// Voix françaises, de la plus naturelle à la plus robotique.
export function frenchVoices() {
  return voices.filter((v) => /^fr/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a));
}

export function onVoicesChanged(fn) {
  if (hasSynth()) window.speechSynthesis.addEventListener?.('voiceschanged', fn);
  return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', fn);
}

function chosenVoice() {
  const wanted = getState().settings.voiceName;
  const list = frenchVoices();
  return list.find((v) => v.name === wanted) ?? list[0] ?? null;
}

// Les boutons 🔊 s'affichent si le navigateur sait parler et que la voix n'est pas désactivée.
export function canSpeak() {
  return hasSynth() && getState().settings.voiceEnabled !== false;
}

function say(text) {
  if (!hasSynth() || !text) return;
  const clean = text
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/\+/g, ' plus ')
    .replace(/×/g, ' fois ')
    .replace(/=/g, ' égale ')
    .replace(/½/g, ' une demie ')
    .replace(/\s+/g, ' ')
    .trim();
  const u = new SpeechSynthesisUtterance(clean);
  const voice = chosenVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'fr-FR';
  u.rate = Number(getState().settings.voiceRate) || 1;
  u.pitch = 1; // une hauteur modifiée rend les voix plus artificielles
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// Toujours déclenchée par un clic de l'enfant : elle fonctionne même si les sons sont coupés.
export function speak(text) {
  if (canSpeak()) say(text);
}

// Pour le bouton « Tester » de l'Espace parent (même si la voix est désactivée).
export function testVoice() {
  say('Bonjour ! Je suis ton chat sorcier. Combien font 3 plus 4 ?');
}

export function stopSpeaking() {
  if (hasSynth()) window.speechSynthesis.cancel();
}
