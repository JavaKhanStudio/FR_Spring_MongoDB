# Déroulé — 3 jours

Fiche de conduite du formateur. Chaque séquence indique **ce qu'on projette**
et **le geste qui doit rester** en fin de séquence.

---

## Avant la session

```bash
make simple
make amorcer          # 00-jeu-de-donnees.js + 00b-generer-volume.js
```

Vérifier : `make shell` puis `db.navires.countDocuments()` → **45**, et
`db.journauxBord.countDocuments()` → **100 000**.

---

## J1 matin — Concepts et mise en place

| Séquence | Support | Le geste qui reste |
|---|---|---|
| SQL vs NoSQL | `docs/sql-vs-nosql.md` §1 | *le même navire, 6 tables contre 1 document* |
| Écosystème NoSQL | `docs/sql-vs-nosql.md` §3 | *4 familles, pas concurrentes* |
| MongoDB vs PostgreSQL JSONB | `docs/sql-vs-nosql.md` §4 | *la règle de décision* |
| CAP | `docs/sql-vs-nosql.md` §5 | *MongoDB est CP : il refuse l'écriture plutôt que de diverger* |
| Installation | `docker/docker-compose.yml`, `docker/README.md` | `make simple` |
| Paramétrage, auth, rôles | `docker/mongo-init/` | *trois comptes, trois portées* |
| Compass, mongosh | `docs/outils.md` | **l'onglet Schema de Compass** |

> Réplication et sharding sont **annoncés** ici (le programme les range sous
> « Initialisation »), mais joués en J2 après-midi. Voir CONCEPTION §11.

---

## J1 après-midi — Utilisation de base

| Séquence | Support | Le geste qui reste |
|---|---|---|
| CRUD | `mongosh/01-crud.js` | *`replaceOne` écrase, `updateOne`+`$set` fusionne* |
| Opérateurs de mise à jour | idem | *`$addToSet` est rejouable, `$push` non* |
| Upsert | idem | *le filtre sert aussi de gabarit* |
| find, projection | `mongosh/02-requetes.js` | *on ne mélange pas inclusion et exclusion* |
| sort, limit, skip | idem | *pagination sans tri stable = doublons et oublis* |
| Opérateurs de requête | `mongosh/03-operateurs.js` | *`$ne: null` exclut l'absent, `$ne: "X"` l'inclut* |
| **`$elemMatch`** | idem, dernière section | **17 résultats contre 9 : 8 faux positifs, dont le Charles de Gaulle** |

C'est la séquence `$elemMatch` qui doit rester du J1. Elle se rejoue en
30 secondes et elle marque.

---

## J2 matin — Index et modélisation

| Séquence | Support | Le geste qui reste |
|---|---|---|
| État initial, `explain()` | `mongosh/04-index.js` §1 | *lire la colonne « docs lus »* |
| Index composé, règle **ESR** | §2 | *Égalité, Sort, Range — dans cet ordre* |
| `hideIndex` | §2 | *tester « et si je le retirais ? » sans le supprimer* |
| Préfixe d'index | §3 | *un index composé en sert plusieurs* |
| Index couvrant | §4 | *0 document lu — mais il faut exclure `_id`* |
| Index unique | §5 | *l'unicité se décide sur le métier : ici le couple (nation, coque)* |
| Index partiel | §6 | *250 entrées au lieu de 100 000, même service* |
| Multiclé, texte, 2dsphere | §7-9 | *un seul index texte par collection* |
| `$indexStats` | §10 | *0 utilisation = index à supprimer* |
| **Embedded / Referred** | `mongosh/05-embedded-referred.js` | *cycle de vie, cardinalité, accès — la cardinalité tranche* |
| Le contre-exemple équipage | §5 du script | **1 950 marins ne s'embarquent pas** |
| La référence enrichie | §6 | *recopier ce qui change rarement* |
| **Catalogue de patterns** | `mongosh/05b-patterns.js` | *embedded/referred est la première question, pas la seule* |
| Polymorphic | §1 du script | **un sous-marin et un porte-avions n'ont pas la même forme** |
| Extended Reference | §2 | *on dénormalise champ par champ, jamais en bloc* |
| Subset | §3 | *l'état-major embarqué, le roster référencé* |
| Computed | §4 | *le prix, c'est la dérive — prévoir la réconciliation* |
| Bucket, Attribute | §5-6 | *time series = bucket automatisé* |
| Le contre-poison | fin du script | **quel écran, appelé combien de fois, est rendu plus rapide ?** |

---

## J2 après-midi — Agrégations, réplication, sharding

| Séquence | Support | Le geste qui reste |
|---|---|---|
| `$match`, `$group` | `mongosh/06-agregations.js` §1-2 | *`$match` en premier, toujours* |
| `$unwind` | §3 | *le second `$match`, après le `$unwind`* |
| `$lookup` | §4-5 | *un `$lookup` rend toujours un tableau* |
| `$bucket`, `$facet` | §6-7 | *`$facet` : une passe, plusieurs analyses — mais aucun index* |
| `$out` / `$merge` | §10 | *`$out` écrase, `$merge` fusionne* |
| **Bascule de profil** | `make stop && make replique` | — |
| Réplication | `mongosh/07-replication.js` | *nombre de votants impair, toujours* |
| Write concern | §4 du script | *`w:"majority"` est le défaut sain ; `w:N` bloque à la première panne* |
| Bascule en direct | §6 | `rs.stepDown(30)` |
| Transactions *(bonus)* | `mongosh/09-transactions.js` | *si les chemins chauds ont besoin de transactions, revoir le modèle* |
| **Bascule de profil** | `make stop && make partition` puis `make cluster-charger` | — |
| Avant : rien n'est réparti | `08-sharding.js` §2 | *une collection non partitionnée vit sur UN shard* |
| Le choix de la clé | §3 | *cardinalité mesurée sur les candidats réels* |
| **Partitionnement en direct** | §4 | **1 → 3 → 8 chunks sous les yeux de la salle** |
| Les deux pièges de lecture | §5 | *on équilibre des OCTETS, pas des chunks ; `$collStats` compte les orphelins* |
| Ciblé vs diffusé | §6 | *1 shard contre 2 — si la majorité diffuse, la clé est mauvaise* |
| **L'ajout à chaud** | `make etendre` + `make cluster-sonde` | **la sonde reste à 100 000 pendant qu'une machine rejoint le cluster** |

En fin de séquence : `make stop && make simple` pour le J3.

---

## J3 matin — Spring Data MongoDB

| Séquence | Support | Le geste qui reste |
|---|---|---|
| Le projet, l'arborescence | `amiraute-api/README.md` | *un module, des paquets en français* |
| Mapping | `domain/Navire.java` | *`record` pour l'embarqué, classes pour l'audit et `@Version`* |
| **Polymorphisme** | `SousMarin`, `PorteAeronefs`, `BatimentSurface` | *`@TypeAlias`, une collection, trois formes* |
| **Le faux filtre** | `SousMarinRepository` | **`count()` rend 45, pas 10 — Spring ne filtre pas sur `_class`** |
| Deux discriminants | `_class` et `categorie` | *base et réseau, deux frontières* |
| Audit et verrouillage | `config/MongoConfig` | *sans `@EnableMongoAuditing`, les dates restent nulles* |
| `MongoRepository` | `depot/NavireRepository.java` | *le nom de méthode EST la requête* |
| `@Query` + `$elemMatch` | idem | **la dérivée équivalente serait fausse** |
| Projections | `web/dto/NavireSummary` | *une interface, aucune implémentation* |
| Pagination | `NavireController` | — |
| **La ligne de partage** | `NavireRepositoryCustom` | *une interface injectée, deux moteurs derrière* |
| `Criteria` dynamiques | `repository/impl/…Impl.java` | *treize critères, 2^13 combinaisons, une méthode* |
| `$geoWithin` vs `$near` | idem | *`$near` ne se pagine pas* |
| `updateMulti` | idem | *N documents modifiés, zéro chargé* |
| **Les trois références** | `domain/demo/` + `/api/demonstration/…` | **`@DBRef` contamine le format stocké** |

---

## J3 après-midi — Agrégations Spring, bonnes pratiques, diagnostic

| Séquence | Support | Le geste qui reste |
|---|---|---|
| Portage des pipelines | `depot/agregation/StatistiqueRepository` | *l'agrégation est un calcul, pas une requête : sa propre couche* |
| `$facet` en Spring | idem + `StatistiqueService` | *sortie hétérogène → `Document` brut, remis en forme au-dessus* |
| Types BSON | `StatistiqueService.nombre()` | *un `$sum` peut rendre Integer, Long ou Double* |
| **Index : la bonne pratique** | `config/IndexConfig` | *annotation pour l'intention, création maîtrisée au démarrage* |
| Absence d'intégrité | `NavireService.supprimer` | *aucun `ON DELETE CASCADE` : c'est au code* |
| `explain()` depuis REST | `/api/diagnostic/comparaison-index` | **le ratio docs lus / rendus** |
| Profileur | `/api/diagnostic/profileur` | *niveau 2 jamais en production* |
| Logs | `make logs`, `grep 'Slow query'` | *`planSummary` est la colonne à lire en premier* |
| **La requête lente** | `/api/diagnostic/requete-lente` | **à trouver par les outils, pas en lisant le code** |
| **Les quatre pages** | `/vue/navires`, `/vue/diagnostic` | **le compteur : 2 requêtes contre 12, page identique** |
| La méthode en 5 gestes | `mongosh/10-diagnostic.js` §8 | *logs → explain → indexStats → corriger → **remesurer*** |
| Le mot de la fin | idem | *un index se justifie, il ne s'ajoute pas par réflexe* |
| **Le banc de poissons** *(bonus)* | `mongosh/11-antipatterns.js` | **28 × plus de données pour la même information** |
| Les types mélangés | §3 du script | *1 304 documents invisibles, aucune erreur levée* |
| La date en chaîne | §4 | *le tri donne le 1er de chaque mois avant le 2 janvier* |
| La référence cassée | §9 | *`$lookup` rend 0 sur 4 000, sans broncher* |
| La conclusion | fin du script | *l'absence de schéma déclaré n'est pas l'absence de schéma* |

---

## Si le temps manque

Dans cet ordre, ce qui passe en travail personnel :

1. `mongosh/09-transactions.js` — bonus assumé, hors programme strict.
2. `mongosh/08-sharding.js` §6-7 — garder §2 (le choix de la clé), qui est
   l'essentiel.
3. `mongosh/04-index.js` §3-4 (préfixe, index couvrant) — précieux, mais moins
   que l'index partiel et la règle ESR.
4. Les endpoints d'écriture du J3 matin — projeter, ne pas dérouler.

**Ne jamais sacrifier :** `$elemMatch` (J1), la règle ESR et l'index partiel
(J2 matin), le contre-exemple équipage (J2 matin), la ligne de partage
Repository/Template (J3 matin), la requête lente (J3 après-midi).
