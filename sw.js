// Service worker : l'application fonctionne hors ligne.
// Stratégie « stale-while-revalidate » : on sert la copie en cache tout de suite
// et on la met à jour en arrière-plan ; la nouvelle version s'affiche au lancement suivant.
// Changer CACHE seulement pour forcer un nettoyage complet.

const CACHE = 'chats-sorciers-v3';
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'css/theme.css',
  'css/components.css',
  'js/main.js',
  'js/config.js',
  'js/store.js',
  'js/rewards.js',
  'js/rng.js',
  'js/sound.js',
  'js/ui/dom.js',
  'js/ui/mascot.js',
  'js/ui/icons.js',
  'js/ui/confetti.js',
  'js/ui/progress.js',
  'js/ui/numpad.js',
  'js/activities/registry.js',
  'js/activities/addition.js',
  'js/activities/mystery.js',
  'js/activities/problems.js',
  'js/screens/home.js',
  'js/screens/exercise.js',
  'js/screens/results.js',
  'js/screens/wheel.js',
  'js/screens/parent.js',
  'js/screens/collection.js',
  'js/screens/grimoire.js',
  'js/screens/cat.js',
  'js/voice/lines.js',
  'js/voice/clips.js',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// Voix pré-enregistrées : mises en cache si elles existent (le site marche aussi sans).
async function cacheVoices(cache) {
  try {
    const res = await fetch('audio/voice/index.json', { cache: 'no-cache' });
    if (!res.ok) return;
    await cache.put('audio/voice/index.json', res.clone());
    const { clips = {} } = await res.json();
    await Promise.allSettled(Object.keys(clips).map((k) => cache.add(`audio/voice/${k}.mp3`)));
  } catch { /* pas de voix enregistrées */ }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE)
    .then(async (c) => { await c.addAll(CORE); await cacheVoices(c); })
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;

  event.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(request, { ignoreSearch: sameOrigin });
    const network = fetch(request)
      .then((response) => {
        if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
        return response;
      })
      .catch(() => cached);
    return cached ?? network;
  }));
});
