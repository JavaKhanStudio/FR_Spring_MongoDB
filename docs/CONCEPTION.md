# AMIRAUTE — Document de conception

> Support de formation **MongoDB / NoSQL avec Spring**
> Projet fil rouge : système d'information d'une marine de guerre.
> Version du document : 1.0 — 26/08/2026

---

## 1. Objectif du document

Ce document fixe **le terrain de jeu** avant écriture du moindre fichier Java :
le domaine métier, le modèle de données, l'architecture, les conventions, et la
correspondance entre **chaque point du programme** et **l'artefact du projet qui
le démontre**.

Il sert trois lecteurs :

| Lecteur | Ce qu'il y cherche |
|---|---|
| Le formateur | La carte : quel fichier ouvrir pour illustrer quel concept |
| L'apprenant | Le modèle métier et les conventions de nommage |
| Le futur mainteneur du support | Les décisions et leurs justifications |

### Principe directeur : « complet, mais avec des poches de simplicité »

Le projet doit être assez riche pour être crédible (index composés, agrégations à
plusieurs étages, références croisées), **mais chaque concept doit pouvoir être
isolé dans un objet volontairement pauvre**.

Concrètement :

- `Navire` est le document **riche** : sous-documents, tableaux, géospatial,
  références, verrouillage optimiste. C'est la vitrine.
- `Port` et `Flotte` sont volontairement **anémiques** (4 à 6 champs). Ils
  existent pour démontrer la **référence** sans que le bruit du modèle ne masque
  le mécanisme.
- `MembreEquipage` démontre le **1‑N référencé à forte cardinalité** et la
  pagination, rien d'autre.
- `JournalBord` démontre le **volume** (index, `explain()`, time series). Trois
  champs utiles, 100 000 documents.

Règle de conception : *si un concept demande une explication, il a droit à sa
propre collection minimale.*

---

## 2. Décisions techniques

| Sujet | Décision | Justification |
|---|---|---|
| JDK | **Java 21** (cible `release 21`, compile et tourne sous le JDK 25 installé) | Cible LTS large ; les apprenants sous 17/21/25 compilent tous |
| Framework | **Spring Boot 3.5.x** | Version la plus documentée pour Spring Data MongoDB ; évite de dérouter avec les nouveautés de Boot 4 |
| Accès données | **Spring Data MongoDB** (`spring-boot-starter-data-mongodb`) | Couvre les deux API du programme : `MongoRepository` et `MongoTemplate` |
| Build | **Maven** + wrapper (`mvnw`) | Aucun outil à installer côté apprenant |
| Serveur Mongo | **MongoDB 8.0** via Docker Compose | Le programme exige Docker ; 8.0 pour les time series et `$lookup` modernes |
| Noyau ≥ 6.19 | `GLIBC_TUNABLES=glibc.pthread.rseq=1` sur les 8 services | MongoDB 8.0+ refuse sinon de démarrer (SERVER-121912). Vérifié sur noyau 7.1.5 |
| IHM | **Compass** (poste) + **mongo-express** (conteneur) | Compass pour l'analyse, mongo-express pour un coup d'oeil rapide sans installation |
| Tests | **Testcontainers** + `@DataMongoTest` | Montre la bonne pratique ; aucun Mongo embarqué figé |
| API exposée | REST minimaliste (Spring MVC) | L'API n'est **pas** le sujet. Elle sert de déclencheur aux requêtes |
| Vues | **Thymeleaf**, 4 pages | Uniquement pour le compteur de requêtes : il rend mesurable ce qu'un log oblige à déchiffrer |
| Langue | Code, identifiants et commentaires en **français sans accents** | Public francophone ; ASCII pur pour éviter tout souci d'encodage |

### Décisions volontairement écartées

- **Pas de Spring Security.** Hors programme, ajoute du bruit.
- **Front-end réduit à quatre pages Thymeleaf**, sans framework CSS. Elles
  existent pour une seule raison : le **compteur de requêtes MongoDB** en pied
  de page, qui rend le N+1 et l'extended reference visibles sans lire un log
  (2 requêtes contre 12, page identique). Au-delà, l'API se pilote avec une
  collection **Bruno** (`bruno/amiraute/`), un fichier `.http` et `curl`. Bruno plutôt qu'un client propriétaire :
  ses fichiers `.bru` sont du **texte versionné avec le projet** — pas de
  compte, pas d'import, pas de synchronisation cloud. Un stagiaire clone le
  dépôt et a la collection.
- **Pas de `@DBRef` comme mécanisme principal.** Il est enseigné, mais dans un
  module dédié où l'on montre *pourquoi* on lui préfère la référence manuelle.
  Voir §5.3.
- **Pas de multi-module Maven.** Un seul module, des packages clairs. La
  complexité de build volerait du temps au sujet.

---

## 3. Le domaine : AMIRAUTE

> **AMIRAUTE** est le système d'information d'un état-major naval fictif.
> Il suit les navires de guerre du monde, leur armement, leurs ports d'attache,
> les flottes auxquelles ils appartiennent, les missions qu'ils exécutent, leurs
> équipages, et la télémétrie remontée par leur journal de bord.

Pourquoi ce domaine fonctionne pédagogiquement :

- **Un navire est naturellement un document.** Son armement, ses capteurs, sa
  propulsion n'ont aucune existence hors du navire. C'est l'argument
  *embedded* servi sur un plateau — et c'est exactement ce qu'un modèle
  relationnel éclaterait en six tables.
- **Un port d'attache est naturellement une référence.** Toulon existe
  indépendamment des navires qui y mouillent, et trente navires le partagent.
  C'est l'argument *referenced*, tout aussi évident.
- Les données sont **chiffrées et comparables** (tonnage, vitesse, portée,
  année) : les opérateurs `$gt`, les tris, les `$bucket` et les moyennes ont un
  sens métier immédiat.
- Les positions sont **géographiques** : l'index `2dsphere` n'est pas un gadget.
- Le journal de bord est **temporel et volumineux** : les index et `explain()`
  deviennent démontrables, pas théoriques.

---

## 4. Modèle de données

Six collections. Trois riches, trois volontairement pauvres.

```
                    +-------------+
                    |   flottes   |  (pauvre)
                    +------+------+
                           ^ flotteId
                           |
+----------+  portAttacheId |            +---------------+
|  ports   |<---------------+---navires--+ missions      |
| (pauvre) |                     |  ^    | naviresIds[]  |
+----------+                     |  +----+---------------+
                                 |
              navireId  +--------+--------+  navireId
                        v                 v
              +------------------+  +-----------------+
              | membresEquipage  |  |  journauxBord   |
              |    (pauvre)      |  | (pauvre, 100k)  |
              +------------------+  +-----------------+
```

### 4.1 `navires` — le document riche, et **polymorphe**

Trois formes de document dans une seule collection, départagées par `_class`.

**Le tronc commun**, présent sur les 45 :

```json
{
  "_id": "ObjectId(...)",
  "_class": "porte-aeronefs",
  "numeroCoque": "R91",
  "nom": "Charles de Gaulle",
  "type": "PORTE_AVIONS",
  "nation": "France",
  "statut": "ACTIF",
  "deplacementTonnes": 42500,
  "vitesseMaxNoeuds": 27,
  "equipageMax": 1950,

  "propulsion": { "type": "NUCLEAIRE", "puissanceChevaux": 83000, "nombreHelices": 2 },
  "armements":  [ { "designation": "Aster 15", "categorie": "MISSILE_ANTIAERIEN", "quantite": 32 } ],
  "capteurs":   [ { "designation": "DRBJ-11B", "categorie": "RADAR", "porteeKm": 400 } ],
  "positionActuelle": { "type": "Point", "coordinates": [5.93, 43.10] },

  "portAttache": { "id": "TOULON", "nom": "Toulon", "pays": "France" },
  "flotte":      { "id": "FAN", "nom": "Force d'Action Navale", "nation": "France" },

  "etatMajor": [
    { "role": "COMMANDANT", "grade": "CAPITAINE_DE_VAISSEAU", "nom": "Marchand", "matricule": "M-2019-000042" }
  ],
  "stats": {
    "nombreMissions": 1,
    "effectifActuel": 110,
    "dernierReleve": { "horodatage": "2026-07-30T23:00:00Z", "vitesseNoeuds": 16.2, "carburantPourcent": 74.1 }
  },

  "devise": "Servir sans faillir",
  "etiquettes": ["nucleaire", "aviation", "otan"],
  "dateCreation": "2026-08-26T08:00:00Z",
  "version": 0
}
```

**Ce qui n'appartient qu'à une forme :**

| `_class` | Nb | Champs propres |
|---|---|---|
| `porte-aeronefs` | 17 | `typeCatapulte`, `nombreAeronefs`, `longueurPisteMetres`, `nombreAscenseurs`, `groupeAerien[]` |
| `batiment-surface` | 18 | `systemeCombat`, `capaciteVLS`, `nombreHelicopteres`, `plateformeHelicoptere` |
| `sous-marin` | 10 | `profondeurMaxMetres`, `nombreTubesLanceTorpilles`, `missionStrategique`, `autonomieImmersionJours`, `discretionDecibels` |

`groupeAerien` est un **tableau de sous-documents qui n'existe que sur les
porte-aéronefs** : ce n'est pas un champ scalaire qui varie, c'est une
structure entière qui apparaît.

#### Ce qu'il démontre, champ par champ

| Élément | Concept enseigné |
|---|---|
| `_class` | **Polymorphic pattern**, `@TypeAlias`, filtre automatique par sous-classe |
| `nation` + `numeroCoque` | Index **unique composé** — un numéro de coque n'est unique que par nation |
| `nation` + `type` + `deplacementTonnes` | Index **composé**, règle ESR |
| `nom` + `devise` + `classe` | Index **texte** avec poids |
| `propulsion` | Sous-document unique (embedded 1-1) |
| `armements`, `capteurs`, `groupeAerien` | Tableaux de sous-documents, `$elemMatch`, `$unwind`, index multiclés |
| `positionActuelle` | Index **2dsphere**, `$near`, `$geoWithin` |
| `portAttache`, `flotte` | **Extended Reference** — le nom est là, la jointure disparaît |
| `etatMajor` | **Subset** — 5 officiers embarqués, 1 941 marins référencés |
| `stats` | **Computed** — agrégats maintenus à l'écriture |
| `etiquettes` | Tableau de scalaires, `$in`, `$all`, index multiclé |
| `autonomieMillesNautiques: null` | Champ absent vs `null` : `$exists` vs `$eq: null` |
| `dateCreation` / `dateModification` | Audit Spring |
| `version` | Verrouillage optimiste |

### 4.2 `ports` — poche de simplicité

```json
{ "_id": "ObjectId(...)", "nom": "Toulon", "pays": "France",
  "localisation": { "type": "Point", "coordinates": [5.93, 43.12] },
  "capaciteNavires": 60, "profondeurBassinMetres": 14.5 }
```

Six champs. Sert exclusivement à : la référence, le `$lookup`, et un second
index `2dsphere` pour comparer deux collections géographiques.

### 4.3 `flottes` — poche de simplicité

```json
{ "_id": "ObjectId(...)", "nom": "Force d'Action Navale", "nation": "France",
  "amiralCommandant": { "grade": "Vice-amiral d'escadre", "nom": "Perrier" },
  "anneeCreation": 1990 }
```

Sert à démontrer qu'un **sous-document** (`amiralCommandant`) et une
**référence** peuvent coexister sans contradiction — la question n'est jamais
« lequel est meilleur » mais « qui possède la donnée ».

### 4.4 `missions` — la relation N‑N

```json
{ "_id": "ObjectId(...)", "nomCode": "CLEMENCEAU 26",
  "type": "DEPLOIEMENT", "statut": "TERMINEE",
  "dateDebut": "2026-01-15T00:00:00Z", "dateFin": "2026-04-30T00:00:00Z",
  "zoneOperation": { "nom": "Mediterranee orientale",
                     "centre": { "type": "Point", "coordinates": [28.0, 34.5] },
                     "rayonKm": 600 },
  "naviresParticipantsIds": ["ObjectId(...)", "ObjectId(...)"],
  "coutEstimeEuros": 128000000,
  "objectifs": ["Presence maritime", "Interoperabilite OTAN"] }
```

Tableau d'identifiants = **N‑N référencé**. Terrain du `$lookup` avec pipeline
imbriqué et du `$unwind` sur références.

### 4.5 `membresEquipage` — le 1‑N à forte cardinalité

```json
{ "_id": "ObjectId(...)", "navireId": "ObjectId(...)",
  "matricule": "M-2019-004512", "nom": "Lemoine", "prenom": "Claire",
  "grade": "SECOND_MAITRE", "specialite": "SONAR",
  "dateEnrolement": "2019-09-01T00:00:00Z" }
```

**Démonstration clé du cours** : pourquoi l'équipage n'est *pas* embarqué dans
le navire. 1 950 marins × un document de 16 Mo de limite, plus une rotation
constante. C'est le contre-exemple qui donne du sens à la règle.

### 4.6 `journauxBord` — le volume

```json
{ "_id": "ObjectId(...)", "navireId": "ObjectId(...)",
  "horodatage": "2026-06-12T08:15:00Z",
  "position": { "type": "Point", "coordinates": [7.21, 41.88] },
  "vitesseNoeuds": 18.5, "capDegres": 127, "carburantPourcent": 62.4,
  "evenement": null }
```

**100 000 documents générés.** Seule collection assez grosse pour que
`explain()` produise un écart visible entre `COLLSCAN` et `IXSCAN`. Sert aussi
de support à la **collection time series** et au **sharding** (clé de partition
`navireId` + `horodatage`).

---

## 5. Modélisation : du binaire au catalogue

Le coeur du module « Embedded et Referred ». Conçu pour être joué **en direct**,
pas lu.

### 5.1 Embarqué : `armements` dans `navires`

Un armement n'existe pas sans son navire, on le lit toujours avec lui, sa
cardinalité est bornée (moins de 20), il ne change presque jamais.
**Une lecture, un document, zéro jointure.**

### 5.2 Référencé : le port d'attache

Toulon existe indépendamment, est partagé par huit navires, et sa capacité
change sans que les navires changent. L'embarquer entièrement, c'est dupliquer
et se condamner à la mise à jour multiple.

### 5.3 Les quatre façons de lier deux documents en Spring

À montrer côte à côte sur `Navire`, dans cet ordre :

| Approche | Code | Verdict enseigné |
|---|---|---|
| **Extended Reference** | `private PortRef portAttache;` | **Le choix du projet.** Une lecture, zéro jointure, entièrement requêtable — on groupe même sur `portAttache.pays` |
| Référence manuelle nue | `private String portAttacheId;` | Ce dont le projet est **parti**. Rien à propager, mais deux allers-retours sur l'écran chaud |
| `@DocumentReference` | `@DocumentReference Port portAttache;` | Confort de mapping, chargement paresseux — mais le N+1 est **invisible** dans le code appelant |
| `@DBRef` | `@DBRef Port portAttache;` | **Historique.** Inscrit une convention Java dans la base. À reconnaître, pas à écrire |

**La leçon, et elle vaut pour les quatre** : le choix de mapping **décide du
format stocké**. Ce n'est pas un détail d'implémentation qu'on change plus
tard — c'est un engagement sur la forme des documents, donc sur ce que tous les
autres clients pourront lire.

`@DBRef` est le pire de ce point de vue. L'extended reference est le meilleur :
le document reste du JSON que n'importe qui comprend.

### 5.4 Le catalogue de patterns

`embedded` ou `referred` est la **première** question, pas la seule. Un modèle
qui s'arrête là produit du SQL déguisé en JSON — trois signes le trahissent :

1. **Tous les documents ont la même forme.** Un schéma uniforme est la
   définition même du relationnel.
2. **Les relations sont des identifiants nus.** Ce sont des clés étrangères
   avec un autre nom.
3. **Chaque affichage demande une jointure.** Le modèle n'a pas été conçu pour
   la façon dont il est lu.

Le projet applique cinq patterns nommés, démontrés dans `mongosh/05b-patterns.js`.

| Pattern | Où, dans le projet | Ce qu'il achète | Ce qu'il coûte |
|---|---|---|---|
| **Polymorphic** | `navires` — 3 formes de document | Une collection, des requêtes transverses, pas de colonnes `NULL` | Un discriminant à écrire, et à ne jamais renommer |
| **Extended Reference** | `portAttache`, `flotte`, `naviresParticipants` | L'écran chaud sans jointure | Propager les copies quand la source change |
| **Subset** | `etatMajor` | La fiche navire en une lecture | Deux endroits à tenir d'accord |
| **Computed** | `stats` | Un `$lookup` devient une lecture de champ | La dérive silencieuse |
| **Bucket** | *exercice, pas le modèle* | Moins de documents, agrégats gratuits | `explain()` compte des seaux |

**Attribute** est démontré dans le même script. **Outlier** et
**Schema Versioning** sont traités dans l'annexe d'exercices (E13, E14).

#### Pourquoi `journauxBord` n'est **pas** en bucket

Le cas s'y prête parfaitement : c'est même exactement pour cela que les
collections *time series* existent. Le projet s'en abstient pour une raison
**pédagogique et non technique** — la sortie d'`explain()` compterait alors des
seaux et non des documents, ce qui rendrait la démonstration `COLLSCAN` vs
`IXSCAN` du J3 après-midi illisible.

C'est le genre d'arbitrage qu'il faut énoncer à voix haute en salle, sous peine
de passer pour ignorant du pattern.

#### Deux pièges vérifiés à l'exécution

**1. Spring mappe tout `id` vers `_id`, même imbriqué.**

Sans `@Field("id")` sur `PortRef` / `FlotteRef` / `NavireRef`, l'application
écrirait `{ "_id": "TOULON", … }` là où les scripts `mongosh` écrivent
`{ "id": "TOULON", … }`. Les deux formats cohabiteraient dans la même
collection et **tout `$lookup` sur `portAttache.id` ne verrait que la moitié
des documents** — sans la moindre erreur, juste des jointures vides.

Un test de non-régression (`FormatStockageTest`) verrouille le format.

**2. Une projection par interface casse sur une hiérarchie polymorphe.**

Une projection par interface fait matérialiser le document dans le type déclaré
du repository — `Navire` — avant de poser le proxy. Or `_class` ne fait pas
partie des champs projetés : Spring ne sait plus quelle sous-classe instancier,
retombe sur `Navire`, qui est **abstraite**, et lève
`MappingInstantiationException`.

`NavireSummary` est donc un **record**, pas une interface : un DTO est construit
directement, l'entité n'est jamais instanciée.

> **Règle : sur une collection polymorphe, projeter vers un DTO, jamais vers
> une interface.**

**3. Un repository de sous-classe ne filtre pas tout seul.**

On attend d'un `SousMarinRepository` qu'il ne voie que les sous-marins.
**Ce n'est pas le cas.** Vérifié sur Spring Boot 3.5 :

```
sousMarinRepository.findAll()  ->  find using query: {}  in collection: navires
sousMarinRepository.count()    ->  Executing count: {}   in collection: navires
```

Aucune restriction sur `_class`. Pire : les 45 documents sont ensuite
instanciés **de force** en `SousMarin`, porte-avions compris. Mistypage
silencieux — pas d'exception, pas de log, juste des objets faux.

Le discriminant est donc déclaré explicitement dans chaque `@Query`, et
`FormatStockageTest` verrouille le comportement.

**4. Les références sont des `ObjectId`, le modèle Java dit `String`.**

La lecture fonctionne — Spring convertit `ObjectId` → `String` et on voit un
identifiant hexadécimal normal. Mais les **requêtes** construites depuis ce
`String` envoient un `String` au serveur, qui le compare à un `ObjectId` :
**zéro résultat, aucune erreur**.

Symptôme observé avant correction : `GET /api/navires/{id}/equipage` renvoyait
`0 membres` sur un navire qui en a 110.

La parade est `@Field(targetType = FieldType.OBJECT_ID)` sur
`JournalBord.navireId`, `MembreEquipage.navireId` et `NavireRef.id` : `String`
côté Java, `ObjectId` côté base **et côté requête**.

**5. Le module diagnostic exige plus que `readWrite`.**

`$indexStats`, le profileur et la lecture de `system.profile` ne sont pas
autorisés par le rôle `readWrite`. Sans `dbAdmin`, `/api/diagnostic/*` répond
`Unauthorized (13)`.

Ni `readWrite` **ni `dbAdmin`** ne les accordent — vérifié. Plutôt que d'empiler
des rôles prédéfinis jusqu'à ce que ça passe, `docker/mongo-init/` déclare un
rôle sur mesure avec les **actions exactes** :

```js
actions: ["indexStats", "collStats", "dbStats", "enableProfiler", "find"]
```

C'est le principe du moindre privilège, et cela montre qu'un rôle MongoDB se
compose action par action. En production, ce rôle irait à un compte
d'observabilité distinct — jamais au compte applicatif.

**6. `@TypeAlias` n'est pas cosmétique.**

Sans lui, `_class` contient le nom de classe Java complet. Renommer ou déplacer
la classe rend alors toute la collection illisible. Le même test le vérifie.

#### Le contre-poison

Ces patterns **dénormalisent**, presque tous. Ils échangent de la simplicité
d'écriture contre de la vitesse de lecture — un bon échange **seulement** si
l'on lit beaucoup plus qu'on n'écrit. Sur un système à forte écriture, la
normalisation redevient le bon choix, et MongoDB s'en accommode très bien.

La question à poser avant d'appliquer un pattern n'est jamais « est-ce
élégant ? » mais :

> **Quel écran, appelé combien de fois par minute, est-ce que ce pattern rend
> plus rapide ?**

Sans réponse chiffrée à cette question, on ne dénormalise pas.

---

## 6. Architecture applicative

Un module Maven, découpage en couches, packages en français.

```
amiraute-api/
+- pom.xml
+- src/main/java/fr/formation/amiraute/
|  +- AmirauteApplication.java
|  +- config/
|  |  +- MongoConfig.java        # MongoClient, converters, audit
|  |  +- IndexConfig.java        # creation explicite des index (voir 6.2)
|  +- domaine/
|  |  +- Navire.java                    # @Document("navires")
|  |  +- Port.java  Flotte.java  Mission.java
|  |  +- MembreEquipage.java  JournalBord.java
|  |  +- embarque/                      # sous-documents
|  |  |  +- Propulsion.java  Armement.java  Capteur.java
|  |  |  +- ZoneOperation.java  Amiral.java
|  |  +- enumeration/
|  |     +- TypeNavire.java  StatutNavire.java  TypePropulsion.java
|  |     +- CategorieArmement.java  CategorieCapteur.java
|  |     +- TypeMission.java  StatutMission.java  Grade.java
|  +- depot/
|  |  +- NavireRepository.java               # extends MongoRepository
|  |  +- NavireRepositoryCustom.java   # contrat MongoTemplate
|  |  +- impl/NavireRepositoryCustomImpl.java
|  |  +- PortRepository.java  FlotteRepository.java  MissionRepository.java
|  |  +- MembreEquipageRepository.java  JournalBordRepository.java
|  |  +- agregation/
|  |     +- StatistiqueRepository.java       # pipelines d'agregation, MongoTemplate pur
|  +- service/
|  |  +- NavireService.java  MissionService.java
|  |  +- StatistiqueService.java  DiagnosticService.java
|  +- web/
|  |  +- NavireController.java  MissionController.java
|  |  +- StatistiqueController.java
|  |  +- dto/                           # requetes / reponses / projections
|  |  +- GlobalExceptionHandler.java
|  +- amorce/
|     +- ChargeurJeuDonnees.java        # ApplicationRunner, profil "demo"
|     +- GenerateurJournalBord.java     # 100 000 documents
+- src/main/resources/
|  +- application.yml
|  +- donnees/navires.json  ports.json  flottes.json  missions.json
+- src/test/java/fr/formation/amiraute/
   +- depot/NavireRepositoryTest.java        # @DataMongoTest + Testcontainers
   +- service/StatistiqueServiceTest.java
```

### 6.1 `MongoRepository` vs `MongoTemplate` — la ligne de partage

Le programme demande explicitement les deux. Le projet applique une **règle
tranchée**, énoncée une fois et tenue partout :

> **`MongoRepository`** pour tout ce qui est connu à la compilation :
> CRUD, requêtes dérivées du nom de méthode, `@Query` simple, pagination.
>
> **`MongoTemplate`** dès que la requête est **construite dynamiquement** ou que
> l'on sort du modèle : `Criteria` conditionnels, agrégations, opérations en
> masse, `updateMulti`, `explain()`.

Matérialisé par le trio `NavireRepository` / `NavireRepositoryCustom` /
`NavireRepositoryCustomImpl` : **une seule interface injectée** côté service,
deux moteurs derrière. C'est le motif « custom repository implementation » de
Spring Data, et c'est celui à retenir.

Exemple canonique du projet — la recherche multicritère où tous les critères
sont optionnels (type, nation, tonnage min/max, statut, rayon géographique).
Impossible à écrire proprement en requête dérivée ; naturelle avec `Criteria`.

### 6.2 Les index : annotations ou création explicite ?

Position enseignée : **les deux, mais pas au même endroit.**

- `@Indexed`, `@CompoundIndex`, `@TextIndexed` sur les documents : **lisibles**,
  ils documentent l'intention au bon endroit.
- Mais `spring.data.mongodb.auto-index-creation` est **désactivé** en
  configuration. Les index sont créés par `IndexConfig` au démarrage.

Justification à donner en cours : la création automatique d'index au premier
accès est un piège en production (verrous, ordre non maîtrisé, index fantômes
survivant à une refonte du modèle). On garde l'annotation pour la lisibilité et
on maîtrise la création. C'est exactement le type de « bonne pratique » que le
programme réclame.

---

## 7. Conventions de code

### 7.1 Les deux règles

**Règle 1 — la frontière anglais / français.**

> **Anglais** pour ce qui désigne un *artefact logiciel* ou un concept de
> framework : `Repository`, `Controller`, `Service`, `Config`, `Impl`,
> `Custom`, `Handler`, `Test`, `Criteria`, `Page`, `Summary`.
>
> **Français** pour ce qui désigne le *domaine naval* : `Navire`, `Flotte`,
> `Armement`, `Capteur`, `numeroCoque`, `deplacementTonnes`, `portAttache`.

Les **verbes de méthode** relèvent du logiciel, donc de l'anglais :
`findBy…`, `search…`, `list…`, `create`, `update`, `delete`, `count…`.
C'est d'ailleurs imposé par Spring Data, qui *analyse* le nom des méthodes
dérivées — `findByNationAndNumeroCoque` mélange donc les deux registres, et
c'est exactement la forme attendue.

Ce qui donne, dans une même interface :

```java
Optional<Navire> findByNationAndNumeroCoque(String nation, String numeroCoque);
long             countByStatut(StatutNavire statut);
Page<Navire>     searchAdvanced(NavireSearchCriteria criteres, Pageable pageable);
List<Navire>     findByArmement(String categorie, int porteeMinimaleKm);
```

**Règle 2 — ASCII strict.**

Aucun accent, aucune cédille dans le code, les identifiants, les commentaires,
les noms de fichiers, les clés JSON. `deplacementTonnes`, jamais
`déplacementTonnes`. `EN_REPARATION`, jamais `EN_RÉPARATION`.

Les accents ne sont autorisés que dans ce document, les énoncés de TP, et les
messages destinés à l'utilisateur final s'il y en a.

### 7.2 Glossaire

**Termes logiciels — anglais, sans exception.**

| Notion | Nom retenu |
|---|---|
| repository | `Repository` |
| custom repository fragment | `…RepositoryCustom` / `…RepositoryCustomImpl` |
| controller | `Controller` |
| service | `Service` |
| configuration | `…Config` |
| exception handler | `GlobalExceptionHandler` |
| DTO de pagination | `PageResponse` |
| DTO de critères | `…SearchCriteria` |
| projection | `…Summary` |
| socle de test | `MongoTestBase` |
| fixtures | `TestData` |
| paquets | `domain`, `repository`, `service`, `web`, `config`, `bootstrap` |
| sous-paquets | `embedded`, `enumeration`, `aggregation`, `impl`, `demo` |

**Termes métier — français, sans accent.**

| Anglais | Français retenu |
|---|---|
| warship | `navire` |
| fleet | `flotte` |
| home port | `portAttache` |
| hull number | `numeroCoque` |
| displacement | `deplacement` |
| commissioning year | `anneeMiseEnService` |
| weapon | `armement` |
| sensor | `capteur` |
| propulsion | `propulsion` |
| crew member | `membreEquipage` |
| ship's log | `journalBord` |
| range (km) | `portee` |
| tag | `etiquette` |
| motto | `devise` |
| status | `statut` |
| operation zone | `zoneOperation` |

**Verbes de méthode — anglais.**

`findById`, `findByNumeroCoque`, `listByNation`, `searchAdvanced`,
`findNearby`, `countByStatut`, `create`, `update`, `delete`,
`updateStatutByNation`, `addEtiquette`, `addParticipant`, `close`.

### 7.3 Commentaires

**Rares et courts.** Un commentaire n'existe que pour expliquer un *choix*
(pourquoi cet index est partiel, pourquoi cette requête passe par `Criteria`),
jamais pour paraphraser le code. Pas de Javadoc systématique. Le formateur
commente à l'oral ; le code doit rester lisible au vidéoprojecteur.

---

## 8. Infrastructure Docker

`docker/docker-compose.yml`, piloté par **profils**, pour que la même commande
serve les trois moments du cours.

| Profil | Contenu | Module concerné |
|---|---|---|
| `simple` (défaut) | 1 `mongod` standalone + `mongo-express` | Installation, CRUD, requêtes, index, agrégations |
| `replique` | 3 `mongod` en replica set + `mongo-express` | Réplication, transactions, change streams |
| `partition` | 1 config server + 2 shards + `mongos` | Sharding |
| `extension` | + un 3ᵉ shard, démarré à la demande | Le passage à l'échelle à chaud |

Points d'attention prévus :

- Volume nommé par profil, pour qu'un changement de profil ne détruise pas le
  jeu de données du précédent.
- Script `docker/mongo-init/` pour créer l'utilisateur applicatif et la base
  `amiraute` — l'occasion de parler **authentification** et **rôles**, absents
  du programme mais toujours demandés en salle.
- L'application Spring **ne tourne pas** dans Docker. Les apprenants la lancent
  depuis leur IDE : point d'arrêt, rechargement à chaud, et une chose de moins à
  déboguer.

---

## 9. Jeu de données

| Collection | Volume | Origine |
|---|---|---|
| `navires` | 45 | Écrit à la main, navires réels de 8 nations, dans `mongosh/00-jeu-de-donnees.js` |
| `ports` | 14 | Écrit à la main, bases navales réelles, coordonnées vraies |
| `flottes` | 13 | Écrit à la main |
| `missions` | 25 | Écrit à la main, participants résolus par (nation, numeroCoque) |
| `membresEquipage` | ~2 000 | Généré, réparti sur les navires |
| `journauxBord` | ~100 000 | Généré, 30 jours de télémétrie |

Choix assumé : les **petites collections sont écrites à la main** avec de vraies
données (le *Charles de Gaulle* déplace bien 42 500 t, Toulon est bien à
43,12° N). Un apprenant qui reconnaît la donnée fait confiance à l'exemple, et
les requêtes produisent des résultats qui *signifient* quelque chose.

Les grosses collections sont générées, avec une graine fixe : **tout le monde a
les mêmes résultats de `explain()`**, ce qui rend la démonstration
reproductible.

---

## 10. Correspondance programme → projet

C'est le tableau que le formateur garde ouvert.

### Comprendre les concepts

| Point du programme | Support dans le projet |
|---|---|
| SQL vs NoSQL | `docs/sql-vs-nosql.md` : le même navire en 6 tables relationnelles vs 1 document. Diagramme + les deux requêtes « donne-moi le navire complet » côte à côte |
| Survol des SGBD NoSQL | Section du même document : document / clé-valeur / colonnes / graphe, avec le cas d'usage AMIRAUTE qui irait à chacun |
| MongoDB dans l'écosystème | Idem, plus le positionnement face à PostgreSQL JSONB |

### Initialisation de MongoDB

| Point | Support |
|---|---|
| Installation Docker + Server | `docker/docker-compose.yml`, profil `simple` |
| Paramétrage | `docker/mongo-init/`, utilisateur applicatif, `application.yml` |
| Outils annexes | `mongo-express` dans le compose ; feuille de route Compass dans `docs/outils.md` ; scripts `mongosh/` |
| Réplication et Sharding | Profils `replique`, `partition` et `extension` ; `mongosh/07-replication.js`, `mongosh/08-sharding.js`. Le sharding se joue **en direct** : partition d'une collection déjà pleine, migration observable, puis ajout d'un 3ᵉ shard à chaud pendant que les lectures continuent |

### Utilisation de base — `mongosh/01` à `03`

| Point | Support |
|---|---|
| Inserts one/many, updates, deletes | `mongosh/01-crud.js` sur `navires` |
| find, limit, sort, skip | `mongosh/02-requetes.js` : catalogue de la flotte |
| `$eq`, `$ne`, `$gt`/`$gte`, `$regex`, ... | `mongosh/03-operateurs.js` : tonnage, année, nom, `$in` sur type, `$elemMatch` sur `armements` |

### Utilisation avancée — `mongosh/04` à `06`

| Point | Support |
|---|---|
| Index simple, unique, composé, partiel | `mongosh/04-index.js` : unique sur `numeroCoque`, composé `(nation, type, deplacementTonnes)`, partiel sur `statut = ACTIF`, texte sur `nom`+`devise`, 2dsphere sur `positionActuelle` |
| Embedded et Referred | `mongosh/05-embedded-referred.js` + §5. Le contre-exemple `membresEquipage` est le moment fort |
| *(au-delà du programme)* | `mongosh/05b-patterns.js` — Polymorphic, Extended Reference, Subset, Computed, Bucket, Attribute. C'est ce module qui empêche le projet de ressembler à du SQL |
| Les Aggregates | `mongosh/06-agregations.js` : tonnage par nation, top 5 par déplacement, `$unwind` sur `armements` pour compter les missiles par nation, `$lookup` navires↔missions, `$bucket` par tranche de tonnage, `$facet` pour un tableau de bord en une passe |

### Utilisation dans Spring — le coeur du projet

| Point | Support |
|---|---|
| `MongoRepository` | `NavireRepository` : dérivées (`trouverParNationEtStatut`), `@Query`, `Page<Navire>`, projections |
| `MongoTemplate` | `NavireRepositoryCustomImpl` : `searchAdvanced` multicritère, `updateMulti`, `bulkOps` |
| Index dans Spring | `@Indexed` / `@CompoundIndex` sur `Navire` + `IndexConfig` (§6.2) |
| Referred dans Spring | `Navire.portAttache` en extended reference, plus `domain/demo/` qui compare les quatre approches (§5.3) |
| Polymorphisme | `SousMarin` / `PorteAeronefs` / `BatimentSurface`, `@TypeAlias`, et **le filtre `_class` qu'il faut écrire soi-même** |
| Bonnes pratiques | Audit (`@CreatedDate`), `@Version`, projections DTO, pagination, `Criteria` type-safe, agrégations dans une couche dédiée |

### Performance et diagnostic

| Point | Support |
|---|---|
| Analyser indicateurs et performances | `DiagnosticService` : `explain()` déclenché depuis un endpoint REST, avant/après index sur `journauxBord` (100 000 docs). `$indexStats`, `$collStats` |
| *(au-delà du programme)* | `mongosh/11-antipatterns.js` — l'autopsie de `poissons` : dix pathologies mesurées, 28 × plus de données pour la même information |
| Lecture des logs | Profileur Mongo activé (`slowms`), lecture de `system.profile` ; côté Spring, `logging.level.org.springframework.data.mongodb.core.MongoTemplate: DEBUG` pour voir la requête réellement émise |

---

## 11. Déroulé sur 3 jours

Session de 3 jours, 6 demi-journées. Le projet AMIRAUTE est **projeté et manipulé
en direct** ; il n'est pas construit par les apprenants (voir §12).

| Demi-journée | Module du programme | Support projeté |
|---|---|---|
| **J1 matin** | SQL vs NoSQL · survol des SGBD NoSQL · MongoDB dans l'écosystème · installation Docker + serveur · paramétrage · Compass / CLI | `docs/sql-vs-nosql.md`, `docker/docker-compose.yml` profil `simple`, `docs/outils.md` |
| **J1 après-midi** | Inserts one/many, updates, deletes · find, limit, sort, skip · opérateurs `$eq`, `$ne`, `$gt`, `$regex`, `$in`, `$elemMatch` | `mongosh/01-crud.js` → `03-operateurs.js` |
| **J2 matin** | Index : simple, unique, composé, filtre partiel, texte, 2dsphere · Embedded et Referred | `mongosh/04-index.js`, `05-embedded-referred.js`, §5 |
| **J2 après-midi** | Les Aggregates · Réplication et Sharding | `mongosh/06-agregations.js`, `07-replication.js`, `08-sharding.js`, profils `replique` et `partition` |
| **J3 matin** | `MongoRepository` · mapping des documents · projections · pagination · `MongoTemplate` et `Criteria` | `domain/`, `NavireRepository`, `NavireRepositoryCustomImpl` |
| **J3 après-midi** | Agrégations en Spring · bonnes pratiques (index, referred) · performance et diagnostic | `agregation/StatistiqueRepository`, `IndexConfig`, `DiagnosticService` |

### Écart assumé avec le programme

Le PDF range **Réplication et Sharding** sous « Initialisation de MongoDB ».
Le déroulé le déplace en J2 après-midi et n'en garde en J1 que le *pourquoi*
(architecture, tolérance de panne, motivation du partitionnement).

Raison : le sharding ne veut rien dire tant qu'on n'a pas de volume ni de clé
d'accès en tête. Après le module Index et le module Agrégations, la clé de
partition `navireId` + `horodatage` sur `journauxBord` se justifie toute seule.
Basculer les profils Docker en fin de J2 fait aussi une respiration bienvenue
avant la journée Spring.

---

## 12. Projet livré complet, exercices en annexe

**Décision** : le projet AMIRAUTE est fourni **entièrement construit**. Les
apprenants ne le reconstruisent pas en salle.

Justification : les apprenants ont déjà les connaissances Spring. Leur faire
retaper un squelette Boot, des `@Document` et des controllers REST consommerait
la moitié du J3 sans rien enseigner de MongoDB. Le projet devient le
**référentiel de démonstration** : on l'ouvre, on le lit, on le modifie en
direct, on l'instrumente.

La pratique passe donc dans une **annexe d'exercices**, découplée du projet.

### 12.1 Deux familles d'exercices

| Famille | Définition | Rôle |
|---|---|---|
| **Proches** | Portent directement sur les collections d'AMIRAUTE (`navires`, `missions`, `journauxBord`&hellip;) | Consolider ce qui vient d'être projeté, dans un contexte déjà connu — zéro coût de mise en contexte |
| **Hors-piste** | Micro-domaines autonomes, sans rapport avec la marine | Isoler un concept que le projet ne met pas assez en tension, ou vérifier que l'apprenant sait modéliser **à partir de zéro** |

Les exercices hors-piste sont volontairement dépaysants. Un apprenant qui sait
écrire un `$lookup` sur `navires` ne sait pas forcément faire un `$lookup` ; il
sait peut-être seulement reproduire celui du cours. Le changement de domaine
est le test.

Micro-domaines hors-piste prévus (chacun 1 ou 2 collections, jamais plus) :

| Domaine | Concept isolé |
|---|---|
| Bibliothèque municipale | Modélisation embedded vs referred sur un cas neuf |
| Capteurs météo | Collection time series, index TTL |
| Catalogue e-commerce | Index composé, ordre des clés, tri couvert |
| Réseau social minimal | `$graphLookup`, données récursives |
| Journal d'accès serveur | Agrégation par fenêtre temporelle, `$bucket` |
| Panier d'achat | Écritures concurrentes, `@Version`, opérateurs atomiques |

### 12.2 Structure de l'annexe

```
exercices/
+- README.md              # index, bareme, mode d'emploi
+- enonces/
|  +- E01-crud-navires.md
|  +- E02-catalogue-flotte.md
|  +- ...
+- corriges/
   +- E01-crud-navires.js
   +- E02-catalogue-flotte.js
   +- ...
```

Numérotation plate et continue. L'index du `README.md` porte toute la
navigation :

| Colonne | Contenu |
|---|---|
| Réf | `E07` |
| Titre | Le tableau de bord de l'amiral |
| Module | Agrégations |
| Demi-journée | J2 après-midi |
| Famille | Proche / Hors-piste |
| Difficulté | ★ / ★★ / ★★★ |

Un formateur qui a dix minutes de rab en fin de séquence filtre sur la
demi-journée et la difficulté, et sort un exercice. C'est le seul usage réel de
cet index, il est conçu pour ça.

### 12.3 Contrat d'un énoncé

Chaque énoncé tient en une page et suit le même gabarit :

1. **Contexte** — deux phrases, pas plus.
2. **Ce dont tu disposes** — collections, volume, éventuel script d'amorce.
3. **Travail demandé** — numéroté, chaque point vérifiable objectivement.
4. **Résultat attendu** — l'extrait de sortie, ou le nombre de documents, pour
   que l'apprenant sache seul s'il a réussi.
5. **Pour aller plus loin** — une question ouverte, sans corrigé.

Le point 4 est non négociable : sans lui, l'apprenant appelle le formateur pour
savoir s'il a bon, et le formateur ne fait plus que ça.

---

## 13. Plan de construction

| Lot | Contenu | État |
|---|---|---|
| **A** | Ce document de conception | ✅ |
| **B** | `docker/docker-compose.yml` (3 profils) + scripts d'init | ✅ |
| **C** | Jeu de données JSON : navires, ports, flottes, missions | ✅ |
| **D** | Scripts `mongosh/00` à `10` — la partie MongoDB pure du cours | ✅ |
| **E** | Squelette Spring Boot : pom, `application.yml`, classe principale | ✅ |
| **F** | Documents, énumérations, sous-documents | ✅ |
| **G** | Repositories `MongoRepository` + services + REST | ✅ |
| **H** | Repository personnalisé `MongoTemplate` + recherche multicritère | ✅ |
| **I** | Agrégations Spring + `StatistiqueController` | ✅ |
| **J** | `IndexConfig` + générateurs `membresEquipage` et `journauxBord` | ✅ |
| **K** | `DiagnosticService` + `explain()` + profileur + requête lente plantée | ✅ |
| **L** | Tests Testcontainers | ✅ |
| **M** | `docs/sql-vs-nosql.md`, `docs/outils.md`, `docs/deroule-3-jours.md` | ✅ |
| **N** | Annexe d'exercices : `README.md` + premiers énoncés et corrigés | ✅ |

Les lots B à M forment le projet livré. Le lot N s'étoffe ensuite au fil de l'eau.

---

## 14. Points tranchés

**MongoDB Atlas : hors périmètre.** La session se déroule intégralement en
local, par Docker, conformément au programme. Atlas est mentionné en une
paragraphe dans `docs/outils.md` — chaîne de connexion `mongodb+srv://`, et le
fait que le pilote et le code Spring ne changent pas — sans plus.

**Volumétrie de l'annexe d'exercices : à la main du formateur.** Les 14
exercices livrés couvrent chaque demi-journée ; l'annexe s'étoffe ensuite selon
le rythme réel des sessions.
