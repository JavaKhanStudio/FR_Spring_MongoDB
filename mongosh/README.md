# Scripts `mongosh` — la partie MongoDB pure du cours

Chaque script est **autonome** et **commenté** : un stagiaire peut n'en rejouer
qu'un seul. Ils sont conçus pour être projetés, pas seulement exécutés.

## Ordre d'exécution

```bash
make simple                                 # demarrer le serveur
make charger F=mongosh/00-jeu-de-donnees.js # UNE FOIS
make charger F=mongosh/00b-generer-volume.js# UNE FOIS (~30 s)
```

| Script | Demi-journée | Module du programme | Profil |
|---|---|---|---|
| `00-jeu-de-donnees.js` | avant J1 | amorçage : ports, flottes, navires, missions | `simple` |
| `00b-generer-volume.js` | avant J1 | amorçage : 1 941 marins, 100 000 relevés | `simple` |
| `01-crud.js` | J1 pm | inserts one/many, updates, deletes | `simple` |
| `02-requetes.js` | J1 pm | find, projection, sort, limit, skip | `simple` |
| `03-operateurs.js` | J1 pm | `$eq` `$ne` `$gt` `$regex` `$in` `$elemMatch` | `simple` |
| `04-index.js` | J2 am | simple, unique, composé, partiel, texte, 2dsphere | `simple` |
| `05-embedded-referred.js` | J2 am | Embedded et Referred | `simple` |
| `05b-patterns.js` | J2 am | **Catalogue de patterns** : Polymorphic, Extended Reference, Subset, Computed, Bucket, Attribute | `simple` |
| `06-agregations.js` | J2 pm | Les Aggregates | `simple` |
| `07-replication.js` | J2 pm | Réplication | **`replique`** |
| `08-sharding.js` | J2 pm | Sharding | **`partition`** |
| `09-transactions.js` | J2 pm *(bonus)* | transactions, change streams | **`replique`** |
| `10-diagnostic.js` | J3 pm | performances, profileur, logs | `simple` |
| `00c-poissons.js` | *à la demande* | amorçage : 4 000 observations **délibérément mal modélisées** | `simple` |
| `11-antipatterns.js` | J3 pm *(bonus)* | **autopsie comparée** : dix pathologies mesurées | `simple` |

## Lancer un script

Les scripts sont **montés** dans le conteneur (`/projet`) et joués avec
`--file`, jamais par `stdin` : `mongosh` lu sur stdin se comporte en REPL, ce
qui casse certaines constructions multi-lignes sans message clair.


```bash
# profil simple
make charger F=mongosh/04-index.js        # -> mongosh --file /projet/mongosh/04-index.js

# profil replique (le script s'execute DANS le reseau Docker, sur mongo1)
make charger-rs F=mongosh/07-replication.js

# profil partition (sur le routeur mongos)
make charger-shard F=mongosh/08-sharding.js
```

## Dépendances entre scripts

- `01` à `03`, `05`, `05b`, `06` : lecture seule ou auto-nettoyants. Rejouables
  sans limite (`05b` crée et supprime ses propres collections `demo*`).
- `04` **crée les index** et les laisse en place. C'est voulu : `06` et `10` en
  ont besoin. Pour repartir d'une collection nue, rejouer `00b`.
- `10` suppose que `04` a été joué.

## Le banc de poissons

`poissons` est une collection **délibérément malade**, totalement isolée du
reste : aucun navire, aucune mission, aucun index du projet ne la référence.
La supprimer n'a aucun effet.

```bash
make charger F=mongosh/00c-poissons.js     # genere poissons ET poissonsCorrige
make charger F=mongosh/11-antipatterns.js  # l'autopsie comparee
```

Le reste du projet montre le **bon** modèle et explique pourquoi il est bon.
Cela laisse un angle mort : les stagiaires n'ont jamais vu, en vrai, ce que
produit une mauvaise modélisation. `poissons` comble cet angle mort avec dix
pathologies **toutes mesurables** avec les outils du J3.

Le verdict, mesuré sur la même information :

| | Malade | Corrigé | Facteur |
|---|---|---|---|
| Données | 33 244 Ko | 1 189 Ko | **28 ×** |
| Document moyen | 8 510 o | 304 o | **28 ×** |
| Index | 10 | 5 | — |

**Aucune des dix pathologies ne lève d'erreur.** Trois produisent des résultats
silencieusement **incomplets** — types mélangés, casse non normalisée,
référence cassée. Un test qui compte des lignes ne les verra jamais.

## Remettre à zéro

```bash
make purger && make simple
make charger F=mongosh/00-jeu-de-donnees.js
make charger F=mongosh/00b-generer-volume.js
```

## Note sur le jeu de données

Les petites collections sont **écrites à la main** avec des données réelles :
le *Charles de Gaulle* déplace bien 42 500 t, Toulon est bien à 43,12° N. Un
stagiaire qui reconnaît la donnée fait confiance à l'exemple.

Les 100 000 relevés de `journauxBord` sont générés par un **générateur
congruentiel à graine fixe** : toute la salle obtient exactement les mêmes
documents, donc les mêmes sorties d'`explain()`. La démonstration du module
Performance est reproductible d'une session à l'autre.
