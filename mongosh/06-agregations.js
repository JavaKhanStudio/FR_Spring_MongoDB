// =============================================================================
// 06 - AGREGATIONS                                                    [J2 pm]
// =============================================================================
// Programme : "Les Aggregates"
//
//     make charger F=mongosh/06-agregations.js
//
// Un pipeline est une SUITE D'ETAPES. Chaque etape recoit le flux de documents
// de la precedente et le transforme. On le construit toujours etape par etape,
// jamais d'un bloc.
// =============================================================================

const base = db.getSiblingDB("amiraute");
function titre(t) { print("\n--- " + t + " " + "-".repeat(Math.max(0, 60 - t.length))); }
function ligne() { print("  " + Array.prototype.slice.call(arguments).join("  ")); }


// =============================================================================
titre("1. $match + $group : la base");
// =============================================================================

print("\nTonnage total par nation, batiments en service :");
base.navires.aggregate([
  { $match: { statut: { $ne: "DESARME" } } },
  { $group: {
      _id: "$nation",
      nombre: { $sum: 1 },
      tonnageTotal: { $sum: "$deplacementTonnes" },
      tonnageMoyen: { $avg: "$deplacementTonnes" },
      leParPlusLourd: { $max: "$deplacementTonnes" }
  } },
  { $sort: { tonnageTotal: -1 } }
]).forEach(function (r) {
  ligne(r._id.padEnd(14),
        String(r.nombre).padStart(2) + " nav.",
        String(r.tonnageTotal).padStart(7) + " t",
        "moy " + String(Math.round(r.tonnageMoyen)).padStart(6) + " t",
        "max " + String(r.leParPlusLourd).padStart(6) + " t");
});

print("\n$match EN PREMIER, toujours : il reduit le flux avant les etapes");
print("couteuses, et c'est la seule etape qui peut utiliser un index.");


// =============================================================================
titre("2. $group avec plusieurs cles, et $push");
// =============================================================================

print("\nRepartition nation x type :");
base.navires.aggregate([
  { $match: { statut: { $ne: "DESARME" } } },
  { $group: { _id: { nation: "$nation", type: "$type" }, n: { $sum: 1 },
              exemples: { $push: "$nom" } } },
  { $match: { n: { $gte: 3 } } },
  { $sort: { n: -1 } }
]).forEach(function (r) {
  ligne((r._id.nation + " / " + r._id.type).padEnd(34),
        String(r.n).padStart(2), r.exemples.slice(0, 3).join(", "));
});

print("\n_id peut etre un OBJET : c'est le GROUP BY multi-colonnes.");
print("$push accumule, $addToSet accumule sans doublon.");


// =============================================================================
titre("3. $unwind : eclater un tableau");
// =============================================================================

print("\nUn navire, plusieurs armements -> une ligne par armement :");
base.navires.aggregate([
  { $match: { numeroCoque: "D620", nation: "France" } },
  { $unwind: "$armements" },
  { $project: { _id: 0, nom: 1, arme: "$armements.designation", cat: "$armements.categorie" } }
]).forEach(function (r) { ligne(r.nom.padEnd(10), r.cat.padEnd(22), r.arme); });

print("\nPuissance de feu totale par nation (somme des quantites) :");
base.navires.aggregate([
  { $match: { statut: { $ne: "DESARME" } } },
  { $unwind: "$armements" },
  { $match: { "armements.categorie": { $in: ["MISSILE_ANTIAERIEN", "MISSILE_ANTINAVIRE",
                                             "MISSILE_CROISIERE", "MISSILE_BALISTIQUE"] } } },
  { $group: { _id: "$nation", missiles: { $sum: "$armements.quantite" },
              porteeMax: { $max: "$armements.porteeKm" } } },
  { $sort: { missiles: -1 } }
]).forEach(function (r) {
  ligne(r._id.padEnd(14), String(r.missiles).padStart(4) + " missiles",
        "portee max " + String(r.porteeMax).padStart(5) + " km");
});

print("\nNoter le SECOND $match, apres le $unwind : il filtre les ELEMENTS");
print("eclates, ce que le premier $match ne pouvait pas faire.");
print("$unwind supprime les documents dont le tableau est vide, sauf avec");
print("l'option { preserveNullAndEmptyArrays: true }.");


// =============================================================================
titre("4. $lookup : la jointure - et comment s'en passer");
// =============================================================================

print("\nA L'ANCIENNE - navires + port + flotte par jointure :");
base.navires.aggregate([
  { $match: { nation: "France", statut: "ACTIF" } },
  { $lookup: { from: "ports",   localField: "portAttache.id", foreignField: "_id", as: "p" } },
  { $lookup: { from: "flottes", localField: "flotte.id",      foreignField: "_id", as: "f" } },
  { $project: { _id: 0, nom: 1,
                port: { $first: "$p.nom" },
                flotte: { $first: "$f.nom" },
                amiral: { $first: "$f.amiralCommandant.nom" } } }
]).forEach(function (r) {
  ligne(r.nom.padEnd(22), r.port.padEnd(10), r.flotte.padEnd(36), r.amiral);
});

print("\n$lookup produit TOUJOURS un tableau, meme pour une relation 1-1.");
print("$first (ou $unwind) le remet a plat. Oublier cette etape est l'erreur");
print("numero un sur les $lookup.");

print("\nMAINTENANT - le meme ecran, avec l'EXTENDED REFERENCE :");
base.navires.aggregate([
  { $match: { nation: "France", statut: "ACTIF" } },
  { $lookup: { from: "flottes", localField: "flotte.id", foreignField: "_id", as: "f" } },
  { $project: { _id: 0, nom: 1,
                port: "$portAttache.nom",       // deja dans le document
                flotte: "$flotte.nom",          // deja dans le document
                amiral: { $first: "$f.amiralCommandant.nom" } } }
]).forEach(function (r) {
  ligne(r.nom.padEnd(22), r.port.padEnd(10), r.flotte.padEnd(36), r.amiral);
});

print("\nDeux $lookup ont disparu. Le nom du port et celui de la flotte sont");
print("recopies dans le navire : c'est l'EXTENDED REFERENCE (script 05b).");
print("");
print("Il en RESTE un, et c'est volontaire : le nom de l'amiral n'est pas");
print("recopie, parce qu'un amiral change de poste. On denormalise champ par");
print("champ, selon la frequence de changement - jamais en bloc.");

titre("5. $lookup avec pipeline : la relation N-N");
// =============================================================================

print("\nMissions en cours et leurs participants :");
base.missions.aggregate([
  { $match: { statut: "EN_COURS" } },
  // Aucun $lookup : naviresParticipants porte deja { id, nom, numeroCoque, type }.
  { $project: { _id: 0, nomCode: 1, zone: "$zoneOperation.nom",
                participants: "$naviresParticipants.nom" } },
  { $sort: { nomCode: 1 } }
]).forEach(function (m) {
  ligne(m.nomCode.padEnd(26), m.zone.padEnd(28), m.participants.join(", "));
});

print("\nZERO jointure : l'ecran le plus consulte du systeme se rend par une");
print("simple projection. C'est ce qu'achete l'extended reference.");
print("");
print("La syntaxe du $lookup a sous-pipeline reste bonne a connaitre - elle");
print("filtre et projette cote collection etrangere AVANT de rapatrier :");
print("");
print("  { $lookup: { from: 'navires', localField: 'naviresParticipants.id',");
print("               foreignField: '_id', as: 'detail',");
print("               pipeline: [ { $project: { nom: 1, statut: 1 } } ] } }");
print("");
print("C'est ainsi qu'on irait chercher le STATUT d'un participant : lui n'est");
print("pas recopie, justement parce qu'il change tout le temps.");

print("\nLe sens inverse - dans combien de missions chaque navire figure :");
base.navires.aggregate([
  { $lookup: { from: "missions", localField: "_id",
               foreignField: "naviresParticipants.id", as: "missions" } },
  { $project: { _id: 0, nom: 1, nation: 1,
                nbMissions: { $size: "$missions" },
                // COMPUTED : la meme valeur, deja calculee et stockee.
                nbMissionsPrecalcule: "$stats.nombreMissions" } },
  { $sort: { nbMissions: -1, nom: 1 } },
  { $limit: 6 }
]).forEach(function (n) { ligne(String(n.nbMissions), n.nom.padEnd(24), n.nation); });

print("\nLes navires a 0 mission apparaissent quand meme : $lookup est une");
print("jointure GAUCHE, le tableau est simplement vide.");
print("");
print("Les deux colonnes sont identiques : la seconde vient de stats, calculee");
print("a l'ECRITURE. Le pattern COMPUTED transforme ce pipeline en lecture de");
print("champ - et il faut que les deux restent d'accord, c'est le prix.");


// =============================================================================
titre("5b. POLYMORPHIC : agreger sur ce qui n'existe qu'ici");
// =============================================================================

print("\nRepartition des documents par FORME :");
base.navires.aggregate([
  { $group: { _id: "$_class", n: { $sum: 1 }, tonnage: { $sum: "$deplacementTonnes" } } },
  { $sort: { n: -1 } }
]).forEach(function (r) {
  ligne(r._id.padEnd(20), String(r.n).padStart(2) + " navires",
        String(r.tonnage).padStart(7) + " t");
});

print("\ngroupeAerien n'existe QUE sur les porte-aeronefs :");
base.navires.aggregate([
  { $match: { _class: "porte-aeronefs" } },
  { $unwind: "$groupeAerien" },
  { $group: { _id: "$groupeAerien.role", total: { $sum: "$groupeAerien.quantite" },
              nations: { $addToSet: "$nation" } } },
  { $sort: { total: -1 } }
]).forEach(function (r) {
  ligne(r._id.padEnd(20), String(r.total).padStart(4) + " appareils",
        r.nations.length + " nations");
});

print("\nEt profondeurMaxMetres, que sur les sous-marins :");
base.navires.aggregate([
  { $match: { _class: "sous-marin" } },
  { $group: { _id: "$missionStrategique", n: { $sum: 1 },
              profondeurMoyenne: { $avg: "$profondeurMaxMetres" },
              plusDiscret: { $min: "$discretionDecibels" } } },
  { $sort: { n: -1 } }
]).forEach(function (r) {
  ligne(r._id.padEnd(14), String(r.n).padStart(2),
        Math.round(r.profondeurMoyenne) + " m en moyenne",
        r.plusDiscret + " dB pour le plus discret");
});

print("\n_class est un champ COMME UN AUTRE : on groupe dessus, on le filtre,");
print("on l'indexe. C'est ce qui rend le polymorphisme interrogeable, la ou un");
print("heritage relationnel imposerait un UNION ou trois requetes.");


// =============================================================================
titre("6. $bucket : les tranches");
// =============================================================================

print("\nRepartition par tranche de tonnage :");
base.navires.aggregate([
  { $match: { statut: { $ne: "DESARME" } } },
  { $bucket: {
      groupBy: "$deplacementTonnes",
      boundaries: [0, 5000, 10000, 30000, 60000, 120000],
      default: "hors bornes",
      output: { n: { $sum: 1 }, navires: { $push: "$nom" } }
  } }
]).forEach(function (b) {
  ligne(("a partir de " + b._id + " t").padEnd(22), String(b.n).padStart(2),
        b.navires.slice(0, 3).join(", ") + (b.navires.length > 3 ? "..." : ""));
});

print("\n$bucketAuto fait le meme travail avec des bornes calculees :");
base.navires.aggregate([
  { $bucketAuto: { groupBy: "$anneeMiseEnService", buckets: 4,
                   output: { n: { $sum: 1 } } } }
]).forEach(function (b) { ligne(b._id.min + " - " + b._id.max, String(b.n).padStart(3) + " navires"); });


// =============================================================================
titre("7. $facet : plusieurs analyses en une passe");
// =============================================================================

const tb = base.navires.aggregate([
  { $match: { statut: { $ne: "DESARME" } } },
  { $facet: {
      parType: [ { $group: { _id: "$type", n: { $sum: 1 } } }, { $sort: { n: -1 } } ],
      parPropulsion: [ { $group: { _id: "$propulsion.type", n: { $sum: 1 } } },
                       { $sort: { n: -1 } } ],
      lesPlusRapides: [ { $sort: { vitesseMaxNoeuds: -1 } }, { $limit: 3 },
                        { $project: { _id: 0, nom: 1, vitesseMaxNoeuds: 1 } } ],
      totaux: [ { $group: { _id: null, navires: { $sum: 1 },
                            tonnage: { $sum: "$deplacementTonnes" },
                            equipage: { $sum: "$equipageMax" } } } ]
  } }
]).toArray()[0];

print("\n=== TABLEAU DE BORD DE L'AMIRAL ===");
print("\nPar type :");        tb.parType.forEach(function (r) { ligne(r._id.padEnd(20), String(r.n).padStart(3)); });
print("\nPar propulsion :");  tb.parPropulsion.forEach(function (r) { ligne(r._id.padEnd(20), String(r.n).padStart(3)); });
print("\nLes plus rapides :");tb.lesPlusRapides.forEach(function (r) { ligne(r.vitesseMaxNoeuds + " nd", r.nom); });
print("\nTotaux :");
ligne(tb.totaux[0].navires + " navires", tb.totaux[0].tonnage + " t",
      tb.totaux[0].equipage + " hommes d'equipage");

print("\n$facet execute chaque branche sur le MEME flux d'entree. Un seul");
print("aller-retour reseau, un seul balayage. C'est l'etape des tableaux de bord.");
print("Limite : aucune branche de $facet ne peut utiliser d'index.");


// =============================================================================
titre("8. Etapes de mise en forme");
// =============================================================================

print("\n$addFields, $filter, $cond, $switch :");
base.navires.aggregate([
  { $match: { type: "PORTE_AVIONS", statut: { $ne: "DESARME" } } },
  { $addFields: {
      // $filter garde TOUS les elements correspondants (contrairement a
      // $elemMatch en projection, qui n'en garde qu'un).
      missilesLongs: { $filter: {
          input: "$armements", as: "a",
          cond: { $gte: ["$$a.porteeKm", 100] } } },
      categorie: { $switch: { branches: [
          { case: { $gte: ["$deplacementTonnes", 80000] }, then: "super-porte-avions" },
          { case: { $gte: ["$deplacementTonnes", 40000] }, then: "porte-avions lourd" }
        ], default: "porte-avions moyen" } },
      age: { $subtract: [2026, "$anneeMiseEnService"] }
  } },
  { $project: { _id: 0, nom: 1, categorie: 1, age: 1,
                nbMissilesLongs: { $size: "$missilesLongs" } } },
  { $sort: { age: 1 } }
]).forEach(function (n) {
  ligne(n.nom.padEnd(24), n.categorie.padEnd(22), String(n.age).padStart(2) + " ans",
        n.nbMissilesLongs + " missile(s) longue portee");
});


// =============================================================================
titre("9. Agreger sur le VOLUME - journauxBord");
// =============================================================================

print("\nVitesse moyenne par jour, un navire, sur 100 000 releves :");
const cdgId = base.navires.findOne({ numeroCoque: "R91", nation: "France" })._id;
base.journauxBord.aggregate([
  { $match: { navireId: cdgId } },
  { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$horodatage" } },
      releves: { $sum: 1 },
      vitesseMoyenne: { $avg: "$vitesseNoeuds" },
      carburantMin: { $min: "$carburantPourcent" }
  } },
  { $sort: { _id: 1 } },
  { $limit: 7 }
]).forEach(function (j) {
  ligne(j._id, String(j.releves).padStart(4) + " releves",
        j.vitesseMoyenne.toFixed(1) + " nd",
        "carburant min " + j.carburantMin + " %");
});

print("\nLe $match initial descend dans idx_navire_temps (script 04). Sans lui,");
print("cette agregation balaierait les 100 000 documents.");

print("\nVerification avec explain :");
const plan = base.journauxBord.explain("executionStats").aggregate([
  { $match: { navireId: cdgId } },
  { $group: { _id: null, n: { $sum: 1 } } }
]);
const st = plan.stages ? plan.stages[0].$cursor : plan;
if (st && st.executionStats) {
  ligne("docs examines :", String(st.executionStats.totalDocsExamined),
        "| duree :", st.executionStats.executionTimeMillis + " ms");
}


// =============================================================================
titre("10. Ecrire le resultat : $out et $merge");
// =============================================================================

base.navires.aggregate([
  { $match: { statut: { $ne: "DESARME" } } },
  { $group: { _id: "$nation", navires: { $sum: 1 },
              tonnage: { $sum: "$deplacementTonnes" } } },
  { $merge: { into: "statistiquesNations", on: "_id",
              whenMatched: "replace", whenNotMatched: "insert" } }
]).toArray();

print("\nCollection statistiquesNations : " + base.statistiquesNations.countDocuments() + " lignes");
base.statistiquesNations.find().sort({ tonnage: -1 }).limit(3).forEach(function (s) {
  ligne(s._id.padEnd(14), String(s.navires).padStart(2) + " nav.", s.tonnage + " t");
});

print("\n$out ECRASE la collection cible. $merge fusionne, et sait quoi faire");
print("en cas de collision. Pour une vue materialisee rafraichie la nuit,");
print("c'est $merge qu'on veut, pas $out.");

base.statistiquesNations.drop();
print("(collection de demonstration supprimee)");
