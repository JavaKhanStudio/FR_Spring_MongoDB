# E05 — La bibliothèque municipale

**Module** Embedded / Referred · **J2 matin** · **Hors-piste** · ★★ · ~30 min

## Contexte

Tu modélises le système d'une bibliothèque municipale. Aucun navire dans cet
exercice : c'est **volontaire**. Savoir refaire le modèle du cours ne prouve
rien ; savoir modéliser un domaine neuf, si.

## Ce dont tu disposes

Les besoins, exprimés par la bibliothécaire :

- Un **livre** a un titre, un ISBN, une année, un ou plusieurs **auteurs**, un
  ou plusieurs **genres**, et un **éditeur**.
- Un **auteur** a un nom, une biographie, une date de naissance. Il écrit
  plusieurs livres. On consulte parfois sa fiche seule.
- Un **éditeur** a un nom, une ville, un site web. Il publie beaucoup de livres.
- La bibliothèque possède plusieurs **exemplaires** physiques du même livre,
  chacun avec un code-barres, un état (`NEUF`, `BON`, `USE`, `PERDU`) et une
  localisation en rayon.
- Un **emprunt** lie un exemplaire et un adhérent, avec une date de sortie et
  une date de retour prévue. On garde **l'historique complet** des emprunts.
- Un **adhérent** a un nom, un e-mail, une date d'adhésion. Il peut emprunter
  5 exemplaires simultanément.

Écrans les plus consultés, par fréquence :

1. La fiche d'un livre, avec ses auteurs, son éditeur et le nombre
   d'exemplaires disponibles. **Des centaines de fois par jour.**
2. La liste des emprunts en cours d'un adhérent. **Souvent.**
3. La fiche d'un auteur avec sa bibliographie. **Rarement.**
4. Les statistiques d'emprunt par genre sur l'année. **Une fois par mois.**

## Travail demandé

**Sur papier ou dans un fichier, avant toute ligne de code.**

1. Lister les **collections** que tu retiens. Justifier chaque décision
   *embarqué vs référencé* en une phrase, en t'appuyant sur les trois critères
   du cours : **cycle de vie, cardinalité, mode d'accès**.
2. Écrire le document JSON complet d'**un livre**, avec des valeurs réalistes.
3. Écrire le document JSON d'**un emprunt**.
4. Identifier la décision la plus **discutable** de ton modèle, et dire ce qui
   te ferait changer d'avis.
5. Créer les collections dans `mongosh` (préfixe `ex_`), y insérer 2 livres,
   3 auteurs, 1 éditeur, 4 exemplaires, 2 adhérents et 3 emprunts.
6. Écrire la requête de l'**écran n° 1** — la plus fréquente. Combien
   d'allers-retours ou d'étapes de pipeline coûte-t-elle dans ton modèle ?

## Résultat attendu

Il n'y a **pas une seule bonne réponse**. Un modèle est bon s'il rend l'écran
n° 1 peu coûteux sans rendre les autres impossibles.

Points de contrôle :

- Les **genres** doivent être embarqués. Cardinalité bornée, jamais consultés
  seuls.
- Les **exemplaires** ne doivent **pas** être une collection séparée si la
  bibliothèque en a moins d'une dizaine par livre… mais **doivent** l'être si
  chaque exemplaire est emprunté indépendamment. Sais-tu trancher, et pourquoi ?
- Les **emprunts** doivent être une collection séparée. Historique complet,
  croissance sans limite : c'est le contre-exemple `membresEquipage` du cours,
  transposé.
- Les **auteurs** : le vrai débat. Une **référence enrichie**
  (`auteurIds` + `auteurNoms`) est défendable — sache dire ce que tu paies en
  échange.
- Ton écran n° 1 doit coûter **1 requête**, ou 1 pipeline avec au plus
  **2 `$lookup`**. Si tu es à 4, ton modèle est trop normalisé.

## Pour aller plus loin

La bibliothécaire ajoute une exigence : *pouvoir corriger une faute de frappe
dans le nom d'un auteur, et que la correction apparaisse partout.*

Qu'est-ce que cela change à ton modèle ? Et si elle avait plutôt demandé :
*savoir sous quel nom un auteur était crédité au moment de l'emprunt* ?
