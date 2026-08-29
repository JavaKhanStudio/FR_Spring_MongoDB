// =============================================================================
// 09 - TRANSACTIONS ET CHANGE STREAMS                          [J2 pm - bonus]
// =============================================================================
// Hors programme strict, mais systematiquement demande en salle par un public
// venant du relationnel. Prevoir 20 minutes.
//
// PROFIL REQUIS : replique. Les transactions multi-documents exigent un
// replica set, meme mono-noeud.
//     make stop && make replique
//     docker compose -f docker/docker-compose.yml exec -T mongo1 mongosh < mongosh/09-transactions.js
// =============================================================================

function titre(t) { print("\n--- " + t + " " + "-".repeat(Math.max(0, 60 - t.length))); }
function ligne() { print("  " + Array.prototype.slice.call(arguments).join("  ")); }

const base = db.getSiblingDB("amiraute");


// =============================================================================
titre("1. Ce dont on n'a PAS besoin d'une transaction");
// =============================================================================

print("\nUne ecriture sur UN document est deja atomique, meme si elle touche");
print("plusieurs champs et plusieurs sous-documents :");

const avant = base.navires.findOne({ numeroCoque: "D650", nation: "France" },
                                   { _id: 0, nom: 1, statut: 1, "armements.designation": 1 });
printjson(avant);

base.navires.updateOne(
  { numeroCoque: "D650", nation: "France" },
  { $set: { statut: "EN_MISSION" },
    $push: { armements: { designation: "Module d'essai", categorie: "CANON",
                          quantite: 1, porteeKm: 5, calibreMm: 40 } },
    $inc: { "propulsion.puissanceChevaux": 500 } }
);
print("\nTrois operateurs, un seul document, une seule operation atomique.");
print("Aucun autre client ne peut voir un etat intermediaire.");

// remise en etat
base.navires.updateOne(
  { numeroCoque: "D650", nation: "France" },
  { $set: { statut: "ACTIF" },
    $pull: { armements: { designation: "Module d'essai" } },
    $inc: { "propulsion.puissanceChevaux": -500 } }
);

print("\nC'est LE gain du modele document : la plupart des cas qui exigeraient");
print("une transaction en SQL n'en demandent aucune ici, parce que la donnee");
print("liee est deja dans le meme document.");


// =============================================================================
titre("2. Quand la transaction devient necessaire");
// =============================================================================

print("\nMuter un navire d'une flotte a une autre, en tenant un compteur");
print("dans chaque flotte : deux collections, trois documents. Aucune");
print("astuce de modelisation ne rend cela atomique.");

base.flottes.updateMany({}, { $set: { nbNavires: 0 } });
base.flottes.updateOne({ _id: "FAN" },  { $set: { nbNavires: 6 } });
base.flottes.updateOne({ _id: "FOST" }, { $set: { nbNavires: 3 } });

const session = db.getMongo().startSession();
const nav = session.getDatabase("amiraute").navires;
const flo = session.getDatabase("amiraute").flottes;

session.startTransaction({ readConcern: { level: "snapshot" },
                           writeConcern: { w: "majority" } });
try {
  nav.updateOne({ numeroCoque: "D650", nation: "France" },
    { $set: { flotte: { id: "FOST", nom: "Force Oceanique Strategique", nation: "France" } } });
  flo.updateOne({ _id: "FAN"  }, { $inc: { nbNavires: -1 } });
  flo.updateOne({ _id: "FOST" }, { $inc: { nbNavires:  1 } });
  session.commitTransaction();
  print("\ncommit effectue");
} catch (e) {
  session.abortTransaction();
  print("\nannulee : " + e.message);
}

print("");
base.flottes.find({ _id: { $in: ["FAN", "FOST"] } }).forEach(function (f) {
  ligne(f._id.padEnd(8), f.nbNavires + " navires");
});


// =============================================================================
titre("3. L'annulation");
// =============================================================================

session.startTransaction();
try {
  nav.updateOne({ numeroCoque: "D650", nation: "France" }, { $set: { statut: "PERDU" } });
  ligne("dans la transaction :", nav.findOne({ numeroCoque: "D650", nation: "France" }).statut);
  ligne("vu de l'exterieur   :", base.navires.findOne({ numeroCoque: "D650", nation: "France" }).statut);
  throw new Error("avarie simulee");
} catch (e) {
  session.abortTransaction();
  ligne("apres abort         :", base.navires.findOne({ numeroCoque: "D650", nation: "France" }).statut);
}

print("\nL'isolation est reelle : la session voit sa propre modification,");
print("personne d'autre ne la voit tant que le commit n'a pas eu lieu.");

// remise en etat
base.navires.updateOne({ numeroCoque: "D650", nation: "France" },
    { $set: { flotte: { id: "FAN", nom: "Force d'Action Navale", nation: "France" } } });
base.flottes.updateMany({}, { $unset: { nbNavires: "" } });
session.endSession();


// =============================================================================
titre("4. Les limites, a annoncer avant que quelqu'un les decouvre");
// =============================================================================

ligne("duree      ", "60 secondes par defaut, puis abandon automatique");
ligne("taille     ", "16 Mo d'oplog par transaction");
ligne("DDL        ", "pas de createIndex ni de createCollection dedans");
ligne("cout       ", "verrous et snapshots : nettement plus cher qu'une ecriture");
ligne("conflits   ", "en cas de collision, MongoDB abandonne. Le code DOIT rejouer");

print("\nLa bonne pratique tient en une phrase : si un modele a besoin de");
print("transactions sur ses chemins CHAUDS, c'est le modele qu'il faut revoir,");
print("pas la transaction qu'il faut optimiser.");


// =============================================================================
titre("5. Change streams");
// =============================================================================

print("\nUn change stream lit l'oplog et pousse les modifications en continu.");
print("Il remplace le polling par une souscription :");
print("");
print("  const flux = base.navires.watch([");
print("    { $match: { 'updateDescription.updatedFields.statut': { $exists: true } } }");
print("  ]);");
print("  while (flux.hasNext()) { printjson(flux.next()); }");
print("");
print("Cote Spring : @Autowired ReactiveMongoTemplate, ou MessageListener");
print("avec ChangeStreamRequest. Usage typique : invalider un cache, alimenter");
print("un index de recherche, declencher une notification.");
print("");
print("Comme les transactions, cela exige un replica set.");
