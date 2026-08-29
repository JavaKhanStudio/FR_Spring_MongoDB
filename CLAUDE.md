# AMIRAUTE — repere pour l'assistant

Support de formation **MongoDB / NoSQL avec Spring**, 3 jours, public
francophone. Projet fil rouge : le systeme d'information d'une marine de
guerre fictive.

Ce n'est pas une application a livrer : c'est du **materiel pedagogique**. Le
code est fait pour etre projete, lu a voix haute et modifie en direct devant
une salle.

---

## Convention de nommage — la regle la plus importante

**Anglais** pour tout ce qui designe un artefact logiciel ou un concept de
framework, **et pour les verbes de methode** :

    Repository  Controller  Service  Config  Impl  Custom  Handler  Test
    findBy...   search...   list...  create  update  delete  count...

**Francais** pour tout ce qui designe le domaine naval :

    Navire  Flotte  Armement  Capteur  MembreEquipage  JournalBord
    numeroCoque  deplacementTonnes  portAttache  portee  etiquette

**ASCII strict** dans le code, les identifiants, les commentaires, les clefs
JSON, les noms de fichiers :

    deplacementTonnes    et jamais    déplacementTonnes
    EN_REPARATION        et jamais    EN_RÉPARATION

Les accents ne sont admis que dans la documentation `.md` et les enonces
d'exercices.

Le glossaire complet est dans `docs/CONCEPTION.md` §7.

---

## Commentaires

**Rares et courts.** Un commentaire explique un CHOIX (pourquoi cet index est
partiel, pourquoi cette requete passe par `Criteria`), jamais ce que le code
fait deja. Pas de Javadoc systematique.

Exception : les pieges. Quand un comportement a coute du temps a decouvrir, le
commentaire doit dire ce qui a ete MESURE, pas ce qu'on suppose. Voir
`SousMarinRepository` ou `NavireRef`.

---

## Verifier, toujours

**Dans ce projet, chaque premiere execution a revele de vrais bugs.** La
compilation et `node --check` ne prouvent rien : les noms de champs, les
privileges, les types BSON et les plans de requete ne se voient qu'a
l'execution.

Ne jamais annoncer qu'une demonstration fonctionne sans l'avoir jouee. Si un
chiffre figure dans un enonce d'exercice ou un script, il doit avoir ete
mesure sur la vraie base.

```bash
make simple && make amorcer            # profil autonome + jeu de donnees
make charger F=mongosh/04-index.js     # jouer un script
cd amiraute-api && ./mvnw test         # 32 tests Testcontainers
cd bruno/amiraute && bru run --env local -r   # 33 requetes
```

---

## Environnement de cette machine

| | |
|---|---|
| Docker | le demon systeme n'est pas accessible ; on passe par le socket **podman rootless** |
| | `export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock` |
| JDK | pas de JDK systeme (JRE seul). Utiliser `JAVA_HOME=~/.jdks/jdk-21.0.11+10` |
| Maven | via `./mvnw` |
| Testcontainers | ajouter `TESTCONTAINERS_RYUK_DISABLED=true` en rootless |

---

## Pieges deja rencontres, deja corriges

Ne pas les reintroduire.

| Piege | Parade en place |
|---|---|
| MongoDB 8 refuse de demarrer sur noyau >= 6.19 (SERVER-121912) | `GLIBC_TUNABLES=glibc.pthread.rseq=1` sur les 8 services **et** dans `MongoTestBase` |
| SELinux bloque les bind mounts | suffixe `,z` sur tous les montages |
| `mongosh` lu sur stdin se comporte en REPL | toujours `--file /projet/...`, jamais `< fichier` |
| Spring mappe tout `id` vers `_id`, meme imbrique | `@Field("id")` sur `PortRef`, `FlotteRef`, `NavireRef` |
| Les references sont des `ObjectId`, le modele dit `String` | `@Field(targetType = FieldType.OBJECT_ID)` |
| Un repository de sous-classe ne filtre PAS sur `_class` | discriminant ecrit a la main dans chaque `@Query` |
| Projection par interface sur hierarchie polymorphe | DTO (`record`), jamais une interface |
| `Object.bsonsize` n'existe pas dans mongosh | `bsonsize()` global |
| `$geoNear` n'accepte plus `limit` | etape `$limit` distincte |
| `$near` interdit dans `countDocuments` | `find().itcount()` |
| Index partiel `$type: "string"` non utilise | `$exists: true`, et champ ABSENT plutot que `null` |
| `$indexStats` refuse par `readWrite` ET `dbAdmin` | role `observateur` sur mesure |
| `slowms` non modifiable par le compte applicatif | `--slowms=20` au demarrage de mongod |
| `system.profile.drop()` refuse sur standalone | filtrer par `ts`, ne pas vider |
| Le healthcheck repond avant le vrai demarrage | `start_period: 40s`, et exiger plusieurs pings consecutifs |
| `#request` indisponible dans Thymeleaf 3.1 | passer par le modele via un intercepteur |

---

## Structure

    docs/          CONCEPTION.md (commencer ici), deroule-3-jours, sql-vs-nosql, outils
    docker/        4 profils : simple / replique / partition / extension
    mongosh/       15 scripts, la partie MongoDB pure (J1 et J2)
    amiraute-api/  l'application Spring Boot (J3) + 4 pages Thymeleaf
    bruno/         collection Bruno, 33 requetes versionnees
    exercices/     15 enonces + corriges
    Makefile       toutes les cibles ; `make aide`

---

## Ce qui rend ce projet particulier

Le modele **n'est pas** un modele relationnel deguise. Cinq patterns de
modelisation MongoDB y sont appliques et demontres : Polymorphic (3 formes de
document dans `navires`), Extended Reference, Subset, Computed, et Bucket en
exercice.

`poissons` est une collection **deliberement malade**, isolee du reste, avec
dix pathologies mesurables. Ne pas la "corriger" : c'est le contre-exemple du
cours. Sa version saine est `poissonsCorrige`.

Une requete lente est **plantee volontairement** dans `journauxBord` : un tri
sur `carburantPourcent`, champ non indexe. Ne pas ajouter cet index.
