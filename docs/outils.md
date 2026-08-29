# Outils annexes — support du J1 matin

> Programme : *Outils annexes (Compass, CLI, etc)*

---

## Le paysage

| Outil | Nature | Quand s'en servir |
|---|---|---|
| **`mongosh`** | shell JavaScript | tout le cours. C'est la référence |
| **Compass** | client graphique officiel | explorer, analyser un schéma, lire un plan |
| **mongo-express** | client web dans le Compose | coup d'œil rapide, zéro installation |
| **Extension VS Code** | *MongoDB for VS Code* | rester dans l'éditeur, playgrounds `.mongodb.js` |
| **Database Tools** | `mongodump`, `mongoexport`… | sauvegarde et transfert |
| **Atlas** | l'offre managée | hors périmètre, mentionné pour situer |

---

## `mongosh` — la référence

Tout ce que fait Compass, `mongosh` le fait ; l'inverse est faux. C'est aussi
le seul outil dont la syntaxe se retrouve **telle quelle** dans la
documentation officielle, dans Stack Overflow et dans `@Query` côté Spring.

```bash
make shell                    # ouvre un shell sur la base amiraute
make charger F=mongosh/04-index.js
```

Les commandes du formateur :

```js
show dbs                       // les bases
use amiraute                   // changer de base
show collections               // les collections
db.navires.countDocuments()    // compter
db.navires.findOne()           // un document, pour voir la forme
db.navires.getIndexes()        // les index
db.navires.find().pretty()     // sortie lisible
```

Deux réflexes à installer dès le J1 :

```js
// Ce que MongoDB ferait vraiment
db.navires.find({ nation: "France" }).explain("executionStats")

// L'aide en ligne, sans quitter le shell
db.navires.help()
```

---

## Compass — pour analyser, pas pour saisir

Connexion, profil `simple` :

```
mongodb://amiral:amiral@localhost:27017/?authSource=admin
```

Compte en lecture seule, à privilégier en salle :

```
mongodb://amiraute_lecture:amiraute@localhost:27017/amiraute?authSource=amiraute
```

Les quatre onglets qui servent réellement :

| Onglet | Usage en formation |
|---|---|
| **Documents** | voir la forme réelle, filtrer, éditer un document |
| **Schema** | **le plus utile** : échantillonne la collection et affiche les types et distributions de chaque champ |
| **Explain Plan** | le même `explain()` qu'en shell, mais lisible |
| **Indexes** | lister, créer, et surtout voir la **taille** et l'**usage** de chaque index |

### L'onglet Schema mérite dix minutes

Sur `navires`, il montre visuellement que `longueurMetres` est tantôt `int`,
tantôt `double`, et que `autonomieMillesNautiques` est parfois `null`, parfois
absent. Ce sont exactement les deux pièges du script `03-operateurs.js` —
Compass les rend **visibles sans écrire une requête**.

C'est le meilleur argument pour l'ouvrir en salle : sur un modèle sans schéma
déclaré, c'est l'outil qui dit à quoi ressemblent vraiment les données.

---

## mongo-express — le coup d'œil

<http://localhost:8081>, démarré avec le profil `simple`. Aucune installation.

Suffisant pour vérifier qu'un document est bien arrivé, ou pour montrer les
collections à quelqu'un qui n'a rien installé. Au-delà, prendre Compass.

---

## Extension VS Code

*MongoDB for VS Code*, dans la marketplace. L'intérêt : les **playgrounds**,
des fichiers `.mongodb.js` qu'on exécute par blocs, avec autocomplétion sur les
noms de collections et de champs.

Les scripts de `mongosh/` s'ouvrent tels quels comme playgrounds.

---

## Database Tools

Fournis séparément de l'image `mongo` depuis MongoDB 6. À installer sur le
poste si besoin de sauvegarde ou de transfert.

```bash
# Sauvegarde binaire (BSON) - fidele, y compris les index
mongodump   --uri="mongodb://amiral:amiral@localhost:27017/amiraute?authSource=admin" --out=./sauvegarde
mongorestore --uri="..." ./sauvegarde

# Export texte (JSON/CSV) - lisible, mais perd les types BSON
mongoexport --uri="..." --collection=navires --out=navires.json --jsonArray
mongoimport --uri="..." --collection=navires --file=navires.json --jsonArray
```

**La distinction à faire passer :** `mongodump` produit du **BSON**, il
préserve les types exacts et les index. `mongoexport` produit du **JSON**, il
est lisible mais aplatit les types — un `Int32` et un `Double` deviennent
indistinguables. Pour une sauvegarde, `mongodump`. Pour échanger avec un autre
système, `mongoexport`.

---

## Depuis IntelliJ IDEA

IntelliJ Ultimate se connecte à MongoDB via l'outil **Database** : mêmes
paramètres que Compass. Utile pour rester dans l'IDE pendant le J3, mais
l'analyse de schéma et le plan d'exécution restent meilleurs dans Compass.

---

## Et Atlas ?

L'offre managée de MongoDB, avec un niveau gratuit. Hors périmètre de cette
session, qui installe en local par Docker conformément au programme.

Ce qu'il faut en savoir : la **chaîne de connexion** change de forme
(`mongodb+srv://…`), le pilote et le code Spring, eux, ne changent pas. Atlas
ajoute des services propres — Atlas Search, Vector Search, graphiques,
sauvegardes — qui ne font pas partie de MongoDB en tant que tel.
