// =============================================================================
// 07 - REPLICATION                                                    [J2 pm]
// =============================================================================
// Programme : "Replication et Sharding"
//
// PROFIL REQUIS : replique (3 noeuds). Depuis la racine :
//     make stop && make replique
//     docker compose -f docker/docker-compose.yml exec -T mongo1 mongosh < mongosh/07-replication.js
//
// Ce script s'execute DANS le reseau Docker, sur mongo1.
// =============================================================================

function titre(t) { print("\n--- " + t + " " + "-".repeat(Math.max(0, 60 - t.length))); }
function ligne() { print("  " + Array.prototype.slice.call(arguments).join("  ")); }

const ETATS = { 1: "PRIMAIRE", 2: "SECONDAIRE", 7: "ARBITRE", 0: "DEMARRAGE",
                8: "INJOIGNABLE", 5: "RESYNCHRONISATION", 9: "RETOUR_ARRIERE" };


// =============================================================================
titre("1. Qui est qui");
// =============================================================================

const etat = rs.status();
print("\nreplica set : " + etat.set);
print("");
etat.members.forEach(function (m) {
  ligne(m.name.padEnd(18),
        (ETATS[m.state] || m.stateStr).padEnd(14),
        "sante " + m.health,
        m.optimeDate ? "a jour au " + m.optimeDate.toISOString().slice(11, 19) : "");
});

const moi = db.hello();
print("\ndb.hello() vu depuis ce noeud :");
ligne("primaire du groupe :", moi.primary);
ligne("je suis primaire   :", String(moi.isWritablePrimary));
ligne("je suis secondaire :", String(!!moi.secondary));

print("\nUn seul noeud accepte les ecritures. Les deux autres rejouent son");
print("oplog. C'est la definition d'un replica set : une seule source de");
print("verite, N copies qui la suivent.");


// =============================================================================
titre("2. La configuration : priorites et votes");
// =============================================================================

const conf = rs.conf();
print("");
conf.members.forEach(function (m) {
  ligne(m.host.padEnd(18),
        "priorite " + m.priority,
        "votes " + m.votes,
        m.hidden ? "cache" : "", m.arbiterOnly ? "arbitre" : "");
});

print("\npriorite  : plus elle est haute, plus le noeud est candidat a l'election");
print("            priorite 0 = ne sera JAMAIS primaire (noeud d'analyse)");
print("votes     : participe au quorum. Il faut la MAJORITE STRICTE des votes");
print("            pour elire un primaire.");
print("\nConsequence a marteler : un groupe a 2 noeuds ne tolere AUCUNE panne.");
print("Perdre 1 noeud sur 2, c'est perdre la majorite, donc perdre l'ecriture.");
print("Le nombre de noeuds votants doit etre IMPAIR. Toujours.");


// =============================================================================
titre("3. L'oplog : le journal qui fait tourner la replication");
// =============================================================================

// On produit d'abord un peu de trafic REEL : sans cela l'oplog d'un cluster
// neuf ne contient que des ecritures internes (admin.system.keys), et la
// demonstration ne montre rien de reconnaissable.
const demo = db.getSiblingDB("amiraute").demoOplog;
demo.drop();
demo.insertMany([{ navire: "Charles de Gaulle", statut: "ACTIF" },
                 { navire: "Suffren", statut: "ACTIF" }]);
demo.updateOne({ navire: "Suffren" }, { $set: { statut: "EN_MISSION" } });
demo.deleteOne({ navire: "Charles de Gaulle" });

const local = db.getSiblingDB("local");
const oplog = local.oplog.rs;
const premier = oplog.find().sort({ $natural: 1 }).limit(1).toArray()[0];
const dernier = oplog.find().sort({ $natural: -1 }).limit(1).toArray()[0];

const stats = local.runCommand({ collStats: "oplog.rs" });
print("\ntaille allouee  : " + Math.round(stats.maxSize / 1024 / 1024) + " Mo");
print("taille utilisee : " + (stats.size / 1024).toFixed(1) + " Ko");
print("remplissage     : " + (stats.size / stats.maxSize * 100).toFixed(3) + " %");
print("operations      : " + oplog.countDocuments());

// ts est un Timestamp BSON, PAS une Date : pas de getTime(). Son champ .t
// porte les secondes depuis l'epoque. Piege classique, et le message d'erreur
// ("getTime is not a function") ne le dit pas.
if (premier && dernier) {
  const fenetreS = dernier.ts.t - premier.ts.t;
  print("fenetre couverte: " + (fenetreS / 3600).toFixed(2) + " h  (" + fenetreS + " s)");
}

print("\nSur un cluster neuf la fenetre est minuscule : quelques secondes de");
print("trafic. En production elle se compte en jours, et c'est ce chiffre-la");
print("qu'on surveille.");
print("\nLa FENETRE D'OPLOG est l'indicateur de supervision numero un :");
print("c'est le temps maximal pendant lequel un secondaire peut etre coupe");
print("et rattraper ensuite sans resynchronisation complete. Si elle tombe");
print("sous quelques heures, il faut agrandir l'oplog.");

print("\nQuelques entrees recentes :");
oplog.find({ op: { $in: ["i", "u", "d"] } }).sort({ $natural: -1 }).limit(4)
  .forEach(function (o) {
    ligne({ i: "insert", u: "update", d: "delete" }[o.op], (o.ns || "").padEnd(26),
          o.wall ? o.wall.toISOString().slice(11, 19) : "");
  });


// =============================================================================
titre("4. Write concern : jusqu'ou attend-on ?");
// =============================================================================

const base = db.getSiblingDB("amiraute");
base.demoReplication.drop();

function ecrire(etiquette, wc) {
  // Trois ecritures, on garde la mediane : une mesure unique sur des durees
  // de quelques millisecondes ne veut rien dire.
  const mesures = [];
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    base.demoReplication.insertOne({ etiquette: etiquette, t: new Date() }, { writeConcern: wc });
    mesures.push(Date.now() - t0);
  }
  mesures.sort(function (a, b) { return a - b; });
  ligne(etiquette.padEnd(30), mesures[1] + " ms");
}

// ECHAUFFEMENT : la toute premiere ecriture paie l'etablissement de la
// connexion et la selection du serveur. Sans cela, w:1 parait plus lent que
// w:"majority", et la demonstration dit le contraire de ce qu'on veut montrer.
base.demoReplication.insertOne({ etiquette: "echauffement" });

print("");
ecrire("w:1 (le primaire seul)",        { w: 1 });
ecrire("w:'majority' (2 sur 3)",        { w: "majority" });
ecrire("w:3 (les trois noeuds)",        { w: 3, wtimeout: 5000 });
ecrire("w:1 + j:true (journalise)",     { w: 1, j: true });

print("\nSur un cluster local les trois noeuds sont sur la meme machine : les");
print("ecarts se comptent en millisecondes et peuvent meme s'inverser. En");
print("production, avec des noeuds dans trois zones, w:'majority' coute un");
print("aller-retour reseau et w:3 en coute deux. L'ORDRE DE GRANDEUR compte,");
print("pas le chiffre exact mesure ici.");
print("");
print("w:1          rapide, mais une bascule juste apres peut perdre l'ecriture");
print("w:'majority' garantit la durabilite face a une bascule. LE DEFAUT SAIN.");
print("w:3          exige TOUS les noeuds : une seule panne bloque l'ecriture");
print("             -> ne jamais mettre w = nombre de noeuds en production");
print("wtimeout     obligatoire des que w > 1, sinon l'ecriture peut pendre");
print("\nPiege : wtimeout depasse ne fait PAS de rollback. L'ecriture peut");
print("etre appliquee quand meme. wtimeout signale, il n'annule pas.");


// =============================================================================
titre("5. Read preference et read concern");
// =============================================================================

print("\nreadPreference - QUEL noeud lit-on ?");
ligne("primary            ", "defaut. Toujours coherent.");
ligne("primaryPreferred   ", "bascule sur un secondaire si le primaire tombe");
ligne("secondary          ", "decharge le primaire, mais donnees en retard");
ligne("secondaryPreferred ", "le compromis courant pour du reporting");
ligne("nearest            ", "latence minimale, aucune garantie de fraicheur");

print("\nreadConcern - QUELLE version lit-on ?");
ligne("local              ", "ce que le noeud a, meme non replique");
ligne("majority           ", "seulement ce qui ne peut plus etre annule");
ligne("linearizable       ", "la plus recente confirmee. Lent, rarement justifie");

print("\nLire sur un secondaire, c'est accepter un retard. Mesurable :");
etat.members.filter(function (m) { return m.state === 2; }).forEach(function (m) {
  const retard = (etat.date - m.optimeDate) / 1000;
  ligne(m.name, "retard " + retard.toFixed(1) + " s");
});

print("\nA dire clairement en salle : deporter les lectures sur les secondaires");
print("n'est PAS une optimisation gratuite. C'est un arbitrage coherence /");
print("charge, et il doit etre pris ecran par ecran.");


// =============================================================================
titre("6. Provoquer une bascule");
// =============================================================================

print("\nAvant : primaire = " + db.hello().primary);
print("\nCommande a jouer, puis relancer le script :");
print("  rs.stepDown(30)");
print("\nEt pour observer la bascule en direct depuis un autre terminal :");
print("  docker compose -f docker/docker-compose.yml exec mongo2 \\");
print("    mongosh --eval 'while(true){print(db.hello().primary); sleep(500)}'");
print("\nMESURE SUR CE CLUSTER : la bascule mongo1 -> mongo2 prend moins de");
print("4 secondes, les trois noeuds etant sur la meme machine. En production,");
print("avec des noeuds repartis en zones, comptez 5 a 12 secondes.");
print("");
print("Pendant ce laps de temps");
print("il n'y a AUCUN primaire, donc aucune ecriture possible. Un pilote qui");
print("gere les retryable writes rejoue tout seul : c'est pour cela qu'il ne");
print("faut jamais desactiver retryWrites.");

base.demoReplication.drop();
base.demoOplog.drop();
print("\n(collections de demonstration supprimees)");
