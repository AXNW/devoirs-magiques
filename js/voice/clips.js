// Lecture des voix pré-enregistrées (audio/voice/*.mp3), assemblées bout à bout.
// Si un morceau manque, playClips renvoie false et on lit le texte avec la voix du navigateur.

const BASE = 'audio/voice/';
const GAP = 0.06; // petite respiration entre deux morceaux (secondes)
let indexPromise = null;
let index = null; // index chargé (pour les vérifications synchrones)
const buffers = new Map();
let playing = [];

// À appeler au démarrage (main.js) pour que hasClips() réponde tout de suite.
export function loadIndex() {
  indexPromise ??= fetch(`${BASE}index.json`)
    .then((r) => (r.ok ? r.json() : { clips: {} }))
    .catch(() => ({ clips: {} }))
    .then((data) => { index = data; return data; });
  return indexPromise;
}

// Tous ces enregistrements existent-ils ? (false tant que l'index n'est pas chargé)
export function hasClips(keys) {
  return !!keys?.length && keys.every((k) => k && index?.clips?.[k]);
}

export async function clipCount() {
  const idx = await loadIndex();
  return Object.keys(idx.clips ?? {}).length;
}

// Retire le silence au début et à la fin (encodage MP3) pour un enchaînement fluide.
function trimSilence(ctx, buffer, threshold = 0.01) {
  const data = buffer.getChannelData(0);
  let start = 0;
  let end = data.length - 1;
  while (start < end && Math.abs(data[start]) < threshold) start++;
  while (end > start && Math.abs(data[end]) < threshold) end--;
  const pad = Math.floor(buffer.sampleRate * 0.02);
  start = Math.max(0, start - pad);
  end = Math.min(data.length - 1, end + pad);
  const length = end - start + 1;
  if (length <= 0 || length === data.length) return buffer;
  const out = ctx.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    out.copyToChannel(buffer.getChannelData(c).subarray(start, end + 1), c);
  }
  return out;
}

function getBuffer(ctx, key) {
  if (!buffers.has(key)) {
    const p = fetch(`${BASE}${key}.mp3`)
      .then((r) => { if (!r.ok) throw new Error(key); return r.arrayBuffer(); })
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => trimSilence(ctx, buffer));
    p.catch(() => buffers.delete(key)); // on réessaiera la prochaine fois
    buffers.set(key, p);
  }
  return buffers.get(key);
}

export function stopClips() {
  for (const src of playing) {
    try { src.stop(); } catch { /* déjà terminé */ }
  }
  playing = [];
}

export async function playClips(ctx, keys) {
  if (!ctx || !keys?.length || keys.some((k) => !k)) return false;
  const idx = await loadIndex();
  if (!keys.every((k) => idx.clips?.[k])) return false;
  let list;
  try {
    list = await Promise.all(keys.map((k) => getBuffer(ctx, k)));
  } catch {
    return false;
  }
  stopClips();
  let t = ctx.currentTime + 0.02;
  for (const buffer of list) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(t);
    playing.push(src);
    t += buffer.duration + GAP;
  }
  return true;
}
