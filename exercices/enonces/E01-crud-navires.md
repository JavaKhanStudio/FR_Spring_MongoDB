# E01 — Le chantier naval

**Module** CRUD · **J1 après-midi** · **Proche** · ★ · ~10 min

## Contexte

L'Atlantide se dote d'une marine et te confie la saisie de ses trois premiers
bâtiments. Tu travailles dans `navires`, sur des données fictives : le
référentiel réel ne doit pas bouger.

## Ce dont tu disposes

- La collection `navires`, 45 documents.
- `make shell` pour ouvrir un `mongosh` sur la base `amiraute`.

Note ton point de départ avant de commencer :

```js
db.navires.countDocuments()
```

## Travail demandé

1. Insérer **un** navire : `numeroCoque` `"A01"`, nom `"Poseidon"`, nation
   `"Atlantide"`, type `"CORVETTE"`, statut `"ACTIF"`, 2 200 tonnes,
   mis en service en 2026.
2. Insérer **deux** navires en une seule commande : `"A02"` / `"Triton"` et
   `"A03"` / `"Nerée"`, tous deux `"PATROUILLEUR"`, `"ACTIF"`, 800 tonnes.
3. Le *Poseidon* entre au bassin : passer son `statut` à `"EN_REPARATION"` et
   **ajouter** un champ `derniereRevision` daté du 1er août 2026.
4. Il ressort modernisé : ajouter 300 tonnes à son déplacement, ajouter
   l'étiquette `"modernise"` dans un tableau `etiquettes`, et **supprimer** le
   champ `derniereRevision`.
5. Toute la flotte atlante reçoit l'étiquette `"flotte-experimentale"` — en
   **une seule commande**, sans créer de doublon si on la rejoue.
6. Remplacer intégralement le document du *Triton* par une version ne
   contenant que `numeroCoque`, `nom`, `nation` et `deplacementTonnes`.
   Observer ce qu'il advient de son champ `etiquettes`.
7. Supprimer tous les navires de nation `"Atlantide"`.

## Résultat attendu

- Après 2 : `db.navires.countDocuments()` → **48**
- Après 4 : le *Poseidon* pèse **2 500** tonnes, `etiquettes` vaut
  `["modernise"]`, et `derniereRevision` **n'existe plus**.
- Après 5 : `modifiedCount` vaut **3** au premier passage, **0** au second.
- Après 6 : le *Triton* n'a **plus** de champ `etiquettes`, ni `type`, ni
  `statut`.
- Après 7 : `deletedCount` → **3**, et `countDocuments()` revient à **45**.

## Pour aller plus loin

À l'étape 3, tu as créé le champ `derniereRevision` sur **un seul** des
45 navires. La collection est donc désormais hétérogène, et MongoDB ne s'en
émeut pas.

Est-ce une force ou un défaut ? Formule la réponse en une phrase, puis demande-toi
comment tu t'assurerais, six mois plus tard, que ce champ existe bien partout
où il devrait.
