// Valeurs par défaut de l'application.
// Elles servent pour une première utilisation : ensuite, les réglages se font
// dans l'Espace parent et sont enregistrés dans le navigateur.

export const DEFAULT_SETTINGS = {
  sound: true,
  questionsPerExercise: 10, // nombre de questions dans un exercice
  successMinHats: 1,        // chapeaux minimum pour qu'un exercice compte comme « réussi »
  exercisesPerGem: 10,      // exercices réussis pour gagner une Gemme de lune
  gemsPerSpin: 1,           // gemmes nécessaires pour tourner la roue
  perfectsToUnlock: 3,      // OU : exercices à 3 chapeaux pour débloquer le niveau suivant
  masteryToUnlock: 80,      // % des calculs du niveau « sus » pour débloquer le suivant
  dailyPauseHint: 3,        // le chat propose une pause tous les N exercices (0 = jamais)
  dailyLimit: 0,            // nombre maximum d'exercices par jour (0 = illimité)
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
  { id: 'moustache',  emoji: '😺', name: 'Moustache',  hint: 'Gagne 3 chapeaux à un exercice',     test: (s) => s.stats.perfectCount >= 1 },
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
