// =============================================================================
// CORRIGE E08 - Le tableau de bord de l'amiral
// =============================================================================
const base = db.getSiblingDB("amiraute");
function etape(n, t) { print("\n--- " + n + ". " + t + " " + "-".repeat(Math.max(0, 50 - t.length))); }
function l() { print("  " + Array.prototype.slice.call(arguments).join("  ")); }

etape(1, "$match -> $group -> $sort");
base.navires.aggregate([
  { $match: { statut: { $ne: "DESARME" } } },
  { $group: { _id: "$nation", tonnage: { $sum: "$deplacementTonnes" }, n: { $sum: 1 } } },
  { $sort: { tonnage: -1 } }
]).forEach(function (r) {
  l(r._id.padEnd(14), String(r.tonnage).padStart(7) + " t", String(r.n).padStart(2) + " navires");
});
print("\n  $match EN PREMIER : c'est la seule etape qui peut utiliser un index.");

etape(2, "$avg + $round");
base.navires.aggregate([
  { $group: { _id: "$type", moyenne: { $avg: "$deplacementTonnes" }, n: { $sum: 1 } } },
  { $project: { _id: 0, type: "$_id", n: 1, moyenne: { $round: ["$moyenne", 0] } } },
  { $sort: { moyenne: -1 } }
]).forEach(function (r) {
  l(r.type.padEnd(20), String(r.moyenne).padStart(6) + " t", "(" + r.n + " navires)");
});

etape(3, "deux pipelines sur missions");
print("  Par type :");
base.missions.aggregate([
  { $group: { _id: "$type", n: { $sum: 1 } } },
  { $sort: { n: -1, _id: 1 } }
]).forEach(function (r) { l("  " + r._id.padEnd(14), String(r.n).padStart(2)); });

print("\n  Cout par statut :");
base.missions.aggregate([
  { $group: { _id: "$statut", cout: { $sum: "$coutEstimeEuros" }, n: { $sum: 1 } } },
  { $sort: { cout: -1 } }
]).forEach(function (r) {
  l("  " + r._id.padEnd(12), String(r.cout).padStart(12) + " EUR", "(" + r.n + " missions)");
});

etape(4, "$unwind sur un tableau de REFERENCES, puis $lookup");
base.missions.aggregate([
  // Chaque mission a N participants : on eclate pour compter par navire.
  { $unwind: "$naviresParticipants" },
  { $group: { _id: "$naviresParticipants.id", nbMissions: { $sum: 1 } } },
  { $sort: { nbMissions: -1 } },
  { $limit: 5 },
  // Aucun $lookup : naviresParticipants portait deja le nom (EXTENDED REFERENCE).
  { $lookup: { from: "navires", localField: "_id", foreignField: "_id", as: "n" } },
  { $project: { _id: 0, nbMissions: 1, nom: { $first: "$n.nom" },
                nation: { $first: "$n.nation" } } },
  { $sort: { nbMissions: -1, nom: 1 } }
]).forEach(function (r) { l(String(r.nbMissions), r.nom.padEnd(24), r.nation); });
print("\n  Placer le $lookup APRES le $limit est la cle : on resout 5 noms,");
print("  pas 25 missions x N participants.");

etape(5, "$lookup depuis ports : les ports vides apparaissent");
base.ports.aggregate([
  { $lookup: { from: "navires", localField: "_id", foreignField: "portAttache.id", as: "navires" } },
  { $project: { _id: 0, nom: 1, pays: 1, nbNavires: { $size: "$navires" } } },
  { $sort: { nbNavires: -1, nom: 1 } }
]).forEach(function (r) {
  l(r.nom.padEnd(14), r.pays.padEnd(14), String(r.nbNavires).padStart(2) + " navires");
});

etape(6, "$lookup + tableau vide = jointure gauche");
base.navires.aggregate([
  { $lookup: { from: "missions", localField: "_id",
               foreignField: "naviresParticipants.id", as: "missions" } },
  { $match: { missions: { $size: 0 } } },
  { $project: { _id: 0, nom: 1, nation: 1, statut: 1 } },
  { $sort: { nom: 1 } }
]).forEach(function (r) { l(r.nom.padEnd(24), r.nation.padEnd(14), r.statut); });
print("\n  $lookup est une jointure GAUCHE : le navire remonte quand meme,");
print("  avec un tableau vide. C'est ce qui rend { $size: 0 } utilisable.");

etape(7, "$facet : quatre analyses, une seule passe");
const tb = base.navires.aggregate([
  { $match: { statut: { $ne: "DESARME" } } },
  { $facet: {
      totaux: [ { $group: { _id: null, navires: { $sum: 1 },
                            tonnage: { $sum: "$deplacementTonnes" } } } ],
      parStatut: [ { $group: { _id: "$statut", n: { $sum: 1 } } }, { $sort: { n: -1 } } ],
      plusRapides: [ { $sort: { vitesseMaxNoeuds: -1 } }, { $limit: 3 },
                     { $project: { _id: 0, nom: 1, vitesseMaxNoeuds: 1 } } ]
  } }
]).toArray()[0];

l("navires :", String(tb.totaux[0].navires), "| tonnage :", String(tb.totaux[0].tonnage) + " t");
print("\n  Par statut :");
tb.parStatut.forEach(function (r) { l("  " + r._id.padEnd(16), String(r.n).padStart(2)); });
print("\n  Les plus rapides :");
tb.plusRapides.forEach(function (r) { l("  " + r.vitesseMaxNoeuds + " nd", r.nom); });
print("\n  Un aller-retour reseau, un balayage. Limite : aucune branche de");
print("  $facet ne peut utiliser d'index - le $match en amont, lui, le peut.");

// -----------------------------------------------------------------------------
print("\n--- Pour aller plus loin " + "-".repeat(38));

print("\n  SENS A : depuis ports (le corrige ci-dessus)");
const depuisPorts = base.ports.aggregate([
  { $lookup: { from: "navires", localField: "_id", foreignField: "portAttache.id", as: "n" } },
  { $project: { nbNavires: { $size: "$n" } } }
]).toArray();
l("lignes rendues :", String(depuisPorts.length),
  "| ports a 0 navire :", String(depuisPorts.filter(function (p) { return p.nbNavires === 0; }).length));

print("\n  SENS B : depuis navires");
const depuisNavires = base.navires.aggregate([
  { $lookup: { from: "ports", localField: "portAttache.id", foreignField: "_id", as: "p" } },
  { $group: { _id: { $first: "$p.nom" }, n: { $sum: 1 } } }
]).toArray();
l("lignes rendues :", String(depuisNavires.length));

print("\n  LA DIFFERENCE :");
print("  Le sens B ne peut PAS produire un port a zero navire : il part des");
print("  navires, donc un port sans navire n'a aucune ligne d'ou emerger.");
print("");
print("  Ici les 14 ports ont tous au moins un navire, donc les deux sens");
print("  donnent 14 lignes - et c'est un piege : le bug ne se voit pas sur ce");
print("  jeu de donnees. Il apparaitrait le jour ou on ouvrirait une base");
print("  navale vide.");
print("");
print("  LA REGLE : dans un $lookup, la collection de DEPART decide de qui");
print("  a le droit d'apparaitre dans le resultat. Pour 'tous les X, meme");
print("  ceux sans Y', il faut toujours partir de X.");
