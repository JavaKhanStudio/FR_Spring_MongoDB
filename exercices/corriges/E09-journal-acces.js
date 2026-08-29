// =============================================================================
// CORRIGE E09 - Le journal d'acces
// Prerequis : make charger F=exercices/corriges/E09-amorce.js
// =============================================================================
const base = db.getSiblingDB("amiraute");
function etape(n, t) { print("\n--- " + n + ". " + t + " " + "-".repeat(Math.max(0, 50 - t.length))); }
function l() { print("  " + Array.prototype.slice.call(arguments).join("  ")); }

if (base.ex_acces.countDocuments() === 0) {
  print("ex_acces est vide. Jouer d'abord E09-amorce.js");
  quit(1);
}

etape(1, "$dateTrunc : regrouper par heure");
const parHeure = base.ex_acces.aggregate([
  { $group: {
      // $dateTrunc est plus sur que $dateToString : il rend une DATE, donc
      // le tri chronologique est exact, sans dependre du format textuel.
      _id: { $dateTrunc: { date: "$horodatage", unit: "hour" } },
      n: { $sum: 1 }
  } },
  { $sort: { _id: 1 } }
]).toArray();

l("lignes :", String(parHeure.length), "(attendu 168 = 7 jours x 24 h)");
print("\n  Six premieres heures :");
parHeure.slice(0, 6).forEach(function (h) {
  l("  " + h._id.toISOString().slice(0, 16).replace("T", " "), String(h.n).padStart(5));
});
const pic = parHeure.reduce(function (a, b) { return b.n > a.n ? b : a; });
l("\n  heure de pic :", pic._id.toISOString().slice(0, 16).replace("T", " "), String(pic.n));

etape(2, "$bucket sur les familles de statut");
base.ex_acces.aggregate([
  { $bucket: {
      groupBy: "$codeStatut",
      boundaries: [200, 300, 400, 500, 600],
      default: "autre",
      output: { n: { $sum: 1 }, codes: { $addToSet: "$codeStatut" } }
  } }
]).forEach(function (b) {
  l((b._id + "xx").toString().padEnd(8), String(b.n).padStart(7),
    "codes : " + (Array.isArray(b.codes) ? b.codes.sort().join(", ") : ""));
});
print("\n  boundaries est INCLUSIF a gauche, EXCLUSIF a droite : [200, 300).");
print("  Il faut donc une borne finale (600) au-dela de la derniere valeur.");

etape(3, "$bucket sur les temps de reponse");
base.ex_acces.aggregate([
  { $bucket: {
      groupBy: "$dureeMs",
      boundaries: [0, 50, 200, 1000, 100000],
      default: "hors bornes",
      output: { n: { $sum: 1 }, chemins: { $push: "$chemin" } }
  } },
  // Le chemin le plus frequent de chaque tranche, calcule apres coup.
  { $project: { n: 1, chemins: 1 } }
]).forEach(function (b) {
  const compte = {};
  b.chemins.forEach(function (c) { compte[c] = (compte[c] || 0) + 1; });
  const top = Object.keys(compte).sort(function (a, c) { return compte[c] - compte[a]; })[0];
  l(("a partir de " + b._id + " ms").padEnd(24), String(b.n).padStart(7),
    "dominant : " + top);
});
print("\n  Attention : $push accumule TOUS les chemins en memoire. Sur 150 000");
print("  documents cela passe, sur 50 millions non. La forme propre serait un");
print("  $group par (tranche, chemin) suivi d'un $sort + $group top-1.");

etape(4, "$group + $match apres agregation");
base.ex_acces.aggregate([
  { $group: { _id: "$chemin", appels: { $sum: 1 },
              dureeMoyenne: { $avg: "$dureeMs" }, dureeMax: { $max: "$dureeMs" } } },
  // Ce $match porte sur un champ CALCULE : il ne peut pas etre remonte avant
  // le $group, ni utiliser d'index. C'est normal et inevitable ici.
  { $match: { appels: { $gte: 500 } } },
  { $project: { _id: 0, chemin: "$_id", appels: 1, dureeMax: 1,
                dureeMoyenne: { $round: ["$dureeMoyenne", 0] } } },
  { $sort: { dureeMoyenne: -1 } },
  { $limit: 5 }
]).forEach(function (r) {
  l(r.chemin.padEnd(20), String(r.dureeMoyenne).padStart(6) + " ms moy",
    String(r.dureeMax).padStart(6) + " ms max", String(r.appels).padStart(7) + " appels");
});

etape(5, "taux d'erreur : $cond dans un $sum");
base.ex_acces.aggregate([
  { $group: {
      _id: "$chemin",
      total: { $sum: 1 },
      // $cond dans un $sum : le compteur conditionnel, motif tres courant.
      erreurs: { $sum: { $cond: [{ $gte: ["$codeStatut", 400] }, 1, 0] } }
  } },
  { $project: { _id: 0, chemin: "$_id", total: 1, erreurs: 1,
                taux: { $round: [{ $multiply: [{ $divide: ["$erreurs", "$total"] }, 100] }, 2] } } },
  { $match: { taux: { $gt: 5 } } },
  { $sort: { taux: -1 } }
]).forEach(function (r) {
  l(r.chemin.padEnd(20), String(r.taux).padStart(6) + " %",
    String(r.erreurs).padStart(6) + " / " + r.total);
});

etape(6, "fenetre de 10 minutes la plus chargee");
const fenetre = base.ex_acces.aggregate([
  { $group: {
      _id: { $dateTrunc: { date: "$horodatage", unit: "minute", binSize: 10 } },
      n: { $sum: 1 }
  } },
  { $sort: { n: -1 } },
  { $limit: 1 }
]).toArray()[0];
l("debut :", fenetre._id.toISOString().replace("T", " ").slice(0, 19),
  "|", String(fenetre.n) + " requetes");

etape(7, "volume par jour");
base.ex_acces.aggregate([
  { $group: {
      _id: { $dateTrunc: { date: "$horodatage", unit: "day" } },
      octets: { $sum: "$octets" }, requetes: { $sum: 1 }
  } },
  { $project: { _id: 0, jour: { $dateToString: { format: "%Y-%m-%d", date: "$_id" } },
                requetes: 1,
                mo: { $round: [{ $divide: ["$octets", 1048576] }, 1] } } },
  { $sort: { jour: 1 } }
]).forEach(function (r) {
  l(r.jour, String(r.requetes).padStart(7) + " req", String(r.mo).padStart(8) + " Mo");
});

// -----------------------------------------------------------------------------
print("\n--- Pour aller plus loin " + "-".repeat(38));
print("");
print("  Deux facons d'arrondir a la tranche de 10 minutes :");
print("");
print("  a) $dateTrunc  { unit: 'minute', binSize: 10 }");
print("     Lisible, et surtout : il accepte un parametre timezone.");
print("       { date: '$horodatage', unit: 'day', timezone: 'Europe/Paris' }");
print("     Les journees sont alors decoupees a minuit HEURE LOCALE, en tenant");
print("     compte du passage a l'heure d'ete.");
print("");
print("  b) Arithmetique sur la date :");
print("       $toDate: { $subtract: [ { $toLong: '$horodatage' },");
print("                               { $mod: [ { $toLong: '$horodatage' }, 600000 ] } ] }");
print("     Fonctionne, mais raisonne en millisecondes depuis l'epoque : donc");
print("     TOUJOURS en UTC. Un decoupage 'par jour' construit ainsi sera faux");
print("     de deux heures en France l'ete, et d'une heure l'hiver.");
print("");
print("  VERDICT : $dateTrunc, systematiquement. Le seul cas ou l'arithmetique");
print("  reste defendable est une tranche sous la seconde, ou $dateTrunc");
print("  n'apporte rien.");


print("\n--- Nettoyage " + "-".repeat(47));
print("  ex_acces contient 150 000 documents. La laisser en place");
print("  fausserait les mesures des autres modules ($collStats sur la base,");
print("  taille du working set). On la supprime.");
base.ex_acces.drop();
print("  ex_acces supprimee");
