// =============================================================================
// 00c - LE BANC DE POISSONS : une collection deliberement MAL MODELISEE
// =============================================================================
//     make charger F=mongosh/00c-poissons.js
//
// POURQUOI CETTE COLLECTION EXISTE
// --------------------------------
// Tout le reste du projet est un contre-exemple par l'exemple : on montre le
// bon modele, et on explique pourquoi il est bon. Cela laisse un angle mort -
// les stagiaires n'ont jamais vu, EN VRAI, ce que produit une mauvaise
// modelisation.
//
// poissons est cet angle mort comble. Elle contient neuf pathologies
// classiques, toutes MESURABLES avec les outils du J3.
//
// ELLE NE POLLUE RIEN
// -------------------
// Aucun navire, aucune mission, aucun index du projet ne la reference. Elle
// est totalement isolee : la supprimer n'a aucun effet sur le reste.
//   - poissons          : la version malade
//   - poissonsCorrige   : la meme donnee, bien modelisee
//
// L'autopsie comparee est dans mongosh/11-antipatterns.js.
// =============================================================================

const base = db.getSiblingDB("amiraute");
base.poissons.drop();
base.poissonsCorrige.drop();

let graine = 31415926;
function alea() { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; }
function entier(a, b) { return a + Math.floor(alea() * (b - a + 1)); }
function parmi(l) { return l[entier(0, l.length - 1)]; }

const ESPECES = [
  "Thon rouge", "Merlu", "Sardine", "Maquereau", "Espadon",
  "Requin bleu", "Dorade", "Bar", "Lieu noir", "Cabillaud"
];
const ZONES = ["Golfe de Gascogne", "Mer du Nord", "Mediterranee occidentale",
               "Manche", "Atlantique Nord-Est"];
const ENGINS = ["CHALUT", "PALANGRE", "SENNE", "FILET_DERIVANT", "LIGNE"];

// Une "photo" : chaine base64 factice, mais de taille realiste.
function photo(ko) { return "data:image/jpeg;base64," + "/9j/4AAQSkZJRg".repeat(ko * 70); }

print("Generation de 4 000 observations halieutiques...\n");

const CIBLE = 4000;
let lot = [];

for (let i = 1; i <= CIBLE; i++) {
  const espece = parmi(ESPECES);
  const jour = entier(1, 28), mois = entier(1, 12);

  const d = {
    reference: "OBS-" + String(i).padStart(5, "0"),

    // PATHOLOGIE 1 - NOMMAGE INCOHERENT
    // Le meme concept sous trois noms differents selon le document. Aucune
    // requete ne peut les couvrir tous sans $or, et aucun index ne sert.
    [parmi(["espece", "Espece", "nomEspece"])]:
      // PATHOLOGIE 2 - CASSE ET ACCENTS NON NORMALISES
      // "Thon rouge", "thon rouge", "THON ROUGE" sont trois valeurs
      // distinctes pour MongoDB. L'egalite exacte devient inutilisable.
      parmi([espece, espece.toLowerCase(), espece.toUpperCase()]),

    // PATHOLOGIE 3 - TYPES INCOHERENTS SUR LE MEME CHAMP
    // Un tiers des poids est stocke en CHAINE. { $gt: 400 } ne les verra
    // jamais, silencieusement : une chaine n'est pas comparable a un nombre.
    poidsGrammes: alea() < 0.33 ? String(entier(80, 90000)) : entier(80, 90000),

    // PATHOLOGIE 4 - DATE EN CHAINE, AU FORMAT LOCAL
    // "07/03/2026" ne se trie pas, ne s'intervalle pas, et son index ne sert
    // qu'a l'egalite exacte. En prime le format est ambigu : 07/03 est-il
    // le 7 mars ou le 3 juillet ?
    dateCapture: String(jour).padStart(2, "0") + "/" + String(mois).padStart(2, "0") + "/2026",

    zone: parmi(ZONES),
    engin: parmi(ENGINS),

    // PATHOLOGIE 5 - CHAMP A CARDINALITE 1
    // Present sur les 4 000 documents avec la meme valeur. On l'indexera
    // quand meme, plus bas : un index parfaitement inutile.
    type: "OBSERVATION",

    // PATHOLOGIE 6 - IMBRICATION PROFONDE ET GRATUITE
    // Six niveaux pour ranger une latitude. Chaque niveau est un chemin de
    // plus a ecrire, et l'index doit porter le chemin complet.
    metadonnees: { collecte: { contexte: { navire: { position: {
      coordonnees: { latitude: Math.round(entier(3500, 6000) / 100 * 100) / 100,
                     longitude: Math.round(entier(-1000, 900) / 100 * 100) / 100 } } } } } },

    // PATHOLOGIE 7 - REFERENCE CASSEE
    // On stocke un numero de coque, pas un identifiant. Le $lookup vers
    // navires._id ne remontera jamais rien - et personne ne s'en apercevra
    // avant des mois, parce qu'un $lookup vide ne leve aucune erreur.
    navireObservateur: parmi(["R91", "D620", "S635", "CVN-78", "R08"]),

    observations: []
  };

  // PATHOLOGIE 8 - TABLEAU NON BORNE
  // Une poignee de documents accumule des milliers de sous-documents. Le
  // document entier est reecrit a chaque ajout, et on marche vers la limite
  // de 16 Mo sans jamais recevoir d'avertissement.
  const nb = alea() < 0.02 ? entier(800, 2000) : entier(0, 4);
  for (let j = 0; j < nb; j++) {
    d.observations.push({
      instant: String(entier(0, 23)).padStart(2, "0") + ":" + String(entier(0, 59)).padStart(2, "0"),
      profondeurM: entier(2, 900),
      temperatureC: Math.round(entier(400, 2600) / 100 * 100) / 100,
      commentaire: "Releve automatique du capteur embarque, sequence " + j
    });
  }

  // PATHOLOGIE 9 - BINAIRE EMBARQUE
  // Une photo de 80 Ko dans le document. Elle est relue a CHAQUE lecture,
  // meme quand l'ecran n'affiche que le nom de l'espece.
  if (alea() < 0.05) { d.photo = photo(80); }

  lot.push(d);
  if (lot.length >= 500) { base.poissons.insertMany(lot, { ordered: false }); lot = []; }
}
if (lot.length) { base.poissons.insertMany(lot, { ordered: false }); }

// ---------------------------------------------------------------------------
// PATHOLOGIE 10 - SUR-INDEXATION
// Neuf index sur une collection de 4 000 documents. Chacun est paye a CHAQUE
// ecriture. Plusieurs ne serviront jamais.
// ---------------------------------------------------------------------------
[["zone", 1], ["engin", 1], ["type", 1], ["dateCapture", 1], ["reference", 1],
 ["navireObservateur", 1], ["poidsGrammes", 1],
 ["metadonnees.collecte.contexte.navire.position.coordonnees.latitude", 1]
].forEach(function (k) {
  const spec = {}; spec[k[0]] = k[1];
  base.poissons.createIndex(spec);
});
base.poissons.createIndex({ zone: 1, engin: 1, type: 1, dateCapture: 1 });

print("poissons          : " + base.poissons.countDocuments() + " documents, " +
      base.poissons.getIndexes().length + " index");


// ===========================================================================
// LA MEME DONNEE, BIEN MODELISEE
// ===========================================================================
// Un seul nom par concept, des types coherents, des vraies dates, une
// imbrication plate, une reference resolue, et les gros tableaux sortis
// dans leur propre collection.
// ===========================================================================

const MOIS = {};
const idParCoque = {};
base.navires.find({}, { numeroCoque: 1 }).forEach(function (n) {
  if (!idParCoque[n.numeroCoque]) { idParCoque[n.numeroCoque] = n._id; }
});

let sains = [];
let releves = [];
base.poissons.find().forEach(function (p) {
  const brut = p.espece || p.Espece || p.nomEspece;
  const nb = (p.observations || []).length;
  const [j, m, a] = p.dateCapture.split("/");

  const propre = {
    _id: p._id,
    reference: p.reference,
    // UN SEUL nom, UNE SEULE casse.
    espece: brut.charAt(0).toUpperCase() + brut.slice(1).toLowerCase(),
    // UN SEUL type.
    poidsGrammes: parseInt(p.poidsGrammes, 10),
    // Une VRAIE date.
    dateCapture: new Date(Date.UTC(parseInt(a, 10), parseInt(m, 10) - 1, parseInt(j, 10))),
    zone: p.zone,
    engin: p.engin,
    // Imbrication a plat, et en GeoJSON : indexable en 2dsphere.
    position: {
      type: "Point",
      coordinates: [
        p.metadonnees.collecte.contexte.navire.position.coordonnees.longitude,
        p.metadonnees.collecte.contexte.navire.position.coordonnees.latitude
      ]
    },
    // Reference RESOLUE, enrichie du numero de coque pour l'affichage.
    navireObservateur: idParCoque[p.navireObservateur]
      ? { id: idParCoque[p.navireObservateur], numeroCoque: p.navireObservateur }
      : null,
    // COMPUTED : le compte, pas le contenu.
    nombreReleves: nb
  };
  sains.push(propre);

  // Les releves sortent du document : cardinalite non bornee.
  (p.observations || []).forEach(function (o) {
    releves.push({ observationId: p._id, instant: o.instant,
                   profondeurM: o.profondeurM, temperatureC: o.temperatureC });
  });
});

for (let i = 0; i < sains.length; i += 500) {
  base.poissonsCorrige.insertMany(sains.slice(i, i + 500), { ordered: false });
}
base.poissonsCorrige.createIndex({ espece: 1, dateCapture: -1 });
base.poissonsCorrige.createIndex({ zone: 1, poidsGrammes: -1 });
base.poissonsCorrige.createIndex({ position: "2dsphere" });
// Index sur la date SEULE : "les captures de mars" et "les plus recentes"
// sont deux acces reels, et dateCapture n'est pas prefixe de l'index
// compose ci-dessus. Sans lui, ces deux requetes balaieraient tout.
base.poissonsCorrige.createIndex({ dateCapture: -1 });

print("poissonsCorrige   : " + base.poissonsCorrige.countDocuments() + " documents, " +
      base.poissonsCorrige.getIndexes().length + " index");
print("releves extraits  : " + releves.length + " (restes hors du document)");
print("");
print("Autopsie comparee : mongosh/11-antipatterns.js");
