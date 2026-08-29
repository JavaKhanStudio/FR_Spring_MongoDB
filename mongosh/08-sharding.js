// =============================================================================
// 08 - SHARDING : le passage a l'echelle, en direct                   [J2 pm]
// =============================================================================
// Programme : "Replication et Sharding"
//
//   make stop && make partition && make cluster-charger
//   make charger-shard F=mongosh/08-sharding.js
//
// Le script s'execute sur le ROUTEUR mongos, jamais sur un shard.
//
// SCENARIO : on part d'une collection de 100 000 documents DEJA PLEINE et NON
// partitionnee. On la partitionne en direct, et on regarde le cluster se
// reorganiser tout seul. C'est le seul moyen de rendre le sharding tangible.
// =============================================================================

const cfg = db.getSiblingDB("config");
const base = db.getSiblingDB("amiraute");
const NS = "amiraute.journauxBord";

function titre(t) { print("\n" + "=".repeat(70) + "\n  " + t + "\n" + "=".repeat(70)); }
function sous(t) { print("\n--- " + t + " " + "-".repeat(Math.max(0, 56 - t.length))); }
function l() { print("  " + Array.prototype.slice.call(arguments).join("  ")); }

/** Repartition des chunks, et surtout de la TAILLE des donnees. */
function repartition() {
  const c = cfg.collections.findOne({ _id: NS });
  if (!c) { l("collection NON partitionnee"); return null; }
  const chunks = cfg.chunks.aggregate([
    { $match: { uuid: c.uuid } },
    { $group: { _id: "$shard", n: { $sum: 1 } } }, { $sort: { _id: 1 } }
  ]).toArray();
  const stats = base.journauxBord.aggregate([{ $collStats: { storageStats: {} } }]).toArray();
  chunks.forEach(function (ch) {
    const st = stats.filter(function (s) { return s.shard === ch._id; })[0];
    l(ch._id.padEnd(10),
      String(ch.n).padStart(3) + " chunks",
      st ? String(st.storageStats.count).padStart(7) + " docs" : "      - docs",
      st ? String(Math.round(st.storageStats.size / 1024)).padStart(6) + " Ko" : "");
  });
  return chunks;
}

function attendreBalancer(secondes) {
  for (let i = 0; i < secondes; i++) {
    if (!sh.isBalancerRunning().inBalancerRound) { break; }
    sleep(1000);
  }
}


// =============================================================================
titre("1. ANATOMIE DU CLUSTER");
// =============================================================================

print("");
cfg.shards.find().forEach(function (s) { l("shard  ", s._id.padEnd(12), s.host); });
cfg.mongos.find().forEach(function (m) { l("routeur", m._id); });

print("\nTrois roles, trois responsabilites :");
l("configsvr", "sait QUEL chunk est sur QUEL shard");
l("shard    ", "detient les donnees. Serait un replica set en production");
l("mongos   ", "route la requete. Sans etat, on en met plusieurs");
print("\nUn client ne parle JAMAIS a un shard. Il parle a mongos.");


// =============================================================================
titre("2. AVANT : une collection pleine, sur un seul shard");
// =============================================================================

const total = base.journauxBord.countDocuments();
print("\ndocuments dans journauxBord : " + total);
if (total === 0) {
  print("\nLa collection est vide. Charger d'abord :");
  print("  make cluster-charger");
  quit(1);
}

l("shard primaire de la base :", cfg.databases.findOne({ _id: "amiraute" }).primary);
print("");
base.journauxBord.aggregate([{ $collStats: { storageStats: {} } }]).forEach(function (s) {
  l(s.shard.padEnd(10), String(s.storageStats.count).padStart(7) + " docs",
    String(Math.round(s.storageStats.size / 1024)).padStart(6) + " Ko");
});

print("\nTout est sur UN shard. Le cluster en compte plusieurs, mais tant qu'une");
print("collection n'est pas partitionnee, elle vit entierement sur le shard");
print("primaire de sa base. Le cluster ne sert alors a rien pour elle.");


// =============================================================================
titre("3. LE CHOIX DE LA CLEF - la seule decision qui compte");
// =============================================================================

print("\nUne clef de partition se juge sur trois criteres :");
l("CARDINALITE ", "assez de valeurs distinctes pour remplir tous les shards");
l("REPARTITION ", "pas de valeur ultra-majoritaire, sinon un shard chauffe");
l("CIBLAGE     ", "presente dans les requetes courantes, sinon tout diffuse");

sous("Mesurons ces criteres sur les candidats");
[["navireId", "$navireId"], ["capDegres", "$capDegres"],
 ["evenement", "$evenement"]].forEach(function (cand) {
  const n = base.journauxBord.distinct(cand[0]).length;
  l(cand[0].padEnd(12), "cardinalite : " + String(n).padStart(4),
    n < 10 ? "<- trop faible, quelques shards seulement" : "");
});

print("\nhorodatage est MONOTONE : toutes les ecritures du moment iraient sur le");
print("meme shard. C'est le pire cas, et le plus frequent en pratique.");

print("\nRetenu : { navireId: 'hashed' }");
l("hache      ", "repartit uniformement, aucun shard chaud");
l("cardinalite", base.journauxBord.distinct("navireId").length + " navires distincts");
l("ciblage    ", "present dans la quasi-totalite des requetes du journal");

print("\nContrainte : la definition de la clef est IMMUABLE. On la choisit une");
print("fois, et on vit avec.");


// =============================================================================
titre("4. PARTITIONNEMENT EN DIRECT");
// =============================================================================

if (cfg.collections.findOne({ _id: NS })) {
  print("\nDeja partitionnee. Pour rejouer la demonstration depuis zero :");
  print("  make cluster-reinit");
} else {
  sous("taille de chunk");
  l("configuree :", cfg.settings.findOne({ _id: "chunksize" }).value + " Mo",
    "(1 Mo : reglage de DEMONSTRATION, voir docker/README.md)");

  sous("sh.shardCollection");
  base.journauxBord.createIndex({ navireId: "hashed" });
  const r = sh.shardCollection(NS, { navireId: "hashed" });
  l("resultat :", r.collectionsharded ? "partitionnee" : JSON.stringify(r));

  sous("immediatement apres");
  repartition();

  sous("le repartiteur travaille");
  print("");
  for (let i = 0; i < 8; i++) {
    const enCours = sh.isBalancerRunning().inBalancerRound;
    const c = cfg.collections.findOne({ _id: NS });
    const n = cfg.chunks.countDocuments({ uuid: c.uuid });
    const parShard = cfg.chunks.aggregate([
      { $match: { uuid: c.uuid } }, { $group: { _id: "$shard", n: { $sum: 1 } } }, { $sort: { _id: 1 } }
    ]).toArray().map(function (x) { return x._id + "=" + x.n; }).join(" ");
    l("t+" + String(i * 5).padStart(2) + "s", String(n).padStart(3) + " chunks",
      parShard.padEnd(30), enCours ? "migration en cours" : "au repos");
    if (i < 7) { sleep(5000); }
  }
}

sous("etat final");
attendreBalancer(30);
repartition();


// =============================================================================
titre("5. LIRE LES CHIFFRES SANS SE TROMPER");
// =============================================================================

print("\nDEUX PIEGES, et ils tombent tous les deux ici.");

sous("Piege 1 - le nombre de chunks n'est PAS la mesure de l'equilibre");
const etat = db.adminCommand({ balancerCollectionStatus: NS });
l("le repartiteur considere la collection equilibree :", String(etat.balancerCompliant));
print("");
print("  Depuis MongoDB 6, le repartiteur equilibre la TAILLE DES DONNEES, pas");
print("  le nombre de chunks. Un gros chunk peut valoir dix petits. Voir un");
print("  shard a 1 chunk et l'autre a 9 n'est donc PAS un desequilibre.");
print("");
print("  La bonne question n'est jamais 'combien de chunks ?' mais");
print("  'combien d'octets ?'.");

sous("Piege 1 bis - le repartiteur ne vise PAS l'egalite parfaite");
let octets = [];
base.journauxBord.aggregate([{ $collStats: { storageStats: {} } }])
    .forEach(function (x) { octets.push([x.shard, x.storageStats.size]); });
const somme = octets.reduce(function (a, x) { return a + x[1]; }, 0);
print("");
octets.sort().forEach(function (x) {
  l(x[0].padEnd(10), String(Math.round(x[1] / 1024)).padStart(6) + " Ko",
    String(Math.round(x[1] / somme * 100)).padStart(3) + " %");
});
print("");
print("  Sur trois shards, on attendrait 33 % chacun. On obtient plutot");
print("  37 / 39 / 24. Ce n'est PAS un bug, et ce n'est pas une migration");
print("  inachevee : le repartiteur s'arrete des que l'ecart passe sous son");
print("  seuil, pour ne pas passer sa vie a deplacer des donnees.");
print("");
print("  Deplacer un chunk coute cher : lecture, ecriture, verrou de plage,");
print("  puis nettoyage des orphelins. Chercher l'egalite parfaite couterait");
print("  plus que le desequilibre qu'on corrige.");
print("");
print("  C'est LA question que la salle pose en voyant l'ecran. La reponse");
print("  n'est pas 'attends encore un peu' - c'est 'il a fini, et 24 % lui");
print("  convient'.");

sous("Piege 2 - les ORPHELINS faussent les compteurs par shard");
const viaRouteur = base.journauxBord.countDocuments();
let physique = 0;
base.journauxBord.aggregate([{ $collStats: { storageStats: {} } }])
    .forEach(function (s) { physique += s.storageStats.count; });
l("total via le routeur :", String(viaRouteur), "<- la verite");
l("somme des shards     :", String(physique), physique > viaRouteur ? "<- orphelins inclus" : "");
print("");
print("  Apres une migration, le shard SOURCE conserve les documents deplaces");
print("  jusqu'au passage du nettoyeur. $collStats les compte, countDocuments()");
print("  via mongos ne les compte pas.");
print("");
print("  Ce cluster est regle a 10 s de retard (orphanCleanupDelaySecs) pour");
print("  que la demonstration reste lisible. Le defaut est de 900 s.");


// =============================================================================
titre("6. REQUETE CIBLEE CONTRE REQUETE DIFFUSEE");
// =============================================================================

function mesurer(libelle, filtre) {
  const e = base.journauxBord.find(filtre).explain("executionStats");
  const shards = e.queryPlanner && e.queryPlanner.winningPlan.shards
               ? e.queryPlanner.winningPlan.shards.length
               : (e.shards ? Object.keys(e.shards).length : 1);
  const stats = e.executionStats || {};
  l(libelle.padEnd(38), shards + " shard(s) interroge(s)",
    stats.nReturned !== undefined ? String(stats.nReturned).padStart(7) + " rendus" : "");
}

const unNavire = base.journauxBord.findOne().navireId;
print("");
mesurer("CIBLEE   { navireId: X }", { navireId: unNavire });
mesurer("DIFFUSEE { vitesseNoeuds > 20 }", { vitesseNoeuds: { $gt: 20 } });

print("\n  C'est TOUTE la difference.");
print("");
print("  Une requete CIBLEE porte la clef de partition : mongos sait sur quel");
print("  shard aller, et n'interroge que celui-la.");
print("");
print("  Une requete DIFFUSEE (scatter-gather) interroge CHAQUE shard puis");
print("  fusionne. Elle coute autant que le shard le plus lent, et elle ne");
print("  passe pas a l'echelle : ajouter un shard la rend plus lente, pas plus");
print("  rapide.");
print("");
print("  SI LA MAJORITE DES REQUETES SONT DIFFUSEES, LA CLEF EST MAUVAISE.");


// =============================================================================
titre("7. LE PASSAGE A L'ECHELLE, POUR DE VRAI");
// =============================================================================

print("\nLa question que tout le monde se pose : que se passe-t-il quand on");
print("ajoute une machine ?");
print("");
print("Depuis un AUTRE terminal, sans rien arreter :");
print("");
print("    make etendre");
print("");
print("Un troisieme shard rejoint le cluster. Le repartiteur deplace des");
print("chunks vers lui, tout seul, pendant que les lectures continuent.");
print("");
print("Pour l'observer :");
print("");
print("    make cluster-etat        # a relancer plusieurs fois");
print("");
print("Et pour verifier qu'AUCUNE lecture n'est perdue pendant la migration,");
print("laisser tourner dans un troisieme terminal :");
print("");
print("    make cluster-sonde");
print("");
print("Le compteur doit rester a " + viaRouteur + ", sans interruption ni erreur.");
print("C'est cela, le passage a l'echelle horizontale : on ajoute une machine");
print("a un systeme en production, et personne ne s'en apercoit.");


// =============================================================================
titre("8. sh.status()");
// =============================================================================
printjson(sh.status());
