// =============================================================================
// 00b - GENERATION DU VOLUME : membresEquipage et journauxBord
// =============================================================================
// A jouer UNE FOIS, juste apres 00-jeu-de-donnees.js :
//
//     make charger F=mongosh/00b-generer-volume.js
//
// Produit ~2 000 membres d'equipage et 100 000 releves de journal de bord.
// Duree indicative : 10 a 30 secondes.
//
// Le generateur est DETERMINISTE (generateur congruentiel a graine fixe) :
// tout le monde en salle obtient exactement les memes documents, donc les
// memes sorties d'explain(). C'est ce qui rend la demonstration du module
// Performance reproductible d'une session a l'autre.
// =============================================================================

const base = db.getSiblingDB("amiraute");

// Generateur pseudo-aleatoire a graine fixe (Lehmer / Park-Miller).
let graine = 20260826;
function alea() { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; }
function entre(min, max) { return min + alea() * (max - min); }
function entier(min, max) { return Math.floor(entre(min, max + 1)); }
function parmi(liste) { return liste[entier(0, liste.length - 1)]; }

const navires = base.navires.find(
  { statut: { $nin: ["DESARME"] } },
  { _id: 1, nom: 1, equipageMax: 1, positionActuelle: 1, vitesseMaxNoeuds: 1 }
).toArray();

print("navires en service retenus : " + navires.length);


// -----------------------------------------------------------------------------
// membresEquipage - le 1-N a forte cardinalite, DELIBEREMENT non embarque
// -----------------------------------------------------------------------------
print("\n--- membresEquipage ---");
base.membresEquipage.deleteMany({});

const PRENOMS = ["Claire", "Julien", "Amine", "Sofia", "Lucas", "Nadia", "Thomas", "Ines",
                 "Marc", "Elodie", "Hugo", "Sarah", "Paul", "Leila", "Antoine", "Camille",
                 "Yanis", "Manon", "Victor", "Chloe", "Rachid", "Emma", "Louis", "Fanny"];
const NOMS    = ["Lemoine", "Barreau", "Ferrand", "Nguyen", "Diallo", "Marchand", "Roussel",
                 "Perrot", "Benali", "Chevalier", "Lacroix", "Moreau", "Fontaine", "Guerin",
                 "Sanchez", "Weber", "Olivier", "Tanguy", "Rossi", "Kowalski", "Andersen",
                 "Costa", "Bouvier", "Renaud"];
const GRADES  = ["MATELOT", "QUARTIER_MAITRE", "SECOND_MAITRE", "MAITRE", "PREMIER_MAITRE",
                 "MAJOR", "ENSEIGNE_DE_VAISSEAU", "LIEUTENANT_DE_VAISSEAU",
                 "CAPITAINE_DE_CORVETTE", "CAPITAINE_DE_FREGATE", "CAPITAINE_DE_VAISSEAU"];
const SPECIALITES = ["PONT", "MACHINE", "ARMEMENT", "SONAR", "RADAR", "TRANSMISSIONS",
                     "AERONAUTIQUE", "SANTE", "COMMISSARIAT", "NUCLEAIRE"];

let equipages = [];
let matricule = 0;

navires.forEach(function (n) {
  // Effectif represente : proportionnel a l'equipage reel, borne pour rester
  // lisible en salle tout en gardant l'ordre de grandeur relatif entre navires.
  const effectif = Math.max(14, Math.min(110, Math.round((n.equipageMax || 150) / 13)));
  for (let i = 0; i < effectif; i++) {
    const annee = entier(2008, 2025);
    equipages.push({
      navireId: n._id,
      matricule: "M-" + annee + "-" + String(++matricule).padStart(6, "0"),
      nom: parmi(NOMS),
      prenom: parmi(PRENOMS),
      grade: parmi(GRADES),
      specialite: parmi(SPECIALITES),
      dateEnrolement: new Date(Date.UTC(annee, entier(0, 11), entier(1, 28)))
    });
  }
});

for (let i = 0; i < equipages.length; i += 1000) {
  base.membresEquipage.insertMany(equipages.slice(i, i + 1000));
}
print("inseres : " + base.membresEquipage.countDocuments());


// -----------------------------------------------------------------------------
// PATTERN - SUBSET
//
// L'equipage complet reste dans sa collection : cardinalite non bornee.
// Mais l'ecran "fiche du navire" affiche TOUJOURS l'etat-major, et jamais les
// 1 949 autres marins.
//
// On PROMEUT donc ce sous-ensemble dans le navire. La fiche se rend en une
// lecture, et la pagination de l'equipage complet reste possible.
//
// C'est la troisieme voie, entre le tout-embarque et le tout-reference.
// -----------------------------------------------------------------------------
print("\n--- etat-major (Subset) ---");

const ROLES = ["COMMANDANT", "SECOND", "CHEF_MECANICIEN",
               "OFFICIER_ARMEMENT", "OFFICIER_NAVIGATION"];
// Le pacha d'un porte-avions n'a pas le grade du pacha d'un patrouilleur.
const GRADE_PAR_ROLE = {
  COMMANDANT:          ["CAPITAINE_DE_VAISSEAU", "CAPITAINE_DE_FREGATE"],
  SECOND:              ["CAPITAINE_DE_FREGATE", "CAPITAINE_DE_CORVETTE"],
  CHEF_MECANICIEN:     ["CAPITAINE_DE_CORVETTE", "LIEUTENANT_DE_VAISSEAU"],
  OFFICIER_ARMEMENT:   ["LIEUTENANT_DE_VAISSEAU", "ENSEIGNE_DE_VAISSEAU"],
  OFFICIER_NAVIGATION: ["LIEUTENANT_DE_VAISSEAU", "ENSEIGNE_DE_VAISSEAU"]
};

let promus = 0;
navires.forEach(function (n) {
  const equipage = base.membresEquipage.find({ navireId: n._id }).toArray();
  if (equipage.length === 0) { return; }

  const gros = (n.equipageMax || 0) > 800;   // porte-avions et gros batiments
  const etatMajor = ROLES.map(function (role, i) {
    const m = equipage[i % equipage.length];
    const grades = GRADE_PAR_ROLE[role];
    const grade = grades[gros ? 0 : 1];

    // Le grade officiel est aussi ecrit sur le membre d'equipage : la
    // collection reste la SOURCE DE VERITE, le navire n'en porte qu'une copie.
    base.membresEquipage.updateOne({ _id: m._id }, { $set: { grade: grade, role: role } });

    return { role: role, grade: grade, nom: m.nom, prenom: m.prenom, matricule: m.matricule };
  });

  base.navires.updateOne({ _id: n._id }, {
    $set: {
      etatMajor: etatMajor,
      "stats.effectifActuel": equipage.length
    }
  });
  promus++;
});
print("etats-majors constitues : " + promus);


// -----------------------------------------------------------------------------
// journauxBord - le volume, support du module Performance
// -----------------------------------------------------------------------------
print("\n--- journauxBord ---");
base.journauxBord.drop();
base.createCollection("journauxBord");

const CIBLE = 100000;
const EVENEMENTS = ["APPAREILLAGE", "MOUILLAGE", "RAVITAILLEMENT", "EXERCICE_TIR",
                    "DETECTION_SONAR", "AVARIE_MINEURE", "RELEVE_METEO"];

// Point de depart : la position connue du navire, ou un point plausible.
const positionnes = navires.filter(function (n) { return n.positionActuelle; });
const parNavire = Math.ceil(CIBLE / positionnes.length);
const DEBUT = Date.UTC(2026, 6, 1, 0, 0, 0);          // 1er juillet 2026
const PAS_MS = Math.floor((30 * 24 * 3600 * 1000) / parNavire);

let lot = [];
let total = 0;

positionnes.forEach(function (n) {
  let lon = n.positionActuelle.coordinates[0];
  let lat = n.positionActuelle.coordinates[1];
  let cap = entier(0, 359);
  let carburant = entre(55, 100);
  const vitesseCroisiere = (n.vitesseMaxNoeuds || 25) * 0.6;

  for (let i = 0; i < parNavire && total < CIBLE; i++) {
    // Marche aleatoire : le cap derive lentement, la position suit le cap.
    cap = (cap + entier(-4, 4) + 360) % 360;
    const vitesse = Math.max(0, vitesseCroisiere + entre(-4, 4));
    const rad = cap * Math.PI / 180;
    lat += Math.cos(rad) * vitesse * 0.0009;
    lon += Math.sin(rad) * vitesse * 0.0009;
    // Demi-tour au-dela des hautes latitudes, plutot qu'un ecretage qui
    // empilerait des dizaines de releves sur la meme valeur de latitude.
    if (lat > 78 || lat < -78) { cap = (cap + 180) % 360; lat = Math.max(-78, Math.min(78, lat)); }
    if (lon > 180) { lon -= 360; } if (lon < -180) { lon += 360; }

    carburant -= 0.012;
    if (carburant < 12) { carburant = 100; }            // ravitaillement

    lot.push({
      navireId: n._id,
      horodatage: new Date(DEBUT + i * PAS_MS),
      position: { type: "Point", coordinates: [Math.round(lon * 1e4) / 1e4,
                                               Math.round(lat * 1e4) / 1e4] },
      vitesseNoeuds: Math.round(vitesse * 10) / 10,
      capDegres: cap,
      carburantPourcent: Math.round(carburant * 10) / 10
    });
    // 1 releve sur 400 porte un evenement. Ailleurs le champ est ABSENT,
    // et non pas null : c'est ce qui permet a l'index partiel
    // { evenement: { $exists: true } } de ne contenir que ~250 entrees au
    // lieu de 100 000. Un champ a null EXISTE, et serait donc indexe.
    if (alea() < 0.0025) { lot[lot.length - 1].evenement = parmi(EVENEMENTS); }
    total++;

    if (lot.length >= 5000) {
      base.journauxBord.insertMany(lot, { ordered: false });
      lot = [];
      if (total % 25000 === 0) { print("  " + total + " / " + CIBLE); }
    }
  }
});

if (lot.length) { base.journauxBord.insertMany(lot, { ordered: false }); }

print("inseres : " + base.journauxBord.countDocuments());

// -----------------------------------------------------------------------------
// PATTERN - COMPUTED (suite)
//
// stats.dernierReleve evite d'aller chercher le dernier document du journal
// a chaque affichage de la fiche navire. Un tri sur 100 000 documents devient
// une lecture de champ.
// -----------------------------------------------------------------------------
print("\n--- stats.dernierReleve (Computed) ---");
let calcules = 0;
positionnes.forEach(function (n) {
  const dernier = base.journauxBord.find({ navireId: n._id })
                      .sort({ horodatage: -1 }).limit(1).toArray()[0];
  if (dernier) {
    base.navires.updateOne({ _id: n._id }, { $set: { "stats.dernierReleve": {
      horodatage: dernier.horodatage,
      vitesseNoeuds: dernier.vitesseNoeuds,
      carburantPourcent: dernier.carburantPourcent
    } } });
    calcules++;
  }
});
print("derniers releves reportes : " + calcules);

print("\n=== Volume genere ===");
print("  membresEquipage : " + base.membresEquipage.countDocuments());
print("  journauxBord    : " + base.journauxBord.countDocuments());
print("  avec evenement  : " + base.journauxBord.countDocuments({ evenement: { $exists: true } }));
print("");
print("AUCUN index n'a ete cree volontairement : le script 04 part d'une");
print("collection nue pour mesurer l'apport de chaque index.");
