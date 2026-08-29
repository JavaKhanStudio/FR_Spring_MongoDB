// =============================================================================
// CORRIGE E01 - Le chantier naval
//     make charger F=exercices/corriges/E01-crud-navires.js
// =============================================================================
const base = db.getSiblingDB("amiraute");
function etape(n, t) { print("\n--- " + n + ". " + t + " " + "-".repeat(Math.max(0, 50 - t.length))); }

const depart = base.navires.countDocuments();
print("depart : " + depart + " navires");

// 1 ---------------------------------------------------------------------------
etape(1, "insertOne");
base.navires.insertOne({
  numeroCoque: "A01", nom: "Poseidon", nation: "Atlantide",
  type: "CORVETTE", statut: "ACTIF",
  deplacementTonnes: 2200, anneeMiseEnService: 2026
});
print("total : " + base.navires.countDocuments());

// 2 ---------------------------------------------------------------------------
etape(2, "insertMany");
base.navires.insertMany([
  { numeroCoque: "A02", nom: "Triton", nation: "Atlantide",
    type: "PATROUILLEUR", statut: "ACTIF", deplacementTonnes: 800 },
  { numeroCoque: "A03", nom: "Neree", nation: "Atlantide",
    type: "PATROUILLEUR", statut: "ACTIF", deplacementTonnes: 800 }
]);
print("total : " + base.navires.countDocuments() + "   (attendu : " + (depart + 3) + ")");

// 3 ---------------------------------------------------------------------------
etape(3, "$set cree le champ s'il n'existe pas");
base.navires.updateOne(
  { numeroCoque: "A01", nation: "Atlantide" },
  { $set: { statut: "EN_REPARATION",
            derniereRevision: ISODate("2026-08-01T00:00:00Z") } }
);
printjson(base.navires.findOne({ numeroCoque: "A01" }, { _id: 0, statut: 1, derniereRevision: 1 }));

// 4 ---------------------------------------------------------------------------
etape(4, "$inc, $push, $unset");
base.navires.updateOne(
  { numeroCoque: "A01", nation: "Atlantide" },
  { $inc: { deplacementTonnes: 300 },
    $push: { etiquettes: "modernise" },
    $unset: { derniereRevision: "" } }
);
printjson(base.navires.findOne({ numeroCoque: "A01" },
  { _id: 0, deplacementTonnes: 1, etiquettes: 1, derniereRevision: 1 }));
print("-> derniereRevision absent de la sortie : $unset a bien supprime le champ");

// 5 ---------------------------------------------------------------------------
etape(5, "updateMany + $addToSet, donc rejouable");
let r = base.navires.updateMany({ nation: "Atlantide" },
                                { $addToSet: { etiquettes: "flotte-experimentale" } });
print("1er passage : modifies = " + r.modifiedCount);
r = base.navires.updateMany({ nation: "Atlantide" },
                            { $addToSet: { etiquettes: "flotte-experimentale" } });
print("2e passage  : modifies = " + r.modifiedCount + "   <- $addToSet n'ajoute pas de doublon");
print("($push aurait donne 3 au second passage, et une etiquette en double)");

// 6 ---------------------------------------------------------------------------
etape(6, "replaceOne ECRASE, il ne fusionne pas");
print("avant : " + JSON.stringify(base.navires.findOne({ numeroCoque: "A02" }, { _id: 0 })));
base.navires.replaceOne(
  { numeroCoque: "A02", nation: "Atlantide" },
  { numeroCoque: "A02", nom: "Triton", nation: "Atlantide", deplacementTonnes: 800 }
);
print("apres : " + JSON.stringify(base.navires.findOne({ numeroCoque: "A02" }, { _id: 0 })));
print("-> type, statut et etiquettes ont disparu. C'est LA difference avec $set.");

// 7 ---------------------------------------------------------------------------
etape(7, "deleteMany");
print("supprimes : " + base.navires.deleteMany({ nation: "Atlantide" }).deletedCount);

const fin = base.navires.countDocuments();
print("\ntotal : " + fin + (fin === depart ? "   OK, jeu de reference intact" : "   ECART !"));
