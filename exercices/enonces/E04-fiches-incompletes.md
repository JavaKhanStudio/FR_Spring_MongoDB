# E04 — Les fiches incomplètes

**Module** `$exists`, `null`, `$type` · **J1 après-midi** · **Proche** · ★★ · ~20 min

## Contexte

Le référentiel a été alimenté par plusieurs sources. Certaines fiches sont
incomplètes — mais « incomplète » recouvre **deux réalités bien distinctes**,
et c'est tout l'objet de l'exercice.

## Ce dont tu disposes

- `navires`, 45 documents.
- Deux champs volontairement irréguliers : `autonomieMillesNautiques` et
  `positionActuelle`.

## Travail demandé

1. Combien de navires ont un champ `autonomieMillesNautiques` **présent**,
   même s'il vaut `null` ? Combien l'ont **absent** ?
2. Combien de navires ont `autonomieMillesNautiques` **exactement égal à
   `null`**, le champ étant présent ?
3. Exécute `db.navires.countDocuments({ autonomieMillesNautiques: null })`.
   Ce chiffre correspond-il à la question 1, à la question 2, ou à ni l'une ni
   l'autre ? Explique.
4. Exécute `db.navires.countDocuments({ autonomieMillesNautiques: { $ne: null } })`.
   Les navires dont le champ est **absent** sont-ils comptés ? Compare avec
   `{ type: { $ne: "SOUS_MARIN" } }` sur un document auquel il manquerait
   `type`.
5. Lister les navires sans `positionActuelle`. L'un d'eux est pourtant `ACTIF` :
   lequel, et pourquoi est-ce cohérent ?
6. Le champ `longueurMetres` existe partout. Compte combien de documents le
   stockent en `int` et combien en `double`. Explique l'écart.
7. Combien de navires n'ont **aucun** capteur de catégorie `SONAR` ?

## Résultat attendu

1. Présent → **42**, absent → **3** (Rubis, Ticonderoga, Ark Royal)
2. **12**
3. **15** — ni l'une ni l'autre : c'est 12 + 3.
4. **30**. Les champs absents ne sont **pas** comptés, contrairement au cas
   `{ type: { $ne: "SOUS_MARIN" } }` où un document sans `type` serait inclus.
5. Le Terrible, Rubis, Ticonderoga, Ark Royal. `Le Terrible` est un SNLE en
   patrouille de dissuasion : **on ne publie pas la position d'un SNLE.**
6. **31** en `int`, **14** en `double`.
7. **19**

## Pour aller plus loin

Trois états coexistent donc pour un champ : *renseigné*, *explicitement `null`*,
*absent*. Le filtre `{ champ: null }` en confond deux.

Comment garantirais-tu, côté application, que la distinction entre « autonomie
illimitée » et « autonomie inconnue » ne se perde jamais ? Y a-t-il une
solution qui ne repose pas sur `null` du tout ?
