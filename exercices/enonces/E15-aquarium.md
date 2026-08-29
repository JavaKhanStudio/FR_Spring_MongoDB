# E15 — L'aquarium

**Module** anti-patterns, diagnostic · **J3 après-midi** · **Proche** · ★★★ · ~45 min

## Contexte

Un collègue a quitté l'équipe en laissant la collection `poissons` : 4 000
observations halieutiques. Tout le monde s'en plaint — « les rapports sont
faux », « la page met trois secondes », « on ne retrouve jamais rien ».

Personne n'a jamais su dire **pourquoi**.

## Consigne

**Ne lis pas `mongosh/00c-poissons.js`.** Ce script génère la collection et
commente chaque pathologie : le lire, c'est se donner les réponses. En
production, tu n'auras ni le générateur ni son auteur.

Tu disposes des outils du J3 : `explain()`, `$indexStats`, `$collStats`,
`$type`, `distinct`, le profileur.

## Ce dont tu disposes

```bash
make charger F=mongosh/00c-poissons.js
```

Deux collections : `poissons` et `poissonsCorrige` — la même information, mais
tu ne dois **pas** regarder la seconde avant la question 8.

## Travail demandé

1. **Reconnaissance.** Taille des données, taille des index, nombre d'index,
   taille du document moyen. Compare avec `journauxBord` (100 000 documents).
   Qu'est-ce qui te frappe ?
2. **Le rapport faux.** Un analyste affirme que « 2 682 poissons pèsent plus de
   400 g ». Un autre a compté 3 986 à la main. Qui a raison, et **pourquoi
   l'écart** ? Prouve-le avec une seule requête.
3. **Le champ fantôme.** Combien de documents ont un champ `espece` ? Es-tu
   sûr d'avoir compté tous les poissons ? Cherche.
4. **Le comptage impossible.** Combien y a-t-il de thons rouges ? Donne le
   chiffre juste, puis explique pourquoi aucune requête simple ne le trouve.
5. **Le tri qui ment.** Affiche les 8 dates de capture distinctes les plus
   anciennes. L'ordre te paraît-il correct ? Explique.
6. **Les index inutiles.** Joue d'abord une dizaine de requêtes réalistes
   (par zone, par engin, par espèce, par date…), **puis** regarde
   `$indexStats`. Lesquels n'ont jamais bougé ? Lequel est utilisé et ne
   filtre pourtant **rien** ? Chiffre-le.
7. **La jointure vide.** Fais un `$lookup` de `poissons` vers `navires`. Combien
   de résolutions ? Pourquoi aucune erreur n'est levée ?
8. **La comparaison.** Maintenant seulement, ouvre `poissonsCorrige`. Pour
   chaque défaut trouvé, dis en une ligne comment il a été corrigé.
9. **Le rapport.** Cinq lignes maximum : les trois pathologies les plus
   **graves** selon toi, et pourquoi celles-là.

## Résultat attendu

| | |
|---|---|
| 1 | ~33 000 Ko pour 4 000 documents, **10 index**, document moyen ~8 500 o |
| 2 | Les deux ont raison sur leur périmètre. **1 304 documents invisibles** : un tiers des poids est stocké en chaîne, et une chaîne n'est jamais `$gt` un nombre |
| 3 | ~1 351 sur `espece`, mais aussi `Espece` et `nomEspece` — **trois noms pour un concept** |
| 4 | 410. Ni l'égalité exacte (44) ni la regex insensible à la casse (136) ne le trouvent : les deux pathologies **se cumulent** |
| 5 | `01/01`, `01/02`, `01/03`… — trié par **jour du mois**. Le 1er décembre passe avant le 2 janvier |
| 6 | Au moins **6 index n'auront jamais bougé**. Attention : `$indexStats` compte depuis la création de l'index — mesurer juste après `00c-poissons.js` donne 0 partout, y compris pour les index utiles. Il faut jouer les requêtes **avant** de mesurer. `type_1`, lui, est utilisé et rend les 4 000 documents : cardinalité 1 |
| 7 | **0 résolution sur 4 000**. `$lookup` est une jointure gauche : un tableau vide est un résultat valide |

## Pour aller plus loin

Aucune de ces pathologies ne lève d'erreur. La collection répond, les écrans
s'affichent, les rapports sortent.

Trois d'entre elles produisent des résultats **silencieusement incomplets**.
Lesquelles ? Et surtout : **quel test automatisé les aurait attrapées ?**

Réfléchis à ce qu'un test qui compte des lignes peut, et ne peut pas, détecter.
Puis cherche `$jsonSchema` : qu'aurait-il empêché, et qu'aurait-il laissé
passer ?
