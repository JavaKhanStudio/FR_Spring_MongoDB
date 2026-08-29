// =============================================================================
// CORRIGE E06 - Accelerer le journal de bord
// Prerequis : rejouer 00b-generer-volume.js pour repartir sans index.
// =============================================================================
const base = db.getSiblingDB("amiraute");
function etape(n, t) { print("\n--- " + n + ". " + t + " " + "-".repeat(Math.max(0, 50 - t.length))); }

function chaine(st) { const l = []; while (st) { l.push(st.stage); st = st.inputStage; } return l.join(" <- "); }
function mesurer(libelle, filtre, tri, projection) {
  let c = base.journauxBord.find(filtre, projection || {});
  if (tri) { c = c.sort(tri); }
  const e = c.explain("executionStats").executionStats;
  print("  " + libelle.padEnd(30) +
        String(e.nReturned).padStart(6) + " rendus" +
        String(e.totalDocsExamined).padStart(8) + " docs" +
        String(e.totalKeysExamined).padStart(8) + " cles" +
        String(e.executionTimeMillis).padStart(6) + " ms  " + chaine(e.executionStages));
  return e;
}

const NAVIRE = base.navires.findOne({ numeroCoque: "R91", nation: "France" })._id;
const D1 = ISODate("2026-07-10T00:00:00Z"), D2 = ISODate("2026-07-13T00:00:00Z");
const FENETRE = { navireId: NAVIRE, horodatage: { $gte: D1, $lt: D2 } };

print("index au depart : " + base.journauxBord.getIndexes()
        .map(function (i) { return i.name; }).join(", "));

etape(1, "sans index");
const sansIndex = mesurer("COLLSCAN", { navireId: NAVIRE });

etape(2, "index simple");
base.journauxBord.createIndex({ navireId: 1 }, { name: "idx_navire" });
const avecIndex = mesurer("IXSCAN", { navireId: NAVIRE });
print("\n  docs examines : " + sansIndex.totalDocsExamined + " -> " + avecIndex.totalDocsExamined);
print("  facteur : " + Math.round(sansIndex.totalDocsExamined / avecIndex.totalDocsExamined) + " x");

etape(3, "fenetre temporelle + tri");
const avecSort = mesurer("idx_navire seul", FENETRE, { horodatage: 1 });
print("\n  plan : " + chaine(avecSort.executionStages));
print("  -> l'etape SORT est presente : MongoDB trie EN MEMOIRE apres coup.");
print("     Limite dure de 100 Mo : ce plan casse quand le volume grandit.");

etape(4, "index compose, regle ESR");
base.journauxBord.createIndex({ navireId: 1, horodatage: 1 }, { name: "idx_navire_temps" });
const compose = mesurer("idx_navire_temps", FENETRE, { horodatage: 1 });
print("\n  plan : " + chaine(compose.executionStages));
print("  -> plus de SORT : l'index rend les documents deja tries.");
print("");
print("  REGLE ESR - l'ordre des cles suit :");
print("    E galite  navireId    teste par egalite, donc en premier");
print("    S ort     horodatage  le champ du tri");
print("    R ange    horodatage  ici le meme champ sert aussi d'intervalle");
print("");
print("  L'ordre inverse { horodatage: 1, navireId: 1 } forcerait a parcourir");
print("  tout l'intervalle de temps, TOUS navires confondus, avant de filtrer.");
base.journauxBord.createIndex({ horodatage: 1, navireId: 1 }, { name: "idx_inverse" });
base.journauxBord.hideIndex("idx_navire_temps");
mesurer("ordre inverse", FENETRE, { horodatage: 1 });
base.journauxBord.unhideIndex("idx_navire_temps");
base.journauxBord.dropIndex("idx_inverse");

etape(5, "le prefixe rend idx_navire redondant");
mesurer("navireId seul", { navireId: NAVIRE });
print("  -> sert par idx_navire_temps, dont { navireId } est le PREFIXE.");
base.journauxBord.dropIndex("idx_navire");
print("  idx_navire supprime : un index de trop coute a chaque ecriture.");

etape(6, "index couvrant");
mesurer("projection hors index", FENETRE, null, { _id: 0, vitesseNoeuds: 1 });
mesurer("projection dans l'index", FENETRE, null, { _id: 0, horodatage: 1 });
print("\n  La seconde lit 0 document : PROJECTION_COVERED.");
print("  Contrainte : il faut exclure _id, qui n'est pas dans l'index.");
mesurer("avec _id", FENETRE, null, { horodatage: 1 });
print("  -> avec _id, il faut aller chercher le document : FETCH revient.");

etape(7, "index partiel");
const avarie = { evenement: "AVARIE_MINEURE" };
print("  releves porteurs d'un evenement : " +
      base.journauxBord.countDocuments({ evenement: { $exists: true } }) + " sur 100 000\n");
mesurer("sans index", avarie);
base.journauxBord.createIndex(
  { evenement: 1, horodatage: -1 },
  { name: "idx_evenement_partiel",
    partialFilterExpression: { evenement: { $exists: true } } });
mesurer("index partiel", avarie);

const tailles = base.journauxBord
  .aggregate([{ $collStats: { storageStats: {} } }]).toArray()[0].storageStats.indexSizes;
print("\n  Taille des index :");
Object.keys(tailles).forEach(function (n) {
  print("    " + n.padEnd(26) + String(Math.round(tailles[n] / 1024)).padStart(7) + " Ko");
});
print("\n  L'index partiel contient ~250 entrees, l'autre 100 000.");
print("  Meme service rendu, une fraction du cout en RAM et a l'ecriture.");

// -----------------------------------------------------------------------------
print("\n--- Pour aller plus loin " + "-".repeat(38));
print("");
print("  Quatre filtres partiels, la MEME requete { evenement: 'AVARIE_MINEURE' } :");
print("");

const CANDIDATS = [
  ["$exists: true",   { evenement: { $exists: true } }],
  ["$gt: ''",         { evenement: { $gt: "" } }],
  ["$type: 'string'", { evenement: { $type: "string" } }],
  ["$ne: null",       { evenement: { $ne: null } }]
];

try { base.journauxBord.dropIndex("idx_evenement_partiel"); } catch (e) {}
CANDIDATS.forEach(function (c) {
  try {
    base.journauxBord.createIndex({ evenement: 1, horodatage: -1 },
      { name: "idx_essai", partialFilterExpression: c[1] });
    const e = base.journauxBord.find(avarie).explain("executionStats").executionStats;
    print("  " + c[0].padEnd(18) + chaine(e.executionStages).padEnd(20) +
          String(e.totalDocsExamined).padStart(7) + " docs lus");
    base.journauxBord.dropIndex("idx_essai");
  } catch (err) {
    print("  " + c[0].padEnd(18) + "REFUSE A LA CREATION : " +
          err.message.split("::").pop().trim());
  }
});
base.journauxBord.createIndex({ evenement: 1, horodatage: -1 },
  { name: "idx_evenement_partiel", partialFilterExpression: { evenement: { $exists: true } } });

print("");
print("  LA REGLE : le planificateur n'utilise un index partiel que s'il peut");
print("  PROUVER que la requete est incluse dans partialFilterExpression.");
print("  Sa capacite de preuve est LIMITEE : il n'a pas su etablir qu'une");
print("  chaine litterale satisfait $type: 'string' - alors que c'est vrai.");
print("");
print("  Et $ne: null est refuse d'office : un partialFilterExpression");
print("  n'accepte pas $not, dont $ne est une forme.");
print("");
print("  CE QUE CELA IMPLIQUE quand on herite d'un index partiel : sa seule");
print("  existence ne garantit RIEN. Il faut verifier a l'explain() que les");
print("  requetes visees le prennent vraiment. Un index partiel inutilise est");
print("  le pire des deux mondes : il coute a l'ecriture et ne sert jamais.");
print("");
print("  MODELISATION : si le generateur ecrivait evenement: null au lieu");
print("  d'omettre le champ, le filtre { $exists: true } serait vrai pour les");
print("  100 000 documents. L'index serait utilise, mais il ne serait plus");
print("  PARTIEL - juste un index ordinaire deguise.");
print("  Absent et null ne sont pas interchangeables, et c'est ici que cela");
print("  se paie.");
