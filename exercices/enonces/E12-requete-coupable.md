# E12 — La requête coupable

**Module** Performance et diagnostic · **J3 après-midi** · **Proche** · ★★★ · ~45 min

## Contexte

Un utilisateur signale que « l'application rame ». Aucune autre information.

**Consigne stricte : ne lis pas le code de l'application.** Une requête lente a
été plantée volontairement dans le projet — tu dois la trouver **par les
outils**. C'est exactement ce qui se passera en production, où tu n'auras ni le
code sous les yeux ni la personne qui l'a écrit.

## Ce dont tu disposes

- Le profil `simple` démarré, la base amorcée, `mongosh/04-index.js` joué.
- L'application `amiraute-api` lancée.
- Tes outils : profileur MongoDB, logs, `explain()`, `$indexStats`,
  `$collStats`.

## Travail demandé

### Phase 1 — trouver

1. Activer le profileur au niveau 1, seuil **20 ms**.
2. Faire tourner l'application : appelle une dizaine d'endpoints depuis
   `requetes.http`, au hasard.
3. Interroger `system.profile` et **identifier la requête coupable** :
   collection, filtre, tri, durée, `planSummary`.
4. Retrouver la **même** requête dans les logs du conteneur, sans le profileur.

### Phase 2 — comprendre

5. Rejouer la requête avec `explain("executionStats")`. Relever
   `nReturned`, `totalDocsExamined`, `totalKeysExamined` et la chaîne des
   étapes du plan.
6. Calculer le **ratio documents lus / documents rendus**. Que dit-il ?
7. Identifier l'étape qui coûte, et expliquer en une phrase pourquoi elle est
   là.

### Phase 3 — corriger

8. Proposer **deux** corrections possibles. Une seule est la bonne — dis
   laquelle et pourquoi l'autre est un piège.
9. Appliquer la correction, **remesurer**, et chiffrer le gain.
10. Vérifier avec `$indexStats` que le nouvel index est bien utilisé, et
    qu'aucun index existant n'est devenu inutile.

### Phase 4 — rendre compte

11. Rédiger cinq lignes : symptôme, cause, correction, gain mesuré, risque
    résiduel. C'est ce qu'on écrit dans un ticket, et c'est la partie que tout
    le monde bâcle.

## Résultat attendu

- **Phase 1** : la requête coupable porte sur `journauxBord`, filtre vide, tri
  sur `carburantPourcent`. `planSummary` doit contenir `COLLSCAN`.
- **Phase 2** : ≈ **100 000** documents examinés pour **20** rendus, soit un
  ratio de **5 000**. Le plan contient une étape `SORT`, précédée de
  `SORT_KEY_GENERATOR` : MongoDB **trie en mémoire**.
- **Phase 3** : `db.journauxBord.createIndex({ carburantPourcent: 1 })` fait
  disparaître l'étape `SORT` et fait tomber les documents examinés à **20**.
- Le piège de la question 8 : ajouter `carburantPourcent` à l'index composé
  existant `{ navireId: 1, horodatage: 1 }` **ne sert à rien** — la requête n'a
  aucun filtre sur `navireId`, donc elle ne peut pas utiliser un index dont
  c'est le préfixe.

## Pour aller plus loin

Tu viens d'ajouter un index. **C'est presque toujours la mauvaise réflexion.**

Reprends la requête : elle trie 100 000 relevés par niveau de carburant, tous
navires confondus, pour n'en afficher que 20. **À quelle question métier
cela répond-il ?**

Si tu n'en trouves aucune, la bonne correction n'était pas un index : c'était
de supprimer la requête, ou de la borner à un navire. Un index qui accélère une
requête inutile est un coût permanent en échange de rien.

C'est le mot de la fin du module : **un index se justifie, il ne s'ajoute pas
par réflexe.**
