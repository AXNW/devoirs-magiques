// Liste des activités affichées sur l'accueil.
// Pour ajouter une activité : créer un fichier à côté (voir addition.js)
// puis l'importer et l'ajouter au tableau ci-dessous.

import addition from './addition.js';

export const ACTIVITIES = [addition];

export function getActivity(id) {
  return ACTIVITIES.find((a) => a.id === id) ?? null;
}
