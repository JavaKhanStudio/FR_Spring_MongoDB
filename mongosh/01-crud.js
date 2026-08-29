// =============================================================================
// 01 - CRUD : inserer, lire, modifier, supprimer                      [J1 pm]
// =============================================================================
// Programme : "Inserts (One/Many), updates, deletes."
//
//   make charger F=mongosh/01-crud.js
//
// Ce script travaille sur des navires FICTIFS qu'il cree puis supprime.
// Le jeu de reference n'est jamais touche.
// =============================================================================

const base = db.getSiblingDB("amiraute");
function titre(t) { print("\n--- " + t + " " + "-".repeat(Math.max(0, 60 - t.length))); }

const avant = base.navires.countDocuments();
titre("Point de depart : " + avant + " navires");


// -----------------------------------------------------------------------------
// insertOne - un document
// -----------------------------------------------------------------------------
titre("insertOne");

const resInsertion = base.navires.insertOne({
  // _class est le discriminant du POLYMORPHIC PATTERN. Sans lui, Spring Data
  // ne saura pas quelle sous-classe instancier a la lecture.
  _class: "batiment-surface",
  numeroCoque: "X001", nom: "Prototype Alpha", classe: "Essai",
  type: "CORVETTE", nation: "Atlantide", anneeMiseEnService: 2026, statut: "ACTIF",
  deplacementTonnes: 2400, longueurMetres: 95.0, vitesseMaxNoeuds: 32,
  propulsion: { type: "DIESEL", puissanceChevaux: 12000, nombreHelices: 2, nombreReacteurs: 0 },
  armements: [{ designation: "Canon d'essai", categorie: "CANON", quantite: 1, porteeKm: 12, calibreMm: 76 }],
  capteurs: [],
  // EXTENDED REFERENCE : l'identifiant PLUS les champs qu'on affiche avec.
  portAttache: { id: "TOULON", nom: "Toulon", pays: "France" },
  flotte: { id: "FAN", nom: "Force d'Action Navale", nation: "France" },
  systemeCombat: "ESSAI", capaciteVLS: 8, nombreHelicopteres: 0,
  etiquettes: ["prototype"]
});

print("insere : " + resInsertion.insertedId);
print("acknowledged : " + resInsertion.acknowledged);

// A montrer : MongoDB n'a exige AUCUN schema. Le champ "nation" vaut
// "Atlantide", "tirantEauMetres" est absent, "capteurs" est vide. Aucun refus.
// C'est la difference la plus visible avec un INSERT SQL.
//
// Et les trois documents inseres a l'etape suivante n'ont PAS TOUS LA MEME
// FORME : deux batiments de surface et un sous-marin, dans la meme collection.
// Aucune base relationnelle n'accepterait cela sans colonnes NULL.


// -----------------------------------------------------------------------------
// insertMany - plusieurs documents, et l'option ordered
// -----------------------------------------------------------------------------
titre("insertMany");

const resMultiple = base.navires.insertMany([
  { _class: "batiment-surface", numeroCoque: "X002", nom: "Prototype Beta",  type: "CORVETTE", nation: "Atlantide",
    statut: "ACTIF", deplacementTonnes: 2500, anneeMiseEnService: 2026, etiquettes: ["prototype"] },
  { _class: "batiment-surface", numeroCoque: "X003", nom: "Prototype Gamma", type: "PATROUILLEUR", nation: "Atlantide",
    statut: "EN_REPARATION", deplacementTonnes: 900, anneeMiseEnService: 2025, etiquettes: ["prototype"] },
  // Volontairement d'une AUTRE forme : un mini sous-marin d'essai.
  { _class: "sous-marin", numeroCoque: "X004", nom: "Prototype Delta", type: "SOUS_MARIN", nation: "Atlantide",
    statut: "ACTIF", deplacementTonnes: 1100, anneeMiseEnService: 2024,
    profondeurMaxMetres: 180, missionStrategique: "ATTAQUE", etiquettes: ["prototype"] }
]);

print("inseres : " + Object.keys(resMultiple.insertedIds).length);

// ordered:false continue apres une erreur au lieu de s'arreter au premier echec.
// Utile pour les imports en masse ; a connaitre, rarement le bon defaut.


// -----------------------------------------------------------------------------
// updateOne - modifier UN document
// -----------------------------------------------------------------------------
titre("updateOne avec $set");

const resMaj = base.navires.updateOne(
  { numeroCoque: "X001" },
  { $set: { statut: "EN_REPARATION", derniereRevision: ISODate("2026-08-01T00:00:00Z") } }
);

print("trouves : " + resMaj.matchedCount + " | modifies : " + resMaj.modifiedCount);

// $set cree le champ s'il n'existe pas. Ici "derniereRevision" n'existait sur
// AUCUN navire : il vient d'apparaitre sur celui-ci seulement. Le "schema" de
// la collection est desormais heterogene, et c'est parfaitement legal.


// -----------------------------------------------------------------------------
// Les autres operateurs de mise a jour
// -----------------------------------------------------------------------------
titre("$inc, $push, $unset, $rename");

base.navires.updateOne({ numeroCoque: "X001" }, { $inc: { deplacementTonnes: 150 } });
base.navires.updateOne({ numeroCoque: "X001" }, { $push: { etiquettes: "modernise" } });
base.navires.updateOne({ numeroCoque: "X001" }, {
  $push: { armements: { designation: "Lanceur d'essai", categorie: "MISSILE_ANTINAVIRE",
                        quantite: 4, porteeKm: 90, calibreMm: null } }
});
base.navires.updateOne({ numeroCoque: "X001" }, { $unset: { derniereRevision: "" } });

printjson(base.navires.findOne(
  { numeroCoque: "X001" },
  { _id: 0, nom: 1, deplacementTonnes: 1, etiquettes: 1, "armements.designation": 1 }
));

// A souligner : $push a ajoute dans un TABLEAU DE SOUS-DOCUMENTS en une seule
// operation atomique, sans table de jointure et sans transaction.


// -----------------------------------------------------------------------------
// updateMany - modifier en masse
// -----------------------------------------------------------------------------
titre("updateMany");

const resMasse = base.navires.updateMany(
  { nation: "Atlantide", statut: "ACTIF" },
  { $set: { flotte: { id: "FAN", nom: "Force d'Action Navale", nation: "France" } },
    $addToSet: { etiquettes: "flotte-experimentale" } }
);

print("trouves : " + resMasse.matchedCount + " | modifies : " + resMasse.modifiedCount);

// $addToSet vs $push : $addToSet n'ajoute que si la valeur est absente.
// Rejouer cette commande ne creera pas de doublon. $push, si.


// -----------------------------------------------------------------------------
// upsert - modifier, ou creer si absent
// -----------------------------------------------------------------------------
titre("upsert");

const resUpsert = base.navires.updateOne(
  { numeroCoque: "X999", nation: "Atlantide" },
  { $set: { nom: "Prototype Omega", type: "CORVETTE", statut: "ACTIF",
            deplacementTonnes: 2000, etiquettes: ["prototype"] } },
  { upsert: true }
);

print("upsertedId : " + resUpsert.upsertedId);

// Le filtre sert AUSSI de gabarit : numeroCoque et nation, presents dans le
// filtre, se retrouvent dans le document cree. Piege classique en entretien.


// -----------------------------------------------------------------------------
// replaceOne - remplacer tout le document
// -----------------------------------------------------------------------------
titre("replaceOne");

base.navires.replaceOne(
  { numeroCoque: "X999" },
  { numeroCoque: "X999", nom: "Prototype Omega II", nation: "Atlantide",
    type: "CORVETTE", statut: "ACTIF", deplacementTonnes: 2050 }
);

printjson(base.navires.findOne({ numeroCoque: "X999" }, { _id: 0 }));

// Le tableau "etiquettes" a DISPARU. replaceOne ne fusionne pas : il ecrase.
// C'est la difference avec updateOne + $set, et la source d'incidents reels.


// -----------------------------------------------------------------------------
// deleteOne et deleteMany
// -----------------------------------------------------------------------------
titre("deleteOne / deleteMany");

print("deleteOne  : " + base.navires.deleteOne({ numeroCoque: "X999" }).deletedCount);
print("deleteMany : " + base.navires.deleteMany({ nation: "Atlantide" }).deletedCount);


// -----------------------------------------------------------------------------
titre("Verification");
const apres = base.navires.countDocuments();
print("navires : " + apres + " (depart : " + avant + ")");
print(apres === avant ? "OK - le jeu de reference est intact" : "ATTENTION - ecart detecte");
