// =============================================================================
// 02 - REQUETES : find, projection, sort, limit, skip                  [J1 pm]
// =============================================================================
// Programme : "Commandes classic (find, limit, sort, skip, etc)"
//
//   make charger F=mongosh/02-requetes.js
//
// Lecture seule : ce script ne modifie rien.
// =============================================================================

const base = db.getSiblingDB("amiraute");
function titre(t) { print("\n--- " + t + " " + "-".repeat(Math.max(0, 60 - t.length))); }
function noms(curseur) { return curseur.toArray().map(function (n) { return n.nom; }).join(", "); }


// -----------------------------------------------------------------------------
// find sans filtre, et le curseur
// -----------------------------------------------------------------------------
titre("find() et le curseur");

print("total          : " + base.navires.countDocuments());
print("premier trouve : " + base.navires.findOne().nom);

// find() ne ramene RIEN tant qu'on n'itere pas : il renvoie un curseur.
// C'est ce qui permet de trier et paginer cote serveur.


// -----------------------------------------------------------------------------
// Filtre simple : egalite
// -----------------------------------------------------------------------------
titre("Filtre d'egalite");

print("porte-avions : " + base.navires.countDocuments({ type: "PORTE_AVIONS" }));
print("francais     : " + base.navires.countDocuments({ nation: "France" }));

// Plusieurs cles dans le meme objet = ET implicite.
print("porte-avions francais : " +
  noms(base.navires.find({ type: "PORTE_AVIONS", nation: "France" })));


// -----------------------------------------------------------------------------
// Filtre sur un champ imbrique : la notation pointee
// -----------------------------------------------------------------------------
titre("Notation pointee");

print("propulsion nucleaire : " +
  base.navires.countDocuments({ "propulsion.type": "NUCLEAIRE" }));

// Sur un TABLEAU de sous-documents, la notation pointee teste "au moins un
// element". Retenir cette phrase : elle explique le piege du script 03.
print("au moins un sonar : " +
  base.navires.countDocuments({ "capteurs.categorie": "SONAR" }));


// -----------------------------------------------------------------------------
// Projection : ne ramener que ce dont on a besoin
// -----------------------------------------------------------------------------
titre("Projection");

printjson(base.navires.findOne(
  { numeroCoque: "R91", nation: "France" },
  { _id: 0, nom: 1, type: 1, deplacementTonnes: 1, "propulsion.type": 1 }
));

// Projection par exclusion : tout sauf ces champs.
printjson(base.navires.findOne(
  { numeroCoque: "R91", nation: "France" },
  { armements: 0, capteurs: 0, etiquettes: 0, dateCreation: 0, dateModification: 0 }
));

// Regle : on ne melange pas inclusion et exclusion dans la meme projection,
// _id excepte. Toute autre combinaison provoque une erreur.


// -----------------------------------------------------------------------------
// sort
// -----------------------------------------------------------------------------
titre("sort");

print("Les 5 plus lourds :");
base.navires.find({}, { _id: 0, nom: 1, deplacementTonnes: 1 })
  .sort({ deplacementTonnes: -1 })
  .limit(5)
  .forEach(function (n) {
    print("  " + String(n.deplacementTonnes).padStart(6) + " t  " + n.nom);
  });

print("\nTri multiple (nation croissante, tonnage decroissant) :");
base.navires.find({ type: "SOUS_MARIN" }, { _id: 0, nation: 1, nom: 1, deplacementTonnes: 1 })
  .sort({ nation: 1, deplacementTonnes: -1 })
  .forEach(function (n) {
    print("  " + n.nation.padEnd(14) + String(n.deplacementTonnes).padStart(6) + " t  " + n.nom);
  });

// L'ordre des cles du sort COMPTE, et il devra correspondre a l'ordre des cles
// de l'index si l'on veut que le tri soit couvert. C'est le sujet du script 04.


// -----------------------------------------------------------------------------
// limit et skip : la pagination
// -----------------------------------------------------------------------------
titre("limit / skip");

const parPage = 5;
for (let page = 0; page < 3; page++) {
  const lot = base.navires.find({}, { _id: 0, nom: 1 })
    .sort({ nom: 1 })
    .skip(page * parPage)
    .limit(parPage);
  print("page " + (page + 1) + " : " + noms(lot));
}

// Piege a montrer : sans sort, l'ordre n'est PAS garanti entre deux appels.
// Une pagination sans tri stable peut afficher deux fois le meme navire et en
// sauter un autre. Toujours trier sur une cle unique, ou finir par _id.


// -----------------------------------------------------------------------------
// count vs estimatedDocumentCount
// -----------------------------------------------------------------------------
titre("Compter");

print("countDocuments (exact, respecte le filtre) : " + base.navires.countDocuments({ statut: "ACTIF" }));
print("estimatedDocumentCount (metadonnee, tres rapide, sans filtre) : " +
      base.navires.estimatedDocumentCount());


// -----------------------------------------------------------------------------
// distinct
// -----------------------------------------------------------------------------
titre("distinct");

print("nations : " + base.navires.distinct("nation").sort().join(", "));
print("types   : " + base.navires.distinct("type").sort().join(", "));
print("statuts : " + base.navires.distinct("statut").sort().join(", "));

// distinct traverse les tableaux automatiquement :
print("categories d'armement : " + base.navires.distinct("armements.categorie").sort().join(", "));
