// =============================================================================
// CORRIGE E03 - L'inventaire d'armement
// =============================================================================
const base = db.getSiblingDB("amiraute");
function etape(n, t) { print("\n--- " + n + ". " + t + " " + "-".repeat(Math.max(0, 50 - t.length))); }
function noms(f) { return base.navires.find(f).sort({ nom: 1 }).toArray()
                            .map(function (n) { return n.nom; }); }

etape(1, "$elemMatch : les deux conditions sur le MEME element");
const croisiere = noms({ armements: { $elemMatch: {
  categorie: "MISSILE_CROISIERE", porteeKm: { $gt: 1000 } } } });
print("  " + croisiere.join(", "));
print("  total : " + croisiere.length);

etape(2, "LE PIEGE : naif contre correct");
const naif = { "armements.categorie": "TORPILLE", "armements.porteeKm": { $gte: 45 } };
const correct = { armements: { $elemMatch: { categorie: "TORPILLE", porteeKm: { $gte: 45 } } } };

const listeNaive = noms(naif);
const listeCorrecte = noms(correct);
print("  naif    : " + listeNaive.length + " navires");
print("  correct : " + listeCorrecte.length + " navires");
print("  faux positifs : " + (listeNaive.length - listeCorrecte.length));
print("\n  les 8 justes : " + listeCorrecte.join(", "));

etape(3, "disseque un faux positif");
const fauxPositifs = listeNaive.filter(function (n) { return listeCorrecte.indexOf(n) === -1; });
print("  faux positifs : " + fauxPositifs.join(", "));

const cible = base.navires.findOne({ nom: fauxPositifs[0] });
print("\n  " + cible.nom + " :");
cible.armements.forEach(function (a) {
  const marque = a.categorie === "TORPILLE" ? " <- une torpille"
               : (a.porteeKm >= 45 ? " <- portee >= 45 km" : "");
  print("    " + a.categorie.padEnd(22) + String(a.porteeKm).padStart(5) + " km" + marque);
});
print("\n  Il porte bien une torpille, et bien un armement de portee >= 45 km,");
print("  mais ce ne sont PAS le meme element du tableau. Sans $elemMatch,");
print("  MongoDB evalue chaque condition independamment sur tout le tableau.");

etape(4, "$elemMatch sur la quantite");
print("  " + base.navires.countDocuments({
  armements: { $elemMatch: { categorie: "CIWS", quantite: { $gte: 3 } } } }) + " navires");

etape(5, "$regex insensible a la casse");
print("  " + noms({ nom: { $regex: "admiral", $options: "i" } }).join(", "));

etape(6, "deux formulations equivalentes");
const parAll = noms({ etiquettes: { $all: ["nucleaire", "furtif"] } });
const parAnd = noms({ $and: [{ etiquettes: "nucleaire" }, { etiquettes: "furtif" }] });
print("  $all : " + parAll.length + " navires");
print("  $and : " + parAnd.length + " navires");
print("  identiques : " + (JSON.stringify(parAll) === JSON.stringify(parAnd)));
print("  " + parAll.join(", "));
print("\n  Ici $all et $and donnent le meme resultat parce que chaque condition");
print("  porte sur UNE valeur scalaire du tableau. Ce ne serait pas le cas avec");
print("  des sous-documents : la, il faudrait $elemMatch.");

etape(7, "$size, et ses limites");
print("  exactement 2 capteurs : " + base.navires.countDocuments({ capteurs: { $size: 2 } }));

print("\n  $size n'accepte qu'une valeur EXACTE : { $size: { $gt: 2 } } est refuse.");
print("  Deux contournements :");

const parExpr = base.navires.countDocuments({ $expr: { $gt: [{ $size: "$capteurs" }, 2] } });
print("\n  a) $expr + $size  -> " + parExpr + " navires");
print("     Souple, mais $expr est evalue document par document :");
print("     il ne peut JAMAIS utiliser d'index.");

const parIndice = base.navires.countDocuments({ "capteurs.2": { $exists: true } });
print("\n  b) 'capteurs.2' $exists -> " + parIndice + " navires");
print("     Teste l'existence du 3e element (indice 2). Contre-intuitif, mais");
print("     c'est une condition sur un CHEMIN : elle peut, elle, etre indexee.");
print("\n  Reponse a la question ouverte : b) est indexable, a) ne l'est pas.");
