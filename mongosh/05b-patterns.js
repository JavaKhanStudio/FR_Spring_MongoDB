// =============================================================================
// 05b - LES PATTERNS DE MODELISATION                                  [J2 am]
// =============================================================================
// Au-dela de "Embedded et Referred" du programme.
//
//     make charger F=mongosh/05b-patterns.js
//
// Embarquer ou referencer est la PREMIERE question, pas la seule. Entre les
// deux, MongoDB a un vocabulaire de patterns nommes. C'est lui qui fait la
// difference entre du NoSQL et du SQL deguise en JSON.
// =============================================================================

const base = db.getSiblingDB("amiraute");
function titre(t) { print("\n" + "=".repeat(70) + "\n  " + t + "\n" + "=".repeat(70)); }
function sous(t) { print("\n--- " + t + " " + "-".repeat(Math.max(0, 58 - t.length))); }
function l() { print("  " + Array.prototype.slice.call(arguments).join("  ")); }


// =============================================================================
titre("LE SYMPTOME - a quoi reconnait-on du SQL deguise en JSON ?");
// =============================================================================

print("\nTrois signes, et ils se mesurent :");

sous("1. Tous les documents ont la meme forme");
const cles = {};
base.navires.find().forEach(function (n) {
  Object.keys(n).forEach(function (k) { cles[k] = (cles[k] || 0) + 1; });
});
const total = base.navires.countDocuments();
const partout = Object.keys(cles).filter(function (k) { return cles[k] === total; });
l("champs de premier niveau distincts :", String(Object.keys(cles).length));
l("presents sur les " + total + " documents      :", String(partout.length));
print("\n  Si ce second chiffre est proche du premier, la collection EST une");
print("  table. Un schema uniforme est la definition meme du relationnel.");

sous("2. Les relations sont des identifiants nus");
print("  portAttacheId: 'TOULON'  <- c'est une clef etrangere avec un autre nom.");

sous("3. Chaque affichage demande une jointure");
print("  Si l'ecran le plus consulte du systeme a besoin de trois $lookup,");
print("  le modele n'a pas ete concu pour la facon dont il est lu.");

print("\nCe script applique cinq patterns qui repondent a ces trois signes.");


// =============================================================================
titre("PATTERN 1 - POLYMORPHIC");
// =============================================================================

print("\nPROBLEME  Des entites qui se ressemblent plus qu'elles ne different,");
print("          mais dont certaines caracteristiques sont propres a un type.");
print("SOLUTION  Une seule collection, plusieurs FORMES de document,");
print("          departagees par un champ discriminant.");

sous("Les trois formes de la collection navires");
base.navires.aggregate([
  { $group: { _id: "$_class", n: { $sum: 1 } } }, { $sort: { n: -1 } }
]).forEach(function (c) { l(c._id.padEnd(20), String(c.n).padStart(2) + " documents"); });

sous("Ce que porte un sous-marin, et lui seul");
printjson(base.navires.findOne({ numeroCoque: "S635", nation: "France" },
  { _id: 0, nom: 1, _class: 1, profondeurMaxMetres: 1,
    nombreTubesLanceTorpilles: 1, missionStrategique: 1, discretionDecibels: 1 }));

sous("Ce que porte un porte-avions, et lui seul");
printjson(base.navires.findOne({ numeroCoque: "R91", nation: "France" },
  { _id: 0, nom: 1, _class: 1, typeCatapulte: 1, longueurPisteMetres: 1, groupeAerien: 1 }));

sous("Les champs ne se recouvrent pas");
["profondeurMaxMetres", "groupeAerien", "systemeCombat"].forEach(function (champ) {
  const f = {}; f[champ] = { $exists: true };
  const formes = base.navires.distinct("_class", f);
  l(champ.padEnd(24), "present sur :", formes.join(", "));
});

sous("Et pourtant, une requete transverse marche toujours");
base.navires.aggregate([
  { $match: { statut: { $ne: "DESARME" } } },
  { $group: { _id: "$_class", tonnageMoyen: { $avg: "$deplacementTonnes" } } },
  { $sort: { tonnageMoyen: -1 } }
]).forEach(function (c) {
  l(c._id.padEnd(20), Math.round(c.tonnageMoyen) + " t en moyenne");
});

print("\n  EN RELATIONNEL il faudrait, au choix :");
print("    - trois tables et un UNION pour la requete transverse ;");
print("    - une table unique criblee de colonnes NULL ;");
print("    - une table de base plus trois tables filles jointes.");
print("");
print("  COTE SPRING : classe abstraite Navire, trois sous-classes annotees");
print("  @TypeAlias. Le repository type sur SousMarin ne filtre PAS tout seul :");
print("  Spring Data n'ajoute AUCUNE restriction sur _class. Le discriminant");
print("  doit etre ecrit a la main dans chaque @Query - sinon les 45 documents");
print("  remontent, instancies de force en SousMarin.");
print("  Voir SousMarinRepository, le commentaire vaut le detour.");
print("");
print("  LE PIEGE : sans @TypeAlias, Spring ecrit le nom de classe complet");
print("  dans _class. Renommer le package rend alors TOUTE la collection");
print("  illisible. On ne s'en apercoit qu'apres le deploiement.");


// =============================================================================
titre("PATTERN 2 - EXTENDED REFERENCE");
// =============================================================================

print("\nPROBLEME  Trop de jointures pour reconstituer une ligne d'ecran.");
print("SOLUTION  Recopier dans le document les quelques champs de l'entite");
print("          liee qu'on affiche systematiquement avec lui.");

sous("Ce que porte reellement le navire");
printjson(base.navires.findOne({ numeroCoque: "D620", nation: "France" },
                               { _id: 0, nom: 1, portAttache: 1, flotte: 1 }));

sous("Ce qu'on a recopie, et ce qu'on a laisse");
l("recopie   ", "id, nom, pays        ils ne changent jamais");
l("laisse    ", "capaciteNavires      elle change -> reste dans ports");
l("laisse    ", "profondeurBassin     elle change -> reste dans ports");
l("laisse    ", "amiralCommandant     il mute     -> reste dans flottes");

sous("Le gain, mesure");
const avecJointure = [
  { $match: { nation: "France" } },
  { $lookup: { from: "ports", localField: "portAttache.id", foreignField: "_id", as: "p" } },
  { $project: { nom: 1, port: { $first: "$p.nom" } } }
];
const sansJointure = [
  { $match: { nation: "France" } },
  { $project: { nom: 1, port: "$portAttache.nom" } }
];
l("avec $lookup :", base.navires.aggregate(avecJointure).toArray().length + " lignes, 1 jointure");
l("sans          :", base.navires.aggregate(sansJointure).toArray().length + " lignes, 0 jointure");

sous("Et la recherche devient possible SANS jointure");
base.navires.aggregate([
  { $group: { _id: "$portAttache.pays", navires: { $sum: 1 } } },
  { $sort: { navires: -1 } }, { $limit: 4 }
]).forEach(function (r) { l(String(r._id).padEnd(16), String(r.navires).padStart(2) + " navires"); });
print("\n  Grouper par PAYS DU PORT, sans toucher a la collection ports.");
print("  Un identifiant nu ne permettrait pas cela.");

print("\n  LE PRIX  renommer un port impose de propager la copie.");
print("  QUAND NE PAS L'UTILISER :");
print("    - la donnee change souvent (telephone, statut, stock) ;");
print("    - on a besoin de TOUS les champs de l'entite liee, pas de deux ;");
print("    - la lecture est rare : la synchronisation ne se rentabilise pas.");
print("");
print("  UN CAS OU C'EST OBLIGATOIRE, et non plus une optimisation :");
print("  quand la copie doit refleter l'etat AU MOMENT DU FAIT. Le nom d'un");
print("  navire dans une mission de 2019 doit rester celui de 2019, meme si");
print("  le navire a ete rebaptise depuis. La, ce n'est plus de la perf,");
print("  c'est de l'archivage.");


// =============================================================================
titre("PATTERN 3 - SUBSET");
// =============================================================================

print("\nPROBLEME  Un document trop gros, dont on ne lit qu'une petite part.");
print("SOLUTION  Garder le sous-ensemble chaud dans le document, le reste");
print("          dans une collection a part.");

const cdg = base.navires.findOne({ numeroCoque: "R91", nation: "France" });
sous("L'equipage complet reste reference");
l("equipage theorique du Charles de Gaulle :", String(cdg.equipageMax) + " marins");
l("membres en base                          :", String(base.membresEquipage.countDocuments({ navireId: cdg._id })));

sous("Mais l'etat-major est EMBARQUE");
(cdg.etatMajor || []).forEach(function (o) {
  l(o.role.padEnd(22), o.grade.padEnd(24), o.prenom + " " + o.nom);
});

sous("Pourquoi ce decoupage precis");
print("  La fiche du navire affiche TOUJOURS ces cinq officiers.");
print("  Elle n'affiche JAMAIS les 1 945 autres marins.");
print("");
print("  Embarquer tout l'equipage : la fiche ramenerait " + cdg.equipageMax + " sous-documents");
print("  a chaque appel, et le WORKING SET - la part des donnees que MongoDB");
print("  garde en RAM - exploserait pour rien.");
print("");
print("  Tout referencer : une requete de plus sur l'ecran le plus consulte.");
print("");
print("  Le subset prend les deux : une lecture pour le cas courant, la");
print("  pagination complete quand on la demande vraiment.");

sous("La source de verite reste la collection");
const commandant = (cdg.etatMajor || [])[0];
if (commandant) {
  const fiche = base.membresEquipage.findOne({ matricule: commandant.matricule });
  l("copie dans le navire :", commandant.grade, commandant.nom);
  l("fiche complete       :", fiche ? (fiche.grade + " " + fiche.nom + ", " + fiche.specialite) : "?");
  print("\n  La copie ne porte que ce qu'affiche la fiche navire. La specialite,");
  print("  la date d'enrolement, l'historique restent dans membresEquipage.");
}


// =============================================================================
titre("PATTERN 4 - COMPUTED");
// =============================================================================

print("\nPROBLEME  Une valeur recalculee a chaque lecture alors qu'elle ne");
print("          change qu'a l'ecriture.");
print("SOLUTION  La calculer une fois, a l'ecriture, et la stocker.");

sous("Ce que porte stats");
printjson(cdg.stats);

sous("Le meme chiffre, calcule a la volee");
const calcule = base.missions.countDocuments({ "naviresParticipants.id": cdg._id });
l("stats.nombreMissions (lu)      :", String(cdg.stats.nombreMissions));
l("countDocuments (calcule)       :", String(calcule));
l("d'accord ?", calcule === cdg.stats.nombreMissions ? "oui" : "NON - la denormalisation a derive");

sous("Ce que ca evite");
l("nombreMissions ", "un $lookup + $size par navire affiche");
l("effectifActuel ", "un countDocuments sur membresEquipage");
l("dernierReleve  ", "un tri sur 100 000 documents de journauxBord");

sous("Le cout : la derive");
print("  Chaque champ calcule DOIT etre remis a jour quand sa source change.");
print("  Ajouter un navire a une mission sans incrementer stats.nombreMissions");
print("  produit un chiffre faux que personne ne verra pendant des mois.");
print("");
print("  Trois parades, par ordre de robustesse :");
print("    1. maintenir dans la MEME operation (transaction, ou un seul doc) ;");
print("    2. un change stream qui recalcule en reaction ;");
print("    3. un job de reconciliation nocturne qui compare et corrige.");
print("");
print("  En pratique on fait 1 et 3 : la mise a jour synchrone, plus un filet.");


// =============================================================================
titre("PATTERN 5 - BUCKET");
// =============================================================================

print("\nPROBLEME  Des millions de petits documents temporels. Un document par");
print("          releve, c'est un _id, un index et des metadonnees par releve.");
print("SOLUTION  Regrouper les releves d'une fenetre de temps dans UN document.");

base.demoSeaux.drop();

sous("Avant : un document par releve");
const unNavire = base.navires.findOne({ statut: { $ne: "DESARME" }, positionActuelle: { $exists: true } });
// Tous les releves d'un navire sur 30 jours. Regroupes a l'HEURE, les seaux
// ne contiendraient que 3 ou 4 releves - le pattern ne se verrait pas. La
// taille de la fenetre se choisit d'apres la FREQUENCE des donnees.
const echantillon = base.journauxBord.find({ navireId: unNavire._id })
                        .sort({ horodatage: 1 }).toArray();
l("releves de l'echantillon :", String(echantillon.length) + " (30 jours)");
l("taille d'un releve       :", bsonsize(echantillon[0]) + " octets");
l("total                    :", echantillon.reduce(function (s, d) {
  return s + bsonsize(d); }, 0) + " octets");

sous("Apres : un document par JOUR");
const seaux = {};
echantillon.forEach(function (r) {
  const jour = new Date(Math.floor(r.horodatage.getTime() / 86400000) * 86400000);
  const cle = jour.toISOString();
  if (!seaux[cle]) {
    seaux[cle] = { navireId: r.navireId, debut: jour, nombre: 0,
                   vitesseMin: 999, vitesseMax: 0, releves: [] };
  }
  const s = seaux[cle];
  s.nombre++;
  s.vitesseMin = Math.min(s.vitesseMin, r.vitesseNoeuds);
  s.vitesseMax = Math.max(s.vitesseMax, r.vitesseNoeuds);
  // Dans le seau, on ne garde que l'essentiel : pas de _id, pas de navireId
  // repete 60 fois, pas de type GeoJSON complet.
  s.releves.push({ t: r.horodatage, v: r.vitesseNoeuds, c: r.capDegres,
                   p: r.position.coordinates });
});
const listeSeaux = Object.values(seaux);
base.demoSeaux.insertMany(listeSeaux);

l("seaux crees              :", String(listeSeaux.length));
l("taille d'un seau         :", bsonsize(listeSeaux[0]) + " octets");
const totalSeaux = listeSeaux.reduce(function (s, d) { return s + bsonsize(d); }, 0);
l("total                    :", totalSeaux + " octets");
const totalPlat = echantillon.reduce(function (s, d) { return s + bsonsize(d); }, 0);
l("gain                     :", (totalPlat / totalSeaux).toFixed(1) + " x moins de place");

sous("Et les agregats de la fenetre sont deja calcules");
printjson(base.demoSeaux.findOne({}, { _id: 0, debut: 1, nombre: 1, vitesseMin: 1, vitesseMax: 1 }));

print("\n  CE QU'ON GAGNE : moins de documents, moins d'entrees d'index, des");
print("  agregats par fenetre gratuits, et une compression bien meilleure.");
print("");
print("  CE QU'ON PERD : interroger UN releve precis demande de deballer le");
print("  seau ($unwind). Et un seau qui grossit indefiniment redevient le");
print("  probleme - il faut donc le BORNER, par duree ou par nombre.");
print("");
print("  A SAVOIR : les collections TIME SERIES de MongoDB font exactement");
print("  cela, automatiquement. Ce script montre le mecanisme a la main pour");
print("  qu'il ne reste pas une boite noire.");
print("");
print("  Pourquoi journauxBord n'en est pas une dans ce projet : la sortie");
print("  d'explain() compterait alors des SEAUX et non des documents, ce qui");
print("  rendrait la demonstration COLLSCAN vs IXSCAN du J3 illisible.");
print("  C'est un arbitrage pedagogique, pas technique.");

base.demoSeaux.drop();


// =============================================================================
titre("PATTERN 6 - ATTRIBUTE");
// =============================================================================

print("\nPROBLEME  Des dizaines de champs possibles, dont chaque document n'en");
print("          porte que quelques-uns, et qu'il faut pouvoir rechercher.");
print("SOLUTION  Un tableau de paires { cle, valeur } plutot que N champs,");
print("          et UN SEUL index pour tous.");

base.demoAttributs.drop();

sous("Le probleme, sur les certifications d'un navire");
print("  Chaque navire porte des certifications differentes :");
print("    certifOTAN, certifNucleaire, certifGlace, certifAeronautique,");
print("    certifPlongee, certifMedicale... et vingt autres.");
print("");
print("  Un champ par certification, c'est vingt index pour pouvoir chercher");
print("  'les navires certifies X apres telle date'. Et un vingt-et-unieme");
print("  champ demain.");

sous("La forme Attribute");
base.demoAttributs.insertMany([
  { nom: "Charles de Gaulle", certifications: [
      { k: "OTAN", v: "STANAG-1059", d: ISODate("2024-03-01T00:00:00Z") },
      { k: "NUCLEAIRE", v: "ASND-2024", d: ISODate("2024-06-15T00:00:00Z") },
      { k: "AERONAUTIQUE", v: "CATOBAR-A", d: ISODate("2025-01-10T00:00:00Z") } ] },
  { nom: "Suffren", certifications: [
      { k: "NUCLEAIRE", v: "ASND-2023", d: ISODate("2023-09-01T00:00:00Z") },
      { k: "PLONGEE", v: "IMM-350", d: ISODate("2024-02-20T00:00:00Z") } ] },
  { nom: "Admiral Kuznetsov", certifications: [
      { k: "GLACE", v: "ARC-4", d: ISODate("2022-11-05T00:00:00Z") } ] }
]);

// UN SEUL index sert TOUTES les certifications, presentes et futures.
base.demoAttributs.createIndex({ "certifications.k": 1, "certifications.v": 1 },
                               { name: "idx_attributs" });

sous("Une seule requete, un seul index, n'importe quelle certification");
[["NUCLEAIRE", null], ["GLACE", null], ["OTAN", "STANAG-1059"]].forEach(function (cas) {
  const critere = { k: cas[0] };
  if (cas[1]) { critere.v = cas[1]; }
  const noms = base.demoAttributs.find({ certifications: { $elemMatch: critere } })
                   .toArray().map(function (d) { return d.nom; });
  l((cas[0] + (cas[1] ? " = " + cas[1] : "")).padEnd(28), noms.join(", ") || "aucun");
});

print("\n  Ajouter une certification demain ne demande NI migration, NI index.");
print("");
print("  QUAND NE PAS L'UTILISER : si les champs sont peu nombreux, stables et");
print("  presents partout, des champs nommes restent plus lisibles et plus");
print("  rapides. L'Attribute se justifie a partir d'une dizaine de clefs");
print("  possibles, ou quand la liste est ouverte.");

base.demoAttributs.drop();


// =============================================================================
titre("LA TABLE DE DECISION");
// =============================================================================
print("");
print("  SYMPTOME                                    PATTERN");
print("  " + "-".repeat(68));
print("  Des types qui different par quelques champs  POLYMORPHIC");
print("  Trop de $lookup sur l'ecran chaud            EXTENDED REFERENCE");
print("  Document trop gros, on n'en lit qu'un bout   SUBSET");
print("  Meme calcul refait a chaque lecture          COMPUTED");
print("  Des millions de petits documents temporels   BUCKET");
print("  Des dizaines de champs possibles, ouverts    ATTRIBUTE");
print("  Quelques documents ecrasent la moyenne       OUTLIER");
print("  Le schema change et l'ancien doit survivre   SCHEMA VERSIONING");
print("");
print("  Les cinq premiers sont appliques dans ce projet. Les trois derniers");
print("  sont dans l'annexe d'exercices.");

titre("LE CONTRE-POISON");
print("");
print("  Ces patterns DENORMALISENT, presque tous. Ils echangent de la");
print("  simplicite d'ecriture contre de la vitesse de lecture.");
print("");
print("  Ce n'est un bon echange que si l'on LIT beaucoup plus qu'on n'ECRIT.");
print("  Sur un systeme a forte ecriture, la normalisation redevient le bon");
print("  choix - et MongoDB s'en accommode tres bien.");
print("");
print("  La question a poser AVANT d'appliquer un pattern n'est jamais");
print("  'est-ce elegant ?' mais :");
print("");
print("      Quel ecran, appele combien de fois par minute,");
print("      est-ce que ce pattern rend plus rapide ?");
print("");
print("  Sans reponse chiffree a cette question, on ne denormalise pas.");
