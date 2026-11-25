# Infrastructure MongoDB — AMIRAUTE

Trois profils, **un seul à la fois**. Depuis `docker/`, ou depuis la racine avec
le `Makefile` : `make simple`, `make replique`, `make partition`, `make stop`.

---

## Profil `simple` — le profil par défaut

Un `mongod` autonome, authentification activée. Celui de J1, J2 matin et tout le J3.

```bash
docker compose --profile simple up -d
```

| Ressource | Accès |
|---|---|
| MongoDB | `mongodb://localhost:27017` |
| Compte admin | `amiral` / `amiral` (`authSource=admin`) |
| Compte applicatif | `amiraute_app` / `amiraute` (`authSource=amiraute`) |
| Compte lecture seule | `amiraute_lecture` / `amiraute` (`authSource=amiraute`) |
| mongo-express | http://localhost:8081 |
| Console de MongoDB en visuel | http://127.0.0.1:8822 (la capsule achille la trouve seule) |

Chaîne de connexion utilisée par Spring :

```
mongodb://amiraute_app:amiraute@localhost:27017/amiraute?authSource=amiraute
```

Ouvrir un shell :

```bash
docker compose exec mongo mongosh -u amiral -p amiral --authenticationDatabase admin amiraute
```

Jouer un script du cours (depuis la racine) :

```bash
make charger F=mongosh/00-jeu-de-donnees.js
```

### Le piège du « healthy » trop tôt

L'entrypoint de l'image `mongo` démarre un **premier** `mongod` pour jouer
`/docker-entrypoint-initdb.d`, l'arrête, puis relance le vrai serveur. Entre
les deux, les connexions sont refusées.

Un script qui enchaîne sur un simple `ping` réussi peut donc taper contre
l'instance temporaire et recevoir un `ECONNREFUSED` juste après un `healthy`.

Le `start_period` ne protège de rien : un ping réussi pendant cette période rend
le conteneur `healthy` aussitôt. Le healthcheck du profil `simple` attend donc
que l'instance temporaire soit arrêtée (son pidfile a disparu) et que le compte
`amiraute_app` existe : `docker compose --profile simple up -d --wait` ne rend
la main qu'une fois l'init jouée. Si tu scriptes toi-même une attente, exige
**plusieurs succès consécutifs** :

```bash
ok=0
until [ $ok -ge 5 ]; do
  if mongosh --quiet --eval 'db.adminCommand("ping").ok' >/dev/null 2>&1; then
    ok=$((ok+1)); else ok=0; fi
  sleep 2
done
```

### Ce que font les scripts d'init

`mongo-init/` n'est exécuté **qu'une fois**, à la création du volume.

- `01-utilisateur-applicatif.js` — crée les trois comptes ci-dessus.
- `02-collections.js` — crée les collections, dont `journauxBord` en
  **time series**. C'est un type qui ne peut pas être ajouté après coup : il
  fallait le déclarer là.

Pour rejouer l'init, détruire le volume : `docker compose --profile simple down -v`.

---

## Profil `replique` — replica set à 3 nœuds

J2 après-midi. Socle des **transactions** et des **change streams**, qui exigent
un replica set.

```bash
docker compose --profile replique up -d
docker compose logs rs-init          # verifier l'election du primaire
```

| Nœud | Port hôte | Rôle initial |
|---|---|---|
| `mongo1` | 27018 | primaire (priorité 2) |
| `mongo2` | 27019 | secondaire |
| `mongo3` | 27020 | secondaire |

Les démonstrations se font **depuis l'intérieur du réseau Docker** :

```bash
docker compose exec mongo1 mongosh --eval 'rs.status()'
docker compose exec mongo1 mongosh --eval 'rs.stepDown()'   # provoquer une bascule
docker compose exec mongo2 mongosh --eval 'db.hello().secondary'
```

### Pourquoi pas d'authentification ici

Un replica set authentifié exige un **keyfile partagé** entre les nœuds, avec
des permissions strictes — un point de friction qui n'apprend rien sur la
réplication. Le profil `simple` porte la démonstration de l'authentification,
celui-ci porte celle de la réplication.

### Se connecter depuis l'hôte

Les membres sont déclarés avec leurs noms Docker (`mongo1:27017`), que l'hôte ne
résout pas. Deux options :

1. **Connexion directe à un nœud**, suffisant pour observer :
   `mongodb://localhost:27018/?directConnection=true`
2. **Connexion replica set complète** : ajouter au fichier `hosts` de la machine
   la ligne `127.0.0.1 mongo1 mongo2 mongo3`, puis
   `mongodb://mongo1:27018,mongo2:27019,mongo3:27020/?replicaSet=rsAmiraute`.

L'option 2 demande les droits administrateur — à réserver au poste du formateur.

---

## Profil `partition` — cluster shardé

J2 après-midi, juste après la réplication. C'est **la démonstration du passage
à l'échelle horizontale**, et elle est conçue pour être jouée en direct.

```bash
make stop && make partition      # cluster a 2 shards
make cluster-charger             # 100 000 releves, A TRAVERS le routeur
make charger-shard F=mongosh/08-sharding.js
```

| Composant | Rôle |
|---|---|
| `configsvr` | serveur de configuration (replica set `rsConfig`) |
| `shard1`, `shard2` | les deux fragments (`rsShard1`, `rsShard2`) |
| `mongos` | le routeur, exposé sur le port hôte **27117** |
| `shard3` | le **troisième** shard, profil `extension`, démarré à la demande |

Chaque shard est **mono-nœud** : on démontre le partitionnement, pas la
redondance. En production, chaque shard serait lui-même un replica set
complet — c'est la précision à donner à l'oral.

### Le scénario, en cinq temps

1. **Avant** — 100 000 documents, collection **non partitionnée** : tout est
   sur le shard primaire, l'autre shard est vide. Le cluster ne sert à rien.
2. **Le choix de la clé** — cardinalité, répartition, ciblage, mesurés sur les
   candidats réels.
3. **`sh.shardCollection()` en direct** — les chunks se créent, le répartiteur
   démarre. Le script boucle huit fois sur cinq secondes : **on voit les chunks
   se déplacer**.
4. **Ciblée contre diffusée** — `explain()` montre combien de shards chaque
   requête interroge.
5. **`make etendre`** — un troisième shard rejoint le cluster **sans rien
   arrêter**, et le répartiteur redistribue tout seul.

### Deux réglages qui rendent la démo possible

Sans eux, le cluster tourne mais **ne montre rien**.

**Taille de chunk : 1 Mo** au lieu de 128 Mo par défaut. Le jeu de données pèse
~20 Mo : il tiendrait entièrement dans un seul chunk, et rien ne se
partitionnerait jamais. À 1 Mo, on obtient une vingtaine de chunks et les
migrations deviennent visibles. **Réglage de démonstration uniquement** — en
production, 128 Mo est le bon compromis.

**`orphanCleanupDelaySecs=10`** au lieu de 900. Après une migration, le shard
*source* garde les documents déplacés — les « orphelins » — jusqu'au passage
du nettoyeur. Avec le défaut, les compteurs par shard restent faux pendant
quinze minutes, soit toute la durée de la séquence.

### Deux pièges de lecture, à annoncer avant qu'on les découvre

**Le nombre de chunks n'est pas la mesure de l'équilibre.** Depuis MongoDB 6,
le répartiteur équilibre la **taille des données**, pas le nombre de chunks.
Voir un shard à 1 chunk et l'autre à 9 n'est donc pas un déséquilibre :
`db.adminCommand({ balancerCollectionStatus: ... })` répond
`balancerCompliant: true`.

**Le répartiteur ne vise pas l'égalité parfaite.** Sur trois shards, attendez
37 / 39 / 24 %, pas 33 / 33 / 33. Il s'arrête dès que l'écart passe sous son
seuil : déplacer un chunk coûte une lecture, une écriture, un verrou de plage
et un nettoyage d'orphelins. Chercher l'égalité coûterait plus cher que le
déséquilibre corrigé. `balancerCompliant: true` le confirme.

**`$collStats` compte les orphelins.** La somme des documents par shard peut
dépasser le total réel. `countDocuments()` via `mongos` est la seule vérité.

### Le passage à l'échelle, pour de vrai

Trois terminaux, et c'est le moment fort de la journée :

```bash
# terminal 1 - la sonde : le compteur ne doit JAMAIS bouger
make cluster-sonde

# terminal 2 - on ajoute une machine au cluster en production
make etendre

# terminal 3 - on regarde les donnees migrer
make cluster-etat        # a relancer plusieurs fois
```

Le compteur du terminal 1 reste à 100 000, sans interruption ni erreur,
pendant que les données se déplacent. **C'est cela, le passage à l'échelle
horizontale** : on ajoute une machine à un système en production, et personne
ne s'en aperçoit.

### Rejouer la démonstration

```bash
make cluster-reinit      # departitionne
make cluster-charger     # recharge
```

### Une différence à signaler

`journauxBord` est ici partitionnée sur `{ navireId: "hashed" }` — la clé
composée `{ navireId: "hashed", horodatage: 1 }` serait défendable, mais la
version simple suffit à la démonstration et se lit mieux au vidéoprojecteur.

Noter aussi que **supprimer une collection partitionnée efface sa
configuration de partitionnement** : c'est exactement ce que fait
`make cluster-reinit`.

## Si tu utilises Podman plutôt que Docker

Le socket rootless de Podman **parle l'API Docker**. Le client `docker` et
`docker compose` fonctionnent tels quels, il suffit de les pointer dessus :

```bash
systemctl --user enable --now podman.socket
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock
docker compose --profile simple up -d      # inchange
```

Pour rendre le réglage permanent, ajouter l'`export` à `~/.bashrc`.

### Pour les tests Testcontainers

Deux variables de plus. **Ryuk**, le conteneur de nettoyage de Testcontainers,
demande des privilèges que le mode rootless ne donne pas :

```bash
export TESTCONTAINERS_RYUK_DISABLED=true
export TESTCONTAINERS_CHECKS_DISABLE=true
./mvnw test
```

Ryuk désactivé, les conteneurs de test ne sont plus supprimés automatiquement
en cas de crash de la JVM. `podman container prune` fait le ménage.

### Le piège du groupe `docker`

`sudo usermod -aG docker $USER` ne prend effet qu'à la **prochaine ouverture de
session** — les groupes sont résolus au login, pas au lancement du processus.
Relancer un terminal ne suffit pas toujours : il faut fermer la session
graphique, ou `loginctl terminate-user $USER`.

Vérifier :

```bash
getent group docker     # simon doit y figurer
id -nG                  # ... et docker doit apparaitre ICI aussi
```

Si le premier le montre mais pas le second, c'est la session qui est en retard.

---

## Nettoyage

```bash
docker compose --profile simple down       # arreter, garder les donnees
docker compose --profile simple down -v    # arreter et tout effacer
docker compose down --remove-orphans       # menage complet
```

Chaque profil a ses propres volumes nommés : basculer de `simple` à `replique`
ne détruit pas le jeu de données du premier.
