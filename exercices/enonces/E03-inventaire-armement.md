# E03 — L'inventaire d'armement

**Module** opérateurs, `$elemMatch` · **J1 après-midi** · **Proche** · ★★ · ~25 min

## Contexte

Le bureau des armements veut un inventaire fiable. Chaque navire porte un
tableau `armements`, chaque armement ayant une `categorie`, une `quantite`, une
`porteeKm` et parfois un `calibreMm`.

Attention : c'est exactement là que se cache le piège de la journée.

## Ce dont tu disposes

- `navires`, 45 documents, tableau `armements` de 1 à 4 éléments par navire.

## Travail demandé

1. Lister les navires disposant d'au moins un `MISSILE_CROISIERE` de portée
   **supérieure à 1 000 km**.
2. Lister les navires disposant d'une `TORPILLE` de portée **au moins égale à
   45 km**. Écris d'abord la version « naïve » avec deux conditions pointées,
   puis la version correcte. **Compare les deux comptes.**
3. Pour un des faux positifs de l'étape 2, affiche son tableau `armements`
   complet et explique en une phrase pourquoi il remontait à tort.
4. Compter les navires portant au moins **3** systèmes `CIWS`.
5. Lister les navires dont le nom contient « admiral », sans tenir compte de la
   casse.
6. Lister les navires portant **à la fois** les étiquettes `nucleaire` et
   `furtif`, de deux façons différentes.
7. Combien de navires ont **exactement deux** capteurs ? Et combien en ont
   **plus de deux** ?

## Résultat attendu

1. Arleigh Burke, Astute, Marshal Shaposhnikov, Nanchang, Ohio, Virginia — **6**
2. Version naïve : **14**. Version correcte : **8** — donc **6 faux positifs**.
   Les 8 justes : Astute, Changzheng 18, Iouri Dolgorouki, Le Terrible, Ohio,
   Suffren, Taigei, Virginia.
3. Réponse type : *le navire porte bien une torpille, et porte bien un armement
   de portée ≥ 45 km, mais ce ne sont pas le même élément du tableau.*
4. **11** navires
5. Admiral Kuznetsov, Admiral Gorshkov
6. **7** navires : Astute, Changzheng 18, Iouri Dolgorouki, Le Terrible, Ohio,
   Suffren, Virginia
7. Exactement 2 → **19**. Plus de 2 → **7**, mais `$size` ne sait pas comparer :
   il faut ruser.

## Pour aller plus loin

À l'étape 7, `$size` n'accepte qu'une valeur exacte. Trouve le moyen de
répondre à « plus de deux » — il en existe au moins deux.

Ensuite, la vraie question : lequel des deux pourrait utiliser un index, et
lequel ne le pourra jamais ?
