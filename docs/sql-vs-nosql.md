# SQL vs NoSQL — support du J1 matin

> Programme : *SQL vs NoSQL · Survol des DBMS / SGBD NoSQL · Mise en contexte de
> MongoDB face à l'écosystème NoSQL*

---

## 1. Le même navire, dans les deux mondes

C'est la démonstration d'ouverture. On projette les deux modèles côte à côte et
on pose **une seule question** : *donne-moi la fiche complète du Charles de
Gaulle.*

### En relationnel — six tables

```sql
CREATE TABLE navire (
  id                  BIGINT PRIMARY KEY,
  numero_coque        VARCHAR(16) NOT NULL,
  nom                 VARCHAR(80) NOT NULL,
  nation              VARCHAR(40) NOT NULL,
  type                VARCHAR(24) NOT NULL,
  deplacement_tonnes  INT,
  port_attache_id     BIGINT REFERENCES port(id),
  flotte_id           BIGINT REFERENCES flotte(id),
  UNIQUE (nation, numero_coque)
);

CREATE TABLE propulsion (
  navire_id         BIGINT PRIMARY KEY REFERENCES navire(id),
  type              VARCHAR(24),
  puissance_chevaux INT,
  nombre_helices    SMALLINT
);

CREATE TABLE armement (
  id           BIGINT PRIMARY KEY,
  designation  VARCHAR(80),
  categorie    VARCHAR(32),
  portee_km    INT,
  calibre_mm   INT
);

CREATE TABLE navire_armement (
  navire_id   BIGINT REFERENCES navire(id),
  armement_id BIGINT REFERENCES armement(id),
  quantite    INT,
  PRIMARY KEY (navire_id, armement_id)
);

CREATE TABLE capteur (...);
CREATE TABLE navire_capteur (...);
```

La requête :

```sql
SELECT n.*, p.*, a.designation, na.quantite, c.designation
FROM navire n
LEFT JOIN propulsion      p  ON p.navire_id  = n.id
LEFT JOIN navire_armement na ON na.navire_id = n.id
LEFT JOIN armement        a  ON a.id = na.armement_id
LEFT JOIN navire_capteur  nc ON nc.navire_id = n.id
LEFT JOIN capteur         c  ON c.id = nc.capteur_id
WHERE n.nation = 'France' AND n.numero_coque = 'R91';
```

**Six tables, cinq jointures, un produit cartésien** à recomposer côté
application : 3 armements × 3 capteurs = 9 lignes pour un seul navire.

### En document — une collection

```js
db.navires.findOne({ nation: "France", numeroCoque: "R91" })
```

Une lecture. Un document. Rien à recomposer.

### Et ce n'est que la moitié du problème

Le modèle ci-dessus suppose que **tous les navires ont la même forme**. C'est
faux, et c'est là que le relationnel se tend vraiment.

Un sous-marin porte une profondeur maximale d'immersion et une signature
acoustique. Un porte-aéronefs porte un type de catapulte, une longueur de piste
et un **groupe aérien** — une liste d'appareils avec leur rôle et leur nombre.
Un destroyer ne porte ni l'un ni l'autre.

Trois façons de traiter cela en SQL, et **aucune n'est bonne** :

| Stratégie | Ce qu'elle coûte |
|---|---|
| *Table par sous-type* — 3 tables filles jointes à `navire` | On passe de 6 à **9 tables**, et toute requête transverse devient un `UNION` |
| *Table unique large* — toutes les colonnes dans `navire` | Une trentaine de colonnes dont les deux tiers sont `NULL` sur chaque ligne, et aucune contrainte possible |
| *Colonne JSON* — un blob `caracteristiques` | C'est reconnaître qu'on avait besoin d'un document, tout en gardant les inconvénients du relationnel |

En document, cela ne se pose pas :

```js
db.navires.find({ typeCatapulte: "CATOBAR" })      // 4 porte-avions
db.navires.find({ profondeurMaxMetres: { $gt: 350 } })  // 4 sous-marins
db.navires.aggregate([                              // et la requete TRANSVERSE
  { $group: { _id: "$_class", tonnageMoyen: { $avg: "$deplacementTonnes" } } }
])
```

Une collection, trois formes de document, un champ discriminant `_class`. C'est
le **Polymorphic pattern**, et c'est le sujet du J2 matin.

### Ce qu'il faut en dire

Le modèle document n'est pas « plus simple ». Il fait un **pari différent** :
il optimise pour la lecture qu'on fait *tout le temps*, en acceptant d'être
moins souple sur celles qu'on fait *parfois*.

Et il accepte que **deux lignes d'une même table n'aient pas la même forme** —
ce qu'aucun schéma relationnel ne permet sans contorsion.

## 2. Le tableau honnête

| | Relationnel | Document (MongoDB) |
|---|---|---|
| Schéma | déclaré, contraint à l'écriture | libre, contrôlé par l'application ou par un validateur |
| Formes différentes dans un même ensemble | impossible sans tables filles ou colonnes `NULL` | natif — un champ discriminant suffit |
| Donnée liée | éclatée en tables, recomposée par jointure | rassemblée dans le document |
| Lecture d'un agrégat | N jointures | 1 lecture |
| Requête transverse imprévue | naturelle (SQL est fait pour ça) | souvent une agrégation, parfois impossible |
| Intégrité référentielle | garantie par le SGBD | **inexistante**, à la charge du code |
| Transactions | natives, quotidiennes | possibles, mais coûteuses et à éviter |
| Montée en charge | verticale, puis réplication en lecture | horizontale par sharding, native |
| Modification du schéma | migration `ALTER TABLE` | écriture progressive, documents hétérogènes |

### La phrase à retenir

> **On ne choisit pas MongoDB parce qu'il n'a pas de schéma. On le choisit
> parce que le schéma vit dans le document plutôt que dans le catalogue.**

Le schéma existe toujours. Il est simplement porté par l'application — donc
versionné avec elle, et modifiable sans verrou global.

---

## 3. L'écosystème NoSQL en quatre familles

| Famille | Modèle | Représentants | Ce qu'AMIRAUTE y mettrait |
|---|---|---|---|
| **Document** | JSON/BSON imbriqué, requêtable en profondeur | MongoDB, Couchbase, DocumentDB | **tout le référentiel** : navires, missions, ports |
| **Clé-valeur** | `get` / `put` sur une clé, valeur opaque | Redis, DynamoDB, Memcached | le cache du tableau de bord, les sessions opérateur |
| **Colonnes larges** | lignes très larges, écriture massive | Cassandra, HBase, ScyllaDB | `journauxBord` si on passait à 10 milliards de relevés |
| **Graphe** | nœuds et arêtes, parcours de relations | Neo4j, JanusGraph | la chaîne de commandement, « qui a navigué avec qui » |

Les quatre ne sont **pas concurrentes** : elles répondent à des questions
différentes. Un système réel en combine souvent deux ou trois.

### Où placer MongoDB

MongoDB est le **document** le plus généraliste : il requête en profondeur, il
agrège, il indexe finement, il fait du géospatial et du plein texte. C'est ce
qui en fait le choix par défaut quand on hésite — et aussi ce qui explique
qu'on le voie parfois utilisé là où un relationnel aurait mieux fait.

---

## 4. Face à PostgreSQL JSONB — la vraie question de 2026

L'objection arrive toujours, et elle est légitime : *PostgreSQL sait stocker du
JSON, indexer dedans avec GIN, et requêter avec `jsonb_path_query`. Pourquoi
MongoDB ?*

**Ce que PostgreSQL JSONB fait aussi bien, voire mieux :**

- stocker et indexer un document imbriqué ;
- mélanger colonnes typées et JSON dans la même table ;
- des transactions ACID sur plusieurs lignes, sans réserve ni contorsion ;
- des jointures dont l'optimiseur est incomparablement plus mûr que `$lookup`.

**Ce que MongoDB apporte en propre :**

- le **sharding natif**, transparent pour l'application ;
- un **pipeline d'agrégation** nettement plus expressif que du SQL sur JSONB ;
- les **change streams**, sans extension ni déclencheur ;
- une réplication et une bascule automatiques, intégrées ;
- un modèle mental homogène : tout est document, du stockage jusqu'au pilote.

### La règle de décision

> Si les données sont **naturellement relationnelles** et que le volume tient
> sur une machine : **PostgreSQL**, JSONB pour les parties souples.
>
> Si les données sont **naturellement agrégées**, que le volume impose de
> partitionner, ou que le schéma évolue vite et souvent : **MongoDB**.

AMIRAUTE tombe du côté MongoDB pour deux raisons : un navire *est* un agrégat
naturel, et `journauxBord` grossit sans limite dans le temps.

---

## 5. Le théorème CAP, dit correctement

Trois propriétés, **on n'en garde que deux** en cas de partition réseau :

- **C**onsistency — tous les nœuds voient la même donnée ;
- **A**vailability — chaque requête reçoit une réponse ;
- **P**artition tolerance — le système survit à une coupure réseau.

Sur un système distribué, **P n'est pas optionnel** : le réseau tombe. Le vrai
arbitrage est donc **CP ou AP**.

**MongoDB est CP.** En cas de partition, le côté minoritaire refuse les
écritures plutôt que de risquer une divergence. C'est directement observable :
un replica set qui perd la majorité de ses votants n'a plus de primaire, donc
plus d'écriture. C'est ce qu'on démontre en J2 après-midi avec `rs.stepDown()`.

Cassandra, à l'inverse, est **AP** : il accepte l'écriture des deux côtés et
réconcilie après coup.

Aucun des deux n'a raison dans l'absolu. La question est : *que préfère-t-on,
une écriture refusée ou deux versions à réconcilier ?*
