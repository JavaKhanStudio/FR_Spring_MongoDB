# E10 — Les capteurs météo

**Module** collection time series, index TTL · **J2 après-midi** · **Hors-piste** · ★★ · ~25 min

## Contexte

Un réseau de 40 stations météo remonte une mesure par minute. Le volume double
tous les six mois, et personne ne consulte jamais les données de plus de
90 jours.

C'est le cas d'usage type de la **collection time series** — un type que le
projet AMIRAUTE n'utilise volontairement pas, pour ne pas brouiller les
démonstrations d'`explain()`.

## Ce dont tu disposes

Rien de prêt : **tu crées tout**. Le générateur est fourni dans le corrigé, mais
essaie d'abord d'écrire le `createCollection` toi-même.

## Travail demandé

1. Créer `ex_meteo` en **collection time series**. Identifier lequel des champs
   est le `timeField`, lequel est le `metaField`, et choisir la `granularity`.
   Justifier les trois choix.

   Forme d'une mesure :
   ```json
   { "instant": "2026-08-26T14:32:00Z",
     "station": { "code": "ST-014", "region": "PACA", "altitude": 320 },
     "temperature": 27.4, "humidite": 41, "pressionHpa": 1013.2, "ventKmh": 12.5 }
   ```

2. Y insérer **100 000** mesures réparties sur 40 stations et 30 jours.
3. Comparer la **taille sur disque** avec celle d'une collection ordinaire
   contenant exactement les mêmes documents. Quel est le facteur ?
4. Écrire la requête « température moyenne par jour pour la station ST-014 ».
   Regarder son `explain()`. **Qu'est-ce qui a changé** par rapport à une
   collection ordinaire ?
5. Créer un index secondaire pertinent. Lesquels sont autorisés sur une
   collection time series, lesquels ne le sont pas ?
6. Faire expirer automatiquement les mesures de plus de 90 jours. Quelle est la
   syntaxe pour une time series, et en quoi diffère-t-elle du TTL sur une
   collection ordinaire ?
7. Tenter un `updateOne` sur une mesure, puis un `deleteOne`. Que se passe-t-il ?

## Résultat attendu

1. `timeField: "instant"`, `metaField: "station"`, `granularity: "minutes"`.
   Le `metaField` est ce qui **ne change pas** entre deux mesures d'une même
   source — c'est la clé de regroupement en *buckets*.
2. 100 000 documents.
3. La time series occupe **nettement moins** — attends-toi à un facteur de 3 à
   10 selon la compressibilité.
4. `explain()` ne montre plus des documents mais des **buckets** internes
   (`$_internalUnpackBucket`). Le nombre d'objets examinés n'est plus
   comparable à celui d'une collection ordinaire.
5. Autorisés : sur le `metaField`, sur le `timeField`, et leurs combinaisons.
   **Interdit** : un index unique, et un index sur un champ de mesure
   (`temperature`) avant MongoDB 6.3.
6. `expireAfterSeconds` se passe dans les **options de la collection**, pas
   dans un index. C'est la différence majeure avec le TTL classique.
7. Les mises à jour et suppressions sont **très limitées** : interdit de
   toucher au `timeField` ou au `metaField`, et `deleteOne` est refusé — seul
   `deleteMany` sur le `metaField` est permis.

## Pour aller plus loin

Une collection time series est **optimisée pour l'insertion et la lecture par
plage**, au prix de la mutabilité.

Reprends `journauxBord` d'AMIRAUTE : il aurait pu en être une. Le projet a
choisi de ne pas le faire — retrouve la raison dans
`docker/mongo-init/02-collections.js`, puis dis si tu es d'accord.

Et pose-toi la vraie question : dans un système réel de suivi de flotte,
laquelle des deux contraintes pèserait le plus lourd ?
