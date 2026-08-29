// =============================================================================
// CORRIGE E07 - Le catalogue e-commerce
// Prerequis : make charger F=exercices/corriges/E07-amorce.js
// =============================================================================
const base = db.getSiblingDB("amiraute");
function etape(n, t) { print("\n--- " + n + ". " + t + " " + "-".repeat(Math.max(0, 50 - t.length))); }
function chaine(st) { const l = []; while (st) { l.push(st.stage); st = st.inputStage; } return l.join(" <- "); }

const FILTRE = { categorie: "audio", disponible: true, prixCentimes: { $lte: 15000 } };
const TRI = { prixCentimes: 1 };

function mesurer(libelle, projection) {
  const e = base.ex_produits.find(FILTRE, projection || {}).sort(TRI).limit(24)
                .explain("executionStats").executionStats;
  print("  " + libelle.padEnd(44) +
        String(e.totalDocsExamined).padStart(8) + " docs" +
        String(e.totalKeysExamined).padStart(8) + " cles" +
        String(e.executionTimeMillis).padStart(6) + " ms  " + chaine(e.executionStages));
  return e;
}

if (base.ex_produits.countDocuments() === 0) {
  print("ex_produits est vide. Jouer d'abord E07-amorce.js");
  quit(1);
}

etape(1, "sans index");
mesurer("aucun index");

etape(2, "index naif sur le seul filtre d'egalite principal");
base.ex_produits.createIndex({ categorie: 1 }, { name: "i_naif" });
mesurer("{ categorie: 1 }");
print("\n  Le SORT est TOUJOURS la : l'index sert le filtre, pas le tri.");
print("  MongoDB remonte tous les 'audio' puis les trie en memoire.");

etape(3, "trois candidats, compares un par un");
base.ex_produits.createIndex({ categorie: 1, prixCentimes: 1, disponible: 1 }, { name: "i_cpd" });
base.ex_produits.createIndex({ categorie: 1, disponible: 1, prixCentimes: 1 }, { name: "i_cdp" });
base.ex_produits.createIndex({ prixCentimes: 1, categorie: 1, disponible: 1 }, { name: "i_pcd" });

const TOUS = ["i_naif", "i_cpd", "i_cdp", "i_pcd"];
print("");
TOUS.forEach(function (actif) {
  TOUS.forEach(function (i) { if (i !== actif) { base.ex_produits.hideIndex(i); } });
  base.ex_produits.unhideIndex(actif);
  mesurer(actif + "  " + JSON.stringify(
    base.ex_produits.getIndexes().filter(function (x) { return x.name === actif; })[0].key));
});
TOUS.forEach(function (i) { base.ex_produits.unhideIndex(i); });

etape(4, "le gagnant, et pourquoi");
print("");
print("  GAGNANT : { categorie: 1, disponible: 1, prixCentimes: 1 }");
print("");
print("  REGLE ESR appliquee a cette requete :");
print("    E galite  categorie  = 'audio'   -> en tete");
print("    E galite  disponible = true      -> en tete aussi");
print("    S ort     prixCentimes           -> ensuite");
print("    R ange    prixCentimes <= 15000  -> le meme champ, donc en queue");
print("");
print("  i_cpd (categorie, prix, disponible) : le RANGE sur prix est place");
print("    AVANT l'egalite sur disponible. Tout ce qui suit un range dans un");
print("    index compose devient inutilisable pour filtrer : disponible ne");
print("    sert plus qu'a eviter d'aller lire le document.");
print("");
print("  i_pcd (prix, categorie, disponible) : le PIRE. Un range en tete");
print("    oblige a parcourir tout l'intervalle de prix, TOUTES categories");
print("    confondues, avant de filtrer quoi que ce soit.");
print("");
print("  A retenir : un RANGE en tete d'index compose annule le benefice de");
print("  toutes les cles suivantes.");

etape(5, "rendre la requete couvrante");
mesurer("i_cdp, projection libelle+prix", { _id: 0, libelle: 1, prixCentimes: 1 });
print("  -> FETCH present : libelle n'est pas dans l'index.");

base.ex_produits.createIndex(
  { categorie: 1, disponible: 1, prixCentimes: 1, libelle: 1 }, { name: "i_couvrant" });
mesurer("i_couvrant, meme projection", { _id: 0, libelle: 1, prixCentimes: 1 });
print("\n  0 document lu : PROJECTION_COVERED.");
print("  libelle a ete ajoute EN QUEUE : il ne sert ni au filtre ni au tri,");
print("  il n'est la que pour eviter d'aller chercher le document.");
print("  Contrainte : _id doit etre exclu de la projection.");
print("  Cout : l'index grossit. A ne faire que pour une requete tres chaude.");

etape(6, "la seconde requete de la page");
function mesurer2(libelle) {
  const e = base.ex_produits.find({ marque: "Kappa" }).sort({ note: -1 }).limit(24)
                .explain("executionStats").executionStats;
  print("  " + libelle.padEnd(44) + String(e.totalDocsExamined).padStart(8) + " docs  " +
        chaine(e.executionStages));
}
mesurer2("avec les index existants");
print("  -> marque n'est PREFIXE d'aucun index existant : COLLSCAN + SORT.");

base.ex_produits.createIndex({ marque: 1, note: -1 }, { name: "i_marque_note" });
mesurer2("apres { marque: 1, note: -1 }");
print("\n  Un second index EST justifie : deux requetes majeures, deux chemins");
print("  d'acces sans prefixe commun. On ne peut pas les fusionner - il");
print("  faudrait mettre marque en tete, ce qui casserait la premiere requete.");
print("");
print("  Noter le -1 sur note : il suit le sens du tri demande. Un index");
print("  mono-champ se parcourt dans les deux sens, mais dans un index");
print("  COMPOSE le sens de chaque cle compte.");

etape(7, "menage");
["i_naif", "i_cpd", "i_pcd"].forEach(function (i) {
  base.ex_produits.dropIndex(i);
  print("  " + i + " supprime");
});
print("\n  i_naif : redondant, { categorie } est prefixe de i_cdp");
print("  i_cpd  : ordre de cles inferieur, jamais choisi par le planificateur");
print("  i_pcd  : range en tete, le pire des trois");
print("");
print("  En production on aurait masque (hideIndex) une semaine avant de");
print("  supprimer, en surveillant $indexStats.");

print("\n  Index conserves :");
base.ex_produits.getIndexes().forEach(function (i) {
  print("    " + i.name.padEnd(18) + JSON.stringify(i.key));
});

// -----------------------------------------------------------------------------
print("\n--- Pour aller plus loin " + "-".repeat(38));
print("");
print("  Ou placer un filtre facultatif 'note >= 4' ?");
print("");
print("  C'est un RANGE. Il ne peut donc pas passer devant prixCentimes, qui");
print("  porte le tri. Le seul emplacement sans degradation est la QUEUE :");
print("    { categorie: 1, disponible: 1, prixCentimes: 1, note: 1 }");
print("  La, note ne filtre pas dans l'index, mais elle evite le FETCH quand");
print("  le filtre est absent. Gain modeste, cout nul sur l'existant.");
print("");
print("  Et si les filtres facultatifs deviennent six ou sept ?");
print("");
print("  2^7 = 128 combinaisons. On n'indexe pas 128 cas. Trois strategies :");
print("    a) indexer les 3 ou 4 combinaisons REELLEMENT majoritaires,");
print("       mesurees dans les logs - pas devinees ;");
print("    b) accepter un FETCH sur les combinaisons rares, en s'assurant que");
print("       le prefixe commun (categorie) reduit deja fortement le flux ;");
print("    c) si la recherche est vraiment libre, sortir du sujet : un moteur");
print("       de recherche (Atlas Search, Elasticsearch) est fait pour ca.");
print("");
print("  C'est exactement le compromis de rechercherAvance dans AMIRAUTE :");
print("  treize criteres, deux index, et l'acceptation que les combinaisons");
print("  rares coutent plus cher.");


print("\n--- Nettoyage " + "-".repeat(47));
print("  ex_produits contient 200 000 documents. La laisser en place");
print("  fausserait les mesures des autres modules ($collStats sur la base,");
print("  taille du working set). On la supprime.");
base.ex_produits.drop();
print("  ex_produits supprimee");
