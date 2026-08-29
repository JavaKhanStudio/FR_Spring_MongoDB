# E11 — Le repository multicritère

**Module** `MongoTemplate` et `Criteria` · **J3 matin** · **Proche** · ★★★ · ~45 min

## Contexte

L'état-major demande un nouvel écran de recherche sur les **missions**.
`MissionRepository` est un `MongoRepository` ordinaire : il ne saura pas répondre.

Tu vas lui ajouter une partie `MongoTemplate`, en reproduisant exactement le
motif utilisé pour `NavireRepository`.

## Ce dont tu disposes

- Le projet `amiraute-api`, qui compile.
- Le modèle à copier : `NavireRepository` / `NavireRepositoryCustom` /
  `impl/NavireRepositoryCustomImpl`.
- `MissionRepository`, `Mission`, et le document `missions` (25 documents).

## Travail demandé

1. Créer `MissionRepositoryPersonnalise` avec une méthode :
   ```java
   Page<Mission> searchAdvanced(CritereMission criteres, Pageable pageable);
   ```
2. Créer le record `MissionSearchCriteria` dans `web/dto`, avec **tous les critères
   facultatifs** : `type`, `statut`, `dateDebutMin`, `dateDebutMax`,
   `coutMin`, `coutMax`, `navireId`, `objectifContient`, `zoneNom`.
3. Créer `impl/MissionRepositoryPersonnaliseImpl` et l'implémenter avec `Criteria`.
   **Attention au nom de la classe** : le suffixe n'est pas décoratif.
4. Faire étendre `MissionRepositoryPersonnalise` par `MissionRepository`. Vérifier
   qu'aucune configuration supplémentaire n'est nécessaire.
5. Exposer `GET /api/missions/recherche` dans `MissionController`, en renvoyant
   un `PageResponse<Mission>`.
6. Ajouter une seconde méthode : `coutTotalParStatut()`, qui renvoie une
   `Map<StatutMission, Long>`. **Où la mettre** — dans le repository personnalisé ou
   dans `StatistiqueRepository` ? Justifier.
7. Écrire un test `@DataMongoTest` couvrant au moins : aucun critère, un
   critère, un encadrement de dates, et le filtre par `navireId`.

## Résultat attendu

- Sans critère : **25** missions.
- `statut=EN_COURS` : **10**.
- `type=EXERCICE` : **7**.
- `coutMin=100000000` : les missions à 100 M€ et plus.
- `navireId` du *Charles de Gaulle* : **1** mission (CLEMENCEAU 26).
  Vérifie ce chiffre avant de coder — ne le suppose pas.
- Le filtre `navireId` doit interroger le sous-champ `id` du **tableau de
  références enrichies** `naviresParticipants`. Une simple égalité suffit —
  sais-tu dire pourquoi ?

Vérification :

```bash
cd amiraute-api && ./mvnw test
curl "http://localhost:8080/api/missions/recherche?statut=EN_COURS&coutMin=50000000"
```

## Pièges volontaires

- Si la classe s'appelle `MissionRepositoryCustom` ou `MissionRepositoryPersonnaliseImplementation`,
  Spring **ne la trouvera pas** et échouera au démarrage avec un message peu
  clair. Le suffixe **`Impl`** est imposé par la convention.
- Les deux bornes d'un encadrement doivent aller sur le **même** `Criteria`.
  Deux `Criteria.where("coutEstimeEuros")` séparés : le second écrase le premier
  dans le BSON produit — **silencieusement**.
- `query.with(pageable)` modifie l'objet `Query` **en place**. Compter après
  l'avoir appliqué donne le nombre d'éléments de la page, pas le total.

## Pour aller plus loin

Ta méthode `searchAdvanced` fait deux allers-retours : un `count`, puis un
`find`. Sur une collection volumineuse, le `count` peut coûter aussi cher que
le `find`.

Cherche `Window` et `ScrollPosition` dans Spring Data. Quel contrat perd-on en
échange, et pour quel type d'écran est-ce acceptable ?
