# AMIRAUTE

> Projet fil rouge de la formation **MongoDB / NoSQL avec Spring** — 3 jours.
> Le système d'information d'un état-major naval fictif.

---

## Démarrage en trois commandes

```bash
make simple      # MongoDB 8.0 + mongo-express
make amorcer     # 45 navires, 14 ports, 13 flottes, 25 missions, 100 000 releves
cd amiraute-api && ./mvnw spring-boot:run
```

| | |
|---|---|
| MongoDB | `mongodb://localhost:27017` — `amiral` / `amiral` |
| mongo-express | <http://localhost:8081> |
| API | <http://localhost:8080/api/navires?nation=France> |
| Pages | <http://localhost:8080/vue/navires> — avec le compteur de requêtes Mongo |

`make aide` liste toutes les cibles.

---

## Le repository

```
.
├── docs/
│   ├── CONCEPTION.md          <- COMMENCER ICI : modele, decisions, conventions
│   ├── deroule-3-jours.md     <- la fiche de conduite du formateur
│   ├── sql-vs-nosql.md        <- support du J1 matin
│   └── outils.md              <- mongosh, Compass, mongo-express, Database Tools
├── docker/
│   ├── docker-compose.yml     <- 4 profils : simple / replique / partition / extension
│   ├── mongo-init/            <- comptes applicatifs, creation des collections
│   ├── rs-init/  shard-init/
│   └── README.md
├── mongosh/                   <- la partie MongoDB pure du cours (J1 et J2)
│   ├── 00-jeu-de-donnees.js   <- le referentiel, ecrit a la main
│   ├── 00b-generer-volume.js  <- 1 941 marins + 100 000 releves, graine fixe
│   ├── 01-crud → 10-diagnostic
│   ├── 05b-patterns.js     <- Polymorphic, Extended Ref, Subset, Computed…
│   ├── 11-antipatterns.js  <- le banc de poissons : ce que produit un MAUVAIS modele
│   └── README.md
├── amiraute-api/              <- l'application Spring Boot (J3)
│   ├── src/main/java/fr/formation/amiraute/
│   ├── requetes.http          <- tous les endpoints, annotes
│   └── README.md
├── bruno/amiraute/            <- collection Bruno : 33 requetes documentees
├── exercices/                 <- l'annexe : 12 exercices, enonces + corriges
│   └── README.md              <- l'index, filtrable par demi-journee
└── Makefile
```

---

## Le modèle en une image

```
                       +-------------+
                       |   flottes   |
                       +------+------+
                              ^  extended ref { id, nom, nation }
+----------+                  |
|  ports   |<-----------+  n a v i r e s  +----->+ missions          |
+----------+ extended   |  POLYMORPHE     |      | naviresParticipants
   ref      { id, nom,  |                 |      |   [{id,nom,coque}]|
             pays }     |  sous-marin  10 |      +-------------------+
                        |  porte-aero. 17 |
                        |  bat.-surf.  18 |
                        |                 |
                        |  etatMajor[]    |  <- SUBSET  (5 officiers)
                        |  stats{}        |  <- COMPUTED
                        +--------+--------+
                                 |  navireId
                    +------------+------------+
                    v                         v
          +------------------+      +-----------------+
          | membresEquipage  |      |  journauxBord   |
          |     1 941        |      |    100 000      |
          +------------------+      +-----------------+
```

**Le principe de conception** : *complet, mais avec des poches de simplicité.*

`navires` est le document riche — et il n'a **pas une seule forme**. Un
sous-marin porte `profondeurMaxMetres` et `missionStrategique` ; un
porte-aéronefs porte `typeCatapulte` et un tableau `groupeAerien`. Trois formes,
une collection, un discriminant `_class`.

**Cinq patterns de modélisation** sont appliqués et démontrés en direct :

| Pattern | Dans le projet |
|---|---|
| **Polymorphic** | trois formes de `navires`, `@TypeAlias`, et le filtre `_class` à écrire soi-même |
| **Extended Reference** | `portAttache: { id, nom, pays }` — plus de `$lookup` sur l'écran chaud |
| **Subset** | `etatMajor` embarqué, les 1 941 marins référencés |
| **Computed** | `stats.nombreMissions`, `stats.dernierReleve` |
| **Bucket** | en exercice — expliqué, et **volontairement** pas dans le modèle |

Tout le reste est délibérément pauvre, pour qu'un concept puisse être isolé
sans que le bruit du modèle ne masque le mécanisme.

## Correspondance programme → projet

| Module du programme | Où c'est démontré |
|---|---|
| SQL vs NoSQL, écosystème NoSQL | `docs/sql-vs-nosql.md` |
| Installation Docker, paramétrage | `docker/` — profil `simple` |
| Outils annexes | `docs/outils.md` |
| Réplication et Sharding | profils `replique` / `partition` / `extension`, `mongosh/07`, `08` — l'ajout d'un shard à chaud se joue en direct |
| Inserts, updates, deletes | `mongosh/01-crud.js` |
| find, limit, sort, skip | `mongosh/02-requetes.js` |
| `$eq` `$ne` `$gt` `$regex`… | `mongosh/03-operateurs.js` |
| Index (simple, unique, composé, partiel) | `mongosh/04-index.js` |
| Embedded et Referred | `mongosh/05-embedded-referred.js` + `CONCEPTION.md` §5 |
| *Patterns de modélisation* | `mongosh/05b-patterns.js` — au-delà du programme, mais c'est ce qui distingue MongoDB du SQL |
| Les Aggregates | `mongosh/06-agregations.js` |
| `MongoTemplate` / `MongoRepository` | `amiraute-api/.../depot/` |
| Bonnes pratiques (index, referred) | `config/IndexConfig`, `domain/demo/` |
| Performance et diagnostic | `mongosh/10-diagnostic.js`, `service/DiagnosticService` |
| *Anti-patterns* | `mongosh/11-antipatterns.js` — une collection délibérément malade, isolée, et son autopsie chiffrée |
| TP fil rouge | `exercices/` — 12 exercices, proches et hors-piste |

Le détail séquence par séquence est dans **`docs/deroule-3-jours.md`**.

---

## Conventions

**Français partout, ASCII strict.** Aucun accent ni cédille dans le code, les
identifiants, les commentaires, les clés JSON, les noms de fichiers.
`deplacementTonnes`, jamais `déplacementTonnes`.

Les accents ne sont autorisés que dans la documentation `.md` et les énoncés
d'exercices.

**Anglais** pour les artefacts logiciels et les verbes de méthode :
`Repository`, `Controller`, `Service`, `Config`, `Impl`, `findBy…`, `search…`,
`create`, `update`, `delete`.

**Français** pour le domaine naval : `Navire`, `Flotte`, `Armement`, `Capteur`,
`numeroCoque`, `deplacementTonnes`, `portAttache`.

Le glossaire complet est dans `docs/CONCEPTION.md` §7.2.

---

## Pile technique

| | | |
|---|---|---|
| MongoDB | **8.0** | Docker Compose, trois profils |
| JDK | **21** *(cible)* | compile et tourne sous 17, 21 ou 25 |
| Spring Boot | **3.5.16** | la version la mieux documentée pour Spring Data MongoDB |
| Build | **Maven** | wrapper `./mvnw`, rien à installer |
| Tests | **Testcontainers** | un vrai MongoDB, pas un substitut embarqué |

Les décisions et ce qui a été **écarté** — Lombok, Spring Security, front-end,
`@DBRef`, multi-module — sont justifiés dans `docs/CONCEPTION.md` §2.
# FR_Spring_MongoDB
