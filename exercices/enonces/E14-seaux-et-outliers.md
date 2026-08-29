# E14 — Seaux et cas extrêmes

**Module** Bucket et Outlier patterns · **J2 après-midi** · **Proche** · ★★★ · ~45 min

## Contexte

`journauxBord` contient 100 000 relevés, un document par relevé. Le projet a
**volontairement** gardé cette forme pour que les démonstrations d'`explain()`
restent lisibles.

Cet exercice construit la version en **seaux** et mesure ce qu'on y gagne —
et ce qu'on y perd.

## Ce dont tu disposes

- `journauxBord`, 100 000 documents, index `idx_navire_temps`.
- `navires`, 45 documents.

Tu travailleras dans `ex_seaux`, sans toucher à l'original.

## Travail demandé

### Partie 1 — Bucket

1. Mesurer l'état de départ : nombre de documents, taille des données, taille
   des index (`$collStats`).
2. Construire `ex_seaux` avec **un document par navire et par heure**. Chaque
   seau doit porter : `navireId`, `debut`, `nombre`, `vitesseMin`,
   `vitesseMax`, `vitesseMoyenne`, et le tableau `releves`.
   **Fais-le en une seule commande d'agrégation, avec `$merge` ou `$out`.**
3. Comparer les deux collections : nombre de documents, taille, taille des
   index. Quel est le facteur sur chacun des trois ?
4. Écrire « la vitesse moyenne du navire X le 12 juillet » **dans les deux
   modèles**. Comparer les `explain()`.
5. Écrire « le relevé exact du 12 juillet à 14h32 » dans les deux modèles.
   Lequel est le plus simple ? Le plus rapide ?
6. Quelle est la **limite** d'un seau, et que se passe-t-il quand on la
   dépasse ? Calcule combien de relevés tiennent dans un seau avant de la
   toucher.

### Partie 2 — Outlier

7. Un navire amiral remonte un relevé **toutes les 5 secondes** au lieu d'une
   fois par quart d'heure. Son seau horaire contiendrait 720 relevés au lieu
   de 4. Simule-le pour un navire.
8. Ce seul navire dégrade-t-il les requêtes sur **tous** les autres ? Mesure.
9. Cherche le pattern **Outlier**. Applique-le : comment traiter ce navire
   sans pénaliser les 44 autres ?

## Résultat attendu

1. 100 000 documents, ordre de grandeur : 10 à 15 Mo de données.
3. Environ **700 seaux** au lieu de 100 000. Attends-toi à un facteur **3 à 6×**
   sur les données, et bien plus sur les index — c'est là que le gain est le
   plus spectaculaire, puisqu'il y a 140 fois moins d'entrées à indexer.
4. Dans le modèle en seaux : `vitesseMoyenne` est **déjà calculée**. Aucun
   `$group` n'est nécessaire.
5. Le modèle plat gagne : un `findOne` contre un `$unwind` + `$match`. **C'est
   le prix du bucket** — on optimise la lecture par plage, pas la lecture
   unitaire.
6. Limite de **16 Mo par document**. Avec un relevé de ~60 octets utiles dans
   le seau, cela fait de l'ordre de **250 000 relevés** — soit largement de
   quoi tenir une heure, mais **pas** un an. Un seau doit toujours être borné.
8. Oui : le seau géant fait grossir le *working set* et les lectures par plage
   sur ce navire écrasent les statistiques moyennes.
9. Le pattern **Outlier** : ajouter un drapeau (`debordement: true`) sur le
   document principal et déporter le surplus dans des documents de
   continuation. La requête courante ignore le drapeau ; seul le code qui lit
   *ce* navire paie le coût.

## Pour aller plus loin

Tu viens de réimplémenter à la main ce que fait une **collection time series**.

Relis `docker/mongo-init/02-collections.js` : le projet explique pourquoi il ne
l'utilise pas. Es-tu d'accord avec cet arbitrage ?

Et la vraie question de production : dans un système réel de suivi de flotte,
qu'est-ce qui pèserait le plus lourd — le gain de place, ou l'impossibilité de
corriger un relevé faux ?
