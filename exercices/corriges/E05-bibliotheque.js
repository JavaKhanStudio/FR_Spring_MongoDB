// =============================================================================
// CORRIGE E05 - La bibliotheque municipale
//
// Il n'y a pas UNE bonne reponse. Voici un modele defendable, avec le
// raisonnement qui l'a produit. C'est le raisonnement qui est corrige, pas
// le resultat.
// =============================================================================
const base = db.getSiblingDB("amiraute");
function titre(t) { print("\n--- " + t + " " + "-".repeat(Math.max(0, 58 - t.length))); }

["ex_livres", "ex_auteurs", "ex_editeurs", "ex_exemplaires",
 "ex_adherents", "ex_emprunts"].forEach(function (c) { base[c].drop(); });

titre("1. Les decisions, critere par critere");
print("");
print("  ELEMENT       CHOIX        CYCLE DE VIE   CARDINALITE   ACCES");
print("  " + "-".repeat(70));
print("  genres        embarque     lie au livre   bornee (<5)   avec le livre");
print("  editeur       reference    autonome       1 -> N livres seul parfois");
print("  auteurs       reference+   autonome       1 -> N livres seul parfois");
print("  exemplaires   collection   lie au livre   NON BORNEE    emprunte seul");
print("  emprunts      collection   autonome       ILLIMITEE     historique");
print("  adherents     collection   autonome       -             seul");
print("");
print("  reference+ = reference ENRICHIE : on stocke auteurIds ET auteurNoms.");

titre("Le point qui fait debat : les exemplaires");
print("");
print("  Si un exemplaire n'etait qu'un COMPTEUR, on embarquerait :");
print("      { titre: '...', nbExemplaires: 4, nbDisponibles: 2 }");
print("");
print("  Mais l'enonce dit que chaque exemplaire a un code-barres, un etat et");
print("  une localisation, et surtout qu'il est EMPRUNTE INDIVIDUELLEMENT.");
print("  Un emprunt doit donc pouvoir pointer un exemplaire precis.");
print("");
print("  -> collection separee. Le critere qui tranche n'est pas la");
print("     cardinalite (4 exemplaires tiendraient), c'est le fait qu'une");
print("     autre entite ait besoin de le REFERENCER.");
print("");
print("  Regle generale : ce qui doit etre reference doit exister seul.");

titre("2. Un livre");
const editeur = { _id: "GALLIMARD", nom: "Gallimard", ville: "Paris",
                  siteWeb: "https://gallimard.fr" };
base.ex_editeurs.insertOne(editeur);

base.ex_auteurs.insertMany([
  { _id: "A-VERNE",   nom: "Verne",    prenom: "Jules",  naissance: ISODate("1828-02-08T00:00:00Z"),
    biographie: "Ecrivain francais, pionnier de l'anticipation." },
  { _id: "A-CAMUS",   nom: "Camus",    prenom: "Albert", naissance: ISODate("1913-11-07T00:00:00Z"),
    biographie: "Ecrivain et philosophe, prix Nobel 1957." },
  { _id: "A-BOSSIER", nom: "Bossier",  prenom: "Marc",   naissance: ISODate("1961-04-22T00:00:00Z"),
    biographie: "Illustrateur." }
]);

const livre = {
  _id: "L-978207036822",
  isbn: "978-2-07-036822-8",
  titre: "Vingt mille lieues sous les mers",
  annee: 1870,
  // EMBARQUE : borne, jamais consulte seul, ne change jamais.
  genres: ["aventure", "anticipation", "maritime"],
  // REFERENCE ENRICHIE : l'id pour la verite, le nom pour l'affichage.
  auteurIds: ["A-VERNE", "A-BOSSIER"],
  auteurNoms: ["Jules Verne", "Marc Bossier"],
  editeurId: "GALLIMARD",
  editeurNom: "Gallimard",
  // EMBARQUE : compteur denormalise, maintenu a chaque emprunt/retour.
  nbExemplaires: 3,
  nbDisponibles: 2
};
base.ex_livres.insertOne(livre);
base.ex_livres.insertOne({
  _id: "L-978207036002", isbn: "978-2-07-036002-4", titre: "L'Etranger", annee: 1942,
  genres: ["roman", "philosophie"],
  auteurIds: ["A-CAMUS"], auteurNoms: ["Albert Camus"],
  editeurId: "GALLIMARD", editeurNom: "Gallimard",
  nbExemplaires: 1, nbDisponibles: 1
});
printjson(livre);

titre("3. Exemplaires, adherents, emprunts");
base.ex_exemplaires.insertMany([
  { _id: "EX-0001", livreId: "L-978207036822", codeBarres: "3010001", etat: "BON",  rayon: "R-12-B" },
  { _id: "EX-0002", livreId: "L-978207036822", codeBarres: "3010002", etat: "USE",  rayon: "R-12-B" },
  { _id: "EX-0003", livreId: "L-978207036822", codeBarres: "3010003", etat: "NEUF", rayon: "R-12-B" },
  { _id: "EX-0004", livreId: "L-978207036002", codeBarres: "3010004", etat: "BON",  rayon: "R-04-A" }
]);

base.ex_adherents.insertMany([
  { _id: "AD-001", nom: "Lemoine", prenom: "Claire", courriel: "claire.lemoine@example.org",
    dateAdhesion: ISODate("2023-09-12T00:00:00Z") },
  { _id: "AD-002", nom: "Barreau", prenom: "Julien", courriel: "julien.barreau@example.org",
    dateAdhesion: ISODate("2025-01-05T00:00:00Z") }
]);

const emprunt = {
  _id: "EMP-000001",
  exemplaireId: "EX-0001",
  adherentId: "AD-001",
  // Reference enrichie a nouveau : l'historique doit rester lisible meme si
  // le livre est retire du catalogue dix ans plus tard.
  livreId: "L-978207036822",
  livreTitre: "Vingt mille lieues sous les mers",
  adherentNom: "Claire Lemoine",
  dateSortie: ISODate("2026-08-01T00:00:00Z"),
  dateRetourPrevue: ISODate("2026-08-22T00:00:00Z"),
  dateRetourEffective: null,
  // Recopie pour les statistiques par genre : evite un $lookup mensuel
  // sur toute la collection d'emprunts.
  genres: ["aventure", "anticipation", "maritime"]
};
base.ex_emprunts.insertMany([
  emprunt,
  { _id: "EMP-000002", exemplaireId: "EX-0002", adherentId: "AD-001",
    livreId: "L-978207036822", livreTitre: "Vingt mille lieues sous les mers",
    adherentNom: "Claire Lemoine",
    dateSortie: ISODate("2026-06-02T00:00:00Z"),
    dateRetourPrevue: ISODate("2026-06-23T00:00:00Z"),
    dateRetourEffective: ISODate("2026-06-20T00:00:00Z"),
    genres: ["aventure", "anticipation", "maritime"] },
  { _id: "EMP-000003", exemplaireId: "EX-0004", adherentId: "AD-002",
    livreId: "L-978207036002", livreTitre: "L'Etranger", adherentNom: "Julien Barreau",
    dateSortie: ISODate("2026-08-10T00:00:00Z"),
    dateRetourPrevue: ISODate("2026-08-31T00:00:00Z"),
    dateRetourEffective: null,
    genres: ["roman", "philosophie"] }
]);
printjson(emprunt);

titre("4. La decision la plus discutable");
print("");
print("  La REFERENCE ENRICHIE sur auteurNoms et editeurNom.");
print("");
print("  Ce qu'elle achete : l'ecran n1, le plus frequent, coute UNE requete.");
print("  Ce qu'elle coute  : renommer un auteur impose de propager la copie");
print("                      dans tous ses livres, et dans tous les emprunts.");
print("");
print("  Ce qui me ferait changer d'avis : si les noms d'auteurs changeaient");
print("  souvent. Ils ne changent pas. Le pari est donc bon.");
print("  Si la bibliothecaire corrigeait des fautes de frappe chaque semaine,");
print("  je repasserais a un $lookup et j'accepterais le cout en lecture.");

titre("6. L'ecran n1 : la fiche d'un livre");
print("\n  Cout dans ce modele : UNE seule requete, zero jointure.");
printjson(base.ex_livres.findOne({ _id: "L-978207036822" }));

print("\n  Les auteurs et l'editeur sont deja la, grace a la reference enrichie.");
print("  nbDisponibles est deja calcule, grace au compteur denormalise.");

print("\n  Sans la denormalisation, il aurait fallu :");
base.ex_livres.aggregate([
  { $match: { _id: "L-978207036822" } },
  { $lookup: { from: "ex_auteurs",  localField: "auteurIds", foreignField: "_id", as: "auteurs" } },
  { $lookup: { from: "ex_editeurs", localField: "editeurId", foreignField: "_id", as: "editeur" } },
  { $lookup: { from: "ex_exemplaires", localField: "_id", foreignField: "livreId", as: "exemplaires" } },
  { $project: { titre: 1, auteurs: "$auteurs.nom", editeur: { $first: "$editeur.nom" },
                nbExemplaires: { $size: "$exemplaires" } } }
]).forEach(printjson);
print("\n  Trois $lookup, sur l'ecran le plus consulte du systeme.");

titre("Pour aller plus loin");
print("");
print("  a) 'corriger une faute de frappe partout'");
print("     -> il faut propager. Une commande updateMany par collection");
print("        portant la copie. Acceptable si c'est rare et scripte.");
print("     -> si c'est frequent : abandonner la copie, revenir au $lookup.");
print("");
print("  b) 'sous quel nom l'auteur etait credite AU MOMENT de l'emprunt'");
print("     -> renversement complet ! La copie n'est plus une optimisation,");
print("        elle devient la DONNEE JUSTE. Un emprunt de 2019 doit garder");
print("        le nom de 2019, meme si l'auteur a change de nom depuis.");
print("");
print("  C'est le meme champ, avec deux exigences opposees. La denormalisation");
print("  n'est pas qu'une affaire de performance : parfois, c'est de l'archivage.");

titre("Nettoyage");
["ex_livres", "ex_auteurs", "ex_editeurs", "ex_exemplaires",
 "ex_adherents", "ex_emprunts"].forEach(function (c) { base[c].drop(); });
print("collections ex_* supprimees");
