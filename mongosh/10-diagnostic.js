// =============================================================================
// 10 - PERFORMANCE ET DIAGNOSTIC                                      [J3 pm]
// =============================================================================
// Programme : "Analyser les indicateurs et les performances" + "Lecture des logs"
//
// PROFIL : simple. Prerequis : 00, 00b et 04 joues.
//     make charger F=mongosh/10-diagnostic.js
//
// Objectif du module : savoir repondre a "c'est lent" avec des chiffres,
// pas avec des intuitions.
// =============================================================================

const base = db.getSiblingDB("amiraute");
const admin = db.getSiblingDB("admin");
function titre(t) { print("\n--- " + t + " " + "-".repeat(Math.max(0, 60 - t.length))); }
function ligne() { print("  " + Array.prototype.slice.call(arguments).join("  ")); }


// =============================================================================
titre("1. Les trois niveaux d'explain");
// =============================================================================

const requete = { navireId: base.navires.findOne({ numeroCoque: "R91", nation: "France" })._id,
                  vitesseNoeuds: { $gt: 15 } };

print("\nqueryPlanner        - quel plan serait choisi, SANS executer");
const p1 = base.journauxBord.find(requete).explain("queryPlanner");
ligne("plan retenu   :", p1.queryPlanner.winningPlan.inputStage
                          ? p1.queryPlanner.winningPlan.inputStage.stage
                          : p1.queryPlanner.winningPlan.stage);
ligne("plans rejetes :", String(p1.queryPlanner.rejectedPlans.length));

print("\nexecutionStats      - execute et mesure");
const e = base.journauxBord.find(requete).explain("executionStats").executionStats;
ligne("rendus        :", String(e.nReturned));
ligne("cles lues     :", String(e.totalKeysExamined));
ligne("docs lus      :", String(e.totalDocsExamined));
ligne("duree         :", e.executionTimeMillis + " ms");

print("\nallPlansExecution   - mesure AUSSI les plans rejetes. Le plus verbeux,");
print("                      utile quand on ne comprend pas un choix du planificateur.");

print("\nLE ratio a regarder : docs lus / rendus.");
const ratio = e.nReturned ? (e.totalDocsExamined / e.nReturned) : 0;
ligne("ici :", ratio.toFixed(1), "documents lus pour 1 rendu");
print("  proche de 1  -> l'index fait le travail");
print("  eleve        -> MongoDB filtre en memoire apres coup");
print("\nIci le ratio est > 1 : idx_navire_temps cible bien le navire, mais le");
print("filtre sur vitesseNoeuds s'applique ensuite, document par document.");


// =============================================================================
titre("2. La requete lente plantee dans le projet");
// =============================================================================

print("\nUn tri sur un champ NON indexe, sur 100 000 documents :");
const lente = base.journauxBord.find({}).sort({ carburantPourcent: 1 }).limit(20)
                  .explain("executionStats").executionStats;
ligne("docs lus :", String(lente.totalDocsExamined));
ligne("duree    :", lente.executionTimeMillis + " ms");
ligne("etape    :", lente.executionStages.stage);

print("\nSi l'etape est SORT, MongoDB a trie EN MEMOIRE. Limite dure : 100 Mo,");
print("au-dela la requete echoue (sauf allowDiskUse). Une requete qui marche");
print("en recette et tombe en production, c'est presque toujours cela.");

print("\nCorrection :");
print("  base.journauxBord.createIndex({ carburantPourcent: 1 })");
print("Puis remesurer. L'etape SORT doit disparaitre du plan.");


// =============================================================================
titre("3. Le profileur");
// =============================================================================

// niveau 0 = eteint, 1 = les requetes lentes, 2 = TOUTES (jamais en production)
base.setProfilingLevel(1, { slowms: 20 });
print("\nprofileur actif : niveau 1, seuil 20 ms");

// On genere du trafic, dont une requete volontairement mauvaise.
base.journauxBord.find({}).sort({ carburantPourcent: -1 }).limit(5).toArray();
base.journauxBord.find({ capDegres: { $gt: 180 } }).limit(50).toArray();
base.navires.find({ nation: "France" }).toArray();

print("\nRequetes retenues par le profileur :");
base.system.profile.find({ ns: /amiraute/ }).sort({ ts: -1 }).limit(5).forEach(function (p) {
  ligne(String(p.millis).padStart(5) + " ms",
        (p.op || "").padEnd(8),
        (p.ns || "").replace("amiraute.", "").padEnd(16),
        "lus " + String(p.docsExamined || 0).padStart(7),
        "rendus " + String(p.nreturned || 0).padStart(5),
        p.planSummary || "");
});

print("\nplanSummary est la colonne a lire en premier :");
ligne("COLLSCAN          ", "balayage complet : suspect des que la collection grossit");
ligne("IXSCAN { ... }    ", "index utilise, et lequel");
ligne("SORT              ", "tri en memoire : candidat a un index");

print("\nProfileur a 2 = toutes les requetes. Utile 30 secondes en recette,");
print("jamais en production : system.profile est une collection plafonnee qui");
print("tourne vite, et le cout d'ecriture n'est pas nul.");

base.setProfilingLevel(0);
print("\nprofileur eteint");


// =============================================================================
titre("4. Ce qui se passe MAINTENANT");
// =============================================================================

const enCours = admin.aggregate([
  { $currentOp: { allUsers: true, idleConnections: false } },
  { $match: { active: true, "command.$db": "amiraute" } },
  { $project: { opid: 1, secs_running: 1, op: 1, ns: 1, planSummary: 1 } }
]).toArray();

print("\noperations actives sur amiraute : " + enCours.length);
enCours.slice(0, 3).forEach(function (o) {
  ligne("opid " + o.opid, (o.op || "") + " " + (o.ns || ""),
        (o.secs_running || 0) + " s", o.planSummary || "");
});

print("\nEn cas de requete qui bloque la production :");
print("  db.adminCommand({ killOp: 1, op: <opid> })");
print("C'est le geste d'urgence. A connaitre AVANT d'en avoir besoin.");


// =============================================================================
titre("5. Indicateurs du serveur");
// =============================================================================

const s = admin.runCommand({ serverStatus: 1 });

print("\nConnexions :");
ligne("actives   :", String(s.connections.active),
      "| disponibles :", String(s.connections.available),
      "| total ouvertes :", String(s.connections.current));

print("\nCache WiredTiger :");
const c = s.wiredTiger.cache;
const utilise = c["bytes currently in the cache"];
const max = c["maximum bytes configured"];
ligne("utilise :", Math.round(utilise / 1024 / 1024) + " Mo",
      "/", Math.round(max / 1024 / 1024) + " Mo",
      "(" + Math.round(utilise / max * 100) + " %)");
print("  Au-dela de 80 %, MongoDB commence a evincer des pages : les lectures");
print("  repartent sur le disque et la latence decroche. Indicateur numero un.");

print("\nOperations depuis le demarrage :");
["insert", "query", "update", "delete", "getmore", "command"].forEach(function (k) {
  ligne(k.padEnd(10), String(s.opcounters[k]).padStart(9));
});

if (s.metrics && s.metrics.queryExecutor) {
  const q = s.metrics.queryExecutor;
  print("\nBalayages :");
  ligne("cles d'index lues  :", String(q.scanned));
  ligne("documents lus      :", String(q.scannedObjects));
  const r = q.scanned ? (q.scannedObjects / q.scanned) : 0;
  ligne("ratio docs/cles    :", r.toFixed(2), r > 3 ? " <- eleve, index a revoir" : "");
}


// =============================================================================
titre("6. Etat des collections et des index");
// =============================================================================

print("");
["navires", "missions", "membresEquipage", "journauxBord"].forEach(function (nom) {
  const st = base[nom].aggregate([{ $collStats: { storageStats: {} } }])
                 .toArray()[0].storageStats;
  ligne(nom.padEnd(18),
        String(st.count).padStart(7) + " docs",
        String(Math.round(st.size / 1024)).padStart(7) + " Ko donnees",
        String(Math.round(st.totalIndexSize / 1024)).padStart(6) + " Ko index",
        st.nindexes + " index");
});

print("\nQuand la taille des index approche celle des donnees, il y a trop");
print("d'index. Les candidats a la suppression se trouvent avec $indexStats :");
print("");
base.journauxBord.aggregate([{ $indexStats: {} }]).forEach(function (i) {
  ligne(i.name.padEnd(26), String(i.accesses.ops).padStart(6) + " utilisations",
        "depuis " + i.accesses.since.toISOString().slice(0, 16).replace("T", " "));
});


// =============================================================================
titre("7. Les logs");
// =============================================================================

print("\nDepuis la racine du projet :");
print("  docker compose -f docker/docker-compose.yml logs -f mongo");
print("");
print("Format JSON structure. Les champs qui comptent :");
ligne('"c"    ', 'composant : QUERY, WRITE, INDEX, NETWORK, REPL, STORAGE');
ligne('"s"    ', 'severite : I info, W warning, E erreur, F fatal');
ligne('"msg"  ', 'le message. "Slow query" est celui qu\'on cherche');
ligne('"attr" ', 'le detail : durationMillis, planSummary, docsExamined');

print("\nIsoler les requetes lentes dans les logs :");
print("  docker compose ... logs mongo | grep '\"Slow query\"'");
print("");
print("Une requete depassant slowms y est ecrite MEME si le profileur est");
print("eteint. C'est le filet de securite en production : les logs suffisent");
print("souvent a identifier le coupable sans rien activer.");


// =============================================================================
titre("8. La methode, en cinq gestes");
// =============================================================================

print("");
ligne("1.", "LOGS       - grep 'Slow query' : quelle requete, quelle duree");
ligne("2.", "EXPLAIN    - executionStats : quel plan, quel ratio docs/rendus");
ligne("3.", "INDEXSTATS - l'index existe-t-il, est-il utilise");
ligne("4.", "CORRIGER   - creer l'index, ou reecrire la requete, ou le modele");
ligne("5.", "REMESURER  - sans mesure apres, on ne sait pas si on a corrige");

print("\nPiege le plus courant en salle : ajouter un index a chaque requete");
print("lente. Au bout de dix index, les ECRITURES s'ecroulent et personne ne");
print("fait le lien. Un index se justifie, il ne s'ajoute pas par reflexe.");
