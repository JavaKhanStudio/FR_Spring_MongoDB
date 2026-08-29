# E13 — La médiathèque polymorphe

**Module** Polymorphic pattern · **J2 matin** · **Hors-piste** · ★★★ · ~45 min

## Contexte

Une médiathèque catalogue des **livres**, des **films** et des **albums**. Trois
choses très différentes, qu'on cherche pourtant *ensemble* : « tout ce qui est
sorti en 2024 », « tout ce qui parle de la mer », « les 10 emprunts du mois ».

Aucun navire : savoir refaire le polymorphisme du cours ne prouve rien. Savoir
décider **où passe la frontière** entre le tronc commun et le spécifique, si.

## Ce dont tu disposes

Rien de prêt. Les besoins :

**Tronc commun** — titre, année, langue, genres, cote en rayon, disponible.

**Livre** — ISBN, auteurs, éditeur, nombre de pages, format (POCHE, BROCHE, RELIE).

**Film** — réalisateur, durée en minutes, support (DVD, BLURAY, VOD),
sous-titres disponibles, casting principal.

**Album** — artiste, label, nombre de pistes, durée totale, une **liste de
pistes** avec titre et durée.

## Travail demandé

1. **Sur papier d'abord.** Quels champs mets-tu dans le tronc commun, lesquels
   laisses-tu au spécifique ? Justifie **deux** cas limites de ton choix.
2. Créer `ex_medias` et y insérer au moins 3 livres, 3 films et 3 albums, avec
   un discriminant. **Comment nommes-tu ce champ, et pourquoi ?**
3. Écrire les requêtes **transverses** — celles qui ignorent le type :
   - tout ce qui est sorti en 2024, tous types confondus ;
   - le nombre d'éléments par type et par langue ;
   - tout ce qui est indisponible.
4. Écrire les requêtes **spécifiques** :
   - les livres de plus de 500 pages ;
   - les films en BLURAY avec sous-titres ;
   - les albums de plus de 12 pistes.
5. Créer les index. **Combien en faut-il, et sur quoi ?** Compare avec le
   nombre qu'il faudrait pour trois collections séparées.
6. Mesurer avec `explain()` une requête spécifique **sans** filtre sur le
   discriminant, puis **avec**. Quel est l'écart, et pourquoi ?
7. Un cas qui fâche : la médiathèque acquiert des **jeux vidéo**. Que dois-tu
   modifier ? Combien de documents existants sont impactés ?

## Résultat attendu

1. Réponse type : le tronc commun est ce sur quoi on fait des requêtes
   **transverses**. `annee`, `langue`, `genres`, `disponible` en font partie.
   `duree` est le cas limite intéressant — un film et un album en ont une, un
   livre non. Le monter dans le tronc commun ou pas est défendable **des deux
   côtés** : sache argumenter.
2. Un champ `type` avec des valeurs `LIVRE` / `FILM` / `ALBUM`. Le nommer
   `_class` serait une erreur : ce nom appartient à Spring Data.
5. **Deux ou trois index suffisent** : un sur `(type, annee)`, un sur
   `(disponible, annee)`, un texte sur `titre`. Trois collections séparées en
   demanderaient trois fois plus, pour un service moindre.
6. Sans filtre sur `type`, MongoDB examine les 9 documents. Avec, il n'examine
   que les 3 du bon type. L'écart est dérisoire ici — **c'est le point** :
   il devient décisif à 100 000 documents.
7. **Zéro document impacté.** On ajoute une valeur au discriminant et on insère.
   Aucune migration, aucun `ALTER TABLE`, aucun déploiement coordonné.

## Pour aller plus loin

La question 7 est le vrai argument du pattern, et elle en cache une autre.

Un an plus tard, le tronc commun doit gagner un champ `dateAcquisition`,
obligatoire. Les 40 000 documents existants ne l'ont pas.

Comment gères-tu la transition **sans interruption de service** ? Cherche le
pattern **Schema Versioning** — et demande-toi ce qui se passerait avec un
`ALTER TABLE ... NOT NULL` sur 40 000 lignes en production.
