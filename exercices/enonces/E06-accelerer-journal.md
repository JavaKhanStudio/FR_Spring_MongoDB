# E06 — Accélérer le journal de bord

**Module** Index et `explain()` · **J2 matin** · **Proche** · ★★ · ~25 min

## Contexte

`journauxBord` contient 100 000 relevés de télémétrie. L'application de suivi
est lente. Tu dois **mesurer avant de corriger**, et **remesurer après**.

## Ce dont tu disposes

- `journauxBord`, 100 000 documents : `navireId`, `horodatage`, `position`,
  `vitesseNoeuds`, `capDegres`, `carburantPourcent`, `evenement`.
- **Repars d'une collection sans index** :
  ```bash
  make charger F=mongosh/00b-generer-volume.js
  ```

## Travail demandé

Pour chaque étape, note `nReturned`, `totalDocsExamined`, `totalKeysExamined`,
`executionTimeMillis` et l'étape gagnante du plan.

1. Mesurer, **sans index**, la requête « tous les relevés d'un navire donné ».
2. Créer l'index qui convient. Remesurer. De combien le nombre de documents
   examinés a-t-il baissé ?
3. Mesurer « les relevés d'un navire, entre deux dates, triés par horodatage ».
   Une étape `SORT` apparaît-elle dans le plan ?
4. Créer l'index composé qui fait disparaître le `SORT`. **Dans quel ordre
   mettre les clés, et pourquoi ?**
5. Vérifier que l'index de l'étape 2 est devenu redondant, puis le supprimer.
   Justifier.
6. Trouver une projection qui rende la requête de l'étape 4 **couvrante**
   (`totalDocsExamined` = 0). Quelle contrainte cela impose-t-il ?
7. Mesurer `{ evenement: "AVARIE_MINEURE" }`. Créer un index **partiel** qui
   ne couvre que les relevés porteurs d'un événement. Comparer la **taille**
   de cet index à celle de l'index de l'étape 4.
   **Attention : tous les `partialFilterExpression` ne se valent pas.** Si ton
   index n'est pas utilisé, ce n'est pas une erreur de syntaxe.

## Résultat attendu

1. `COLLSCAN`, `totalDocsExamined` ≈ **100 000** pour ~2 400 rendus.
2. `IXSCAN`, `totalDocsExamined` ≈ **2 400** — un rapport de **40 ×**.
3. Oui : le plan contient `SORT`, précédé de `SORT_KEY_GENERATOR`.
4. `{ navireId: 1, horodatage: 1 }`. **Règle ESR** : Égalité d'abord
   (`navireId`), Sort ensuite (`horodatage`) — qui sert ici aussi de Range.
   L'ordre inverse serait nettement moins efficace.
5. `{ navireId: 1 }` est un **préfixe** de l'index composé, donc couvert par
   lui. Un index de trop coûte à **chaque écriture**, sans rien rendre.
6. `{ _id: 0, horodatage: 1 }` → `PROJECTION_COVERED`. Contrainte : il faut
   **exclure `_id`**, sinon il faut aller chercher le document.
7. Sans index : `COLLSCAN` sur 100 000. Index partiel avec
   `{ evenement: { $exists: true } }` : `IXSCAN`, **30 documents examinés**, et
   ~250 entrées d'index au lieu de 100 000.

## Pour aller plus loin

À l'étape 7, refais l'index partiel avec quatre filtres différents et mesure
la **même** requête `{ evenement: "AVARIE_MINEURE" }` à chaque fois :

| `partialFilterExpression` | Ce qui se passe |
|---|---|
| `{ evenement: { $exists: true } }` | ? |
| `{ evenement: { $gt: "" } }` | ? |
| `{ evenement: { $type: "string" } }` | ? |
| `{ evenement: { $ne: null } }` | ? |

Un des quatre est **refusé à la création**. Un autre crée bien l'index mais
produit un `COLLSCAN` — alors que la condition est logiquement vraie.

Formule la règle en une phrase, puis demande-toi ce qu'elle implique quand on
hérite d'un index partiel écrit par quelqu'un d'autre.

**Question de modélisation, pour finir.** Le champ `evenement` est *absent*
quand il n'y a pas d'événement, et non pas `null`. Que se passerait-il pour cet
index si le générateur écrivait `evenement: null` ?
