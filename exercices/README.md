# Annexe d'exercices

Le projet AMIRAUTE est **livré complet** : les stagiaires ne le reconstruisent
pas. La pratique se fait ici, dans une annexe découplée.

## Deux familles

| Famille | Définition | Rôle |
|---|---|---|
| **Proche** | Porte sur les collections d'AMIRAUTE | Consolider ce qui vient d'être projeté, sans coût de mise en contexte |
| **Hors-piste** | Micro-domaine autonome, sans rapport avec la marine | Vérifier que le stagiaire sait modéliser **à partir de zéro** |

Le hors-piste est volontairement dépaysant. Un stagiaire qui sait écrire *le*
`$lookup` du cours ne sait pas forcément écrire *un* `$lookup`. **Le changement
de domaine est le test.**

## Index

| Réf | Titre | Module | Demi-journée | Famille | Diff. |
|---|---|---|---|---|---|
| [E01](enonces/E01-crud-navires.md) | Le chantier naval | CRUD | J1 pm | Proche | ★ |
| [E02](enonces/E02-catalogue-flotte.md) | Le catalogue de la flotte | find / sort / skip | J1 pm | Proche | ★ |
| [E03](enonces/E03-inventaire-armement.md) | L'inventaire d'armement | `$elemMatch` | J1 pm | Proche | ★★ |
| [E04](enonces/E04-fiches-incompletes.md) | Les fiches incomplètes | `$exists` vs `null` | J1 pm | Proche | ★★ |
| [E05](enonces/E05-bibliotheque.md) | La bibliothèque municipale | Embedded / Referred | J2 am | Hors-piste | ★★ |
| [E06](enonces/E06-accelerer-journal.md) | Accélérer le journal de bord | Index + `explain()` | J2 am | Proche | ★★ |
| [E07](enonces/E07-catalogue-ecommerce.md) | Le catalogue e-commerce | Index composé, ESR | J2 am | Hors-piste | ★★★ |
| [E08](enonces/E08-tableau-de-bord.md) | Le tableau de bord de l'amiral | Agrégations | J2 pm | Proche | ★★ |
| [E09](enonces/E09-journal-acces.md) | Le journal d'accès | `$bucket`, fenêtres | J2 pm | Hors-piste | ★★ |
| [E10](enonces/E10-capteurs-meteo.md) | Les capteurs météo | Time series, TTL | J2 pm | Hors-piste | ★★ |
| [E11](enonces/E11-repository-multicritere.md) | Le repository multicritère | `Criteria` en Spring | J3 am | Proche | ★★★ |
| [E12](enonces/E12-requete-coupable.md) | La requête coupable | Diagnostic | J3 pm | Proche | ★★★ |
| [E13](enonces/E13-mediatheque-polymorphe.md) | La médiathèque polymorphe | Polymorphic | J2 am | Hors-piste | ★★★ |
| [E14](enonces/E14-seaux-et-outliers.md) | Seaux et cas extrêmes | Bucket, Outlier | J2 pm | Proche | ★★★ |
| [E15](enonces/E15-aquarium.md) | L'aquarium | Anti-patterns, diagnostic | J3 pm | Proche | ★★★ |

## Mode d'emploi

**Prérequis** — profil `simple` démarré et base amorcée :

```bash
make simple
make amorcer
```

**Exercices proches** — se jouent dans `mongosh`, sauf E11 et E12 (Spring) :

```bash
make shell
```

**Exercices hors-piste** — chacun crée ses propres collections, dans la même
base `amiraute`, préfixées `ex_`. Elles n'interfèrent avec rien et se
suppriment à la fin de l'énoncé.

**Corrigés** — dans `corriges/`, même référence.

Les corrigés `.js` sont **exécutables** et commentés :

```bash
make charger F=exercices/corriges/E03-inventaire-armement.js
```

E11 est un corrigé `.md` : il porte du code Java, à recopier dans le projet.

**Deux exercices ont un script d'amorce** à jouer **avant** le corrigé :

```bash
make charger F=exercices/corriges/E07-amorce.js   # 200 000 produits
make charger F=exercices/corriges/E09-amorce.js   # 150 000 acces HTTP
```

## Gabarit d'un énoncé

Chaque énoncé tient en une page et suit toujours les mêmes cinq sections :

1. **Contexte** — deux phrases.
2. **Ce dont tu disposes** — collections, volume, script d'amorce éventuel.
3. **Travail demandé** — numéroté, chaque point objectivement vérifiable.
4. **Résultat attendu** — le chiffre ou l'extrait de sortie.
5. **Pour aller plus loin** — question ouverte, sans corrigé.

La section 4 est **non négociable** : sans elle, le stagiaire appelle le
formateur pour savoir s'il a bon, et le formateur ne fait plus que ça.

## Pour le formateur

Dix minutes de rab en fin de séquence ? Filtrer l'index sur la demi-journée et
la difficulté, sortir un exercice. C'est le seul usage réel de ce tableau, il
est conçu pour ça.

Les exercices **★** se font en 10 minutes, les **★★** en 20 à 30, les **★★★**
en 45 et méritent une correction collective.
