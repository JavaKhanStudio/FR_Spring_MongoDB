# amiraute-api

L'application Spring Boot du projet fil rouge. Support des **J3 matin et J3
après-midi** du programme.

## Prérequis

| | |
|---|---|
| JDK | **17, 21 ou 25** — le projet compile en `release 21` |
| | ⚠️ un **JDK**, pas un JRE : `javac --version` doit répondre |
| MongoDB | profil `simple` du Compose, **déjà peuplé** |
| Maven | inutile, le wrapper `./mvnw` s'en charge |

L'application **ne charge pas les données**. Elle se branche sur une base déjà
peuplée par les scripts `mongosh` — c'est un choix de conception : le
référentiel est du matériel de cours, pas du matériel applicatif. Cela évite
d'écrire la même donnée à deux endroits, et cela reproduit le cas réel d'une
application qui se connecte à une base opérationnelle existante.

## Démarrer

```bash
# depuis la racine du projet
make simple
make amorcer          # charge navires, ports, flottes, missions + le volume

cd amiraute-api
./mvnw spring-boot:run
```

### Si `./mvnw` répond « release version 21 not supported »

C'est le symptôme d'un **JRE sans compilateur** sur le `PATH` — le message est
trompeur, il ne parle pas de la version mais de l'absence de `javac`.

```bash
javac --version                      # doit repondre ; sinon :
export JAVA_HOME=/chemin/vers/un/jdk # ex. ~/.jdks/jdk-21.0.11+10 (IntelliJ)
```

Sous Fedora : `sudo dnf install java-21-openjdk-devel`.

Au démarrage, `StartupCheck` journalise le contenu de la base et
indique quoi faire si elle est vide.

```
http://localhost:8080/api/navires?nation=France
http://localhost:8080/actuator/health
```

Deux façons d'appeler l'API, au choix :

**Bruno** — `bruno/amiraute/`, 33 requêtes en 5 dossiers, chacune documentée
avec le concept MongoDB qu'elle déclenche.

```bash
# ouvrir le dossier bruno/amiraute depuis Bruno, environnement "local"
# ou en ligne de commande :
npx @usebruno/cli run --env local
```

Les fichiers `.bru` sont du **texte versionné avec le projet** : rien à
importer, rien à synchroniser. Un stagiaire clone le dépôt et a la collection.

**`requetes.http`** — le même contenu en un seul fichier, pour IntelliJ ou
l'extension REST Client de VS Code.

## Ce que chaque paquet démontre

| Paquet | Concept |
|---|---|
| `domain/` | mapping, sous-documents, tableaux, GeoJSON, `@Version`, audit |
| `domain/embedded/` | l'embedded : des `record`, aucun `@Document` |
| `NavireSummary` | projection par **DTO** — une interface casserait sur la hiérarchie |
| `SousMarin` / `PorteAeronefs` / `BatimentSurface` | **Polymorphic** : `@TypeAlias`, une seule collection |
| `SousMarinRepository` | le filtre `_class` qu'il faut **écrire soi-même** — le piège du module |
| `PortRef` / `FlotteRef` / `NavireRef` | **Extended Reference** |
| `MembreEtatMajor` | **Subset** : 5 officiers embarqués, 1 941 marins référencés |
| `NavireStats` | **Computed** : agrégats maintenus à l'écriture |
| `domain/demo/` | **les trois façons de référencer**, côte à côte |
| `repository/` | `MongoRepository` : dérivées, `@Query`, projections, pagination |
| `repository/impl/` | `MongoTemplate` : `Criteria` dynamiques, `updateMulti`, `$geoNear` |
| `repository/aggregation/` | `$group`, `$unwind`, `$lookup`, `$bucket`, `$facet` |
| `config/IndexConfig` | création **maîtrisée** des index |
| `service/DiagnosticService` | `explain()`, `$indexStats`, `$collStats`, profileur |

## Les quatre pages

Une couche Thymeleaf minimale — quatre pages, zéro framework CSS — pour rendre
le modèle document **tangible**. Chacune est adossée à un concept, et chacune
affiche en pied de page **le nombre de requêtes MongoDB qu'elle a réellement
déclenchées**.

| Page | Concept |
|---|---|
| `/vue/navires` | **Extended reference** — Port, Flotte et Missions viennent du document |
| `/vue/navires/{id}` | **Polymorphic** — les blocs changent selon `_class` |
| `/vue/tableau-de-bord` | **`$facet`** — six analyses en une passe |
| `/vue/diagnostic` | La requête lente, avant/après index, `$indexStats` |

### Le compteur, c'est tout l'intérêt

`CompteurRequetesMongo` est un `CommandListener` du pilote MongoDB, remis à
zéro à chaque appel par un intercepteur. Résultat, mesuré :

```
/vue/navires?nation=France                 ->  2 requetes Mongo
/vue/navires?nation=France&nplusun=true    -> 12 requetes Mongo
```

**La page est identique au pixel près.** Le lien « Rejouer en résolvant le port
navire par navire » bascule entre les deux : le N+1 devient visible sans lire
un seul log, et sans quitter l'écran.

Le détail des commandes est dépliable dans le bandeau.

> **Limite assumée** : le compteur est un `ThreadLocal`. Le pilote synchrone
> exécute ses écouteurs sur le thread appelant, donc cela suffit ici. Avec le
> pilote réactif, il faudrait le `Context` de Reactor.

## Le polymorphisme

`Navire` est **abstraite**. Trois sous-classes, une seule collection :

```java
@Document("navires") @TypeAlias("sous-marin")
public class SousMarin extends Navire { ... }
```

Spring Data écrit `_class: "sous-marin"` dans le document et s'en sert pour
instancier la bonne classe à la lecture. **`@TypeAlias` n'est pas cosmétique** :
sans lui, Spring inscrit le nom de classe complet, et renommer le package rend
toute la collection illisible.

Le point à montrer au vidéoprojecteur :

```
GET /api/navires/comptage-par-forme
  TOTAL (NavireRepository)                45
  count() nu - AUCUN filtre _class, donc faux
      SousMarinRepository.count()         45   <-- !
      PorteAeronefsRepository.count()     45   <-- !
      BatimentSurfaceRepository.count()   45   <-- !
  avec discriminant explicite
      sous-marin                          10
      porte-aeronefs                      17
      batiment-surface                    18
```

**Le piège du module.** On attend d'un repository typé sur `SousMarin` qu'il ne
voie que les sous-marins. Spring Data n'ajoute **aucune** restriction sur
`_class` — et instancie de force les 45 documents en `SousMarin`. Mistypage
silencieux.

Le discriminant est donc écrit à la main dans chaque `@Query`.
`FormatStockageTest` verrouille le comportement : si une version de Spring Data
change d'avis, le test le signale.

**Deux discriminants coexistent, et ce n'est pas un doublon** : `_class` est
écrit par Spring Data dans MongoDB, `categorie` est écrit par Jackson dans le
JSON de l'API. Deux frontières différentes — la base et le réseau.

## Le piège du `id` imbriqué

Spring Data mappe **toute** propriété nommée `id` vers la clé `_id` — y compris
dans un sous-document. Les références enrichies portent donc `@Field("id")` :

```java
public record PortRef(@Field("id") String id, String nom, String pays) { }
```

Sans cette annotation, l'application écrit `portAttache._id` là où les scripts
`mongosh` écrivent `portAttache.id`. Les deux formats cohabitent, et les
`$lookup` remontent vide **sans erreur**. `FormatStockageTest` verrouille ça.

## La ligne de partage Repository / Template

> **`MongoRepository`** pour tout ce qui est connu à la compilation : CRUD,
> requêtes dérivées, `@Query` simple, pagination.
>
> **`MongoTemplate`** dès que la requête se construit **dynamiquement** ou
> qu'on sort du modèle : `Criteria` conditionnels, agrégations, opérations en
> masse, `explain()`.

Matérialisée par le trio `NavireRepository` / `NavireRepositoryCustom` /
`NavireRepositoryCustomImpl`. Le service n'injecte **qu'une seule interface**,
deux moteurs répondent derrière. C'est le motif *custom repository
implementation* de Spring Data ; le suffixe **`Impl`** n'est pas négociable,
c'est ainsi que Spring trouve la classe.

## Les index

`spring.data.mongodb.auto-index-creation` est à **false**, volontairement.

Les annotations `@Indexed` / `@CompoundIndex` sur les documents **documentent
l'intention** ; c'est `IndexConfig` qui crée réellement, au démarrage,
dans un ordre connu et tracé dans les logs. L'`IndexResolver` relit les
annotations, donc elles restent la source unique — seuls l'index **partiel** et
l'index **texte**, qu'aucune annotation ne sait exprimer, sont écrits à la main.

Pour démontrer l'effet de l'absence d'index :

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=sansindex
```

## Tests

```bash
./mvnw test
```

Testcontainers démarre un **vrai MongoDB 8.0** — pas de Mongo embarqué, qui
figerait une version et ne reproduirait ni les index ni le planificateur.
**Un démon Docker doit tourner.**

### Noyau Linux ≥ 6.19

`MongoTestBase` passe `GLIBC_TUNABLES=glibc.pthread.rseq=1` au conteneur, sans
quoi MongoDB 8.0+ refuse de démarrer et **tous** les tests échouent. Même cause
que dans le Compose — voir `docker/README.md`.

### Sous Podman

```bash
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock
export TESTCONTAINERS_RYUK_DISABLED=true
./mvnw test
```

Ryuk, le conteneur de nettoyage de Testcontainers, réclame des privilèges que
le mode rootless refuse.

| Classe | Ce qu'elle vérifie |
|---|---|
| `NavireRepositoryTest` | audit, `@Version`, index unique composé, dérivées, `$elemMatch`, projection, pagination, `$text` |
| `NavireRepositoryCustomTest` | `Criteria` dynamiques, `$geoWithin`, `$geoNear`, `updateMulti`, `$addToSet` |
| `StatistiqueRepositoryTest` | `$group`, `$unwind`, `$bucket`, `$lookup`, `$facet` |

## Journalisation

`application.yml` met `MongoTemplate` en **DEBUG** : la requête BSON réellement
envoyée au serveur apparaît dans la console. C'est indispensable au J3 — on voit
ce que Spring a traduit, pas ce qu'on croit avoir écrit. C'est aussi ce qui rend
le **N+1** de `@DocumentReference` visible à l'œil nu via
`/api/demonstration/reference-resolue`.
