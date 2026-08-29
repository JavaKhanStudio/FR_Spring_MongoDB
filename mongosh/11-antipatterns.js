// =============================================================================
// 11 - AUTOPSIE D'UNE COLLECTION MALADE                        [J3 pm - bonus]
// =============================================================================
// Prerequis : make charger F=mongosh/00c-poissons.js
//
//     make charger F=mongosh/11-antipatterns.js
//
// Le reste du projet montre le BON modele et explique pourquoi il est bon.
// Cela laisse un angle mort : les stagiaires n'ont jamais vu, en vrai, ce que
// produit une mauvaise modelisation.
//
// poissons est cet angle mort comble. Dix pathologies, toutes MESUREES ici
// avec les outils du module Performance, et comparees a poissonsCorrige -
// la MEME donnee, bien modelisee.
//
// A jouer APRES 10-diagnostic.js : les stagiaires savent alors mesurer.
// =============================================================================

const base = db.getSiblingDB("amiraute");
function titre(t) { print("\n" + "=".repeat(72) + "\n  " + t + "\n" + "=".repeat(72)); }
function sous(t) { print("\n--- " + t + " " + "-".repeat(Math.max(0, 58 - t.length))); }
function l() { print("  " + Array.prototype.slice.call(arguments).join("  ")); }

function chaine(st) { const c = []; while (st) { c.push(st.stage); st = st.inputStage; } return c.join(" <- "); }
function mesurer(col, libelle, filtre, tri) {
  let cur = base[col].find(filtre);
  if (tri) { cur = cur.sort(tri); }
  const e = cur.explain("executionStats").executionStats;
  l(libelle.padEnd(40), String(e.nReturned).padStart(5) + " rendus",
    String(e.totalDocsExamined).padStart(6) + " lus", chaine(e.executionStages));
  return e;
}
function stats(col) {
  return base[col].aggregate([{ $collStats: { storageStats: {} } }]).toArray()[0].storageStats;
}

if (base.poissons.countDocuments() === 0) {
  print("Collection poissons vide. Jouer d'abord :");
  print("  make charger F=mongosh/00c-poissons.js");
  quit(1);
}


// =============================================================================
titre("LE PATIENT");
// =============================================================================

const sM = stats("poissons"), sS = stats("poissonsCorrige");
print("");
l("                    ", "MALADE".padStart(12), "CORRIGE".padStart(12));
l("documents           ", String(sM.count).padStart(12), String(sS.count).padStart(12));
l("donnees (Ko)        ", String(Math.round(sM.size/1024)).padStart(12), String(Math.round(sS.size/1024)).padStart(12));
l("index               ", String(sM.nindexes).padStart(12), String(sS.nindexes).padStart(12));
l("taille des index(Ko)", String(Math.round(sM.totalIndexSize/1024)).padStart(12),
                          String(Math.round(sS.totalIndexSize/1024)).padStart(12));
l("doc moyen (octets)  ", String(Math.round(sM.avgObjSize)).padStart(12),
                          String(Math.round(sS.avgObjSize)).padStart(12));

print("\nMeme information, meme nombre de documents. Tout l'ecart vient de la");
print("modelisation.");


// =============================================================================
titre("PATHOLOGIE 1 - LE MEME CONCEPT SOUS TROIS NOMS");
// =============================================================================

print("");
["espece", "Espece", "nomEspece"].forEach(function (c) {
  const f = {}; f[c] = { $exists: true };
  l(c.padEnd(14), String(base.poissons.countDocuments(f)).padStart(5) + " documents");
});
l("espece (corrige)", String(base.poissonsCorrige.countDocuments({ espece: { $exists: true } })).padStart(5) + " documents");

print("\n  Chercher un thon devient :");
print("    { $or: [ { espece: ... }, { Espece: ... }, { nomEspece: ... } ] }");
print("");
print("  Il faut TROIS index pour couvrir un seul concept, et personne ne");
print("  saura jamais s'il existe un quatrieme nom quelque part.");
print("");
print("  D'ou ca vient : trois developpeurs, trois imports, aucun schema");
print("  declare pour les arreter. C'est LE risque du sans-schema, et il n'a");
print("  rien de theorique.");


// =============================================================================
titre("PATHOLOGIE 2 - LA CASSE ET LES ACCENTS");
// =============================================================================

print("");
const variantes = base.poissons.distinct("espece").filter(function (e) {
  return e && e.toLowerCase().indexOf("thon") >= 0; });
l("valeurs distinctes pour 'thon rouge' :", variantes.length);
variantes.forEach(function (v) { l("   ", JSON.stringify(v)); });

l("\n  egalite exacte 'Thon rouge' :", base.poissons.countDocuments({ espece: "Thon rouge" }));
l("  regex insensible a la casse :", base.poissons.countDocuments({ espece: /^thon rouge$/i }));
l("  dans poissonsCorrige        :", base.poissonsCorrige.countDocuments({ espece: "Thon rouge" }));

print("\n  LES DEUX PATHOLOGIES SE CUMULENT, et c'est le vrai enseignement.");
print("");
print("  L'egalite exacte rate les variantes de casse.");
print("  La regex les rattrape... mais seulement sur le champ 'espece'. Les");
print("  documents nommes 'Espece' ou 'nomEspece' restent invisibles, quelle");
print("  que soit la regex.");
print("");
print("  D'ou l'ecart avec le corrige : ni l'une ni l'autre ne trouve les 410.");
print("  Il faudrait un $or sur trois champs ET une regex insensible a la");
print("  casse sur chacun - donc trois balayages complets pour une question");
print("  aussi simple que 'combien de thons rouges ?'.");
print("");
print("  Et la regex non ancree ne peut de toute facon PAS utiliser d'index.");
print("  On choisit entre juste et rapide, et ici on n'a ni l'un ni l'autre.");
print("");
print("  La normalisation se fait A L'ECRITURE. Jamais a la lecture.");


// =============================================================================
titre("PATHOLOGIE 3 - DEUX TYPES DANS LE MEME CHAMP");
// =============================================================================

print("");
l("poidsGrammes en nombre :", base.poissons.countDocuments({ poidsGrammes: { $type: "number" } }));
l("poidsGrammes en chaine :", base.poissons.countDocuments({ poidsGrammes: { $type: "string" } }));

print("");
const gros = base.poissons.countDocuments({ poidsGrammes: { $gt: 400 } });
const grosOk = base.poissonsCorrige.countDocuments({ poidsGrammes: { $gt: 400 } });
l("{ poidsGrammes: { $gt: 400 } } sur poissons        :", String(gros).padStart(5));
l("{ poidsGrammes: { $gt: 400 } } sur poissonsCorrige :", String(grosOk).padStart(5));
l("ecart                                              :", String(grosOk - gros).padStart(5) + " documents INVISIBLES");

print("\n  MongoDB compare d'abord les TYPES, ensuite les valeurs. Une chaine");
print("  n'est jamais superieure a un nombre : le tiers stocke en texte est");
print("  simplement absent du resultat.");
print("");
print("  AUCUNE ERREUR N'EST LEVEE. Le rapport est faux, il a l'air juste, et");
print("  il le restera jusqu'a ce que quelqu'un recompte a la main.");


// =============================================================================
titre("PATHOLOGIE 4 - LA DATE EN CHAINE");
// =============================================================================

print("");
l("exemple stocke :", JSON.stringify(base.poissons.findOne().dateCapture));
l("exemple corrige:", JSON.stringify(base.poissonsCorrige.findOne().dateCapture));

sous("Ce qui marche quand meme, et pourquoi ca trompe");
const marsChaine = base.poissons.countDocuments({ dateCapture: /\/03\/2026$/ });
const marsDate = base.poissonsCorrige.countDocuments({
  dateCapture: { $gte: ISODate("2026-03-01T00:00:00Z"), $lt: ISODate("2026-04-01T00:00:00Z") } });
l("captures de mars, en chaine (regex) :", String(marsChaine).padStart(5));
l("captures de mars, en date (plage)   :", String(marsDate).padStart(5));
print("");
mesurer("poissons", "regex ancree a droite", { dateCapture: /\/03\/2026$/ });
mesurer("poissonsCorrige", "plage de dates",
        { dateCapture: { $gte: ISODate("2026-03-01T00:00:00Z"), $lt: ISODate("2026-04-01T00:00:00Z") } });
print("");
print("  Surprise : la regex descend dans l'index et lit peu de documents.");
print("  MongoDB parcourt TOUTES les clefs de l'index - moins cher qu'un");
print("  balayage de collection - puis ne va chercher que les documents");
print("  correspondants.");
print("");
print("  Un mois donne marche donc, et c'est exactement ce qui rassure a tort.");

sous("Ce qui ne marche PAS - 1 : le tri chronologique");
print("");
print("  Les 8 premieres dates DISTINCTES, triees croissant.");
print("");
print("  En chaine :");
base.poissons.aggregate([
  { $group: { _id: "$dateCapture" } }, { $sort: { _id: 1 } }, { $limit: 8 }
]).forEach(function (d) { l("   ", d._id); });
print("");
print("  En date :");
base.poissonsCorrige.aggregate([
  { $group: { _id: "$dateCapture" } }, { $sort: { _id: 1 } }, { $limit: 8 }
]).forEach(function (d) { l("   ", d._id.toISOString().slice(0, 10)); });
print("");
print("  La premiere liste enumere le 1er de CHAQUE MOIS avant d'arriver au");
print("  2 janvier. Elle est triee par jour du mois, puis par mois, puis par");
print("  annee - exactement l'ordre des caracteres, et exactement l'inverse de");
print("  ce qu'on voulait.");
print("");
print("  Le tri est syntaxiquement valide et chronologiquement faux. Aucune");
print("  erreur, aucun avertissement. Un ecran 'dernieres captures' affichera");
print("  n'importe quoi, et personne ne le remarquera avant longtemps.");

sous("Ce qui ne marche PAS - 2 : l'intervalle a cheval sur deux mois");
const intervalle = base.poissonsCorrige.countDocuments({
  dateCapture: { $gte: ISODate("2026-02-15T00:00:00Z"), $lte: ISODate("2026-03-20T00:00:00Z") } });
l("du 15 fevrier au 20 mars, en date :", String(intervalle).padStart(5), "une seule requete");
print("");
print("  En chaine : impossible. Il faudrait enumerer les jours du 15 au 28");
print("  fevrier PUIS ceux du 1er au 20 mars, dans un $or de trente-quatre");
print("  motifs. Et recommencer a chaque changement de bornes.");
print("");
print("  Etendre a 'du 15 decembre 2025 au 20 mars 2026' devient un exercice");
print("  de generation de regex - pour une question que toute base de donnees");
print("  sait resoudre depuis cinquante ans.");

sous("Et l'ambiguite, par-dessus");
print("");
print("  '07/03/2026' : 7 mars ou 3 juillet ? La reponse depend du pays du");
print("  developpeur qui a ecrit l'import. Sur un jeu de donnees alimente par");
print("  plusieurs sources, les deux conventions coexistent - et rien ne");
print("  permet de les distinguer apres coup.");

titre("PATHOLOGIE 5 - LE TABLEAU NON BORNE");
// =============================================================================

print("");
const enfles = base.poissons.aggregate([
  { $project: { reference: 1, n: { $size: { $ifNull: ["$observations", []] } } } },
  { $match: { n: { $gt: 100 } } }, { $sort: { n: -1 } }, { $limit: 5 }
]).toArray();
l("documents a plus de 100 sous-documents :",
  base.poissons.countDocuments({ "observations.100": { $exists: true } }));
enfles.forEach(function (d) {
  const doc = base.poissons.findOne({ reference: d.reference });
  l("  " + d.reference, String(d.n).padStart(5) + " releves",
    String(Math.round(bsonsize(doc) / 1024)).padStart(5) + " Ko");
});

print("\n  Ces documents pesent des centaines de Ko. Or MongoDB reecrit le");
print("  document ENTIER a chaque modification : ajouter un releve de 80");
print("  octets reecrit 400 Ko.");
print("");
print("  Et la limite de 16 Mo n'est pas un objectif, c'est un MUR. On ne");
print("  recoit aucun avertissement en s'en approchant - juste une erreur");
print("  BSONObjectTooLarge, un jour, sur le chemin d'insertion en production.");
print("");
l("dans poissonsCorrige :", "les releves sont sortis dans leur propre collection");
l("le document ne garde que :", "nombreReleves (COMPUTED)");


// =============================================================================
titre("PATHOLOGIE 6 - LE BINAIRE EMBARQUE");
// =============================================================================

print("");
const avecPhoto = base.poissons.countDocuments({ photo: { $exists: true } });
l("documents portant une photo :", avecPhoto + " sur " + sM.count);
const p = base.poissons.findOne({ photo: { $exists: true } });
if (p) {
  l("taille du document          :", Math.round(bsonsize(p) / 1024) + " Ko");
  l("dont la photo               :", Math.round(p.photo.length / 1024) + " Ko");
}
print("");
print("  " + Math.round(avecPhoto / sM.count * 100) + " % des documents portent une photo, mais elle est relue a");
print("  CHAQUE lecture - meme quand l'ecran n'affiche que le nom de l'espece.");
print("");
print("  Le WORKING SET, la part des donnees que MongoDB garde en RAM, gonfle");
print("  pour des octets que personne ne regarde.");
print("");
print("  Ou ca doit aller : GridFS, ou un stockage objet, et le document ne");
print("  garde qu'une URL. C'est le pattern SUBSET applique au binaire.");


// =============================================================================
titre("PATHOLOGIE 7 - LA SUR-INDEXATION");
// =============================================================================

print("");
l("index sur poissons        :", sM.nindexes, "pour " + Math.round(sM.totalIndexSize/1024) + " Ko");
l("index sur poissonsCorrige :", sS.nindexes, "pour " + Math.round(sS.totalIndexSize/1024) + " Ko");
print("");
print("  Quels index servent VRAIMENT ? On mesure, on ne devine pas :");
print("");
base.poissons.aggregate([{ $indexStats: {} }]).forEach(function (i) {
  l("  " + i.name.padEnd(34), String(i.accesses.ops).padStart(5) + " utilisations");
});
print("");
print("  Un index a 0 utilisation coute a CHAQUE ecriture et ne rend rien.");
print("  Le reflexe : hideIndex() une semaine, puis dropIndex().");
print("");
print("  ATTENTION A LA LECTURE : $indexStats compte depuis la CREATION de");
print("  l'index ou le demarrage du serveur. Juste apres 00c-poissons.js, tout");
print("  est a zero - y compris les index utiles. Les chiffres ci-dessus ne");
print("  valent que parce que ce script a deja joue une dizaine de requetes.");
print("");
print("  En production, on regarde ce compteur apres PLUSIEURS JOURS de");
print("  trafic reel. Un index juge inutile au bout d'une heure peut servir");
print("  au batch de fin de mois.");

sous("Le pire de tous : l'index a cardinalite 1");
l("valeurs distinctes de 'type' :", base.poissons.distinct("type").length);
mesurer("poissons", "{ type: 'OBSERVATION' }", { type: "OBSERVATION" });
print("");
print("  L'index est utilise, et il ne filtre RIEN : les 4 000 documents ont");
print("  la meme valeur. On paie un index pour parcourir toute la collection.");
print("");
print("  Regle : un index n'a de sens que si sa SELECTIVITE est bonne. Sous");
print("  quelques pour cent de documents rendus, il est probablement inutile.");


// =============================================================================
titre("PATHOLOGIE 8 - L'IMBRICATION PROFONDE");
// =============================================================================

print("");
l("chemin reel :", "metadonnees.collecte.contexte.navire.position.coordonnees.latitude");
l("chez le corrige :", "position (GeoJSON, indexable en 2dsphere)");
print("");
mesurer("poissons", "filtre sur la latitude imbriquee",
        { "metadonnees.collecte.contexte.navire.position.coordonnees.latitude": { $gt: 50 } });

print("\n  Six niveaux pour ranger une latitude. Chaque requete, chaque index,");
print("  chaque projection doit reecrire le chemin complet.");

sous("Mais le vrai degat est ailleurs : la CAPACITE perdue");
const TOULON = [5.93, 43.12];
try {
  base.poissons.find({ "metadonnees.collecte.contexte.navire.position.coordonnees":
    { $near: { $geometry: { type: "Point", coordinates: TOULON }, $maxDistance: 300000 } } }).toArray();
  l("$near sur poissons :", "accepte - inattendu");
} catch (e) {
  l("$near sur poissons :", "REFUSE -> " + (e.codeName || e.code));
}
// countDocuments enveloppe le filtre dans un $match d'agregation, ou $near
// est interdit ("requires sorting geospatial data"). On passe donc par un
// curseur find(), ou $near est parfaitement legal. C'est un piege classique.
const proches = base.poissonsCorrige.find({
  position: { $near: { $geometry: { type: "Point", coordinates: TOULON }, $maxDistance: 300000 } } }).itcount();
l("$near sur poissonsCorrige :", proches + " observations a moins de 300 km de Toulon");

print("");
print("  La latitude et la longitude SONT dans le document malade. Mais elles");
print("  n'y sont pas sous forme GeoJSON, donc pas d'index 2dsphere, donc pas");
print("  de $near, pas de $geoWithin, pas de recherche par rayon.");
print("");
print("  La donnee est la. La capacite ne l'est pas. C'est la difference");
print("  entre STOCKER une information et la rendre EXPLOITABLE.");
print("");
print("  AU PASSAGE, un piege rencontre en ecrivant cette demonstration :");
print("  countDocuments() enveloppe son filtre dans un $match d'agregation,");
print("  ou $near est INTERDIT. Il faut un curseur find().itcount(). Le");
print("  message d'erreur, lui, est excellent - il suggere $geoWithin.");


// =============================================================================
titre("PATHOLOGIE 9 - LA REFERENCE QUI NE POINTE NULLE PART");
// =============================================================================

print("");
l("navireObservateur stocke :", JSON.stringify(base.poissons.findOne().navireObservateur));
print("");
const jointureCassee = base.poissons.aggregate([
  { $lookup: { from: "navires", localField: "navireObservateur", foreignField: "_id", as: "n" } },
  { $group: { _id: null, total: { $sum: 1 }, resolus: { $sum: { $size: "$n" } } } }
]).toArray()[0];
l("$lookup vers navires._id :", jointureCassee.resolus + " resolus sur " + jointureCassee.total);

const jointureOk = base.poissonsCorrige.aggregate([
  { $match: { navireObservateur: { $ne: null } } },
  { $lookup: { from: "navires", localField: "navireObservateur.id", foreignField: "_id", as: "n" } },
  { $group: { _id: null, total: { $sum: 1 }, resolus: { $sum: { $size: "$n" } } } }
]).toArray()[0];
l("chez le corrige          :", jointureOk.resolus + " resolus sur " + jointureOk.total);

print("\n  ZERO resolution, et AUCUNE ERREUR. $lookup est une jointure gauche :");
print("  un tableau vide est un resultat parfaitement valide.");
print("");
print("  MongoDB ne verifie aucune reference. Un identifiant faux s'insere");
print("  sans broncher et se decouvre des mois plus tard, quand quelqu'un");
print("  s'etonne qu'un ecran soit vide.");
print("");
print("  C'est le prix du sans-schema, et il se paie au moment ou on l'a");
print("  oublie. Le controle doit etre ECRIT dans l'application.");


// =============================================================================
titre("LE BILAN, EN CHIFFRES");
// =============================================================================
print("");
l("                    ", "MALADE".padStart(12), "CORRIGE".padStart(12), "  FACTEUR");
l("donnees (Ko)        ", String(Math.round(sM.size/1024)).padStart(12),
  String(Math.round(sS.size/1024)).padStart(12),
  "  " + (sM.size / sS.size).toFixed(1) + " x");
l("index (Ko)          ", String(Math.round(sM.totalIndexSize/1024)).padStart(12),
  String(Math.round(sS.totalIndexSize/1024)).padStart(12),
  "  " + (sM.totalIndexSize / sS.totalIndexSize).toFixed(1) + " x");
l("nombre d'index      ", String(sM.nindexes).padStart(12), String(sS.nindexes).padStart(12));
l("document moyen      ", String(Math.round(sM.avgObjSize)).padStart(12),
  String(Math.round(sS.avgObjSize)).padStart(12),
  "  " + (sM.avgObjSize / sS.avgObjSize).toFixed(1) + " x");

print("\n  Meme information. Meme nombre de documents.");

titre("CE QU'IL FAUT EN RETENIR");
print("");
print("  Aucune de ces dix pathologies ne provoque d'ERREUR. C'est ce qui les");
print("  rend dangereuses : la collection repond, les ecrans s'affichent, les");
print("  rapports sortent. Ils sont simplement FAUX, ou lents, ou les deux.");
print("");
print("  Trois d'entre elles produisent des resultats silencieusement");
print("  INCOMPLETS - les types melanges, la casse, la reference cassee. Un");
print("  test qui compte des lignes ne les verra jamais.");
print("");
print("  L'absence de schema declare n'est pas l'absence de schema. Le schema");
print("  existe toujours : il est simplement porte par l'application. Si");
print("  personne ne le tient, personne ne le tient.");
print("");
print("  Les parades, dans l'ordre :");
print("    1. un schema de validation ($jsonSchema) sur la collection ;");
print("    2. une couche de mapping unique - c'est ce que fait Spring Data ;");
print("    3. la normalisation A L'ECRITURE, jamais a la lecture ;");
print("    4. $indexStats en revue trimestrielle.");
