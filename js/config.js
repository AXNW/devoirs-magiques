// Valeurs par défaut de l'application.
// Elles servent pour une première utilisation : ensuite, les réglages se font
// dans l'Espace parent et sont enregistrés dans le navigateur.

export const DEFAULT_SETTINGS = {
  sound: true,
  questionsPerExercise: 10, // nombre de questions dans un exercice
  successMinHats: 1,        // chapeaux minimum pour qu'un exercice compte comme « réussi »
  exercisesPerGem: 10,      // exercices réussis pour gagner une Gemme de lune
  gemsPerSpin: 1,           // gemmes nécessaires pour tourner la roue
  gemsToChoose: 3,          // gemmes pour CHOISIR sa récompense au lieu du hasard (0 = désactivé)
  perfectsToUnlock: 3,      // OU : exercices à 3 chapeaux pour débloquer le niveau suivant
  masteryToUnlock: 80,      // % des calculs du niveau « sus » pour débloquer le suivant
  dailyPauseHint: 3,        // le chat propose une pause tous les N exercices (0 = jamais)
  dailyLimit: 0,            // nombre maximum d'exercices par jour (0 = illimité)
  voiceEnabled: true,       // boutons 🔊 (voix pré-enregistrée du chat)
};

// Personnalisation du chat. `mark` = couleur des motifs (rayures, taches) sur ce pelage,
// `whisker` = couleur des moustaches lisible sur ce pelage.
export const CAT_FURS = [
  { id: 'nuit',     label: 'Nuit',     color: '#3b3060', whisker: '#e9e0ff', mark: 'rgba(255,255,255,.22)' },
  { id: 'roux',     label: 'Roux',     color: '#e07a2f', whisker: '#fff4e0', mark: 'rgba(120,40,0,.35)' },
  { id: 'gris',     label: 'Gris',     color: '#8a8fa3', whisker: '#ffffff', mark: 'rgba(30,30,50,.3)' },
  { id: 'chocolat', label: 'Chocolat', color: '#6b4226', whisker: '#f3e2cf', mark: 'rgba(255,230,200,.25)' },
  { id: 'creme',    label: 'Crème',    color: '#e9c99a', whisker: '#6b4226', mark: 'rgba(150,90,30,.35)' },
  { id: 'neige',    label: 'Neige',    color: '#f4f1ea', whisker: '#8a8fa3', mark: 'rgba(60,60,80,.25)' },
];
export const CAT_EYES = [
  { id: 'vert',  label: 'Vert',  color: '#c6ff6b' },
  { id: 'bleu',  label: 'Bleu',  color: '#7fd3ff' },
  { id: 'ambre', label: 'Ambre', color: '#ffb347' },
  { id: 'rose',  label: 'Rose',  color: '#ff9ec7' },
];

// Options à débloquer : `unlock(state)` renvoie true quand l'option est gagnée ;
// sans `unlock`, l'option est disponible tout de suite.
export const CAT_OPTIONS = {
  pattern: {
    title: 'Son motif',
    items: [
      { id: 'none',    label: 'Uni' },
      { id: 'stripes', label: 'Tigré' },
      { id: 'patch',   label: 'Tache sur l’œil' },
      { id: 'muzzle',  label: 'Museau blanc' },
      { id: 'spots',   label: 'Pois magiques', unlock: (s) => s.stats.exercisesDone >= 5, hint: 'Termine 5 exercices' },
    ],
  },
  hat: {
    title: 'Son chapeau',
    items: [
      { id: 'wizard', label: 'Chapeau pointu' },
      { id: 'none',   label: 'Sans chapeau' },
      { id: 'witch',  label: 'Chapeau à boucle', unlock: (s) => s.wallet.totalStars >= 30,  hint: 'Deviens Apprenti sorcier (30 ⭐)' },
      { id: 'crown',  label: 'Couronne',         unlock: (s) => s.wallet.totalStars >= 250, hint: 'Deviens Grand mage (250 ⭐)' },
    ],
  },
  accessory: {
    title: 'Son accessoire',
    items: [
      { id: 'none',    label: 'Aucun' },
      { id: 'bow',     label: 'Nœud papillon' },
      { id: 'bell',    label: 'Grelot',   unlock: (s) => s.stats.exercisesDone >= 10, hint: 'Termine 10 exercices' },
      { id: 'scarf',   label: 'Écharpe',  unlock: (s) => s.stats.perfectCount >= 3,   hint: 'Fais 3 sans-fautes' },
      { id: 'glasses', label: 'Lunettes', unlock: (s) => s.collection.length >= 5,    hint: 'Collectionne 5 familiers' },
    ],
  },
  wand: {
    title: 'Sa baguette',
    items: [
      { id: 'star',  label: 'Étoile' },
      { id: 'moon',  label: 'Lune',  unlock: (s) => s.wallet.gemsEarned >= 1, hint: 'Gagne une Gemme de lune' },
      { id: 'heart', label: 'Cœur',  unlock: (s) => s.stats.levelUps >= 2,    hint: 'Débloque 2 niveaux' },
    ],
  },
};

// Un calcul est « su » après ce nombre de réussites du premier coup d'affilée.
export const MASTERY_STREAK = 3;

// Récompenses de la Roue du Destin (modifiables dans l'Espace parent).
// weight = poids relatif : 2 tombe deux fois plus souvent que 1.
export const DEFAULT_PRIZES = [
  { id: 'p1', emoji: '📺', label: '15 minutes de dessin animé', weight: 3 },
  { id: 'p2', emoji: '📖', label: 'Une histoire de plus ce soir', weight: 3 },
  { id: 'p3', emoji: '🍰', label: 'Choisir le dessert', weight: 2 },
  { id: 'p4', emoji: '🎲', label: 'Un jeu de société avec un adulte', weight: 2 },
  { id: 'p5', emoji: '⭐', label: 'Un autocollant', weight: 3 },
  { id: 'p6', emoji: '🔮', label: 'Relance gratuite !', weight: 1, respin: true },
];

// Rangs de sorcier, selon le total d'étoiles gagnées.
export const RANKS = [
  { min: 0,    name: 'Chaton apprenti',  hat: '#7b5cd6' },
  { min: 30,   name: 'Apprenti sorcier', hat: '#3f8efc' },
  { min: 100,  name: 'Mage',             hat: '#2bb673' },
  { min: 250,  name: 'Grand mage',       hat: '#e0457b' },
  { min: 500,  name: 'Archimage',        hat: '#f2b705' },
  { min: 1000, name: 'Légende du grimoire', hat: '#ff7a1a' },
];

// Familiers à collectionner. `test` reçoit l'état complet de l'application.
export const FAMILIARS = [
  { id: 'pompon',     emoji: '🐱', name: 'Pompon',     hint: 'Termine ton premier exercice',      test: (s) => s.stats.exercisesDone >= 1 },
  { id: 'moustache',  emoji: '😺', name: 'Frimousse',  hint: 'Gagne 3 chapeaux à un exercice',     test: (s) => s.stats.perfectCount >= 1 },
  { id: 'grimoire',   emoji: '📖', name: 'Grimoire',   hint: 'Débloque un nouveau niveau',         test: (s) => s.stats.levelUps >= 1 },
  { id: 'caramel',    emoji: '🐈', name: 'Caramel',    hint: 'Termine 10 exercices',               test: (s) => s.stats.exercisesDone >= 10 },
  { id: 'lune',       emoji: '🌙', name: 'Lune',       hint: 'Gagne ta première Gemme de lune',    test: (s) => s.wallet.gemsEarned >= 1 },
  { id: 'hibou',      emoji: '🦉', name: 'Hibou',      hint: 'Fais tourner la roue 3 fois',        test: (s) => s.wallet.spins >= 3 },
  { id: 'citrouille', emoji: '🎃', name: 'Citrouille', hint: 'Termine 25 exercices',               test: (s) => s.stats.exercisesDone >= 25 },
  { id: 'eclair',     emoji: '⚡', name: 'Éclair',     hint: 'Gagne 10 fois 3 chapeaux',           test: (s) => s.stats.perfectCount >= 10 },
  { id: 'comete',     emoji: '☄️', name: 'Comète',     hint: 'Termine 50 exercices',               test: (s) => s.stats.exercisesDone >= 50 },
  { id: 'merlin',     emoji: '🧙', name: 'Merlin',     hint: 'Deviens Archimage (500 étoiles)',    test: (s) => s.wallet.totalStars >= 500 },
  { id: 'licorne',    emoji: '🦄', name: 'Licorne',    hint: 'Termine 100 exercices',              test: (s) => s.stats.exercisesDone >= 100 },
  { id: 'dragon',     emoji: '🐉', name: 'Dragon',     hint: 'Gagne 1000 étoiles',                 test: (s) => s.wallet.totalStars >= 1000 },
];
