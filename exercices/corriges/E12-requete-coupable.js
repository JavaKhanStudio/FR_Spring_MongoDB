// =============================================================================
// CORRIGE E12 - La requete coupable
//     make charger F=exercices/corriges/E12-requete-coupable.js
// Prerequis : 00, 00b et 04-index.js joues.
// =============================================================================
const base = db.getSiblingDB("amiraute");
const admin = db.getSiblingDB("admin");
function phase(t) { print("\n=== " + t + " " + "=".repeat(Math.max(0, 58 - t.length))); }
function etape(n, t) { print("\n--- " + n + ". " + t + " " + "-".repeat(Math.max(0, 48 - t.length))); }
function l() { print("  " + Array.prototype.slice.call(arguments).join("  ")); }
function chaine(st) { const c = []; while (st) { c.push(st.stage); st = st.inputStage; } return c.join(" <- "); }

// =============================================================================
phase("PHASE 1 - TROUVER");
// =============================================================================

etape(1, "activer le profileur");
base.setProfilingLevel(1, { slowms: 20 });
l("niveau 1, seuil 20 ms");

// On NE VIDE PAS system.profile.
//
// D'abord parce que c'est une collection PLAFONNEE : elle roule toute seule,
// il n'y a rien a nettoyer.
//
// Ensuite parce qu'un drop() sur une instance autonome echoue :
//     This MongoDB deployment does not support retryable writes.
// mongosh active retryWrites par defaut, et un standalone ne les supporte
// pas. Sur un replica set, la meme commande passerait. C'est le genre de
// difference entre environnements qui surprend en production.
//
// On note donc simplement l'instant de depart, et on filtre dessus.
const depuis = new Date();

etape(2, "generer du trafic, dont la requete coupable");
base.navires.find({ nation: "France" }).toArray();
base.missions.find({ statut: "EN_COURS" }).toArray();
base.journauxBord.find({ navireId: base.navires.findOne()._id }).limit(50).toArray();
base.membresEquipage.find({}).limit(100).toArray();
// Celle-ci est la coupable, mais on fait comme si on ne le savait pas.
base.journauxBord.find({}).sort({ carburantPourcent: 1 }).limit(20).toArray();
base.navires.aggregate([{ $group: { _id: "$nation", n: { $sum: 1 } } }]).toArray();
l("6 requetes jouees");

etape(3, "interroger system.profile");
print("");
const lentes = base.system.profile.find({ ns: /amiraute\./ })
                   .sort({ millis: -1 }).limit(5).toArray();
lentes.forEach(function (p) {
  l(String(p.millis).padStart(5) + " ms",
    (p.ns || "").replace("amiraute.", "").padEnd(18),
    "lus " + String(p.docsExamined || 0).padStart(7),
    "rendus " + String(p.nreturned || 0).padStart(4),
    p.planSummary || "");
});

const coupable = lentes.filter(function (p) {
  return (p.planSummary || "").indexOf("COLLSCAN") >= 0;
})[0] || lentes[0];

print("\n  COUPABLE IDENTIFIEE :");
l("collection :", (coupable.ns || "").replace("amiraute.", ""));
l("filtre     :", JSON.stringify((coupable.command || {}).filter || {}));
l("tri        :", JSON.stringify((coupable.command || {}).sort || {}));
l("duree      :", coupable.millis + " ms");
l("plan       :", coupable.planSummary || "?");
print("\n  planSummary est la colonne a lire en PREMIER. COLLSCAN sur une");
print("  collection de 100 000 documents, c'est le diagnostic a lui seul.");

etape(4, "la retrouver dans les logs, sans profileur");
print("");
print("  docker compose -f docker/docker-compose.yml logs mongo \\");
print("    | grep '\"Slow query\"' | tail -5");
print("");
print("  Une requete depassant slowms est ecrite dans les logs MEME si le");
print("  profileur est eteint. C'est le filet de securite en production :");
print("  les logs suffisent souvent, sans rien avoir a activer.");
print("  Champs a lire : attr.durationMillis, attr.planSummary,");
print("                  attr.docsExamined, attr.command.");

// =============================================================================
phase("PHASE 2 - COMPRENDRE");
// =============================================================================

const FILTRE = {}, TRI = { carburantPourcent: 1 };

etape(5, "explain executionStats");
const avant = base.journauxBord.find(FILTRE).sort(TRI).limit(20)
                  .explain("executionStats").executionStats;
print("");
l("rendus          :", String(avant.nReturned));
l("cles examinees  :", String(avant.totalKeysExamined));
l("docs examines   :", String(avant.totalDocsExamined));
l("duree           :", avant.executionTimeMillis + " ms");
l("plan            :", chaine(avant.executionStages));

etape(6, "le ratio");
const ratio = avant.totalDocsExamined / Math.max(1, avant.nReturned);
l("docs lus / rendus =", Math.round(ratio));
print("\n  Proche de 1  : l'index fait le travail.");
print("  Ici " + Math.round(ratio) + " : MongoDB lit toute la collection pour rendre 20 lignes.");
print("  Noter aussi totalKeysExamined = " + avant.totalKeysExamined + " : AUCUNE cle d'index");
print("  n'a ete lue. C'est la signature d'un COLLSCAN.");

etape(7, "l'etape qui coute");
print("");
print("  " + chaine(avant.executionStages));
print("");
print("  L'etape SORT est la parce qu'AUCUN index ne fournit les documents");
print("  deja tries par carburantPourcent. MongoDB doit donc les charger tous,");
print("  les trier EN MEMOIRE, puis n'en garder que 20.");
print("");
print("  Limite dure : 100 Mo de tri en memoire. Cette requete marche");
print("  aujourd'hui et tombera le jour ou journauxBord aura triple.");
print("  C'est le profil type de la requete qui passe la recette et casse");
print("  en production.");

// =============================================================================
phase("PHASE 3 - CORRIGER");
// =============================================================================

etape(8, "deux corrections, une seule bonne");
print("");
print("  PISTE A - completer l'index compose existant :");
print("    { navireId: 1, horodatage: 1, carburantPourcent: 1 }");
print("");
print("    C'EST LE PIEGE. La requete n'a AUCUN filtre sur navireId. Or un");
print("    index compose ne s'utilise qu'a partir de son PREFIXE. Sans");
print("    condition sur navireId, cet index est inaccessible.");
print("");
print("  PISTE B - un index dedie :");
print("    { carburantPourcent: 1 }");
print("");
print("    C'est la bonne. Le tri porte sur ce seul champ, sans filtre :");
print("    un index mono-champ le sert directement, et se parcourt dans");
print("    les deux sens.");
print("");
print("  Verifions que la piste A ne sert effectivement a rien :");
base.journauxBord.createIndex({ navireId: 1, horodatage: 1, carburantPourcent: 1 },
                              { name: "idx_piste_a" });
const pisteA = base.journauxBord.find(FILTRE).sort(TRI).limit(20)
                   .explain("executionStats").executionStats;
l("  piste A -> docs lus :", String(pisteA.totalDocsExamined), "| plan :", chaine(pisteA.executionStages));
print("    Inchange. L'index existe, il n'est pas utilise.");
base.journauxBord.dropIndex("idx_piste_a");

etape(9, "appliquer et remesurer");
base.journauxBord.createIndex({ carburantPourcent: 1 }, { name: "idx_carburant" });
const apres = base.journauxBord.find(FILTRE).sort(TRI).limit(20)
                  .explain("executionStats").executionStats;
print("");
l("AVANT :", String(avant.totalDocsExamined).padStart(7) + " docs",
  String(avant.executionTimeMillis).padStart(5) + " ms ", chaine(avant.executionStages));
l("APRES :", String(apres.totalDocsExamined).padStart(7) + " docs",
  String(apres.executionTimeMillis).padStart(5) + " ms ", chaine(apres.executionStages));
print("");
l("gain en documents lus :",
  Math.round(avant.totalDocsExamined / Math.max(1, apres.totalDocsExamined)) + " x");
print("\n  L'etape SORT a disparu : l'index rend les documents deja ordonnes,");
print("  et le limit(20) s'arrete apres 20 cles.");

etape(10, "verifier avec $indexStats");
base.journauxBord.find(FILTRE).sort(TRI).limit(20).toArray();
print("");
base.journauxBord.aggregate([{ $indexStats: {} }]).forEach(function (i) {
  l(i.name.padEnd(26), String(i.accesses.ops).padStart(6) + " utilisations");
});
print("\n  idx_carburant est bien sollicite. Aucun index existant n'est devenu");
print("  inutile : idx_navire_temps sert d'autres requetes, idx_evenement_partiel");
print("  aussi. On ne supprime rien.");

// =============================================================================
phase("PHASE 4 - RENDRE COMPTE");
// =============================================================================
print("");
print("  SYMPTOME  Latence signalee par un utilisateur, sans plus de detail.");
print("            Profileur : une requete a " + coupable.millis + " ms sur journauxBord.");
print("");
print("  CAUSE     Tri sur carburantPourcent, champ non indexe, sur 100 000");
print("            documents. Plan COLLSCAN + SORT en memoire :");
print("            " + avant.totalDocsExamined + " documents lus pour " + avant.nReturned + " rendus.");
print("");
print("  CORRECTIF Index simple { carburantPourcent: 1 }.");
print("            Ecarte : ajouter le champ a l'index compose existant, la");
print("            requete ne filtrant pas sur son prefixe navireId.");
print("");
print("  GAIN      docs lus " + avant.totalDocsExamined + " -> " + apres.totalDocsExamined +
      ", etape SORT supprimee du plan.");
print("");
print("  RISQUE    Un index de plus : cout a chaque insertion dans une");
print("            collection a forte ecriture. A surveiller via $indexStats ;");
print("            si l'usage tombe a zero, masquer puis supprimer.");

// =============================================================================
phase("POUR ALLER PLUS LOIN - la vraie question");
// =============================================================================
print("");
print("  A quelle question metier repond 'les 20 releves au carburant le plus");
print("  bas, tous navires et toutes dates confondus' ?");
print("");
print("  A aucune. Un releve de juillet a 12 % sur un navire ravitaille depuis");
print("  n'interesse personne. La question utile serait :");
print("");
print("    - le DERNIER releve de chaque navire, trie par carburant  ->  alerte");
print("    - les releves sous 15 % SUR LES DERNIERES 24 H            ->  incident");
print("    - la consommation d'UN navire sur une periode             ->  suivi");
print("");
print("  Ces trois requetes sont bornees, ciblees, et servies par des index");
print("  qui existent deja ou presque.");
print("");
print("  MORALE : on vient d'ajouter un index permanent, paye a chaque");
print("  ecriture, pour accelerer une requete qui n'aurait pas du exister.");
print("  Le premier reflexe face a une requete lente n'est pas 'quel index ?'");
print("  mais 'a quoi sert cette requete ?'.");
print("");
print("  Un index se justifie, il ne s'ajoute pas par reflexe.");

print("\n--- Nettoyage " + "-".repeat(49));
base.setProfilingLevel(0);
print("  profileur eteint");
print("  idx_carburant CONSERVE : la piste B reste la bonne correction");
print("  technique, meme si la vraie reponse etait de revoir la requete.");
