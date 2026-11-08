# 🐱 L'École des Chats Sorciers

Outil d'aide aux devoirs ludique pour un enfant de 6 ans, sur le thème chat, sorcier et magie.
Première activité : les **Potions d'addition**.

- Site 100 % statique : HTML, CSS et JavaScript (modules ES), **aucune dépendance, aucun build**.
- La progression est enregistrée dans le navigateur (`localStorage`), sur l'ordinateur de l'enfant. Rien n'est envoyé sur Internet.

## Lancer en local

```bash
cd devoirs-magiques
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

> Il faut passer par un petit serveur, car les modules JavaScript ne se chargent pas en ouvrant `index.html` directement (`file://`).

**Tests** : ouvrir http://localhost:8000/tests/ (ou `node tests/tests.js` si Node ≥ 18 est installé).

## Mettre en ligne (GitHub Pages)

À faire avec un compte **personnel**.

1. Créer un dépôt (par exemple `devoirs-magiques`) et y pousser le contenu de ce dossier :
   ```bash
   git init && git add . && git commit -m "Première version"
   git branch -M main
   git remote add origin git@github.com:<compte>/devoirs-magiques.git
   git push -u origin main
   ```
2. Sur GitHub, aller dans *Settings → Pages → Build and deployment*, choisir *Deploy from a branch*, puis la branche `main` et le dossier `/ (root)`.
3. Le site est disponible à l'adresse `https://<compte>.github.io/devoirs-magiques/`. Sur l'ordinateur de l'enfant, il suffit d'ajouter cette adresse en favori.

Chaque `git push` met le site à jour en une minute environ. La progression de l'enfant n'est pas touchée, car elle reste dans son navigateur.

*Avec GitLab Pages, c'est le même principe : ajouter un `.gitlab-ci.yml` qui copie les fichiers dans `public/`.*

## Comment ça marche

| Élément | Règle (modifiable dans l'Espace parent) |
|---|---|
| Exercice | 10 questions. Après une 1re erreur : un message ciblé et un indice de stratégie (ligne numérique, « complète jusqu'à 10 »). Après la 2e : aide avec des boîtes de 10, puis l'enfant recopie la réponse |
| Étoiles ⭐ | 1 par bonne réponse du premier coup, ½ au 2e essai |
| Chapeaux 🎩 | 3 = sans faute, 2 = au moins 80 %, 1 = au moins 60 % |
| Exercice réussi | au moins 1 chapeau |
| Gemme de lune 💎 | 10 exercices réussis = 1 gemme = 1 tour de Roue du Destin |
| Calcul « su » | réussi 3 fois d'affilée du premier coup. Les calculs sus s'écrivent en or dans le **grimoire** (table d'addition) |
| Niveaux | le niveau suivant s'ouvre quand 80 % de ses calculs sont sus **ou** après 3 sans-fautes, **sans dépasser le plafond** fixé par le parent |
| Anti-frustration | après 2 exercices difficiles d'affilée, le chat propose de s'échauffer au niveau précédent |
| Rythme | le chat propose une pause tous les 3 exercices ; une limite quotidienne est réglable (désactivée par défaut) |
| Rangs | selon le total d'étoiles : Chaton apprenti → Apprenti sorcier → Mage → Grand mage → Archimage |
| Familiers 🐾 | des cartes à collectionner, débloquées par paliers |
| Révisions | les calculs ratés reviennent en priorité, puis ceux pas encore sus, avec quelques révisions de calculs sus |

**Espace parent** (bouton 🔒 en bas de l'accueil, protégé par une multiplication) : prénom, sons, plafond et niveaux débloqués, nombre de questions, seuils, lots de la roue avec leurs poids, bons gagnés, suivi de la semaine, calculs à retravailler, **export et import de la sauvegarde**.

> 💡 Exportez la sauvegarde de temps en temps : si les données du navigateur sont effacées, la progression est perdue.

## Structure

```
index.html
css/theme.css            couleurs et polices (changer de thème = modifier les variables)
css/components.css       styles des écrans
js/main.js               routeur (#/accueil, #/exercice/<activité>/<niveau>, #/roue, #/parent, #/familiers)
js/config.js             valeurs par défaut : réglages, lots de la roue, rangs, familiers
js/store.js              sauvegarde versionnée (+ migrations), export et import
js/rewards.js            règles de récompense (fonctions pures, testées)
js/rng.js                aléatoire et tirage pondéré
js/sound.js              sons générés (Web Audio)
js/ui/                   mascotte, pavé numérique, barre de progression, effets
js/screens/              écrans ; exercise.js est un moteur générique
js/activities/           une activité par fichier + registry.js
tests/                   tests (navigateur ou Node)
```

## Ajouter une activité (soustraction, heure, multiplications…)

1. Créer `js/activities/soustraction.js` en suivant le modèle de `addition.js` :
   ```js
   export default {
     id: 'soustraction',
     title: 'Potions de soustraction',
     subtitle: '…',
     icon: '🧹',
     levels: [{ id: 1, label: 'Jusqu’à 5', params: { max: 5 } }, /* … */],
     defaultCeiling: 1,
     maxInputLength: 2,
     generate(params, { rng, count, missed, isMastered }) { /* → [{ prompt, answer, key, ... }] */ },
     check(question, input) { /* → true / false */ },
     renderHelp(question) { /* → élément HTML affiché après 2 erreurs */ },
     // Facultatif :
     levelFacts(params) { /* → liste des clés de calcul du niveau (maîtrise), ou null */ },
     diagnose(question, input) { /* → message pour une erreur typique, ou null */ },
     renderHint(question) { /* → indice de stratégie après la 1re erreur */ },
     speak(question) { /* → phrase lue par le bouton 🔊 */ },
     renderGrimoire(actState, { isMastered }) { /* → page du grimoire */ },
   };
   ```
2. L'ajouter dans `js/activities/registry.js`.

C'est tout : l'accueil, le moteur d'exercice, les récompenses, les niveaux et l'Espace parent la prennent en charge automatiquement.

## Faire évoluer le format de sauvegarde

Les nouveaux champs ajoutés à `defaultState()` (`js/store.js`) sont complétés automatiquement dans les anciennes sauvegardes. Pour un changement de structure, incrémenter `SCHEMA_VERSION` et ajouter une fonction dans `MIGRATIONS`.

## Idées pour la suite

Soustractions, compléments à 10, comparer des nombres (<, >, =), dictée de nombres en audio, lecture de l'heure, monnaie, tables de multiplication, mots outils. Mode hors ligne installable (PWA), plusieurs profils, défi du jour.
