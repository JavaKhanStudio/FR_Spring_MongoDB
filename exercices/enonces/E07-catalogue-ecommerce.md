# E07 — Le catalogue e-commerce

**Module** index composé, règle ESR, tri couvert · **J2 matin** · **Hors-piste** · ★★★ · ~45 min

## Contexte

Un site de vente en ligne. La page catalogue affiche les produits d'une
catégorie, filtrés par disponibilité, triés par prix. Elle est appelée
**des milliers de fois par minute** et elle est lente.

Aucun navire ici : l'enjeu est de savoir appliquer la règle ESR à un domaine
que tu découvres.

## Ce dont tu disposes

Le script d'amorce ci-dessous crée `ex_produits` et y insère
**200 000 documents**. À jouer une fois :

```bash
make charger F=exercices/corriges/E07-amorce.js
```

Forme d'un document :

```json
{
  "reference": "REF-000123",
  "libelle": "Casque audio Kappa 7",
  "categorie": "audio",
  "marque": "Kappa",
  "prixCentimes": 8990,
  "stock": 42,
  "disponible": true,
  "note": 4.3,
  "dateAjout": "2025-04-12T00:00:00Z"
}
```

## La requête à optimiser

```js
db.ex_produits
  .find({ categorie: "audio", disponible: true, prixCentimes: { $lte: 15000 } })
  .sort({ prixCentimes: 1 })
  .limit(24)
```

## Travail demandé

1. Mesurer **sans index**. Noter `totalDocsExamined` et l'étape gagnante.
2. Créer un index **naïf** `{ categorie: 1 }`. Remesurer. Le `SORT` a-t-il
   disparu ?
3. Proposer **trois** index composés candidats, dans trois ordres de clés
   différents. Les créer tous les trois, puis les comparer en utilisant
   `hideIndex()` pour n'en laisser qu'un actif à la fois.
4. Désigner le gagnant et **justifier par la règle ESR**.
5. Rendre la requête **couvrante** : trouver la projection et, si nécessaire,
   compléter l'index. Vérifier `totalDocsExamined` = 0.
6. La page produit une seconde requête : `{ marque: "Kappa" }` triée par
   `note` décroissante. Ton index gagnant la sert-il ? Sinon, faut-il en créer
   un second, ou peut-on réorganiser ?
7. Supprimer les index perdants et justifier chaque suppression.

## Résultat attendu

1. `COLLSCAN` + `SORT`, ≈ **200 000** documents examinés pour 24 rendus.
2. Le `SORT` **reste** : l'index sert le filtre, pas le tri.
3. Les trois candidats naturels :
   - `{ categorie: 1, prixCentimes: 1, disponible: 1 }`
   - `{ categorie: 1, disponible: 1, prixCentimes: 1 }`
   - `{ prixCentimes: 1, categorie: 1, disponible: 1 }`
4. Gagnant : **`{ categorie: 1, disponible: 1, prixCentimes: 1 }`**.
   **E** — `categorie` et `disponible` sont testés par **égalité**, donc en
   tête. **S** et **R** — `prixCentimes` porte à la fois le tri et
   l'intervalle, donc en queue. Le troisième candidat est le pire :
   `prixCentimes` en tête est un **Range**, et un range en tête casse
   l'utilisabilité de tout ce qui suit.
5. `{ _id: 0, libelle: 1, prixCentimes: 1 }` ne suffit pas — il faut ajouter
   `libelle` en fin d'index. `PROJECTION_COVERED`, **0** document lu.
6. Non : `marque` n'est pas un préfixe de l'index gagnant. Un **second index**
   `{ marque: 1, note: -1 }` est justifié — deux requêtes majeures, deux accès
   différents, on ne peut pas les fusionner.
7. Les deux perdants coûtent à chaque écriture sans rien rendre. `hideIndex()`
   d'abord, `dropIndex()` ensuite.

## Pour aller plus loin

Le catalogue ajoute un filtre facultatif « note ≥ 4 ». Où le placerais-tu dans
l'index gagnant ? Y a-t-il un endroit qui ne dégrade **aucune** des requêtes
existantes ?

Et si les filtres facultatifs devenaient six ou sept — comme dans la recherche
multicritère d'AMIRAUTE ? À partir de combien de combinaisons renonce-t-on à
indexer chaque cas ?
