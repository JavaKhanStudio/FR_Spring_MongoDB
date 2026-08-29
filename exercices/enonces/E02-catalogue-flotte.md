# E02 — Le catalogue de la flotte

**Module** find / projection / sort / limit / skip · **J1 après-midi** · **Proche** · ★ · ~10 min

## Contexte

L'état-major veut un catalogue consultable des 45 bâtiments : filtré, trié,
paginé. Tout se fait en lecture, tu ne modifies rien.

## Ce dont tu disposes

- `navires`, 45 documents. `make shell`.

## Travail demandé

1. Compter les navires par grande catégorie : combien de `PORTE_AVIONS`,
   combien de `SOUS_MARIN`, combien de `FREGATE` ?
2. Lister le **nom** et le **tonnage** des cinq plus gros sous-marins, du plus
   lourd au plus léger. Ne ramener que ces deux champs, sans `_id`.
3. Lister par ordre alphabétique le nom des navires **actifs** dépassant
   30 000 tonnes.
4. Paginer le catalogue complet : 10 navires par page, triés par nom croissant.
   Afficher la **page 3**.
5. Afficher la liste des `nation` distinctes, puis celle des `statut`
   distincts.
6. Afficher, pour le *Charles de Gaulle*, uniquement son nom, son type de
   propulsion et la **désignation** de chacun de ses armements.

## Résultat attendu

1. `PORTE_AVIONS` → **13**, `SOUS_MARIN` → **10**, `FREGATE` → **6**
2. Iouri Dolgorouki (24 000), Ohio (18 750), Le Terrible (14 335),
   Changzheng 18 (11 000), Virginia (7 800)
3. America, Charles de Gaulle, Dwight D. Eisenhower, Fujian, Gerald R. Ford,
   Liaoning, Queen Elizabeth, Vikramaditya, Vikrant — soit **9 navires**
4. Iouri Dolgorouki, Izumo, Kaga, Languedoc, Le Terrible, Liaoning,
   Marshal Shaposhnikov, Maya, Mistral, Nanchang
5. **8** nations, **4** statuts
6. `{ nom: "Charles de Gaulle", propulsion: { type: "NUCLEAIRE" },
   armements: [ {designation: "Sylver A43 / Aster 15"}, {designation: "Mistral SADRAL"},
   {designation: "Giat 20F2"} ] }`

## Pour aller plus loin

À l'étape 4, retire le `.sort()` et exécute la même requête plusieurs fois.
L'ordre est-il stable ? Que se passerait-il si un utilisateur naviguait de la
page 3 à la page 4 pendant qu'un collègue insère un navire ?

Et si le tri portait sur `deplacementTonnes` plutôt que sur `nom` : y a-t-il
un risque supplémentaire ? Regarde combien de navires partagent exactement le
même tonnage.
