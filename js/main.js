// Point d'entrée : routeur par hash (#/accueil, #/exercice/addition/2, ...).

import { load } from './store.js';
import { loadIndex } from './voice/clips.js';
import * as home from './screens/home.js';
import * as exercise from './screens/exercise.js';
import * as results from './screens/results.js';
import * as wheel from './screens/wheel.js';
import * as parent from './screens/parent.js';
import * as collection from './screens/collection.js';
import * as grimoire from './screens/grimoire.js';
import * as cat from './screens/cat.js';

const routes = {
  accueil: home,
  exercice: exercise,
  resultats: results,
  roue: wheel,
  parent,
  familiers: collection,
  grimoire,
  'mon-chat': cat,
};

const session = { lastResult: null, parentOk: false };
const app = document.getElementById('app');
let cleanup = null;

function navigate(hash) {
  if (location.hash === hash) router();
  else location.hash = hash;
}

function router() {
  const [name = 'accueil', ...params] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const routeName = routes[name] ? name : 'accueil';
  if (typeof cleanup === 'function') cleanup();
  app.replaceChildren();
  app.className = `screen screen-${routeName}`;
  cleanup = routes[routeName].render(app, { params, session, navigate }) || null;
  window.scrollTo(0, 0);
}

load();
// Index des voix enregistrées (rapide, et en cache hors ligne) : on l'attend au plus 1,5 s.
await Promise.race([loadIndex(), new Promise((r) => setTimeout(r, 1500))]);
window.addEventListener('hashchange', router);
router();

// Mode hors ligne (PWA). Désactivé en local pour toujours voir la dernière version du code.
const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if ('serviceWorker' in navigator && !isLocal) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker non enregistré', e));
  });
}
