// =============================================================================
// 04 - INDEX                                                          [J2 am]
// =============================================================================
// Programme : "Index (Simple, Unique, Compound, Filtre partiel, etc)"
//
// Prerequis : 00-jeu-de-donnees.js ET 00b-generer-volume.js
//
//     make charger F=mongosh/04-index.js
//
// Le script part d'une collection journauxBord SANS AUCUN INDEX (hors _id),
// mesure, cree l'index, remesure. C'est l'ecart mesure qui enseigne, pas la
// definition de l'index.
// =============================================================================

const base = db.getSiblingDB("amiraute");
function titre(t) { print("\n--- " + t + " " + "-".repeat(Math.max(0, 60 - t.length))); }

// Deroule la chaine des etapes du plan gagnant : COLLSCAN, IXSCAN, FETCH, SORT...
function etapes(st) {
  const noms = [];
  while (st) { noms.push(st.stage); st = st.inputStage || (st.inputStages || [])[0]; }
  return noms.join(" <- ");
}

// Mesure une requete et affiche la ligne qui compte.
function mesurer(etiquette, collection, filtre, tri, projection) {
  let c = collection.find(filtre, projection || {});
  if (tri) { c = c.sort(tri); }
  const r = c.explain("executionStats");
  const e = r.executionStats;
  print("  " + etiquette.padEnd(34) +
        String(e.nReturned).padStart(6) + " rendus" +
        String(e.totalDocsExamined).padStart(8) + " docs lus" +
        String(e.totalKeysExamined).padStart(8) + " cles" +
        String(e.executionTimeMillis).padStart(6) + " ms   " +
        etapes(e.executionStages));
}

const UN_NAVIRE = base.navires.findOne({ numeroCoque: "R91", nation: "France" })._id;


// =============================================================================
titre("Etat initial");
// =============================================================================

print("journauxBord : " + base.journauxBord.countDocuments() + " documents");
print("index existants : " + base.journauxBord.getIndexes().map(function (i) { return i.name; }).join(", "));
print("\nSeul _id_ existe. MongoDB le cree toujours, il est toujours unique,");
print("et il ne peut pas etre supprime.");


// =============================================================================
titre("1. Index simple - la mesure avant / apres");
// =============================================================================

print("\nRequete : tous les releves d'un navire");
mesurer("SANS index", base.journauxBord, { navireId: UN_NAVIRE });

base.journauxBord.createIndex({ navireId: 1 }, { name: "idx_navire" });
mesurer("AVEC idx_navire", base.journauxBord, { navireId: UN_NAVIRE });

print("\nLire la colonne 'docs lus' : elle passe de 100 000 a ce qui est");
print("reellement rendu. Le COLLSCAN devient IXSCAN. C'est tout le sujet.");


// =============================================================================
titre("2. Index compose - l'ordre des cles n'est pas negociable");
// =============================================================================

const DEBUT = ISODate("2026-07-10T00:00:00Z");
const FIN   = ISODate("2026-07-13T00:00:00Z");
const fenetre = { navireId: UN_NAVIRE, horodatage: { $gte: DEBUT, $lt: FIN } };

print("\nRequete : un navire, sur trois jours, trie par horodatage");
mesurer("idx_navire seul", base.journauxBord, fenetre, { horodatage: 1 });

base.journauxBord.createIndex({ navireId: 1, horodatage: 1 }, { name: "idx_navire_temps" });
mesurer("idx_navire_temps", base.journauxBord, fenetre, { horodatage: 1 });

print("\nAvec le seul idx_navire, MongoDB devait remonter tous les releves du");
print("navire puis les TRIER en memoire (etape SORT). L'index compose fournit");
print("les documents deja tries : l'etape SORT disparait du plan.");

print("\nRegle ESR - l'ordre des cles d'un index compose suit :");
print("  E galite   -> les champs testes par egalite d'abord   (navireId)");
print("  S ort      -> puis les champs du tri                   (horodatage)");
print("  R ange     -> enfin les champs testes par intervalle");
print("Un index (horodatage, navireId) serait beaucoup moins efficace ici.");

// Demonstration : l'index inverse
base.journauxBord.createIndex({ horodatage: 1, navireId: 1 }, { name: "idx_temps_navire" });
print("\nComparaison des deux ordres sur la meme requete :");
mesurer("navireId puis horodatage", base.journauxBord, fenetre, { horodatage: 1 });
base.journauxBord.hideIndex("idx_navire_temps");
mesurer("horodatage puis navireId", base.journauxBord, fenetre, { horodatage: 1 });
base.journauxBord.unhideIndex("idx_navire_temps");

print("\nhideIndex() rend un index invisible au planificateur SANS le supprimer.");
print("C'est l'outil pour tester 'et si je le retirais ?' en production, avec");
print("un unhideIndex() immediat si la latence s'ecroule.");

base.journauxBord.dropIndex("idx_temps_navire");


// =============================================================================
titre("3. Prefixe d'index - un index en vaut plusieurs");
// =============================================================================

print("\nidx_navire_temps sert AUSSI les requetes sur navireId seul :");
mesurer("navireId seul", base.journauxBord, { navireId: UN_NAVIRE });

print("\nIl couvre le prefixe { navireId }, mais PAS { horodatage } seul :");
mesurer("horodatage seul", base.journauxBord, { horodatage: { $gte: DEBUT, $lt: FIN } });

print("\nConsequence pratique : idx_navire est devenu redondant.");
base.journauxBord.dropIndex("idx_navire");
print("idx_navire supprime. Un index de trop coute a chaque ecriture.");


// =============================================================================
titre("4. Index couvrant - repondre sans lire un seul document");
// =============================================================================

print("\nSi la projection ne demande que des champs presents dans l'index,");
print("MongoDB repond depuis l'index seul. Regarder 'docs lus' :");
mesurer("projection hors index", base.journauxBord, fenetre, null, { _id: 0, vitesseNoeuds: 1 });
mesurer("projection dans l'index", base.journauxBord, fenetre, null, { _id: 0, horodatage: 1 });

print("\nLa seconde ligne lit 0 document : etape PROJECTION_COVERED.");
print("Le gain est maximal, mais il impose d'exclure _id de la projection.");


// =============================================================================
titre("5. Index unique");
// =============================================================================

// Cas simple : le nom d'un port est unique.
base.ports.createIndex({ nom: 1 }, { unique: true, name: "idx_port_nom_unique" });
print("ports.nom : index unique cree");

try {
  base.ports.insertOne({ _id: "TOULON_BIS", nom: "Toulon", pays: "France" });
  print("ATTENTION : le doublon est passe");
} catch (e) {
  print("doublon refuse -> code " + e.code + " (11000 = DuplicateKey)");
}

// Cas reel : un numero de coque N'EST PAS unique dans le monde.
print("\nnumeroCoque tout seul peut-il etre unique ?");
const doublons = base.navires.aggregate([
  { $group: { _id: "$numeroCoque", n: { $sum: 1 } } },
  { $match: { n: { $gt: 1 } } }
]).toArray();
print("  numeros de coque partages entre nations : " + doublons.length);

base.navires.createIndex({ nation: 1, numeroCoque: 1 },
                         { unique: true, name: "idx_nation_coque_unique" });
print("  -> l'unicite est donc posee sur le COUPLE (nation, numeroCoque)");
print("\nLecon : la contrainte d'unicite se decide sur le metier, pas sur le");
print("champ qui ressemble le plus a une cle primaire.");


// =============================================================================
titre("6. Index partiel - n'indexer que ce qui est interroge");
// =============================================================================

const avarie = { evenement: "AVARIE_MINEURE" };
print("\nreleves porteurs d'un evenement : " +
      base.journauxBord.countDocuments({ evenement: { $exists: true } }) + " sur 100 000");

mesurer("SANS index", base.journauxBord, avarie);

base.journauxBord.createIndex(
  { evenement: 1, horodatage: -1 },
  { name: "idx_evenement_partiel",
    // $exists: true - et PAS $type: "string", ni $ne: null. Voir plus bas.
    partialFilterExpression: { evenement: { $exists: true } } }
);
mesurer("index partiel", base.journauxBord, avarie);

// $collStats remplace le db.collection.stats() deprecie depuis MongoDB 6.2.
const tailles = base.journauxBord
  .aggregate([{ $collStats: { storageStats: {} } }]).toArray()[0]
  .storageStats.indexSizes;
print("\nTaille des index :");
Object.keys(tailles).forEach(function (n) {
  print("  " + n.padEnd(26) + String(Math.round(tailles[n] / 1024)).padStart(7) + " Ko");
});
print("\nL'index partiel ne contient que ~250 entrees au lieu de 100 000.");
print("Meme service rendu, une fraction du cout en RAM et a l'ecriture.");
print("");
print("LE CHOIX DU FILTRE N'EST PAS LIBRE. Mesure sur ce jeu de donnees,");
print("pour la meme requete { evenement: \"AVARIE_MINEURE\" } :");
print("");
print("  $exists: true    IXSCAN,   30 docs lus   <- retenu");
print("  $gt: \"\"          IXSCAN,   30 docs lus");
print("  $in: [ ... ]     IXSCAN,   30 docs lus");
print("  $type: \"string\"  COLLSCAN, 100 000 docs lus");
print("  $ne: null        REFUSE a la creation ($not non supporte)");
print("");
print("Le planificateur n'utilise un index partiel que s'il peut PROUVER que");
print("la requete est incluse dans le filtre. Il n'a pas prouve que la chaine");
print("\"AVARIE_MINEURE\" satisfait $type: \"string\" - alors que c'est vrai.");
print("");
print("Corollaire de modelisation : le champ evenement est ABSENT quand il n'y");
print("a pas d'evenement, et non pas null. Un champ a null EXISTE, et serait");
print("donc indexe : l'index partiel contiendrait les 100 000 entrees.");


// =============================================================================
titre("7. Index multicle - les tableaux");
// =============================================================================

base.navires.createIndex({ "armements.categorie": 1 }, { name: "idx_armement_categorie" });
base.navires.createIndex({ etiquettes: 1 }, { name: "idx_etiquettes" });

mesurer("etiquette 'nucleaire'", base.navires, { etiquettes: "nucleaire" });

print("\nUn index sur un champ tableau cree UNE ENTREE PAR ELEMENT : c'est un");
print("index multicle. MongoDB le detecte seul, il n'y a rien a declarer.");
print("Limite a connaitre : on ne peut pas composer deux champs tableau dans");
print("le meme index. { armements.x: 1, capteurs.y: 1 } serait refuse.");


// =============================================================================
titre("8. Index texte");
// =============================================================================

base.navires.createIndex(
  { nom: "text", devise: "text", classe: "text" },
  { name: "idx_texte", weights: { nom: 10, classe: 5, devise: 1 }, default_language: "french" }
);

print("\nRecherche plein texte sur 'admiral' :");
base.navires.find({ $text: { $search: "admiral" } },
                  { _id: 0, nom: 1, score: { $meta: "textScore" } })
  .sort({ score: { $meta: "textScore" } })
  .forEach(function (n) { print("  " + n.score.toFixed(2) + "  " + n.nom); });

print("\nLes poids font remonter une correspondance sur le nom avant une");
print("correspondance sur la devise. Une seule collection ne peut porter");
print("qu'UN SEUL index texte : c'est la contrainte a retenir.");

print("\nComparaison avec $regex non ancre :");
mesurer("$regex 'Admiral' (non ancre)", base.navires, { nom: /Admiral/ });
mesurer("$regex '^Admiral' (ancre)", base.navires, { nom: /^Admiral/ });
print("  Seule la regex ancree a gauche peut descendre dans l'index.");


// =============================================================================
titre("9. Index geospatial 2dsphere");
// =============================================================================

base.navires.createIndex({ positionActuelle: "2dsphere" }, { name: "idx_position" });
base.ports.createIndex({ localisation: "2dsphere" }, { name: "idx_port_position" });

const TOULON = [5.93, 43.12];
print("\nNavires a moins de 500 km de Toulon :");
base.navires.find({
  positionActuelle: { $near: { $geometry: { type: "Point", coordinates: TOULON },
                               $maxDistance: 500000 } }
}, { _id: 0, nom: 1, nation: 1 }).limit(8).forEach(function (n) {
  print("  " + n.nom + " (" + n.nation + ")");
});

print("\n$near trie par distance croissante : le tri est gratuit.");
print("$maxDistance est en METRES. Un index 2dsphere est OBLIGATOIRE pour");
print("$near : sans lui, la requete echoue au lieu d'etre simplement lente.");

print("\nDistance calculee avec $geoNear (agregation) :");
base.navires.aggregate([
  // $geoNear n'accepte plus le parametre "limit" depuis MongoDB 7 :
  // il faut une etape $limit distincte. Erreur Location50858 sinon.
  { $geoNear: { near: { type: "Point", coordinates: TOULON },
                distanceField: "distanceKm", distanceMultiplier: 0.001,
                spherical: true } },
  { $limit: 5 },
  { $project: { _id: 0, nom: 1, distanceKm: { $round: ["$distanceKm", 0] } } }
]).forEach(function (n) {
  print("  " + String(n.distanceKm).padStart(6) + " km  " + n.nom);
});


// =============================================================================
titre("10. Diagnostic des index");
// =============================================================================

print("\nTous les index de navires :");
base.navires.getIndexes().forEach(function (i) {
  print("  " + i.name.padEnd(28) + JSON.stringify(i.key));
});

print("\n$indexStats - qui sert vraiment ?");
base.journauxBord.aggregate([{ $indexStats: {} }]).forEach(function (i) {
  print("  " + i.name.padEnd(26) + String(i.accesses.ops).padStart(6) + " utilisations");
});

print("\nUn index a 0 utilisation apres plusieurs jours de production est un");
print("index a supprimer : il coute a chaque ecriture et ne rend rien.");
print("Le reflexe : hideIndex() d'abord, dropIndex() une semaine plus tard.");

print("\n=== Index en place a la fin du script ===");
["navires", "ports", "journauxBord"].forEach(function (c) {
  print("  " + c + " : " + base[c].getIndexes().map(function (i) { return i.name; }).join(", "));
});
