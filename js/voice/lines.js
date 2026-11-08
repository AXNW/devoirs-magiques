// Catalogue des phrases du chat qui peuvent être pré-enregistrées.
//
// ⚠️ Le bloc entre BEGIN LINES et END LINES doit rester du JSON strict
// (guillemets doubles, pas de virgule finale) : tools/generate_voice.py le lit
// pour générer les fichiers audio/voice/<clé>.mp3.
//
// Clés des enregistrements :
//   - tableau  → <groupe>_<index>   (ex. praise_0)
//   - objet    → <groupe>_<clé>     (ex. words_plus)
//   - numbers  → n<nombre>          (ex. n7)
//   - stories  → story_<id>_a<n> / story_<id>_b<n> / story_<id>_q  (énigmes, n de 1 à 10)
// Après avoir modifié une phrase, relancer le script : il ne régénère que ce qui a changé.

export const LINES = /* BEGIN LINES */ {
  "praise": [
    "Miaou-gique !",
    "Bravo, tu as bien compté !",
    "Abracadabra, c’est juste !",
    "Bien joué !",
    "Ronron de fierté !",
    "Tu as pris ton temps, bravo !",
    "Ça, c’est de l’entraînement !"
  ],
  "retry": [
    "Presque ! Essaie encore 💪",
    "Pas tout à fait. Recompte doucement !",
    "Oups, la potion a fait pschitt… Réessaie !"
  ],
  "exercise": {
    "start": "Écris le résultat, puis appuie sur Entrée ✔",
    "almost": "Essaie encore, tu y es presque 🐾",
    "take_time": "Prends ton temps, tu peux compter sur tes doigts 🐾",
    "breathe": "Respire un grand coup 🌬️ On apprend ensemble, tu vas y arriver !",
    "not_bad": "Ce n’est pas grave, c’est comme ça qu’on apprend !",
    "combo": "bonnes réponses d’affilée ! La boule de cristal brille 🔮"
  },
  "results": [
    "Bravo, la potion est terminée ! On s’entraîne encore un peu ?",
    "Bien joué, tu progresses !",
    "Très bien ! Ton entraînement paie !",
    "Un sans-faute ! Tout ce travail a payé !"
  ],
  "results_extra": {
    "limit": "C’était la dernière potion d’aujourd’hui. Bravo, et à demain ! 😴",
    "pause": "potions aujourd’hui ! Ton chat bâille un peu 😴 On fait une pause ?",
    "easier": "Celui-là était difficile ! Et si on s’échauffait un peu ?"
  },
  "home": {
    "resting": "Les potions se reposent jusqu’à demain 😴 Tu peux regarder ton grimoire et tes familiers !",
    "hello": "Bonjour !",
    "its_me": "C’est moi,",
    "hello_generic": "Bonjour ! C’est moi, ton chat sorcier."
  },
  "greetings": [
    "On fait un peu de magie ?",
    "Mes moustaches frétillent : c’est l’heure des potions !",
    "Une petite potion avec moi ?",
    "Miaou ! Un nouveau sortilège aujourd’hui ?"
  ],
  "cat": {
    "my_name_is": "Je m’appelle",
    "pretty": "Tu me fais beau ?",
    "intro_generic": "Coucou ! Tu me fais beau ?",
    "locked": "Celui-là, il faut encore le débloquer !"
  },
  "cat_happy": [
    "J’adore !",
    "Trop chic !",
    "Miaou, c’est parfait !",
    "Je suis magnifique !"
  ],
  "names": {
    "moustache": "Moustache",
    "pompon": "Pompon",
    "caramel": "Caramel",
    "reglisse": "Réglisse",
    "filou": "Filou",
    "minuit": "Minuit",
    "biscotte": "Biscotte",
    "grigri": "Grigri",
    "paillette": "Paillette",
    "pistache": "Pistache"
  },
  "story_terms": { "from": 1, "to": 10 },
  "stories": [
    { "id": "fish", "first": ["Le chat a un poisson.", "Le chat a {n} poissons."], "second": ["Il en pêche encore un.", "Il en pêche encore {n}."], "question": "Combien de poissons a-t-il en tout ?", "emoji1": "🐟", "emoji2": "🐟", "unit": "poissons" },
    { "id": "stars", "first": ["Dans le chaudron, il y a une étoile.", "Dans le chaudron, il y a {n} étoiles."], "second": ["On en ajoute une.", "On en ajoute {n}."], "question": "Combien d’étoiles y a-t-il maintenant ?", "emoji1": "⭐", "emoji2": "⭐", "unit": "étoiles" },
    { "id": "brooms", "first": ["Un balai vole dans le ciel.", "{n} balais volent dans le ciel."], "second": ["Un autre balai arrive.", "{n} autres balais arrivent."], "question": "Combien de balais volent en tout ?", "emoji1": "🧹", "emoji2": "🧹", "unit": "balais" },
    { "id": "owls", "first": ["Sur la branche, il y a un hibou.", "Sur la branche, il y a {n} hiboux."], "second": ["Un autre hibou se pose à côté.", "{n} autres hiboux se posent à côté."], "question": "Combien de hiboux y a-t-il sur la branche ?", "emoji1": "🦉", "emoji2": "🦉", "unit": "hiboux" },
    { "id": "candies", "first": ["Tu as un bonbon magique.", "Tu as {n} bonbons magiques."], "second": ["Ton ami t’en donne un.", "Ton ami t’en donne {n}."], "question": "Combien de bonbons as-tu maintenant ?", "emoji1": "🍬", "emoji2": "🍬", "unit": "bonbons" },
    { "id": "potions", "first": ["Sur l’étagère, il y a une potion bleue.", "Sur l’étagère, il y a {n} potions bleues."], "second": ["Il y a aussi une potion rose.", "Il y a aussi {n} potions roses."], "question": "Combien de potions y a-t-il en tout ?", "emoji1": "🧪", "emoji2": "⚗️", "unit": "potions" },
    { "id": "pumpkins", "first": ["Dans le jardin, il y a une citrouille.", "Dans le jardin, il y a {n} citrouilles."], "second": ["Il en pousse une de plus.", "Il en pousse {n} de plus."], "question": "Combien de citrouilles y a-t-il maintenant ?", "emoji1": "🎃", "emoji2": "🎃", "unit": "citrouilles" }
  ],
  "words": {
    "combien_font": "Combien font",
    "plus": "plus",
    "egale": "égale",
    "plus_combien_egale": "plus combien égale",
    "combien_plus": "Combien plus"
  },
  "numbers": { "from": 0, "to": 100 }
} /* END LINES */;

// Une phrase et ses enregistrements : { text, clips }.
export function line(group, key) {
  const text = LINES[group][key];
  if (text === undefined) throw new Error(`Phrase inconnue : ${group}.${key}`);
  return { text, clips: [`${group}_${key}`] };
}

// Clé de l'enregistrement du nom du chat, s'il fait partie des noms enregistrés.
export function catNameKey(name) {
  const entry = Object.entries(LINES.names).find(([, text]) => text.toLowerCase() === String(name ?? '').trim().toLowerCase());
  return entry ? `names_${entry[0]}` : null;
}

// Une phrase au hasard dans un groupe (tableau).
export function pickLine(group, rng = Math.random) {
  const list = LINES[group];
  return line(group, Math.floor(rng() * list.length));
}

// Clé de l'enregistrement d'un nombre (null s'il n'est pas enregistré).
export function num(n) {
  const { from, to } = LINES.numbers;
  return Number.isInteger(n) && n >= from && n <= to ? `n${n}` : null;
}

// Phrase d'une énigme : part = 'first' (avec a) ou 'second' (avec b).
export function storySentence(story, part, n) {
  return n === 1 ? story[part][0] : story[part][1].replace('{n}', String(n));
}

// Enregistrements d'une énigme a + b (null pour un nombre hors de la plage enregistrée).
export function storyClips(story, a, b) {
  const { from, to } = LINES.story_terms;
  const ok = (n) => n >= from && n <= to;
  return [
    ok(a) ? `story_${story.id}_a${a}` : null,
    ok(b) ? `story_${story.id}_b${b}` : null,
    `story_${story.id}_q`,
  ];
}

// Tous les enregistrements attendus : [{ key, text }].
// (même logique que all_clips() dans tools/generate_voice.py)
export function allClips() {
  const clips = [];
  for (const [group, value] of Object.entries(LINES)) {
    if (group === 'story_terms') continue;
    if (group === 'stories') {
      const { from, to } = LINES.story_terms;
      for (const story of value) {
        for (let n = from; n <= to; n++) {
          clips.push({ key: `story_${story.id}_a${n}`, text: storySentence(story, 'first', n) });
          clips.push({ key: `story_${story.id}_b${n}`, text: storySentence(story, 'second', n) });
        }
        clips.push({ key: `story_${story.id}_q`, text: story.question });
      }
    } else if (group === 'numbers') {
      for (let n = value.from; n <= value.to; n++) clips.push({ key: `n${n}`, text: String(n) });
    } else if (Array.isArray(value)) {
      value.forEach((text, i) => clips.push({ key: `${group}_${i}`, text }));
    } else {
      for (const [k, text] of Object.entries(value)) clips.push({ key: `${group}_${k}`, text });
    }
  }
  return clips;
}
