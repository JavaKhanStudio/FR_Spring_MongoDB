// =============================================================================
// CORRIGE E14 - Seaux et cas extremes
//     make charger F=exercices/corriges/E14-seaux-et-outliers.js
// Prerequis : 00, 00b et 04-index.js joues.
// =============================================================================
const base = db.getSiblingDB("amiraute");
function etape(n, t) { print("\n--- " + n + ". " + t + " " + "-".repeat(Math.max(0, 46 - t.length))); }
function l() { print("  " + Array.prototype.slice.call(arguments).join("  ")); }
function stats(nom) {
  return base[nom].aggregate([{ $collStats: { storageStats: {} } }])
             .toArray()[0].storageStats;
}
function chaine(st) { const c = []; while (st) { c.push(st.stage); st = st.inputStage; } return c.join(" <- "); }

base.ex_seaux.drop();

// =============================================================================
print("\n===== PARTIE 1 - BUCKET " + "=".repeat(46));
// =============================================================================

etape(1, "l'etat de depart");
const avant = stats("journauxBord");
l("documents        :", String(avant.count));
l("donnees          :", Math.round(avant.size / 1024) + " Ko");
l("index            :", Math.round(avant.totalIndexSize / 1024) + " Ko");
l("nb d'index       :", String(avant.nindexes));

etape(2, "construire les seaux, en UNE agregation");
base.journauxBord.aggregate([
  { $group: {
      // La clef du seau : un navire, une heure.
      _id: { navireId: "$navireId",
             debut: { $dateTrunc: { date: "$horodatage", unit: "hour" } } },
      nombre:          { $sum: 1 },
      vitesseMin:      { $min: "$vitesseNoeuds" },
      vitesseMax:      { $max: "$vitesseNoeuds" },
      vitesseMoyenne:  { $avg: "$vitesseNoeuds" },
      carburantFin:    { $last: "$carburantPourcent" },
      // Dans le seau, on ne garde que l'essentiel : ni _id, ni navireId
      // repete, ni enveloppe GeoJSON complete. Des clefs COURTES, aussi :
      // sur des millions de sous-documents, le nom des champs pese.
      releves: { $push: { t: "$horodatage", v: "$vitesseNoeuds",
                          c: "$capDegres", p: "$position.coordinates" } }
  } },
  { $project: {
      _id: 0,
      navireId: "$_id.navireId",
      debut: "$_id.debut",
      nombre: 1, vitesseMin: 1, vitesseMax: 1, carburantFin: 1,
      vitesseMoyenne: { $round: ["$vitesseMoyenne", 2] },
      releves: 1
  } },
  { $merge: { into: "ex_seaux", whenMatched: "replace", whenNotMatched: "insert" } }
]).toArray();

base.ex_seaux.createIndex({ navireId: 1, debut: 1 }, { name: "idx_seau" });
l("seaux crees :", String(base.ex_seaux.countDocuments()));

etape(3, "la comparaison");
const apres = stats("ex_seaux");
print("");
l("                  ", "PLAT".padStart(10), "SEAUX".padStart(10), "FACTEUR".padStart(9));
l("documents         ", String(avant.count).padStart(10), String(apres.count).padStart(10),
  (avant.count / apres.count).toFixed(1).padStart(8) + "x");
l("donnees (Ko)      ", String(Math.round(avant.size / 1024)).padStart(10),
  String(Math.round(apres.size / 1024)).padStart(10),
  (avant.size / apres.size).toFixed(1).padStart(8) + "x");
l("index (Ko)        ", String(Math.round(avant.totalIndexSize / 1024)).padStart(10),
  String(Math.round(apres.totalIndexSize / 1024)).padStart(10),
  (avant.totalIndexSize / apres.totalIndexSize).toFixed(1).padStart(8) + "x");
print("\n  Le gain le plus fort est sur les INDEX : il y a 140 fois moins");
print("  d'entrees a indexer. C'est souvent la vraie motivation du bucket -");
print("  ce sont les index qui doivent tenir en RAM, pas les donnees.");

etape(4, "la vitesse moyenne d'un jour");
const nav = base.journauxBord.findOne().navireId;
const J1 = ISODate("2026-07-12T00:00:00Z"), J2 = ISODate("2026-07-13T00:00:00Z");

print("\n  Modele PLAT : il faut agreger.");
const plat = base.journauxBord.explain("executionStats").aggregate([
  { $match: { navireId: nav, horodatage: { $gte: J1, $lt: J2 } } },
  { $group: { _id: null, moyenne: { $avg: "$vitesseNoeuds" } } }
]);
const statsPlat = plat.stages ? plat.stages[0].$cursor.executionStats : plat.executionStats;
l("  docs examines :", String(statsPlat.totalDocsExamined),
  "| plan :", chaine(statsPlat.executionStages));
base.journauxBord.aggregate([
  { $match: { navireId: nav, horodatage: { $gte: J1, $lt: J2 } } },
  { $group: { _id: null, moyenne: { $avg: "$vitesseNoeuds" }, n: { $sum: 1 } } }
]).forEach(function (r) { l("  moyenne :", r.moyenne.toFixed(2) + " nd sur " + r.n + " releves"); });

print("\n  Modele SEAUX : la moyenne horaire est DEJA calculee.");
base.ex_seaux.aggregate([
  { $match: { navireId: nav, debut: { $gte: J1, $lt: J2 } } },
  // Moyenne PONDEREE par le nombre de releves de chaque seau : une moyenne
  // de moyennes serait fausse si les seaux n'ont pas la meme taille.
  { $group: { _id: null,
              somme: { $sum: { $multiply: ["$vitesseMoyenne", "$nombre"] } },
              n: { $sum: "$nombre" }, seaux: { $sum: 1 } } },
  { $project: { _id: 0, moyenne: { $round: [{ $divide: ["$somme", "$n"] }, 2] }, n: 1, seaux: 1 } }
]).forEach(function (r) {
  l("  moyenne :", r.moyenne + " nd sur " + r.n + " releves, lus dans " + r.seaux + " documents");
});
print("\n  Meme resultat, 24 documents lus au lieu de ~96.");
print("  LE PIEGE : $avg sur vitesseMoyenne donnerait une moyenne de moyennes.");
print("  Elle n'est juste que si tous les seaux ont le meme nombre de releves.");

etape(5, "le releve exact");
print("\n  Modele PLAT : trivial.");
print("    db.journauxBord.findOne({ navireId: X, horodatage: T })");
print("\n  Modele SEAUX : il faut deballer.");
print("    db.ex_seaux.aggregate([");
print("      { $match: { navireId: X, debut: <heure de T> } },");
print("      { $unwind: '$releves' },");
print("      { $match: { 'releves.t': T } } ])");
print("");
print("  Le modele plat gagne, et c'est ATTENDU : le bucket optimise la");
print("  lecture PAR PLAGE, pas la lecture unitaire. Un pattern qui n'a que");
print("  des avantages n'est pas un pattern, c'est une amelioration.");

etape(6, "la limite d'un seau");
const unSeau = base.ex_seaux.findOne();
const octetsSeau = bsonsize(unSeau);
const octetsParReleve = Math.round((octetsSeau - 120) / unSeau.nombre);
print("");
l("taille d'un seau         :", octetsSeau + " octets pour " + unSeau.nombre + " releves");
l("cout marginal d'un releve:", "~" + octetsParReleve + " octets");
l("limite MongoDB           :", "16 777 216 octets par document");
l("releves maximum          :", "~" + Math.floor(16777216 / octetsParReleve).toLocaleString("en-US"));
print("");
print("  Largement de quoi tenir une heure. PAS de quoi tenir un an.");
print("  Depasser la limite provoque une erreur BSONObjectTooLarge a");
print("  l'ecriture - donc en pleine production, sur le chemin d'insertion.");
print("");
print("  Un seau doit TOUJOURS etre borne : par duree (une heure), par nombre");
print("  (200 releves), ou les deux. Le premier des deux atteint ferme le seau");
print("  et en ouvre un nouveau.");

// =============================================================================
print("\n\n===== PARTIE 2 - OUTLIER " + "=".repeat(45));
// =============================================================================

etape(7, "le navire amiral qui remonte 720 releves par heure");
const amiral = base.navires.findOne({ etiquettes: "amiral" }) || base.navires.findOne();
const debutGeant = ISODate("2026-07-12T10:00:00Z");
const geant = { navireId: amiral._id, debut: debutGeant, nombre: 720,
                vitesseMin: 8, vitesseMax: 28, vitesseMoyenne: 18.4, carburantFin: 61.2,
                releves: Array.from({ length: 720 }, function (_, i) {
                  return { t: new Date(debutGeant.getTime() + i * 5000),
                           v: 18 + (i % 20) / 10, c: (i * 3) % 360, p: [5.9, 43.1] }; }) };
base.ex_seaux.insertOne(geant);
l("navire :", amiral.nom);
l("seau normal :", unSeau.nombre + " releves, " + octetsSeau + " octets");
l("seau geant  :", "720 releves, " + bsonsize(geant) + " octets");
l("rapport     :", Math.round(bsonsize(geant) / octetsSeau) + "x");

etape(8, "degrade-t-il les AUTRES navires ?");
const autre = base.navires.findOne({ _id: { $ne: amiral._id } });
function mesurerSeaux(libelle, filtre) {
  const e = base.ex_seaux.find(filtre).explain("executionStats").executionStats;
  l("  " + libelle.padEnd(30), String(e.nReturned).padStart(4) + " seaux",
    String(e.totalDocsExamined).padStart(4) + " lus", e.executionTimeMillis + " ms");
}
print("");
mesurerSeaux("requete sur un autre navire", { navireId: autre._id });
mesurerSeaux("requete sur l'amiral", { navireId: amiral._id });
print("\n  L'index isole correctement : une requete ciblee sur un AUTRE navire");
print("  n'examine pas le seau geant. Le plan est intact.");
print("");
print("  Mais deux choses se degradent quand meme, et elles ne se voient pas");
print("  dans explain() :");
print("    - le WORKING SET : ce seul document occupe en RAM la place de " +
      Math.round(bsonsize(geant) / octetsSeau) + " seaux,");
print("      evincant d'autant les donnees des autres navires ;");
print("    - tout balayage non cible (statistiques, export, sauvegarde) le lit");
print("      integralement.");

etape(9, "le pattern OUTLIER");
print("");
print("  PRINCIPE : la majorite des documents suit un profil. Une infime");
print("  minorite le fait exploser. On ne dimensionne PAS le modele pour la");
print("  minorite - on la traite a part.");
print("");
print("  MISE EN OEUVRE :");
print("    1. borner le seau (ici : 200 releves) ;");
print("    2. au-dela, poser un drapeau sur le seau principal ;");
print("    3. deporter le surplus dans des documents de continuation.");
print("");

base.ex_seaux.deleteOne({ navireId: amiral._id, debut: debutGeant });
const PLAFOND = 200;
const principal = { navireId: amiral._id, debut: debutGeant, nombre: PLAFOND,
                    vitesseMin: 8, vitesseMax: 28, vitesseMoyenne: 18.4,
                    carburantFin: 61.2, debordement: true,
                    nombreTotal: 720, suites: 3,
                    releves: geant.releves.slice(0, PLAFOND) };
base.ex_seaux.insertOne(principal);
for (let i = 1; i <= 3; i++) {
  base.ex_seaux.insertOne({
    navireId: amiral._id, debut: debutGeant, suite: i, estSuite: true,
    releves: geant.releves.slice(i * PLAFOND, (i + 1) * PLAFOND) });
}
l("seau principal :", bsonsize(principal) + " octets, drapeau debordement");
l("documents de suite :", String(base.ex_seaux.countDocuments({ navireId: amiral._id, estSuite: true })));

print("\n  Ce que cela change pour le code :");
print("");
print("    // 99 % des lectures - inchangees, et elles ignorent le drapeau");
print("    db.ex_seaux.find({ navireId: X, estSuite: { $ne: true } })");
print("");
print("    // 1 % des lectures - seul ce chemin paie le cout");
print("    if (seau.debordement) { /* aller chercher les suites */ }");
print("");
print("  LA REGLE : on optimise pour le cas MAJORITAIRE, et on rend le cas");
print("  extreme possible mais plus couteux. L'inverse - dimensionner tout le");
print("  modele pour le pire cas - penalise 99 % du trafic pour 1 % des");
print("  documents.");

// -----------------------------------------------------------------------------
print("\n--- Pour aller plus loin " + "-".repeat(36));
print("");
print("  Tu viens de reimplementer a la main une collection TIME SERIES :");
print("  regroupement automatique en seaux, agregats de fenetre, compression");
print("  colonne. MongoDB le fait pour toi depuis la version 5.0.");
print("");
print("  Le projet ne l'utilise pas - voir docker/mongo-init/02-collections.js.");
print("  La raison est PEDAGOGIQUE : explain() compterait des seaux et non des");
print("  documents, ce qui rendrait la demonstration COLLSCAN vs IXSCAN du J3");
print("  illisible. En production reelle, journauxBord serait une time series");
print("  sans hesitation.");
print("");
print("  LA VRAIE QUESTION DE PRODUCTION :");
print("");
print("  Ce qui pese le plus lourd n'est PAS le gain de place - il est acquis.");
print("  C'est la MUTABILITE. Un releve faux (capteur derive, horloge");
print("  desynchronisee) doit pouvoir etre corrige ou requalifie.");
print("");
print("  Si c'est exceptionnel : supprimer et reinserer le seau suffit.");
print("  Si c'est hebdomadaire : le bucket devient un handicap, et le modele");
print("  plat - malgre son cout - reste le bon choix.");
print("");
print("  Le volume ne decide pas seul. L'usage decide.");

print("\n--- Nettoyage " + "-".repeat(47));
base.ex_seaux.drop();
print("  ex_seaux supprimee, journauxBord intacte : " +
      base.journauxBord.countDocuments() + " documents");
