// Aléatoire. Un `rng` est une fonction qui renvoie un nombre dans [0, 1[.
// Math.random par défaut ; makeSeededRng() sert aux tests (résultats reproductibles).

export function makeSeededRng(seed = 1) {
  let a = seed >>> 0;
  return function mulberry32() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function shuffle(rng, array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Renvoie l'index d'un élément tiré au sort proportionnellement à son poids.
// Si tous les poids sont nuls, le tirage est uniforme.
export function weightedPick(rng, items, weightOf = (x) => x.weight) {
  if (!items.length) return -1;
  const weights = items.map((x) => Math.max(0, Number(weightOf(x)) || 0));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return Math.floor(rng() * items.length);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return weights.findLastIndex((w) => w > 0);
}
