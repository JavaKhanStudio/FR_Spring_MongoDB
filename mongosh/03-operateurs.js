// =============================================================================
// 03 - OPERATEURS DE REQUETE                                           [J1 pm]
// =============================================================================
// Programme : "Commandes avec parametres ($eq, $ne, $gt / $gte, $regex, etc)"
//
//   make charger F=mongosh/03-operateurs.js
//
// Lecture seule.
// =============================================================================

const base = db.getSiblingDB("amiraute");
function titre(t) { print("\n--- " + t + " " + "-".repeat(Math.max(0, 60 - t.length))); }
function noms(f, tri) { return base.navires.find(f).sort(tri || { nom: 1 }).toArray()
                                 .map(function (n) { return n.nom; }).join(", "); }
function combien(f) { return base.navires.countDocuments(f); }


// -----------------------------------------------------------------------------
// Comparaison : $eq $ne $gt $gte $lt $lte
// -----------------------------------------------------------------------------
titre("Comparaison");

print("$eq  type porte-avions        : " + combien({ type: { $eq: "PORTE_AVIONS" } }));
print("     (forme courte)           : " + combien({ type: "PORTE_AVIONS" }));
print("$ne  pas des sous-marins      : " + combien({ type: { $ne: "SOUS_MARIN" } }));
print("$gt  plus de 50 000 t         : " + combien({ deplacementTonnes: { $gt: 50000 } }));
print("$gte au moins 50 000 t        : " + combien({ deplacementTonnes: { $gte: 50000 } }));
print("$lt  moins de 5 000 t         : " + combien({ deplacementTonnes: { $lt: 5000 } }));

// Encadrement : les deux bornes vont dans le MEME sous-objet.
print("entre 6 000 et 10 000 t       : " +
  combien({ deplacementTonnes: { $gte: 6000, $lte: 10000 } }));

print("\nMis en service dans les annees 2020 :");
print("  " + noms({ anneeMiseEnService: { $gte: 2020, $lt: 2030 } }, { anneeMiseEnService: 1 }));

// $ne et les champs ABSENTS : deux comportements opposes, et c'est logique.
// $ne signifie exactement NOT($eq). Or $eq:null matche AUSSI les champs absents.
print("\n$ne \"SOUS_MARIN\"  : " + combien({ type: { $ne: "SOUS_MARIN" } }) +
      "  (un navire sans champ 'type' serait INCLUS)");
print("$ne null          : " + combien({ autonomieMillesNautiques: { $ne: null } }) +
      "  (les 3 navires sans le champ sont EXCLUS)");
print("  car $eq:null matche l'absent, donc $ne:null l'exclut. Contre-intuitif,");
print("  mais parfaitement coherent. On y revient plus bas avec $exists.");


// -----------------------------------------------------------------------------
// Appartenance : $in $nin
// -----------------------------------------------------------------------------
titre("$in / $nin");

print("$in  porte-avions ou croiseurs : " +
  combien({ type: { $in: ["PORTE_AVIONS", "CROISEUR"] } }));
print("$nin ni France ni Etats-Unis   : " +
  combien({ nation: { $nin: ["France", "Etats-Unis"] } }));

// $in accepte aussi des expressions regulieres :
print("nations commencant par un E ou un I : " +
  base.navires.distinct("nation", { nation: { $in: [/^E/, /^I/] } }).join(", "));


// -----------------------------------------------------------------------------
// Logique : $and $or $not $nor
// -----------------------------------------------------------------------------
titre("Logique");

// $or : batiments a l'arret, pour quelque raison que ce soit.
print("$or  en reparation ou desarmes : " +
  combien({ $or: [{ statut: "EN_REPARATION" }, { statut: "DESARME" }] }));

// $and n'est necessaire que si la MEME cle porte deux conditions incompatibles
// avec la forme courte. Ici : deux contraintes distinctes sur "etiquettes".
print("$and nucleaire ET furtif       : " +
  combien({ $and: [{ etiquettes: "nucleaire" }, { etiquettes: "furtif" }] }));
print("     (equivalent avec $all)    : " +
  combien({ etiquettes: { $all: ["nucleaire", "furtif"] } }));

print("$not vitesse NON superieure a 28 nd : " +
  combien({ vitesseMaxNoeuds: { $not: { $gt: 28 } } }));
print("  attention : $not inclut les documents ou le champ est absent");


// -----------------------------------------------------------------------------
// Existence et type : $exists $type
// -----------------------------------------------------------------------------
titre("$exists / $type - la lecon null vs absent");

print("$exists:true   champ present, meme a null : " + combien({ autonomieMillesNautiques: { $exists: true } }));
print("$exists:false  champ absent                : " + combien({ autonomieMillesNautiques: { $exists: false } }));
print("{ champ: null} null OU absent             : " + combien({ autonomieMillesNautiques: null }));
print("$exists+$eq    null ET present            : " +
  combien({ autonomieMillesNautiques: { $exists: true, $eq: null } }));

print("\nLa troisieme ligne est la somme des deux dernieres : { champ: null }");
print("ne sait pas distinguer 'a null' de 'absent'.");

print("\nDeux etats bien distincts pourtant :");
print("  null   = on SAIT que l'autonomie est illimitee (batiment nucleaire)");
print("  absent = on ne sait pas");
print("Le filtre { autonomieMillesNautiques: null } confond les deux.");
print("C'est LE piege de modelisation de la journee.");

print("\nSans position connue : " + noms({ positionActuelle: { $exists: false } }));

print("\n$type - MongoDB distingue les types NUMERIQUES entre eux :");
print("  longueurMetres en int    : " + combien({ longueurMetres: { $type: "int" } }));
print("  longueurMetres en double : " + combien({ longueurMetres: { $type: "double" } }));
print("");
print("Le meme champ, deux types BSON. Personne ne l'a voulu : le pilote a");
print("serialise 199.0 en entier (il est integral) et 152.9 en flottant.");
print("A connaitre : { longueurMetres: 199.0 } trouve quand meme le document,");
print("MongoDB comparant les nombres a travers les types. Mais $type, lui, les");
print("separe - et c'est comme cela qu'on detecte un import bancal.");


// -----------------------------------------------------------------------------
// Chaines : $regex
// -----------------------------------------------------------------------------
titre("$regex");

print("nom contenant 'admiral' (insensible a la casse) : " +
  noms({ nom: { $regex: "admiral", $options: "i" } }));
print("nom commencant par 'Prince'  : " + noms({ nom: /^Prince/ }));
print("devise finissant par 'us'    : " +
  base.navires.find({ devise: /us$/ }).toArray().map(function (n) { return n.devise; }).join(" | "));

print("\nA retenir : seule une regex ANCREE a gauche (/^.../) peut utiliser un");
print("index. { $regex: 'admiral' } force un balayage complet. Voir script 04.");


// -----------------------------------------------------------------------------
// Tableaux : $all $size $elemMatch
// -----------------------------------------------------------------------------
titre("Tableaux");

print("$all  etiquettes contenant otan ET aviation : " +
  combien({ etiquettes: { $all: ["otan", "aviation"] } }));
print("$size exactement 2 capteurs                 : " +
  combien({ capteurs: { $size: 2 } }));

print("\n$size ne prend qu'un nombre exact. Pour 'plus de 3 armements',");
print("il faut $expr : " + combien({ $expr: { $gt: [{ $size: "$armements" }, 3] } }) + " navires");


// -----------------------------------------------------------------------------
// $elemMatch : le piege le plus courant
// -----------------------------------------------------------------------------
titre("$elemMatch - le piege du jour");

// Formulation NAIVE : deux conditions independantes sur le tableau.
const naif = { "armements.categorie": "CANON", "armements.porteeKm": { $gte: 20 } };
print("Sans $elemMatch : " + combien(naif) + " navires");

// Formulation CORRECTE : les deux conditions sur le MEME element.
const correct = { armements: { $elemMatch: { categorie: "CANON", porteeKm: { $gte: 20 } } } };
print("Avec $elemMatch : " + combien(correct) + " navires");

print("\nPourquoi l'ecart ? Sans $elemMatch, MongoDB accepte un navire qui a");
print("UN canon quelque part et UN armement de portee >= 20 km ailleurs, meme si");
print("ce n'est pas le meme. Exemple typique :");

base.navires.find(naif, { _id: 0, nom: 1, armements: 1 }).limit(6).forEach(function (n) {
  const vraiCanonLong = n.armements.some(function (a) {
    return a.categorie === "CANON" && a.porteeKm >= 20;
  });
  print("  " + (vraiCanonLong ? "[VRAI POSITIF] " : "[FAUX POSITIF] ") + n.nom);
});

print("\nDetail d'un faux positif :");
const faux = base.navires.find(naif).toArray().find(function (n) {
  return !n.armements.some(function (a) { return a.categorie === "CANON" && a.porteeKm >= 20; });
});
if (faux) {
  print("  " + faux.nom);
  faux.armements.forEach(function (a) {
    print("    " + a.categorie.padEnd(22) + " portee " + a.porteeKm + " km");
  });
}

print("\nCanons de 20 km et plus (resultat juste) :");
print("  " + noms(correct));


// -----------------------------------------------------------------------------
// Projection d'un element de tableau
// -----------------------------------------------------------------------------
titre("$elemMatch en projection");

printjson(base.navires.findOne(
  { numeroCoque: "D620", nation: "France" },
  { _id: 0, nom: 1, armements: { $elemMatch: { categorie: "TORPILLE" } } }
));

print("En projection, $elemMatch ne ramene que le PREMIER element correspondant.");
print("Pour tous les elements filtres, il faut $filter dans une agregation (script 06).");
