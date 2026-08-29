// =============================================================================
// CORRIGE E02 - Le catalogue de la flotte
// =============================================================================
const base = db.getSiblingDB("amiraute");
function etape(n, t) { print("\n--- " + n + ". " + t + " " + "-".repeat(Math.max(0, 50 - t.length))); }

etape(1, "compter par type");
["PORTE_AVIONS", "SOUS_MARIN", "FREGATE"].forEach(function (t) {
  print("  " + t.padEnd(16) + base.navires.countDocuments({ type: t }));
});

etape(2, "sort + limit + projection");
base.navires.find({ type: "SOUS_MARIN" }, { _id: 0, nom: 1, deplacementTonnes: 1 })
  .sort({ deplacementTonnes: -1 })
  .limit(5)
  .forEach(function (n) {
    print("  " + String(n.deplacementTonnes).padStart(6) + " t  " + n.nom);
  });

etape(3, "deux conditions, ET implicite");
const gros = base.navires.find({ statut: "ACTIF", deplacementTonnes: { $gt: 30000 } },
                               { _id: 0, nom: 1 })
  .sort({ nom: 1 }).toArray().map(function (n) { return n.nom; });
print("  " + gros.join(", "));
print("  total : " + gros.length);

etape(4, "pagination : skip + limit, TOUJOURS avec un sort");
const parPage = 10, page = 3;
base.navires.find({}, { _id: 0, nom: 1 })
  .sort({ nom: 1 })
  .skip((page - 1) * parPage)
  .limit(parPage)
  .forEach(function (n) { print("  " + n.nom); });

etape(5, "distinct");
print("  nations : " + base.navires.distinct("nation").sort().join(", "));
print("  statuts : " + base.navires.distinct("statut").sort().join(", "));

etape(6, "projection dans les sous-documents et les tableaux");
printjson(base.navires.findOne(
  { numeroCoque: "R91", nation: "France" },
  { _id: 0, nom: 1, "propulsion.type": 1, "armements.designation": 1 }
));

// -----------------------------------------------------------------------------
print("\n--- Pour aller plus loin " + "-".repeat(38));
print("\nSans sort, l'ordre depend de l'ordre physique sur le disque : il peut");
print("changer entre deux appels, et il change forcement apres une reecriture");
print("de document. Un utilisateur passant de la page 3 a la page 4 peut donc");
print("revoir un navire deja vu, et en sauter un autre.");

const doublons = base.navires.aggregate([
  { $group: { _id: "$deplacementTonnes", n: { $sum: 1 }, noms: { $push: "$nom" } } },
  { $match: { n: { $gt: 1 } } },
  { $sort: { n: -1 } }
]).toArray();

print("\nTonnages partages par plusieurs navires : " + doublons.length + " valeurs");
doublons.slice(0, 4).forEach(function (d) {
  print("  " + String(d._id).padStart(6) + " t  ->  " + d.noms.join(", "));
});

print("\nUn tri sur deplacementTonnes n'est donc PAS stable : les ex aequo");
print("peuvent s'ordonner differemment d'un appel a l'autre.");
print("La regle : terminer tout tri de pagination par une cle unique.");
print("  .sort({ deplacementTonnes: -1, _id: 1 })");
