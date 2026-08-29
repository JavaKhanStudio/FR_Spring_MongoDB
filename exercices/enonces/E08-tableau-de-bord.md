# E08 — Le tableau de bord de l'amiral

**Module** Agrégations · **J2 après-midi** · **Proche** · ★★ · ~30 min

## Contexte

L'amiral veut une page unique. Chaque question ci-dessous est **un pipeline**.
Construis-les **étape par étape** : ajoute un `$match`, regarde la sortie,
ajoute un `$group`, regarde la sortie. Jamais d'un bloc.

## Ce dont tu disposes

- `navires` (45), `missions` (25), `ports` (14), `flottes` (13).

## Travail demandé

1. Tonnage total par nation, batiments désarmés exclus, du plus lourd au plus
   léger.
2. Déplacement **moyen** par type de navire, arrondi à l'entier, trié
   décroissant.
3. Nombre de missions par type, et coût total par statut de mission.
4. Les cinq navires les plus **sollicités** — c'est-à-dire participant au plus
   grand nombre de missions.
5. Nombre de navires **rattachés** à chaque port, avec le nom du port. Les
   ports sans aucun navire doivent apparaître avec **0**.
6. Les navires n'ayant participé à **aucune** mission.
7. Une **seule** commande produisant d'un coup : le total de navires, le
   tonnage cumulé, la répartition par statut et le top 3 des plus rapides.

## Résultat attendu

1. Etats-Unis 297 445 · Chine 230 000 · Royaume-Uni 150 800 · Russie 121 330 ·
   France 115 735 · Inde 103 800 · Japon 67 250 · Italie 43 750
2. `PORTE_AVIONS` 60 077 · `PORTE_HELICOPTERES` 30 125 · `CROISEUR` 16 220 ·
   `SOUS_MARIN` 10 026 · `DESTROYER` 8 796 · `FREGATE` 5 833
3. 8 types de mission, `EXERCICE` en tête avec **7**.
   Coûts : `TERMINEE` 1 048 500 000 · `PLANIFIEE` 1 034 000 000 ·
   `EN_COURS` 999 000 000 · `ANNULEE` 31 000 000
4. Quatre navires sont ex æquo à **3** missions : Andrea Doria, Aquitaine,
   Arleigh Burke, Izumo.
5. Toulon **8**, Norfolk **5**, puis Portsmouth, Severomorsk, Yokosuka et
   Karwar à **4**. Aucun port n'est à 0 — vérifie-le, ne le suppose pas.
6. **6** navires : Arihant, Ark Royal, Dwight D. Eisenhower, Kaga, Rubis,
   Ticonderoga.
7. 42 navires non désarmés, 1 130 110 tonnes cumulées.

## Pour aller plus loin

À la question 5, tu as sans doute fait le `$lookup` depuis `ports` vers
`navires`. Refais-le dans l'autre sens, depuis `navires`.

Les deux donnent-ils le même résultat ? Non — et la différence porte un nom.
Laquelle des deux formes est la bonne pour cette question précise, et pourquoi
le sens du `$lookup` n'est-il **jamais** neutre ?
