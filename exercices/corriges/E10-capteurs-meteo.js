// =============================================================================
// CORRIGE E10 - Les capteurs meteo
//     make charger F=exercices/corriges/E10-capteurs-meteo.js
// =============================================================================
const base = db.getSiblingDB("amiraute");
function etape(n, t) { print("\n--- " + n + ". " + t + " " + "-".repeat(Math.max(0, 50 - t.length))); }
function l() { print("  " + Array.prototype.slice.call(arguments).join("  ")); }
function taille(nom) {
  const s = base[nom].aggregate([{ $collStats: { storageStats: {} } }])
                .toArray()[0].storageStats;
  return { octets: s.storageSize, total: s.totalSize };
}

base.ex_meteo.drop();
base.ex_meteo_ordinaire.drop();

etape(1, "creation de la collection time series");
base.createCollection("ex_meteo", {
  timeseries: {
    timeField: "instant",       // l'axe temporel. OBLIGATOIRE, et immuable.
    metaField: "station",       // ce qui NE CHANGE PAS entre deux mesures.
    granularity: "minutes"      // frequence d'echantillonnage attendue.
  }
});
print("");
print("  timeField   : 'instant'");
print("    Le seul champ obligatoire. MongoDB s'en sert pour ordonner et");
print("    decouper les buckets. Il ne peut jamais etre modifie.");
print("");
print("  metaField   : 'station'");
print("    C'est la CLE DE REGROUPEMENT. Toutes les mesures partageant la");
print("    meme station vont dans les memes buckets. Le sous-document entier");
print("    (code, region, altitude) n'est stocke QU'UNE FOIS par bucket au");
print("    lieu de 100 000 fois. C'est de la le gain de place.");
print("");
print("  granularity : 'minutes'");
print("    Dimensionne les buckets. Une mesure par minute -> 'minutes'.");
print("    'seconds' ferait des buckets trop nombreux, 'hours' des buckets");
print("    trop gros a relire. Se regle aussi finement avec bucketMaxSpanSeconds.");

etape(2, "generation de 100 000 mesures");
base.createCollection("ex_meteo_ordinaire");

let graine = 987654;
function alea() { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; }
function entier(a, b) { return a + Math.floor(alea() * (b - a + 1)); }

const REGIONS = ["PACA", "Bretagne", "Alsace", "Occitanie", "Normandie"];
const STATIONS = [];
for (let i = 1; i <= 40; i++) {
  STATIONS.push({ code: "ST-" + String(i).padStart(3, "0"),
                  region: REGIONS[i % REGIONS.length],
                  altitude: entier(5, 1800) });
}

const CIBLE = 100000;
const PAR_STATION = Math.floor(CIBLE / STATIONS.length);
const DEBUT = Date.UTC(2026, 6, 1, 0, 0, 0);
const PAS = Math.floor((30 * 24 * 3600 * 1000) / PAR_STATION);

let lot = [];
STATIONS.forEach(function (st) {
  let temp = 18 + alea() * 10 - st.altitude / 250;
  for (let i = 0; i < PAR_STATION; i++) {
    temp += (alea() - 0.5) * 0.4;
    lot.push({
      instant: new Date(DEBUT + i * PAS),
      station: st,
      temperature: Math.round(temp * 10) / 10,
      humidite: entier(20, 95),
      pressionHpa: Math.round((990 + alea() * 40) * 10) / 10,
      ventKmh: Math.round(alea() * 90 * 10) / 10
    });
    if (lot.length >= 5000) {
      base.ex_meteo.insertMany(lot, { ordered: false });
      base.ex_meteo_ordinaire.insertMany(lot, { ordered: false });
      lot = [];
    }
  }
});
if (lot.length) {
  base.ex_meteo.insertMany(lot, { ordered: false });
  base.ex_meteo_ordinaire.insertMany(lot, { ordered: false });
}
l("time series :", String(base.ex_meteo.countDocuments()), "mesures");
l("ordinaire   :", String(base.ex_meteo_ordinaire.countDocuments()), "mesures");

etape(3, "taille sur disque : le gain reel");
const ts = taille("ex_meteo"), ord = taille("ex_meteo_ordinaire");
l("time series :", String(Math.round(ts.octets / 1024)).padStart(8) + " Ko");
l("ordinaire   :", String(Math.round(ord.octets / 1024)).padStart(8) + " Ko");
l("facteur     :", (ord.octets / ts.octets).toFixed(1) + " x");
print("\n  Le gain vient de deux mecanismes :");
print("    - le metaField n'est stocke qu'une fois par bucket ;");
print("    - les mesures sont stockees en COLONNES a l'interieur du bucket,");
print("      ce qui se compresse bien mieux que des documents independants.");

etape(4, "explain sur une time series");
const parJour = [
  { $match: { "station.code": "ST-014" } },
  { $group: { _id: { $dateTrunc: { date: "$instant", unit: "day" } },
              tempMoyenne: { $avg: "$temperature" }, n: { $sum: 1 } } },
  { $sort: { _id: 1 } },
  { $limit: 5 }
];
base.ex_meteo.aggregate(parJour).forEach(function (r) {
  l(r._id.toISOString().slice(0, 10), r.tempMoyenne.toFixed(1) + " C",
    String(r.n).padStart(5) + " mesures");
});

const plan = base.ex_meteo.explain().aggregate(parJour);
const deballage = JSON.stringify(plan).indexOf("$_internalUnpackBucket") >= 0;
print("\n  Le plan contient :");
print(deballage
      ? "    $_internalUnpackBucket  <- l'etape qui deballe les buckets"
      : "    (aucune etape de deballage visible a ce niveau de verbosite)");
print("");
print("  CE QUI CHANGE : la collection que l'on interroge est une VUE. Les");
print("  documents physiques sont des buckets, et MongoDB les deballe a la");
print("  volee. totalDocsExamined compte donc des BUCKETS, pas des mesures :");
print("  il n'est plus comparable a celui d'une collection ordinaire.");
print("  C'est precisement pour cela que journauxBord n'en est pas une.");

etape(5, "index secondaires : ce qui passe et ce qui ne passe pas");
base.ex_meteo.createIndex({ "station.code": 1, instant: 1 }, { name: "idx_station_temps" });
l("OK  ", "{ 'station.code': 1, instant: 1 }   metaField + timeField");

base.ex_meteo.createIndex({ "station.region": 1 }, { name: "idx_region" });
l("OK  ", "{ 'station.region': 1 }             sous-champ du metaField");

try {
  base.ex_meteo.createIndex({ "station.code": 1 }, { unique: true, name: "idx_ko" });
  l("??? ", "index unique accepte - inattendu");
} catch (e) {
  l("REFUSE", "index unique                     -> " + (e.codeName || e.code));
}
print("\n  Regle : on indexe le metaField et le timeField. Les champs de MESURE");
print("  (temperature) sont indexables depuis MongoDB 6.3, mais l'unicite ne");
print("  l'est jamais - un bucket contient plusieurs mesures, la notion de");
print("  document unique n'a plus de sens.");

etape(6, "TTL sur une time series");
base.runCommand({ collMod: "ex_meteo", expireAfterSeconds: 90 * 24 * 3600 });
const options = base.getCollectionInfos({ name: "ex_meteo" })[0].options;
l("expireAfterSeconds :", String(options.expireAfterSeconds), "(90 jours)");
print("\n  LA DIFFERENCE avec un TTL ordinaire :");
print("");
print("    collection ordinaire :");
print("      db.col.createIndex({ date: 1 }, { expireAfterSeconds: 7776000 })");
print("      -> c'est un INDEX qui porte l'expiration, document par document.");
print("");
print("    time series :");
print("      db.runCommand({ collMod: 'ex_meteo', expireAfterSeconds: 7776000 })");
print("      -> c'est une OPTION DE COLLECTION. MongoDB supprime des BUCKETS");
print("         entiers, quand le bucket le plus recent a expire.");
print("");
print("  Consequence : la purge est bien plus efficace (on jette un bloc au");
print("  lieu de N documents), mais moins precise - une mesure peut survivre");
print("  un peu au-dela des 90 jours, si son bucket contient plus recent.");

etape(7, "mutabilite : les limites");
const une = base.ex_meteo.findOne();
try {
  base.ex_meteo.updateOne({ _id: une._id }, { $set: { temperature: 99 } });
  l("OK    ", "update d'un champ de mesure accepte (MongoDB 5.0+)");
} catch (e) {
  l("REFUSE", "updateOne -> " + (e.codeName || e.code));
}
try {
  base.ex_meteo.updateOne({ _id: une._id }, { $set: { instant: new Date() } });
  l("??? ", "modification du timeField acceptee - inattendu");
} catch (e) {
  l("REFUSE", "modifier le timeField -> " + (e.codeName || e.code));
}
try {
  base.ex_meteo.deleteOne({ _id: une._id });
  l("OK    ", "deleteOne accepte");
} catch (e) {
  l("REFUSE", "deleteOne -> " + (e.codeName || e.code));
}
const supprimes = base.ex_meteo.deleteMany({ "station.code": "ST-040" }).deletedCount;
l("OK    ", "deleteMany sur le metaField -> " + supprimes + " mesures");

print("\n  Le contrat d'une time series : on ECRIT beaucoup, on LIT par plage,");
print("  on ne CORRIGE quasiment jamais. Si le metier impose de corriger des");
print("  mesures a posteriori, ce n'est pas le bon type de collection.");

// -----------------------------------------------------------------------------
print("\n--- Pour aller plus loin " + "-".repeat(38));
print("");
print("  journauxBord aurait pu etre une time series : horodatage + navireId,");
print("  100 000 documents, jamais corriges. Le cas est parfait.");
print("");
print("  La raison du refus, dans docker/mongo-init/02-collections.js :");
print("  une time series change la sortie d'explain(). On n'y voit plus des");
print("  documents mais des buckets, et la demonstration COLLSCAN vs IXSCAN");
print("  du module Performance devient illisible.");
print("");
print("  C'est un arbitrage PEDAGOGIQUE, pas technique. En production reelle,");
print("  journauxBord serait une time series - sans hesitation.");
print("");
print("  Quelle contrainte pese le plus lourd dans un vrai suivi de flotte ?");
print("  La mutabilite. Un releve de telemetrie faux (capteur derive, horloge");
print("  desynchronisee) doit pouvoir etre corrige ou requalifie. Si c'est");
print("  frequent, la time series devient un handicap. Si c'est exceptionnel,");
print("  supprimer et reinserer le bucket suffit.");

print("\n--- Nettoyage " + "-".repeat(49));
base.ex_meteo.drop();
base.ex_meteo_ordinaire.drop();
print("  collections ex_meteo* supprimees");
