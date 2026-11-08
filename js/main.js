// Point d'entrée : routeur par hash (#/accueil, #/exercice/addition/2, ...).

import { load } from './store.js';
import * as home from './screens/home.js';
import * as exercise from './screens/exercise.js';
import * as results from './screens/results.js';
import * as wheel from './screens/wheel.js';
import * as parent from './screens/parent.js';
import * as collection from './screens/collection.js';
import * as grimoire from './screens/grimoire.js';

const routes = {
  accueil: home,
  exercice: exercise,
  resultats: results,
  roue: wheel,
  parent,
  familiers: collection,
  grimoire,
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
window.addEventListener('hashchange', router);
router();
