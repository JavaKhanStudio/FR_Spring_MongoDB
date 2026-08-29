// =============================================================================
// CORRIGE E04 - Les fiches incompletes
// =============================================================================
const base = db.getSiblingDB("amiraute");
function etape(n, t) { print("\n--- " + n + ". " + t + " " + "-".repeat(Math.max(0, 50 - t.length))); }
const C = "autonomieMillesNautiques";

etape(1, "$exists");
const present = base.navires.countDocuments({ [C]: { $exists: true } });
const absent  = base.navires.countDocuments({ [C]: { $exists: false } });
print("  present : " + present + "   absent : " + absent);
print("  absents : " + base.navires.find({ [C]: { $exists: false } })
        .toArray().map(function (n) { return n.nom; }).join(", "));

etape(2, "$exists ET $eq combines");
const vraimentNull = base.navires.countDocuments({ [C]: { $exists: true, $eq: null } });
print("  null ET present : " + vraimentNull);

etape(3, "{ champ: null } confond les deux etats");
const raccourci = base.navires.countDocuments({ [C]: null });
print("  { champ: null } -> " + raccourci);
print("  " + vraimentNull + " (null explicite) + " + absent + " (absent) = " + raccourci);
print("\n  Pour MongoDB, un champ ABSENT est equivalent a null dans une");
print("  comparaison d'egalite. Le raccourci { champ: null } ne peut donc pas");
print("  distinguer 'on sait que c'est vide' de 'on ne sait pas'.");

etape(4, "$ne : deux comportements opposes, et c'est logique");
print("  $ne null                 -> " + base.navires.countDocuments({ [C]: { $ne: null } }));
print("  soit 45 - " + vraimentNull + " - " + absent + " : les ABSENTS sont EXCLUS");
print("");
print("  $ne \"SOUS_MARIN\"         -> " + base.navires.countDocuments({ type: { $ne: "SOUS_MARIN" } }));
print("  ici un document sans champ 'type' serait INCLUS");
print("");
print("  Explication : $ne signifie exactement NOT($eq). Et $eq:null matche");
print("  l'absent. Donc $ne:null l'exclut, alors que $ne:'X' l'inclut.");

etape(5, "positionActuelle absente");
base.navires.find({ positionActuelle: { $exists: false } },
                  { _id: 0, nom: 1, statut: 1, type: 1 })
  .forEach(function (n) { print("  " + n.nom.padEnd(20) + n.statut.padEnd(16) + n.type); });
print("\n  Le Terrible est ACTIF sans position : c'est un SNLE en patrouille de");
print("  dissuasion. Sa position est le secret le mieux garde de la Marine.");
print("  L'absence de donnee est ici une INFORMATION, pas un defaut de saisie.");

etape(6, "$type : MongoDB distingue les types numeriques");
const enInt    = base.navires.countDocuments({ longueurMetres: { $type: "int" } });
const enDouble = base.navires.countDocuments({ longueurMetres: { $type: "double" } });
print("  int    : " + enInt);
print("  double : " + enDouble);
print("\n  Le pilote serialise 199.0 en Int32 (la valeur est integrale) et");
print("  152.9 en Double. Personne ne l'a decide : c'est le comportement par");
print("  defaut du pilote JavaScript.");
print("  A savoir : { longueurMetres: 199.0 } trouve quand meme le document,");
print("  MongoDB comparant les nombres a travers les types. Mais $type, lui,");
print("  les separe - et c'est ainsi qu'on detecte un import bancal.");

etape(7, "negation sur un tableau de sous-documents");
print("  " + base.navires.countDocuments({ "capteurs.categorie": { $ne: "SONAR" } }) + " navires sans SONAR");
print("\n  Attention : sur un tableau, $ne signifie 'AUCUN element ne vaut'.");
print("  C'est bien ce qu'on veut ici, mais l'intuition dit souvent l'inverse.");

// -----------------------------------------------------------------------------
print("\n--- Pour aller plus loin " + "-".repeat(38));
print("\nLa solution robuste : ne pas faire porter deux sens a un seul champ.");
print("");
print("  { autonomieIllimitee: true }                    <- batiment nucleaire");
print("  { autonomieIllimitee: false, autonomieMillesNautiques: 7000 }");
print("  { }                                             <- donnee inconnue");
print("");
print("Un booleen explicite, plus une valeur. $exists ne sert plus qu'a");
print("detecter la donnee manquante, et null ne sert plus a rien.");
print("");
print("Regle generale : des qu'un null porte un SENS METIER, il faut un champ.");
