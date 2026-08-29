// =============================================================================
// AMIRAUTE - Jeu de donnees de reference
// =============================================================================
// A jouer UNE FOIS en debut de J1, avant tout le reste :
//     make charger F=mongosh/00-jeu-de-donnees.js
//
// Contenu : ports, flottes, navires, missions. Donnees reelles ou plausibles.
// Les deux grosses collections (membresEquipage, journauxBord) sont generees
// par l'application Spring, pas ici.
//
// Le script est idempotent : il purge avant d'inserer.
// =============================================================================

const base = db.getSiblingDB("amiraute");

base.missions.deleteMany({});
base.navires.deleteMany({});
base.flottes.deleteMany({});
base.ports.deleteMany({});

// -----------------------------------------------------------------------------
// PORTS - _id lisible plutot qu'un ObjectId : les sorties de $lookup restent
// dechiffrables au videoprojecteur.
// -----------------------------------------------------------------------------
base.ports.insertMany([
  { _id: "TOULON",      nom: "Toulon",       pays: "France",       localisation: { type: "Point", coordinates: [  5.93, 43.12] }, capaciteNavires: 60, profondeurBassinMetres: 14.5 },
  { _id: "BREST",       nom: "Brest",        pays: "France",       localisation: { type: "Point", coordinates: [ -4.49, 48.38] }, capaciteNavires: 40, profondeurBassinMetres: 12.0 },
  { _id: "NORFOLK",     nom: "Norfolk",      pays: "Etats-Unis",   localisation: { type: "Point", coordinates: [-76.33, 36.95] }, capaciteNavires: 75, profondeurBassinMetres: 15.2 },
  { _id: "SAN_DIEGO",   nom: "San Diego",    pays: "Etats-Unis",   localisation: { type: "Point", coordinates: [-117.18, 32.68] }, capaciteNavires: 70, profondeurBassinMetres: 13.7 },
  { _id: "PORTSMOUTH",  nom: "Portsmouth",   pays: "Royaume-Uni",  localisation: { type: "Point", coordinates: [ -1.10, 50.80] }, capaciteNavires: 35, profondeurBassinMetres: 11.5 },
  { _id: "DEVONPORT",   nom: "Devonport",    pays: "Royaume-Uni",  localisation: { type: "Point", coordinates: [ -4.18, 50.39] }, capaciteNavires: 30, profondeurBassinMetres: 10.8 },
  { _id: "FASLANE",     nom: "Faslane",      pays: "Royaume-Uni",  localisation: { type: "Point", coordinates: [ -4.82, 56.06] }, capaciteNavires: 15, profondeurBassinMetres: 16.0 },
  { _id: "SEVEROMORSK", nom: "Severomorsk",  pays: "Russie",       localisation: { type: "Point", coordinates: [ 33.42, 69.07] }, capaciteNavires: 45, profondeurBassinMetres: 13.0 },
  { _id: "VLADIVOSTOK", nom: "Vladivostok",  pays: "Russie",       localisation: { type: "Point", coordinates: [131.88, 43.10] }, capaciteNavires: 40, profondeurBassinMetres: 12.5 },
  { _id: "QINGDAO",     nom: "Qingdao",      pays: "Chine",        localisation: { type: "Point", coordinates: [120.38, 36.07] }, capaciteNavires: 55, profondeurBassinMetres: 14.0 },
  { _id: "SANYA",       nom: "Sanya",        pays: "Chine",        localisation: { type: "Point", coordinates: [109.51, 18.23] }, capaciteNavires: 50, profondeurBassinMetres: 15.0 },
  { _id: "YOKOSUKA",    nom: "Yokosuka",     pays: "Japon",        localisation: { type: "Point", coordinates: [139.67, 35.29] }, capaciteNavires: 40, profondeurBassinMetres: 13.4 },
  { _id: "KARWAR",      nom: "Karwar",       pays: "Inde",         localisation: { type: "Point", coordinates: [ 74.13, 14.81] }, capaciteNavires: 32, profondeurBassinMetres: 12.2 },
  { _id: "TARENTE",     nom: "Tarente",      pays: "Italie",       localisation: { type: "Point", coordinates: [ 17.23, 40.47] }, capaciteNavires: 28, profondeurBassinMetres: 11.9 }
]);

// -----------------------------------------------------------------------------
// FLOTTES - amiralCommandant est un sous-document ; le navire portera une
// reference ENRICHIE vers la flotte (voir la mise en forme, plus bas).
// La meme collection porte donc les deux mecanismes : c'est voulu (cf. CONCEPTION 4.3).
// -----------------------------------------------------------------------------
base.flottes.insertMany([
  { _id: "FAN",     nom: "Force d'Action Navale",              nation: "France",      anneeCreation: 1990, amiralCommandant: { grade: "Vice-amiral d'escadre", nom: "Perrier" } },
  { _id: "FOST",    nom: "Force Oceanique Strategique",        nation: "France",      anneeCreation: 1972, amiralCommandant: { grade: "Vice-amiral d'escadre", nom: "Vaujour" } },
  { _id: "USFF",    nom: "United States Fleet Forces Command", nation: "Etats-Unis",  anneeCreation: 1906, amiralCommandant: { grade: "Admiral",               nom: "Caudle" } },
  { _id: "PACFLT",  nom: "United States Pacific Fleet",        nation: "Etats-Unis",  anneeCreation: 1907, amiralCommandant: { grade: "Admiral",               nom: "Paparo" } },
  { _id: "RNSF",    nom: "Royal Navy Surface Fleet",           nation: "Royaume-Uni", anneeCreation: 1971, amiralCommandant: { grade: "Rear Admiral",          nom: "Blount" } },
  { _id: "RNSM",    nom: "Royal Navy Submarine Service",       nation: "Royaume-Uni", anneeCreation: 1901, amiralCommandant: { grade: "Rear Admiral",          nom: "Perks" } },
  { _id: "SEVFLT",  nom: "Flotte du Nord",                     nation: "Russie",      anneeCreation: 1933, amiralCommandant: { grade: "Amiral",               nom: "Moisseev" } },
  { _id: "PACRU",   nom: "Flotte du Pacifique",                nation: "Russie",      anneeCreation: 1731, amiralCommandant: { grade: "Amiral",               nom: "Liina" } },
  { _id: "PLANSTC", nom: "Commandement du Theatre Sud",        nation: "Chine",       anneeCreation: 2016, amiralCommandant: { grade: "Vice-amiral",          nom: "Wang" } },
  { _id: "PLANNTC", nom: "Commandement du Theatre Nord",       nation: "Chine",       anneeCreation: 2016, amiralCommandant: { grade: "Vice-amiral",          nom: "Liu" } },
  { _id: "JMSDF1",  nom: "1re Flottille d'Escorte",            nation: "Japon",       anneeCreation: 1961, amiralCommandant: { grade: "Contre-amiral",        nom: "Saito" } },
  { _id: "INWNC",   nom: "Commandement Naval Ouest",           nation: "Inde",        anneeCreation: 1968, amiralCommandant: { grade: "Vice Admiral",         nom: "Pendharkar" } },
  { _id: "ITSQN",   nom: "Squadra Navale",                     nation: "Italie",      anneeCreation: 1861, amiralCommandant: { grade: "Ammiraglio di squadra", nom: "Berutti" } }
]);

print("[amiraute] " + base.ports.countDocuments() + " ports, " + base.flottes.countDocuments() + " flottes");

// -----------------------------------------------------------------------------
// NAVIRES - le document riche du projet.
//
// A observer en salle :
//   - autonomieMillesNautiques vaut null sur les batiments nucleaires
//     (autonomie illimitee) mais est ABSENT sur ceux dont la donnee est
//     inconnue. C'est le support de la lecon $exists vs $eq:null.
//   - positionActuelle est absent des navires desarmes.
//   - numeroCoque n'est unique QUE par nation : R91 et 101 existent ailleurs.
// -----------------------------------------------------------------------------
const chargement = ISODate("2026-08-26T08:00:00Z");

base.navires.insertMany([

  // ---------------------------------------------------------------- FRANCE --
  { numeroCoque: "R91", nom: "Charles de Gaulle", classe: "Charles de Gaulle",
    type: "PORTE_AVIONS", nation: "France", anneeMiseEnService: 2001, statut: "ACTIF",
    deplacementTonnes: 42500, longueurMetres: 261.5, largeurMetres: 64.4, tirantEauMetres: 9.4,
    vitesseMaxNoeuds: 27, autonomieMillesNautiques: null, equipageMax: 1950,
    propulsion: { type: "NUCLEAIRE", puissanceChevaux: 83000, nombreHelices: 2, nombreReacteurs: 2 },
    armements: [
      { designation: "Sylver A43 / Aster 15", categorie: "MISSILE_ANTIAERIEN", quantite: 32, porteeKm: 30, calibreMm: null },
      { designation: "Mistral SADRAL",        categorie: "MISSILE_ANTIAERIEN", quantite: 12, porteeKm: 6,  calibreMm: null },
      { designation: "Giat 20F2",             categorie: "CANON",              quantite: 8,  porteeKm: 2,  calibreMm: 20 }],
    capteurs: [
      { designation: "DRBJ-11B", categorie: "RADAR",              porteeKm: 400 },
      { designation: "DRBV-26D", categorie: "RADAR",              porteeKm: 300 },
      { designation: "ARBR-21",  categorie: "GUERRE_ELECTRONIQUE", porteeKm: null }],
    positionActuelle: { type: "Point", coordinates: [5.93, 43.10] },
    portAttacheId: "TOULON", flotteId: "FAN",
    devise: "Servir sans faillir", etiquettes: ["nucleaire", "aviation", "otan", "amiral"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "L9013", nom: "Mistral", classe: "Mistral",
    type: "PORTE_HELICOPTERES", nation: "France", anneeMiseEnService: 2006, statut: "ACTIF",
    deplacementTonnes: 21500, longueurMetres: 199.0, largeurMetres: 32.0, tirantEauMetres: 6.3,
    vitesseMaxNoeuds: 19, autonomieMillesNautiques: 10800, equipageMax: 180,
    propulsion: { type: "DIESEL_ELECTRIQUE", puissanceChevaux: 27000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Simbad Mistral", categorie: "MISSILE_ANTIAERIEN", quantite: 2, porteeKm: 6, calibreMm: null },
      { designation: "Breda-Mauser",   categorie: "CANON",              quantite: 2, porteeKm: 3, calibreMm: 30 }],
    capteurs: [
      { designation: "MRR-3D NG", categorie: "RADAR",      porteeKm: 180 },
      { designation: "EOMS NG",   categorie: "OPTRONIQUE", porteeKm: 25 }],
    positionActuelle: { type: "Point", coordinates: [5.91, 43.11] },
    portAttacheId: "TOULON", flotteId: "FAN",
    devise: "Projeter et soutenir", etiquettes: ["amphibie", "otan", "humanitaire"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "D620", nom: "Forbin", classe: "Horizon",
    type: "DESTROYER", nation: "France", anneeMiseEnService: 2010, statut: "ACTIF",
    deplacementTonnes: 7050, longueurMetres: 152.9, largeurMetres: 20.3, tirantEauMetres: 5.4,
    vitesseMaxNoeuds: 29, autonomieMillesNautiques: 7000, equipageMax: 195,
    propulsion: { type: "HYBRIDE", puissanceChevaux: 62000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Sylver A50 / Aster 30", categorie: "MISSILE_ANTIAERIEN",  quantite: 48, porteeKm: 120, calibreMm: null },
      { designation: "Exocet MM40 Block 3",   categorie: "MISSILE_ANTINAVIRE",  quantite: 8,  porteeKm: 180, calibreMm: null },
      { designation: "Oto Melara 76",         categorie: "CANON",               quantite: 2,  porteeKm: 16,  calibreMm: 76 },
      { designation: "MU90",                  categorie: "TORPILLE",            quantite: 4,  porteeKm: 12,  calibreMm: 324 }],
    capteurs: [
      { designation: "EMPAR",  categorie: "RADAR", porteeKm: 180 },
      { designation: "S1850M", categorie: "RADAR", porteeKm: 400 },
      { designation: "UMS 4110", categorie: "SONAR", porteeKm: 60 }],
    positionActuelle: { type: "Point", coordinates: [7.42, 41.55] },
    portAttacheId: "TOULON", flotteId: "FAN",
    devise: "Fort et bon", etiquettes: ["defense-aerienne", "otan"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "D621", nom: "Chevalier Paul", classe: "Horizon",
    type: "DESTROYER", nation: "France", anneeMiseEnService: 2011, statut: "EN_REPARATION",
    deplacementTonnes: 7050, longueurMetres: 152.9, largeurMetres: 20.3, tirantEauMetres: 5.4,
    vitesseMaxNoeuds: 29, autonomieMillesNautiques: 7000, equipageMax: 195,
    propulsion: { type: "HYBRIDE", puissanceChevaux: 62000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Sylver A50 / Aster 30", categorie: "MISSILE_ANTIAERIEN", quantite: 48, porteeKm: 120, calibreMm: null },
      { designation: "Exocet MM40 Block 3",   categorie: "MISSILE_ANTINAVIRE", quantite: 8,  porteeKm: 180, calibreMm: null },
      { designation: "Oto Melara 76",         categorie: "CANON",              quantite: 2,  porteeKm: 16,  calibreMm: 76 }],
    capteurs: [
      { designation: "EMPAR",  categorie: "RADAR", porteeKm: 180 },
      { designation: "S1850M", categorie: "RADAR", porteeKm: 400 }],
    positionActuelle: { type: "Point", coordinates: [5.93, 43.12] },
    portAttacheId: "TOULON", flotteId: "FAN",
    devise: "Sans peur et sans reproche", etiquettes: ["defense-aerienne", "otan"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "D650", nom: "Aquitaine", classe: "FREMM",
    type: "FREGATE", nation: "France", anneeMiseEnService: 2012, statut: "ACTIF",
    deplacementTonnes: 6000, longueurMetres: 142.0, largeurMetres: 20.0, tirantEauMetres: 5.0,
    vitesseMaxNoeuds: 27, autonomieMillesNautiques: 6000, equipageMax: 145,
    propulsion: { type: "HYBRIDE", puissanceChevaux: 43000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Sylver A43 / Aster 15", categorie: "MISSILE_ANTIAERIEN", quantite: 16, porteeKm: 30,   calibreMm: null },
      { designation: "MdCN",                  categorie: "MISSILE_CROISIERE",  quantite: 16, porteeKm: 1000, calibreMm: null },
      { designation: "Exocet MM40 Block 3",   categorie: "MISSILE_ANTINAVIRE", quantite: 8,  porteeKm: 180,  calibreMm: null },
      { designation: "MU90",                  categorie: "TORPILLE",           quantite: 4,  porteeKm: 12,   calibreMm: 324 }],
    capteurs: [
      { designation: "Herakles",  categorie: "RADAR", porteeKm: 250 },
      { designation: "CAPTAS-4",  categorie: "SONAR", porteeKm: 100 },
      { designation: "UMS 4110CL", categorie: "SONAR", porteeKm: 60 }],
    positionActuelle: { type: "Point", coordinates: [-4.51, 48.35] },
    portAttacheId: "BREST", flotteId: "FAN",
    devise: "Fiere et forte", etiquettes: ["lutte-sous-marine", "otan"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "D653", nom: "Languedoc", classe: "FREMM",
    type: "FREGATE", nation: "France", anneeMiseEnService: 2016, statut: "ACTIF",
    deplacementTonnes: 6000, longueurMetres: 142.0, largeurMetres: 20.0, tirantEauMetres: 5.0,
    vitesseMaxNoeuds: 27, autonomieMillesNautiques: 6000, equipageMax: 145,
    propulsion: { type: "HYBRIDE", puissanceChevaux: 43000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Sylver A43 / Aster 15", categorie: "MISSILE_ANTIAERIEN", quantite: 16, porteeKm: 30,  calibreMm: null },
      { designation: "Exocet MM40 Block 3",   categorie: "MISSILE_ANTINAVIRE", quantite: 8,  porteeKm: 180, calibreMm: null },
      { designation: "Oto Melara 76",         categorie: "CANON",              quantite: 1,  porteeKm: 16,  calibreMm: 76 }],
    capteurs: [
      { designation: "Herakles", categorie: "RADAR", porteeKm: 250 },
      { designation: "CAPTAS-4", categorie: "SONAR", porteeKm: 100 }],
    positionActuelle: { type: "Point", coordinates: [6.88, 42.31] },
    portAttacheId: "TOULON", flotteId: "FAN",
    devise: "Toujours en avant", etiquettes: ["lutte-sous-marine", "otan"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "D654", nom: "Auvergne", classe: "FREMM",
    type: "FREGATE", nation: "France", anneeMiseEnService: 2017, statut: "EN_MISSION",
    deplacementTonnes: 6000, longueurMetres: 142.0, largeurMetres: 20.0, tirantEauMetres: 5.0,
    vitesseMaxNoeuds: 27, autonomieMillesNautiques: 6000, equipageMax: 145,
    propulsion: { type: "HYBRIDE", puissanceChevaux: 43000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Sylver A43 / Aster 15", categorie: "MISSILE_ANTIAERIEN", quantite: 16, porteeKm: 30,  calibreMm: null },
      { designation: "Exocet MM40 Block 3",   categorie: "MISSILE_ANTINAVIRE", quantite: 8,  porteeKm: 180, calibreMm: null },
      { designation: "MU90",                  categorie: "TORPILLE",           quantite: 4,  porteeKm: 12,  calibreMm: 324 }],
    capteurs: [
      { designation: "Herakles", categorie: "RADAR", porteeKm: 250 },
      { designation: "CAPTAS-4", categorie: "SONAR", porteeKm: 100 }],
    positionActuelle: { type: "Point", coordinates: [26.41, 34.88] },
    portAttacheId: "TOULON", flotteId: "FAN",
    devise: "Terre de volcans", etiquettes: ["lutte-sous-marine", "otan", "mediterranee"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "S635", nom: "Suffren", classe: "Barracuda",
    type: "SOUS_MARIN", nation: "France", anneeMiseEnService: 2022, statut: "ACTIF",
    deplacementTonnes: 5300, longueurMetres: 99.5, largeurMetres: 8.8, tirantEauMetres: 7.3,
    vitesseMaxNoeuds: 25, autonomieMillesNautiques: null, equipageMax: 65,
    propulsion: { type: "NUCLEAIRE", puissanceChevaux: 20000, nombreHelices: 1, nombreReacteurs: 1 },
    armements: [
      { designation: "F21 Artemis",         categorie: "TORPILLE",           quantite: 20, porteeKm: 50,   calibreMm: 533 },
      { designation: "Exocet SM39",         categorie: "MISSILE_ANTINAVIRE", quantite: 4,  porteeKm: 50,   calibreMm: null },
      { designation: "MdCN",                categorie: "MISSILE_CROISIERE",  quantite: 4,  porteeKm: 1000, calibreMm: null }],
    capteurs: [
      { designation: "S-Cube", categorie: "SONAR", porteeKm: 120 }],
    positionActuelle: { type: "Point", coordinates: [4.12, 41.90] },
    portAttacheId: "TOULON", flotteId: "FOST",
    devise: "Discret et decisif", etiquettes: ["nucleaire", "furtif", "attaque"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "S619", nom: "Le Terrible", classe: "Triomphant",
    type: "SOUS_MARIN", nation: "France", anneeMiseEnService: 2010, statut: "ACTIF",
    deplacementTonnes: 14335, longueurMetres: 138.0, largeurMetres: 12.5, tirantEauMetres: 10.6,
    vitesseMaxNoeuds: 25, autonomieMillesNautiques: null, equipageMax: 110,
    propulsion: { type: "NUCLEAIRE", puissanceChevaux: 41500, nombreHelices: 1, nombreReacteurs: 1 },
    armements: [
      { designation: "M51",         categorie: "MISSILE_BALISTIQUE", quantite: 16, porteeKm: 9000, calibreMm: null },
      { designation: "F21 Artemis", categorie: "TORPILLE",           quantite: 18, porteeKm: 50,   calibreMm: 533 }],
    capteurs: [
      { designation: "DMUX 80", categorie: "SONAR", porteeKm: 150 }],
    portAttacheId: "BREST", flotteId: "FOST",
    devise: "Toujours pret", etiquettes: ["nucleaire", "dissuasion", "furtif"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "S601", nom: "Rubis", classe: "Rubis",
    type: "SOUS_MARIN", nation: "France", anneeMiseEnService: 1983, statut: "DESARME",
    deplacementTonnes: 2670, longueurMetres: 73.6, largeurMetres: 7.6, tirantEauMetres: 6.4,
    vitesseMaxNoeuds: 25, equipageMax: 70,
    propulsion: { type: "NUCLEAIRE", puissanceChevaux: 9500, nombreHelices: 1, nombreReacteurs: 1 },
    armements: [
      { designation: "F17 mod2", categorie: "TORPILLE", quantite: 14, porteeKm: 20, calibreMm: 533 }],
    capteurs: [
      { designation: "DMUX 20", categorie: "SONAR", porteeKm: 80 }],
    portAttacheId: "TOULON", flotteId: "FOST",
    devise: "Ex tenebris lux", etiquettes: ["nucleaire", "historique"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  // ------------------------------------------------------------ ETATS-UNIS --
  { numeroCoque: "CVN-78", nom: "Gerald R. Ford", classe: "Gerald R. Ford",
    type: "PORTE_AVIONS", nation: "Etats-Unis", anneeMiseEnService: 2017, statut: "ACTIF",
    deplacementTonnes: 100000, longueurMetres: 337.0, largeurMetres: 78.0, tirantEauMetres: 12.0,
    vitesseMaxNoeuds: 30, autonomieMillesNautiques: null, equipageMax: 4539,
    propulsion: { type: "NUCLEAIRE", puissanceChevaux: 280000, nombreHelices: 4, nombreReacteurs: 2 },
    armements: [
      { designation: "RIM-162 ESSM", categorie: "MISSILE_ANTIAERIEN", quantite: 32, porteeKm: 50, calibreMm: null },
      { designation: "RIM-116 RAM",  categorie: "MISSILE_ANTIAERIEN", quantite: 42, porteeKm: 9,  calibreMm: null },
      { designation: "Phalanx CIWS", categorie: "CIWS",               quantite: 3,  porteeKm: 4,  calibreMm: 20 }],
    capteurs: [
      { designation: "AN/SPY-3",  categorie: "RADAR",               porteeKm: 320 },
      { designation: "AN/SPY-4",  categorie: "RADAR",               porteeKm: 460 },
      { designation: "AN/SLQ-32", categorie: "GUERRE_ELECTRONIQUE", porteeKm: null }],
    positionActuelle: { type: "Point", coordinates: [-72.10, 34.20] },
    portAttacheId: "NORFOLK", flotteId: "USFF",
    devise: "Integrity at the helm", etiquettes: ["nucleaire", "aviation", "otan", "amiral"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "CVN-69", nom: "Dwight D. Eisenhower", classe: "Nimitz",
    type: "PORTE_AVIONS", nation: "Etats-Unis", anneeMiseEnService: 1977, statut: "ACTIF",
    deplacementTonnes: 101600, longueurMetres: 332.8, largeurMetres: 76.8, tirantEauMetres: 11.3,
    vitesseMaxNoeuds: 30, autonomieMillesNautiques: null, equipageMax: 5680,
    propulsion: { type: "NUCLEAIRE", puissanceChevaux: 260000, nombreHelices: 4, nombreReacteurs: 2 },
    armements: [
      { designation: "RIM-162 ESSM", categorie: "MISSILE_ANTIAERIEN", quantite: 16, porteeKm: 50, calibreMm: null },
      { designation: "RIM-116 RAM",  categorie: "MISSILE_ANTIAERIEN", quantite: 42, porteeKm: 9,  calibreMm: null },
      { designation: "Phalanx CIWS", categorie: "CIWS",               quantite: 3,  porteeKm: 4,  calibreMm: 20 }],
    capteurs: [
      { designation: "AN/SPS-48E", categorie: "RADAR", porteeKm: 400 },
      { designation: "AN/SPS-49",  categorie: "RADAR", porteeKm: 460 }],
    positionActuelle: { type: "Point", coordinates: [-76.30, 36.94] },
    portAttacheId: "NORFOLK", flotteId: "USFF",
    devise: "I like Ike", etiquettes: ["nucleaire", "aviation", "otan"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "LHA-6", nom: "America", classe: "America",
    type: "PORTE_HELICOPTERES", nation: "Etats-Unis", anneeMiseEnService: 2014, statut: "ACTIF",
    deplacementTonnes: 45000, longueurMetres: 257.0, largeurMetres: 32.0, tirantEauMetres: 8.7,
    vitesseMaxNoeuds: 22, autonomieMillesNautiques: 9500, equipageMax: 1204,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 70000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "RIM-162 ESSM", categorie: "MISSILE_ANTIAERIEN", quantite: 16, porteeKm: 50, calibreMm: null },
      { designation: "Phalanx CIWS", categorie: "CIWS",               quantite: 2,  porteeKm: 4,  calibreMm: 20 }],
    capteurs: [
      { designation: "AN/SPS-48E", categorie: "RADAR", porteeKm: 400 }],
    positionActuelle: { type: "Point", coordinates: [132.45, 33.10] },
    portAttacheId: "SAN_DIEGO", flotteId: "PACFLT",
    devise: "Bello vel pace paratus", etiquettes: ["amphibie", "aviation", "pacifique"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "DDG-1000", nom: "Zumwalt", classe: "Zumwalt",
    type: "DESTROYER", nation: "Etats-Unis", anneeMiseEnService: 2016, statut: "EN_REPARATION",
    deplacementTonnes: 15995, longueurMetres: 190.0, largeurMetres: 24.6, tirantEauMetres: 8.4,
    vitesseMaxNoeuds: 30, autonomieMillesNautiques: 4500, equipageMax: 175,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 105000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Mk 57 VLS",    categorie: "MISSILE_ANTIAERIEN", quantite: 80, porteeKm: 150, calibreMm: null },
      { designation: "Mk 46 Mod 2",  categorie: "CANON",              quantite: 2,  porteeKm: 4,   calibreMm: 30 }],
    capteurs: [
      { designation: "AN/SPY-3",   categorie: "RADAR", porteeKm: 320 },
      { designation: "AN/SQS-60",  categorie: "SONAR", porteeKm: 90 }],
    positionActuelle: { type: "Point", coordinates: [-117.15, 32.70] },
    portAttacheId: "SAN_DIEGO", flotteId: "PACFLT",
    devise: "Pace atque bello", etiquettes: ["furtif", "pacifique", "experimental"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "DDG-51", nom: "Arleigh Burke", classe: "Arleigh Burke",
    type: "DESTROYER", nation: "Etats-Unis", anneeMiseEnService: 1991, statut: "ACTIF",
    deplacementTonnes: 8300, longueurMetres: 153.9, largeurMetres: 18.0, tirantEauMetres: 9.4,
    vitesseMaxNoeuds: 30, autonomieMillesNautiques: 4400, equipageMax: 329,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 100000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Mk 41 VLS / SM-2",  categorie: "MISSILE_ANTIAERIEN", quantite: 90, porteeKm: 170,  calibreMm: null },
      { designation: "BGM-109 Tomahawk",  categorie: "MISSILE_CROISIERE",  quantite: 8,  porteeKm: 1600, calibreMm: null },
      { designation: "Mk 45",             categorie: "CANON",              quantite: 1,  porteeKm: 24,   calibreMm: 127 },
      { designation: "Mk 46",             categorie: "TORPILLE",           quantite: 6,  porteeKm: 11,   calibreMm: 324 }],
    capteurs: [
      { designation: "AN/SPY-1D",  categorie: "RADAR",               porteeKm: 320 },
      { designation: "AN/SQS-53C", categorie: "SONAR",               porteeKm: 110 },
      { designation: "AN/SLQ-32",  categorie: "GUERRE_ELECTRONIQUE", porteeKm: null }],
    positionActuelle: { type: "Point", coordinates: [-70.05, 38.44] },
    portAttacheId: "NORFOLK", flotteId: "USFF",
    devise: "Fortune favors the bold", etiquettes: ["defense-aerienne", "otan", "aegis"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "CG-47", nom: "Ticonderoga", classe: "Ticonderoga",
    type: "CROISEUR", nation: "Etats-Unis", anneeMiseEnService: 1983, statut: "DESARME",
    deplacementTonnes: 9800, longueurMetres: 172.8, largeurMetres: 16.8, tirantEauMetres: 10.2,
    vitesseMaxNoeuds: 32, equipageMax: 400,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 80000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Mk 26 / SM-2", categorie: "MISSILE_ANTIAERIEN", quantite: 68, porteeKm: 170, calibreMm: null },
      { designation: "Mk 45",        categorie: "CANON",              quantite: 2,  porteeKm: 24,  calibreMm: 127 }],
    capteurs: [
      { designation: "AN/SPY-1A", categorie: "RADAR", porteeKm: 320 }],
    portAttacheId: "NORFOLK", flotteId: "USFF",
    devise: "Ready and able", etiquettes: ["aegis", "historique"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "SSN-774", nom: "Virginia", classe: "Virginia",
    type: "SOUS_MARIN", nation: "Etats-Unis", anneeMiseEnService: 2004, statut: "ACTIF",
    deplacementTonnes: 7800, longueurMetres: 115.0, largeurMetres: 10.0, tirantEauMetres: 9.3,
    vitesseMaxNoeuds: 25, autonomieMillesNautiques: null, equipageMax: 135,
    propulsion: { type: "NUCLEAIRE", puissanceChevaux: 40000, nombreHelices: 1, nombreReacteurs: 1 },
    armements: [
      { designation: "Mk 48 ADCAP",      categorie: "TORPILLE",          quantite: 26, porteeKm: 50,   calibreMm: 533 },
      { designation: "BGM-109 Tomahawk", categorie: "MISSILE_CROISIERE", quantite: 12, porteeKm: 1600, calibreMm: null }],
    capteurs: [
      { designation: "AN/BQQ-10", categorie: "SONAR", porteeKm: 140 }],
    positionActuelle: { type: "Point", coordinates: [-68.20, 39.80] },
    portAttacheId: "NORFOLK", flotteId: "USFF",
    devise: "Sic semper tyrannis", etiquettes: ["nucleaire", "furtif", "attaque"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "SSGN-726", nom: "Ohio", classe: "Ohio",
    type: "SOUS_MARIN", nation: "Etats-Unis", anneeMiseEnService: 1981, statut: "ACTIF",
    deplacementTonnes: 18750, longueurMetres: 170.0, largeurMetres: 12.8, tirantEauMetres: 11.6,
    vitesseMaxNoeuds: 25, autonomieMillesNautiques: null, equipageMax: 155,
    propulsion: { type: "NUCLEAIRE", puissanceChevaux: 60000, nombreHelices: 1, nombreReacteurs: 1 },
    armements: [
      { designation: "BGM-109 Tomahawk", categorie: "MISSILE_CROISIERE", quantite: 154, porteeKm: 1600, calibreMm: null },
      { designation: "Mk 48 ADCAP",      categorie: "TORPILLE",          quantite: 20,  porteeKm: 50,   calibreMm: 533 }],
    capteurs: [
      { designation: "AN/BQQ-6", categorie: "SONAR", porteeKm: 130 }],
    positionActuelle: { type: "Point", coordinates: [-124.60, 47.35] },
    portAttacheId: "SAN_DIEGO", flotteId: "PACFLT",
    devise: "Vigilance is the price", etiquettes: ["nucleaire", "furtif", "frappe-profonde"],
    dateCreation: chargement, dateModification: chargement, version: 0 }
]);

print("[amiraute] navires France + Etats-Unis inseres : " + base.navires.countDocuments());

base.navires.insertMany([

  // --------------------------------------------------------- ROYAUME-UNI --
  { numeroCoque: "R08", nom: "Queen Elizabeth", classe: "Queen Elizabeth",
    type: "PORTE_AVIONS", nation: "Royaume-Uni", anneeMiseEnService: 2017, statut: "ACTIF",
    deplacementTonnes: 65000, longueurMetres: 280.0, largeurMetres: 73.0, tirantEauMetres: 11.0,
    vitesseMaxNoeuds: 25, autonomieMillesNautiques: 10000, equipageMax: 1600,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 148000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Phalanx CIWS", categorie: "CIWS",  quantite: 3, porteeKm: 4, calibreMm: 20 },
      { designation: "DS30M Mk2",    categorie: "CANON", quantite: 4, porteeKm: 3, calibreMm: 30 }],
    capteurs: [
      { designation: "Artisan 3D", categorie: "RADAR", porteeKm: 200 },
      { designation: "S1850M",     categorie: "RADAR", porteeKm: 400 }],
    positionActuelle: { type: "Point", coordinates: [-1.12, 50.79] },
    portAttacheId: "PORTSMOUTH", flotteId: "RNSF",
    devise: "Semper eadem", etiquettes: ["aviation", "otan", "amiral"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "R09", nom: "Prince of Wales", classe: "Queen Elizabeth",
    type: "PORTE_AVIONS", nation: "Royaume-Uni", anneeMiseEnService: 2019, statut: "EN_MISSION",
    deplacementTonnes: 65000, longueurMetres: 280.0, largeurMetres: 73.0, tirantEauMetres: 11.0,
    vitesseMaxNoeuds: 25, autonomieMillesNautiques: 10000, equipageMax: 1600,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 148000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Phalanx CIWS", categorie: "CIWS",  quantite: 3, porteeKm: 4, calibreMm: 20 },
      { designation: "DS30M Mk2",    categorie: "CANON", quantite: 4, porteeKm: 3, calibreMm: 30 }],
    capteurs: [
      { designation: "Artisan 3D", categorie: "RADAR", porteeKm: 200 },
      { designation: "S1850M",     categorie: "RADAR", porteeKm: 400 }],
    positionActuelle: { type: "Point", coordinates: [110.20, 8.45] },
    portAttacheId: "PORTSMOUTH", flotteId: "RNSF",
    devise: "Ich dien", etiquettes: ["aviation", "otan", "indo-pacifique"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "R07", nom: "Ark Royal", classe: "Invincible",
    type: "PORTE_AVIONS", nation: "Royaume-Uni", anneeMiseEnService: 1985, statut: "DESARME",
    deplacementTonnes: 22000, longueurMetres: 209.1, largeurMetres: 36.0, tirantEauMetres: 8.8,
    vitesseMaxNoeuds: 28, equipageMax: 1050,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 97000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Phalanx CIWS", categorie: "CIWS", quantite: 3, porteeKm: 4, calibreMm: 20 }],
    capteurs: [
      { designation: "Type 1022", categorie: "RADAR", porteeKm: 260 }],
    portAttacheId: "PORTSMOUTH", flotteId: "RNSF",
    devise: "Zeal does not rest", etiquettes: ["aviation", "historique"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "D32", nom: "Daring", classe: "Type 45",
    type: "DESTROYER", nation: "Royaume-Uni", anneeMiseEnService: 2009, statut: "ACTIF",
    deplacementTonnes: 8500, longueurMetres: 152.4, largeurMetres: 21.2, tirantEauMetres: 7.4,
    vitesseMaxNoeuds: 30, autonomieMillesNautiques: 7000, equipageMax: 191,
    propulsion: { type: "HYBRIDE", puissanceChevaux: 55000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Sylver A50 / Aster 30", categorie: "MISSILE_ANTIAERIEN", quantite: 48, porteeKm: 120, calibreMm: null },
      { designation: "Mk 8 Mod 1",            categorie: "CANON",              quantite: 1,  porteeKm: 27,  calibreMm: 114 },
      { designation: "Phalanx CIWS",          categorie: "CIWS",               quantite: 2,  porteeKm: 4,   calibreMm: 20 }],
    capteurs: [
      { designation: "SAMPSON",  categorie: "RADAR", porteeKm: 400 },
      { designation: "S1850M",   categorie: "RADAR", porteeKm: 400 },
      { designation: "Type 2091", categorie: "SONAR", porteeKm: 55 }],
    positionActuelle: { type: "Point", coordinates: [-2.40, 49.90] },
    portAttacheId: "PORTSMOUTH", flotteId: "RNSF",
    devise: "Splendide audax", etiquettes: ["defense-aerienne", "otan"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "F239", nom: "Richmond", classe: "Type 23",
    type: "FREGATE", nation: "Royaume-Uni", anneeMiseEnService: 1995, statut: "ACTIF",
    deplacementTonnes: 4900, longueurMetres: 133.0, largeurMetres: 16.1, tirantEauMetres: 7.3,
    vitesseMaxNoeuds: 28, autonomieMillesNautiques: 7800, equipageMax: 185,
    propulsion: { type: "DIESEL_ELECTRIQUE", puissanceChevaux: 34000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Sea Ceptor", categorie: "MISSILE_ANTIAERIEN", quantite: 32, porteeKm: 25, calibreMm: null },
      { designation: "Mk 8 Mod 1", categorie: "CANON",              quantite: 1,  porteeKm: 27, calibreMm: 114 },
      { designation: "Sting Ray",  categorie: "TORPILLE",           quantite: 4,  porteeKm: 11, calibreMm: 324 }],
    capteurs: [
      { designation: "Artisan 3D", categorie: "RADAR", porteeKm: 200 },
      { designation: "Type 2087",  categorie: "SONAR", porteeKm: 120 }],
    positionActuelle: { type: "Point", coordinates: [-4.20, 50.36] },
    portAttacheId: "DEVONPORT", flotteId: "RNSF",
    devise: "Perseverance", etiquettes: ["lutte-sous-marine", "otan"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "S119", nom: "Astute", classe: "Astute",
    type: "SOUS_MARIN", nation: "Royaume-Uni", anneeMiseEnService: 2010, statut: "ACTIF",
    deplacementTonnes: 7400, longueurMetres: 97.0, largeurMetres: 11.3, tirantEauMetres: 10.0,
    vitesseMaxNoeuds: 30, autonomieMillesNautiques: null, equipageMax: 98,
    propulsion: { type: "NUCLEAIRE", puissanceChevaux: 27000, nombreHelices: 1, nombreReacteurs: 1 },
    armements: [
      { designation: "Spearfish",        categorie: "TORPILLE",          quantite: 38, porteeKm: 54,   calibreMm: 533 },
      { designation: "BGM-109 Tomahawk", categorie: "MISSILE_CROISIERE", quantite: 6,  porteeKm: 1600, calibreMm: null }],
    capteurs: [
      { designation: "Type 2076", categorie: "SONAR", porteeKm: 160 }],
    positionActuelle: { type: "Point", coordinates: [-5.90, 57.20] },
    portAttacheId: "FASLANE", flotteId: "RNSM",
    devise: "Ready for anything", etiquettes: ["nucleaire", "furtif", "attaque"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  // -------------------------------------------------------------- RUSSIE --
  { numeroCoque: "063", nom: "Admiral Kuznetsov", classe: "Kuznetsov",
    type: "PORTE_AVIONS", nation: "Russie", anneeMiseEnService: 1991, statut: "EN_REPARATION",
    deplacementTonnes: 58500, longueurMetres: 305.0, largeurMetres: 72.0, tirantEauMetres: 10.0,
    vitesseMaxNoeuds: 29, autonomieMillesNautiques: 8500, equipageMax: 1960,
    propulsion: { type: "VAPEUR", puissanceChevaux: 200000, nombreHelices: 4, nombreReacteurs: 0 },
    armements: [
      { designation: "P-700 Granit", categorie: "MISSILE_ANTINAVIRE", quantite: 12, porteeKm: 625, calibreMm: null },
      { designation: "Kinzhal",      categorie: "MISSILE_ANTIAERIEN", quantite: 192, porteeKm: 12, calibreMm: null },
      { designation: "AK-630",       categorie: "CIWS",               quantite: 6,  porteeKm: 4,   calibreMm: 30 }],
    capteurs: [
      { designation: "Mars-Passat", categorie: "RADAR", porteeKm: 400 },
      { designation: "Podkat",      categorie: "RADAR", porteeKm: 60 }],
    positionActuelle: { type: "Point", coordinates: [33.40, 69.06] },
    portAttacheId: "SEVEROMORSK", flotteId: "SEVFLT",
    devise: "Force du Nord", etiquettes: ["aviation", "arctique"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "099", nom: "Piotr Veliky", classe: "Kirov",
    type: "CROISEUR", nation: "Russie", anneeMiseEnService: 1998, statut: "ACTIF",
    deplacementTonnes: 25860, longueurMetres: 252.0, largeurMetres: 28.5, tirantEauMetres: 9.1,
    vitesseMaxNoeuds: 32, autonomieMillesNautiques: null, equipageMax: 710,
    propulsion: { type: "NUCLEAIRE", puissanceChevaux: 140000, nombreHelices: 2, nombreReacteurs: 2 },
    armements: [
      { designation: "P-700 Granit", categorie: "MISSILE_ANTINAVIRE", quantite: 20,  porteeKm: 625, calibreMm: null },
      { designation: "S-300F Fort",  categorie: "MISSILE_ANTIAERIEN", quantite: 96,  porteeKm: 150, calibreMm: null },
      { designation: "AK-130",       categorie: "CANON",              quantite: 1,   porteeKm: 23,  calibreMm: 130 },
      { designation: "RBU-12000",    categorie: "LANCE_ROQUETTES_ASM", quantite: 1,  porteeKm: 12,  calibreMm: 300 }],
    capteurs: [
      { designation: "Voskhod MR-800", categorie: "RADAR", porteeKm: 500 },
      { designation: "Polinom",        categorie: "SONAR", porteeKm: 100 }],
    positionActuelle: { type: "Point", coordinates: [35.10, 70.20] },
    portAttacheId: "SEVEROMORSK", flotteId: "SEVFLT",
    devise: "Le Grand", etiquettes: ["nucleaire", "arctique", "frappe-profonde"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "454", nom: "Admiral Gorshkov", classe: "Projet 22350",
    type: "FREGATE", nation: "Russie", anneeMiseEnService: 2018, statut: "ACTIF",
    deplacementTonnes: 5400, longueurMetres: 135.0, largeurMetres: 16.4, tirantEauMetres: 4.5,
    vitesseMaxNoeuds: 29, autonomieMillesNautiques: 4500, equipageMax: 210,
    propulsion: { type: "HYBRIDE", puissanceChevaux: 65000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "3M22 Tsirkon", categorie: "MISSILE_ANTINAVIRE", quantite: 16, porteeKm: 1000, calibreMm: null },
      { designation: "Redut",        categorie: "MISSILE_ANTIAERIEN", quantite: 32, porteeKm: 150,  calibreMm: null },
      { designation: "A-192M",       categorie: "CANON",              quantite: 1,  porteeKm: 22,   calibreMm: 130 }],
    capteurs: [
      { designation: "Poliment",  categorie: "RADAR", porteeKm: 300 },
      { designation: "Zarya-M",   categorie: "SONAR", porteeKm: 70 }],
    positionActuelle: { type: "Point", coordinates: [34.80, 69.90] },
    portAttacheId: "SEVEROMORSK", flotteId: "SEVFLT",
    devise: "Rapide et sur", etiquettes: ["hypersonique", "arctique"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "K-535", nom: "Iouri Dolgorouki", classe: "Borei",
    type: "SOUS_MARIN", nation: "Russie", anneeMiseEnService: 2013, statut: "ACTIF",
    deplacementTonnes: 24000, longueurMetres: 170.0, largeurMetres: 13.5, tirantEauMetres: 10.0,
    vitesseMaxNoeuds: 29, autonomieMillesNautiques: null, equipageMax: 107,
    propulsion: { type: "NUCLEAIRE", puissanceChevaux: 50000, nombreHelices: 1, nombreReacteurs: 1 },
    armements: [
      { designation: "RSM-56 Boulava", categorie: "MISSILE_BALISTIQUE", quantite: 16, porteeKm: 8300, calibreMm: null },
      { designation: "UGST",           categorie: "TORPILLE",           quantite: 6,  porteeKm: 50,   calibreMm: 533 }],
    capteurs: [
      { designation: "Irtych-Amfora", categorie: "SONAR", porteeKm: 150 }],
    positionActuelle: { type: "Point", coordinates: [40.00, 74.50] },
    portAttacheId: "SEVEROMORSK", flotteId: "SEVFLT",
    devise: "Le fondateur", etiquettes: ["nucleaire", "dissuasion", "furtif", "arctique"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "543", nom: "Marshal Shaposhnikov", classe: "Udaloy",
    type: "DESTROYER", nation: "Russie", anneeMiseEnService: 1985, statut: "ACTIF",
    deplacementTonnes: 7570, longueurMetres: 163.0, largeurMetres: 19.3, tirantEauMetres: 6.2,
    vitesseMaxNoeuds: 29, autonomieMillesNautiques: 10500, equipageMax: 300,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 120000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Kalibr-NK", categorie: "MISSILE_CROISIERE",   quantite: 16, porteeKm: 2500, calibreMm: null },
      { designation: "Uran",      categorie: "MISSILE_ANTINAVIRE",  quantite: 16, porteeKm: 260,  calibreMm: null },
      { designation: "AK-100",    categorie: "CANON",               quantite: 2,  porteeKm: 21,   calibreMm: 100 },
      { designation: "RBU-6000",  categorie: "LANCE_ROQUETTES_ASM", quantite: 2,  porteeKm: 6,    calibreMm: 213 }],
    capteurs: [
      { designation: "Fregat-MA", categorie: "RADAR", porteeKm: 300 },
      { designation: "Polinom",   categorie: "SONAR", porteeKm: 100 }],
    positionActuelle: { type: "Point", coordinates: [131.90, 43.05] },
    portAttacheId: "VLADIVOSTOK", flotteId: "PACRU",
    devise: "Fidele au poste", etiquettes: ["lutte-sous-marine", "pacifique"],
    dateCreation: chargement, dateModification: chargement, version: 0 }
]);

print("[amiraute] + Royaume-Uni et Russie : " + base.navires.countDocuments());

base.navires.insertMany([

  // --------------------------------------------------------------- CHINE --
  { numeroCoque: "18", nom: "Fujian", classe: "Type 003",
    type: "PORTE_AVIONS", nation: "Chine", anneeMiseEnService: 2025, statut: "ACTIF",
    deplacementTonnes: 80000, longueurMetres: 316.0, largeurMetres: 76.0, tirantEauMetres: 11.0,
    vitesseMaxNoeuds: 30, autonomieMillesNautiques: 8000, equipageMax: 2500,
    propulsion: { type: "VAPEUR", puissanceChevaux: 200000, nombreHelices: 4, nombreReacteurs: 0 },
    armements: [
      { designation: "HHQ-10",  categorie: "MISSILE_ANTIAERIEN", quantite: 24, porteeKm: 9, calibreMm: null },
      { designation: "H/PJ-11", categorie: "CIWS",               quantite: 3,  porteeKm: 4, calibreMm: 30 }],
    capteurs: [
      { designation: "Type 346B", categorie: "RADAR", porteeKm: 450 }],
    positionActuelle: { type: "Point", coordinates: [109.55, 18.20] },
    portAttacheId: "SANYA", flotteId: "PLANSTC",
    devise: "Vers le large", etiquettes: ["aviation", "catapulte", "amiral"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "17", nom: "Shandong", classe: "Type 002",
    type: "PORTE_AVIONS", nation: "Chine", anneeMiseEnService: 2019, statut: "EN_MISSION",
    deplacementTonnes: 66000, longueurMetres: 305.0, largeurMetres: 75.0, tirantEauMetres: 10.5,
    vitesseMaxNoeuds: 31, autonomieMillesNautiques: 8000, equipageMax: 2000,
    propulsion: { type: "VAPEUR", puissanceChevaux: 200000, nombreHelices: 4, nombreReacteurs: 0 },
    armements: [
      { designation: "HHQ-10",  categorie: "MISSILE_ANTIAERIEN", quantite: 24, porteeKm: 9, calibreMm: null },
      { designation: "H/PJ-11", categorie: "CIWS",               quantite: 3,  porteeKm: 4, calibreMm: 30 }],
    capteurs: [
      { designation: "Type 346A", categorie: "RADAR", porteeKm: 400 }],
    positionActuelle: { type: "Point", coordinates: [118.40, 21.70] },
    portAttacheId: "SANYA", flotteId: "PLANSTC",
    devise: "Montagne de l'Est", etiquettes: ["aviation", "tremplin"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "16", nom: "Liaoning", classe: "Type 001",
    type: "PORTE_AVIONS", nation: "Chine", anneeMiseEnService: 2012, statut: "ACTIF",
    deplacementTonnes: 60000, longueurMetres: 304.5, largeurMetres: 75.0, tirantEauMetres: 10.5,
    vitesseMaxNoeuds: 32, autonomieMillesNautiques: 3850, equipageMax: 1960,
    propulsion: { type: "VAPEUR", puissanceChevaux: 200000, nombreHelices: 4, nombreReacteurs: 0 },
    armements: [
      { designation: "HHQ-10",  categorie: "MISSILE_ANTIAERIEN", quantite: 24, porteeKm: 9, calibreMm: null },
      { designation: "H/PJ-11", categorie: "CIWS",               quantite: 3,  porteeKm: 4, calibreMm: 30 }],
    capteurs: [
      { designation: "Type 346", categorie: "RADAR", porteeKm: 400 }],
    positionActuelle: { type: "Point", coordinates: [120.40, 36.05] },
    portAttacheId: "QINGDAO", flotteId: "PLANNTC",
    devise: "Ecole du ciel", etiquettes: ["aviation", "ecole", "tremplin"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "101", nom: "Nanchang", classe: "Type 055",
    type: "CROISEUR", nation: "Chine", anneeMiseEnService: 2020, statut: "ACTIF",
    deplacementTonnes: 13000, longueurMetres: 180.0, largeurMetres: 20.0, tirantEauMetres: 6.6,
    vitesseMaxNoeuds: 30, autonomieMillesNautiques: 5000, equipageMax: 300,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 150000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "HHQ-9B",    categorie: "MISSILE_ANTIAERIEN", quantite: 64, porteeKm: 200,  calibreMm: null },
      { designation: "YJ-18",     categorie: "MISSILE_ANTINAVIRE", quantite: 48, porteeKm: 540,  calibreMm: null },
      { designation: "CJ-10",     categorie: "MISSILE_CROISIERE",  quantite: 16, porteeKm: 1500, calibreMm: null },
      { designation: "H/PJ-38",   categorie: "CANON",              quantite: 1,  porteeKm: 30,   calibreMm: 130 }],
    capteurs: [
      { designation: "Type 346B", categorie: "RADAR",               porteeKm: 450 },
      { designation: "H/SJG-206", categorie: "SONAR",               porteeKm: 120 },
      { designation: "Type 726",  categorie: "GUERRE_ELECTRONIQUE", porteeKm: null }],
    positionActuelle: { type: "Point", coordinates: [122.10, 33.80] },
    portAttacheId: "QINGDAO", flotteId: "PLANNTC",
    devise: "Premier du nom", etiquettes: ["defense-aerienne", "frappe-profonde"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "421", nom: "Changzheng 18", classe: "Type 094A",
    type: "SOUS_MARIN", nation: "Chine", anneeMiseEnService: 2020, statut: "ACTIF",
    deplacementTonnes: 11000, longueurMetres: 135.0, largeurMetres: 12.5, tirantEauMetres: 8.0,
    vitesseMaxNoeuds: 20, autonomieMillesNautiques: null, equipageMax: 120,
    propulsion: { type: "NUCLEAIRE", puissanceChevaux: 40000, nombreHelices: 1, nombreReacteurs: 1 },
    armements: [
      { designation: "JL-3",   categorie: "MISSILE_BALISTIQUE", quantite: 12, porteeKm: 10000, calibreMm: null },
      { designation: "Yu-6",   categorie: "TORPILLE",           quantite: 12, porteeKm: 45,    calibreMm: 533 }],
    capteurs: [
      { designation: "H/SQG-207", categorie: "SONAR", porteeKm: 110 }],
    positionActuelle: { type: "Point", coordinates: [112.30, 17.50] },
    portAttacheId: "SANYA", flotteId: "PLANSTC",
    devise: "Longue marche", etiquettes: ["nucleaire", "dissuasion", "furtif"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  // --------------------------------------------------------------- JAPON --
  { numeroCoque: "DDH-183", nom: "Izumo", classe: "Izumo",
    type: "PORTE_HELICOPTERES", nation: "Japon", anneeMiseEnService: 2015, statut: "ACTIF",
    deplacementTonnes: 27000, longueurMetres: 248.0, largeurMetres: 38.0, tirantEauMetres: 7.5,
    vitesseMaxNoeuds: 30, autonomieMillesNautiques: 7000, equipageMax: 470,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 112000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "SeaRAM",       categorie: "MISSILE_ANTIAERIEN", quantite: 2, porteeKm: 9, calibreMm: null },
      { designation: "Phalanx CIWS", categorie: "CIWS",               quantite: 2, porteeKm: 4, calibreMm: 20 }],
    capteurs: [
      { designation: "OPS-50",  categorie: "RADAR", porteeKm: 250 },
      { designation: "OQQ-23",  categorie: "SONAR", porteeKm: 80 }],
    positionActuelle: { type: "Point", coordinates: [139.65, 35.28] },
    portAttacheId: "YOKOSUKA", flotteId: "JMSDF1",
    devise: "Nuage de la source", etiquettes: ["aviation", "lutte-sous-marine", "pacifique"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "DDH-184", nom: "Kaga", classe: "Izumo",
    type: "PORTE_HELICOPTERES", nation: "Japon", anneeMiseEnService: 2017, statut: "EN_REPARATION",
    deplacementTonnes: 27000, longueurMetres: 248.0, largeurMetres: 38.0, tirantEauMetres: 7.5,
    vitesseMaxNoeuds: 30, autonomieMillesNautiques: 7000, equipageMax: 470,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 112000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "SeaRAM",       categorie: "MISSILE_ANTIAERIEN", quantite: 2, porteeKm: 9, calibreMm: null },
      { designation: "Phalanx CIWS", categorie: "CIWS",               quantite: 2, porteeKm: 4, calibreMm: 20 }],
    capteurs: [
      { designation: "OPS-50", categorie: "RADAR", porteeKm: 250 }],
    positionActuelle: { type: "Point", coordinates: [139.64, 35.29] },
    portAttacheId: "YOKOSUKA", flotteId: "JMSDF1",
    devise: "Fleuve accroissant", etiquettes: ["aviation", "pacifique", "conversion-f35"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "DDG-179", nom: "Maya", classe: "Maya",
    type: "DESTROYER", nation: "Japon", anneeMiseEnService: 2020, statut: "ACTIF",
    deplacementTonnes: 10250, longueurMetres: 170.0, largeurMetres: 21.0, tirantEauMetres: 6.4,
    vitesseMaxNoeuds: 30, autonomieMillesNautiques: 6000, equipageMax: 300,
    propulsion: { type: "HYBRIDE", puissanceChevaux: 69000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Mk 41 VLS / SM-3", categorie: "MISSILE_ANTIAERIEN", quantite: 96, porteeKm: 700, calibreMm: null },
      { designation: "Type 17 SSM",      categorie: "MISSILE_ANTINAVIRE", quantite: 8,  porteeKm: 200, calibreMm: null },
      { designation: "Mk 45 Mod 4",      categorie: "CANON",              quantite: 1,  porteeKm: 37,  calibreMm: 127 }],
    capteurs: [
      { designation: "AN/SPY-1D(V)", categorie: "RADAR", porteeKm: 320 },
      { designation: "OQQ-22",       categorie: "SONAR", porteeKm: 100 }],
    positionActuelle: { type: "Point", coordinates: [135.20, 33.40] },
    portAttacheId: "YOKOSUKA", flotteId: "JMSDF1",
    devise: "Bouclier de l'archipel", etiquettes: ["defense-aerienne", "antibalistique", "aegis"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "SS-513", nom: "Taigei", classe: "Taigei",
    type: "SOUS_MARIN", nation: "Japon", anneeMiseEnService: 2022, statut: "ACTIF",
    deplacementTonnes: 3000, longueurMetres: 84.0, largeurMetres: 9.1, tirantEauMetres: 10.4,
    vitesseMaxNoeuds: 20, autonomieMillesNautiques: 6100, equipageMax: 70,
    propulsion: { type: "DIESEL_ELECTRIQUE", puissanceChevaux: 8000, nombreHelices: 1, nombreReacteurs: 0 },
    armements: [
      { designation: "Type 18",     categorie: "TORPILLE",           quantite: 30, porteeKm: 50,  calibreMm: 533 },
      { designation: "UGM-84 Harpoon", categorie: "MISSILE_ANTINAVIRE", quantite: 6, porteeKm: 130, calibreMm: null }],
    capteurs: [
      { designation: "ZQQ-8", categorie: "SONAR", porteeKm: 90 }],
    positionActuelle: { type: "Point", coordinates: [137.80, 34.10] },
    portAttacheId: "YOKOSUKA", flotteId: "JMSDF1",
    devise: "Grande baleine", etiquettes: ["furtif", "batterie-lithium", "pacifique"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  // ---------------------------------------------------------------- INDE --
  { numeroCoque: "R11", nom: "Vikrant", classe: "Vikrant",
    type: "PORTE_AVIONS", nation: "Inde", anneeMiseEnService: 2022, statut: "ACTIF",
    deplacementTonnes: 45000, longueurMetres: 262.0, largeurMetres: 62.0, tirantEauMetres: 8.4,
    vitesseMaxNoeuds: 28, autonomieMillesNautiques: 7500, equipageMax: 1700,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 88000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Barak 8",  categorie: "MISSILE_ANTIAERIEN", quantite: 32, porteeKm: 100, calibreMm: null },
      { designation: "AK-630",   categorie: "CIWS",               quantite: 4,  porteeKm: 4,   calibreMm: 30 }],
    capteurs: [
      { designation: "MF-STAR", categorie: "RADAR", porteeKm: 250 }],
    positionActuelle: { type: "Point", coordinates: [73.20, 14.60] },
    portAttacheId: "KARWAR", flotteId: "INWNC",
    devise: "Jayema Sam Yudhi Sprdhah", etiquettes: ["aviation", "tremplin", "ocean-indien"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "R33", nom: "Vikramaditya", classe: "Kiev modifie",
    type: "PORTE_AVIONS", nation: "Inde", anneeMiseEnService: 2013, statut: "ACTIF",
    deplacementTonnes: 45400, longueurMetres: 283.5, largeurMetres: 61.0, tirantEauMetres: 10.0,
    vitesseMaxNoeuds: 30, autonomieMillesNautiques: 7000, equipageMax: 1600,
    propulsion: { type: "VAPEUR", puissanceChevaux: 180000, nombreHelices: 4, nombreReacteurs: 0 },
    armements: [
      { designation: "Barak 1", categorie: "MISSILE_ANTIAERIEN", quantite: 32, porteeKm: 12, calibreMm: null },
      { designation: "AK-630",  categorie: "CIWS",               quantite: 4,  porteeKm: 4,  calibreMm: 30 }],
    capteurs: [
      { designation: "Resistor-E", categorie: "RADAR", porteeKm: 300 }],
    positionActuelle: { type: "Point", coordinates: [74.10, 14.80] },
    portAttacheId: "KARWAR", flotteId: "INWNC",
    devise: "Le brave au combat", etiquettes: ["aviation", "tremplin", "ocean-indien"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "D66", nom: "Visakhapatnam", classe: "Visakhapatnam",
    type: "DESTROYER", nation: "Inde", anneeMiseEnService: 2021, statut: "ACTIF",
    deplacementTonnes: 7400, longueurMetres: 163.0, largeurMetres: 17.4, tirantEauMetres: 6.5,
    vitesseMaxNoeuds: 30, autonomieMillesNautiques: 4000, equipageMax: 315,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 82000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Barak 8",   categorie: "MISSILE_ANTIAERIEN", quantite: 32, porteeKm: 100, calibreMm: null },
      { designation: "BrahMos",   categorie: "MISSILE_ANTINAVIRE", quantite: 16, porteeKm: 450, calibreMm: null },
      { designation: "Oto Melara 76", categorie: "CANON",          quantite: 1,  porteeKm: 16,  calibreMm: 76 }],
    capteurs: [
      { designation: "MF-STAR",  categorie: "RADAR", porteeKm: 250 },
      { designation: "HUMSA-NG", categorie: "SONAR", porteeKm: 90 }],
    positionActuelle: { type: "Point", coordinates: [72.80, 18.90] },
    portAttacheId: "KARWAR", flotteId: "INWNC",
    devise: "Ville de la victoire", etiquettes: ["defense-aerienne", "ocean-indien", "supersonique"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "S2", nom: "Arihant", classe: "Arihant",
    type: "SOUS_MARIN", nation: "Inde", anneeMiseEnService: 2016, statut: "ACTIF",
    deplacementTonnes: 6000, longueurMetres: 111.0, largeurMetres: 11.0, tirantEauMetres: 9.5,
    vitesseMaxNoeuds: 24, autonomieMillesNautiques: null, equipageMax: 95,
    propulsion: { type: "NUCLEAIRE", puissanceChevaux: 47000, nombreHelices: 1, nombreReacteurs: 1 },
    armements: [
      { designation: "K-15 Sagarika", categorie: "MISSILE_BALISTIQUE", quantite: 12, porteeKm: 750, calibreMm: null },
      { designation: "Type 53-65",    categorie: "TORPILLE",           quantite: 6,  porteeKm: 19,  calibreMm: 533 }],
    capteurs: [
      { designation: "USHUS", categorie: "SONAR", porteeKm: 100 }],
    positionActuelle: { type: "Point", coordinates: [83.40, 17.60] },
    portAttacheId: "KARWAR", flotteId: "INWNC",
    devise: "Destructeur d'ennemis", etiquettes: ["nucleaire", "dissuasion", "ocean-indien"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  // -------------------------------------------------------------- ITALIE --
  { numeroCoque: "C550", nom: "Cavour", classe: "Cavour",
    type: "PORTE_AVIONS", nation: "Italie", anneeMiseEnService: 2009, statut: "ACTIF",
    deplacementTonnes: 30000, longueurMetres: 244.0, largeurMetres: 39.0, tirantEauMetres: 8.7,
    vitesseMaxNoeuds: 28, autonomieMillesNautiques: 7000, equipageMax: 1210,
    propulsion: { type: "TURBINE_A_GAZ", puissanceChevaux: 118000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Sylver A43 / Aster 15", categorie: "MISSILE_ANTIAERIEN", quantite: 32, porteeKm: 30, calibreMm: null },
      { designation: "Oto Melara 76",         categorie: "CANON",              quantite: 2,  porteeKm: 16, calibreMm: 76 }],
    capteurs: [
      { designation: "RAN-40L", categorie: "RADAR", porteeKm: 400 },
      { designation: "EMPAR",   categorie: "RADAR", porteeKm: 180 }],
    positionActuelle: { type: "Point", coordinates: [17.25, 40.45] },
    portAttacheId: "TARENTE", flotteId: "ITSQN",
    devise: "In arduis servare mentem", etiquettes: ["aviation", "otan", "f35b", "mediterranee"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "D553", nom: "Andrea Doria", classe: "Horizon",
    type: "DESTROYER", nation: "Italie", anneeMiseEnService: 2007, statut: "ACTIF",
    deplacementTonnes: 7050, longueurMetres: 152.9, largeurMetres: 20.3, tirantEauMetres: 5.4,
    vitesseMaxNoeuds: 29, autonomieMillesNautiques: 7000, equipageMax: 190,
    propulsion: { type: "HYBRIDE", puissanceChevaux: 62000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Sylver A50 / Aster 30", categorie: "MISSILE_ANTIAERIEN", quantite: 48, porteeKm: 120, calibreMm: null },
      { designation: "Teseo Mk2",             categorie: "MISSILE_ANTINAVIRE", quantite: 8,  porteeKm: 180, calibreMm: null },
      { designation: "Oto Melara 76",         categorie: "CANON",              quantite: 3,  porteeKm: 16,  calibreMm: 76 }],
    capteurs: [
      { designation: "EMPAR",  categorie: "RADAR", porteeKm: 180 },
      { designation: "S1850M", categorie: "RADAR", porteeKm: 400 }],
    positionActuelle: { type: "Point", coordinates: [15.80, 38.20] },
    portAttacheId: "TARENTE", flotteId: "ITSQN",
    devise: "Fortiter in re", etiquettes: ["defense-aerienne", "otan", "mediterranee"],
    dateCreation: chargement, dateModification: chargement, version: 0 },

  { numeroCoque: "F590", nom: "Carlo Bergamini", classe: "FREMM",
    type: "FREGATE", nation: "Italie", anneeMiseEnService: 2013, statut: "EN_MISSION",
    deplacementTonnes: 6700, longueurMetres: 144.6, largeurMetres: 19.7, tirantEauMetres: 8.7,
    vitesseMaxNoeuds: 27, autonomieMillesNautiques: 6800, equipageMax: 145,
    propulsion: { type: "HYBRIDE", puissanceChevaux: 43000, nombreHelices: 2, nombreReacteurs: 0 },
    armements: [
      { designation: "Sylver A50 / Aster 30", categorie: "MISSILE_ANTIAERIEN", quantite: 16, porteeKm: 120, calibreMm: null },
      { designation: "Teseo Mk2",             categorie: "MISSILE_ANTINAVIRE", quantite: 8,  porteeKm: 180, calibreMm: null },
      { designation: "MU90",                  categorie: "TORPILLE",           quantite: 6,  porteeKm: 12,  calibreMm: 324 }],
    capteurs: [
      { designation: "Kronos",   categorie: "RADAR", porteeKm: 250 },
      { designation: "UMS 4110", categorie: "SONAR", porteeKm: 60 }],
    positionActuelle: { type: "Point", coordinates: [12.40, 35.10] },
    portAttacheId: "TARENTE", flotteId: "ITSQN",
    devise: "Virtus in actione", etiquettes: ["lutte-sous-marine", "otan", "mediterranee"],
    dateCreation: chargement, dateModification: chargement, version: 0 }
]);

print("[amiraute] navires : " + base.navires.countDocuments());

// -----------------------------------------------------------------------------
// MISSIONS - relation N-N referencee.
//
// Les navires ont des _id ObjectId generes : il faut les resoudre avant de
// construire les missions. Cette etape EST la lecon : une reference se resout,
// elle ne se devine pas. C'est le prix du "referred", face a la gratuite de
// lecture de l'"embedded".
// -----------------------------------------------------------------------------
const parCle = {};
base.navires.find({}, { nation: 1, numeroCoque: 1, nom: 1, type: 1 }).forEach(function (n) {
  parCle[n.nation + "|" + n.numeroCoque] = n;
});

// EXTENDED REFERENCE : on ne stocke pas un identifiant nu, mais l'identifiant
// PLUS les deux ou trois champs qu'on affiche systematiquement avec lui.
// L'ecran "mission et ses participants" se rend alors sans aucun $lookup.
function nav() {
  return Array.prototype.slice.call(arguments).map(function (cle) {
    const n = parCle[cle];
    if (!n) { throw new Error("navire inconnu dans le jeu de donnees : " + cle); }
    return { id: n._id, nom: n.nom, numeroCoque: n.numeroCoque, type: n.type };
  });
}

function zone(nom, lon, lat, rayonKm) {
  return { nom: nom, centre: { type: "Point", coordinates: [lon, lat] }, rayonKm: rayonKm };
}

base.missions.insertMany([
  { nomCode: "CLEMENCEAU 26", type: "DEPLOIEMENT", statut: "TERMINEE",
    dateDebut: ISODate("2026-01-15T00:00:00Z"), dateFin: ISODate("2026-04-30T00:00:00Z"),
    zoneOperation: zone("Mediterranee orientale", 28.0, 34.5, 600),
    naviresParticipants: nav("France|R91", "France|D620", "France|D650", "France|S635"),
    coutEstimeEuros: 128000000,
    objectifs: ["Presence maritime", "Interoperabilite OTAN", "Appui aerien"] },

  { nomCode: "AKILA 26", type: "EXERCICE", statut: "TERMINEE",
    dateDebut: ISODate("2026-03-02T00:00:00Z"), dateFin: ISODate("2026-03-20T00:00:00Z"),
    zoneOperation: zone("Golfe du Lion", 4.5, 42.5, 250),
    naviresParticipants: nav("France|D621", "France|D653", "Italie|D553"),
    coutEstimeEuros: 14500000,
    objectifs: ["Defense aerienne combinee", "Ravitaillement a la mer"] },

  { nomCode: "VIGIE ATLANTIQUE", type: "PATROUILLE", statut: "EN_COURS",
    dateDebut: ISODate("2026-07-01T00:00:00Z"), dateFin: null,
    zoneOperation: zone("Approches occidentales", -8.0, 47.0, 450),
    naviresParticipants: nav("France|D650", "Royaume-Uni|F239"),
    coutEstimeEuros: 22000000,
    objectifs: ["Surveillance sous-marine", "Protection des cables"] },

  { nomCode: "PATROUILLE OCEANIQUE 26-3", type: "DISSUASION", statut: "EN_COURS",
    dateDebut: ISODate("2026-06-10T00:00:00Z"), dateFin: null,
    zoneOperation: zone("Atlantique Nord", -25.0, 52.0, 900),
    naviresParticipants: nav("France|S619"),
    coutEstimeEuros: 47000000,
    objectifs: ["Permanence de la dissuasion"] },

  { nomCode: "JEANNE D'ARC 26", type: "DEPLOIEMENT", statut: "TERMINEE",
    dateDebut: ISODate("2026-02-20T00:00:00Z"), dateFin: ISODate("2026-07-10T00:00:00Z"),
    zoneOperation: zone("Ocean Indien", 68.0, 5.0, 1200),
    naviresParticipants: nav("France|L9013", "France|D654"),
    coutEstimeEuros: 63000000,
    objectifs: ["Formation des officiers", "Diplomatie navale", "Lutte anti-piraterie"] },

  { nomCode: "ATLANTIC RESOLVE 26", type: "DEPLOIEMENT", statut: "TERMINEE",
    dateDebut: ISODate("2026-01-08T00:00:00Z"), dateFin: ISODate("2026-05-22T00:00:00Z"),
    zoneOperation: zone("Atlantique Nord-Est", -15.0, 55.0, 800),
    naviresParticipants: nav("Etats-Unis|CVN-78", "Etats-Unis|DDG-51", "Royaume-Uni|D32"),
    coutEstimeEuros: 410000000,
    objectifs: ["Reassurance des allies", "Dissuasion conventionnelle"] },

  { nomCode: "SILENT DEPTH", type: "SURVEILLANCE", statut: "EN_COURS",
    dateDebut: ISODate("2026-05-30T00:00:00Z"), dateFin: null,
    zoneOperation: zone("Detroit du Groenland", -30.0, 68.0, 500),
    naviresParticipants: nav("Etats-Unis|SSN-774", "Royaume-Uni|S119"),
    coutEstimeEuros: 89000000,
    objectifs: ["Pistage sous-marin", "Cartographie acoustique"] },

  { nomCode: "PACIFIC SENTINEL 26", type: "PATROUILLE", statut: "EN_COURS",
    dateDebut: ISODate("2026-06-18T00:00:00Z"), dateFin: null,
    zoneOperation: zone("Mer des Philippines", 132.0, 20.0, 1100),
    naviresParticipants: nav("Etats-Unis|LHA-6", "Etats-Unis|SSGN-726", "Japon|DDG-179"),
    coutEstimeEuros: 156000000,
    objectifs: ["Liberte de navigation", "Coordination alliee"] },

  { nomCode: "RIMPAC 26", type: "EXERCICE", statut: "PLANIFIEE",
    dateDebut: ISODate("2026-09-01T00:00:00Z"), dateFin: ISODate("2026-10-15T00:00:00Z"),
    zoneOperation: zone("Hawai", -157.0, 21.0, 700),
    naviresParticipants: nav("Etats-Unis|DDG-51", "Japon|DDH-183", "Inde|D66", "France|D653"),
    coutEstimeEuros: 340000000,
    objectifs: ["Exercice multinational", "Tir reel", "Guerre des mines"] },

  { nomCode: "ZUMWALT TRIALS", type: "ESSAIS", statut: "ANNULEE",
    dateDebut: ISODate("2026-04-01T00:00:00Z"), dateFin: ISODate("2026-04-25T00:00:00Z"),
    zoneOperation: zone("Large de San Diego", -119.0, 32.0, 200),
    naviresParticipants: nav("Etats-Unis|DDG-1000"),
    coutEstimeEuros: 31000000,
    objectifs: ["Qualification du systeme de conduite de tir"] },

  { nomCode: "CSG26", type: "DEPLOIEMENT", statut: "EN_COURS",
    dateDebut: ISODate("2026-04-12T00:00:00Z"), dateFin: null,
    zoneOperation: zone("Mer de Chine meridionale", 113.0, 12.0, 900),
    naviresParticipants: nav("Royaume-Uni|R09", "Royaume-Uni|D32", "Royaume-Uni|F239"),
    coutEstimeEuros: 295000000,
    objectifs: ["Presence indo-pacifique", "Exercices bilateraux"] },

  { nomCode: "JOINT WARRIOR 26", type: "EXERCICE", statut: "TERMINEE",
    dateDebut: ISODate("2026-03-10T00:00:00Z"), dateFin: ISODate("2026-03-28T00:00:00Z"),
    zoneOperation: zone("Ouest de l'Ecosse", -7.0, 57.5, 400),
    naviresParticipants: nav("Royaume-Uni|R08", "Royaume-Uni|S119", "France|D650", "Italie|F590"),
    coutEstimeEuros: 78000000,
    objectifs: ["Lutte anti-sous-marine", "Debarquement amphibie"] },

  { nomCode: "GRAND NORD 26", type: "PATROUILLE", statut: "EN_COURS",
    dateDebut: ISODate("2026-05-05T00:00:00Z"), dateFin: null,
    zoneOperation: zone("Mer de Barents", 40.0, 73.0, 800),
    naviresParticipants: nav("Russie|099", "Russie|454"),
    coutEstimeEuros: 61000000,
    objectifs: ["Controle de la route maritime du Nord"] },

  { nomCode: "BOUCLIER OCEANIQUE", type: "DISSUASION", statut: "EN_COURS",
    dateDebut: ISODate("2026-06-01T00:00:00Z"), dateFin: null,
    zoneOperation: zone("Arctique central", 45.0, 78.0, 1000),
    naviresParticipants: nav("Russie|K-535"),
    coutEstimeEuros: 52000000,
    objectifs: ["Permanence de la dissuasion"] },

  { nomCode: "VOSTOK 26", type: "EXERCICE", statut: "PLANIFIEE",
    dateDebut: ISODate("2026-09-15T00:00:00Z"), dateFin: ISODate("2026-09-30T00:00:00Z"),
    zoneOperation: zone("Mer du Japon", 134.0, 42.0, 600),
    naviresParticipants: nav("Russie|543"),
    coutEstimeEuros: 24000000,
    objectifs: ["Manoeuvres conjointes", "Defense cotiere"] },

  { nomCode: "REFONTE KUZNETSOV", type: "ESSAIS", statut: "PLANIFIEE",
    dateDebut: ISODate("2026-11-01T00:00:00Z"), dateFin: ISODate("2027-06-30T00:00:00Z"),
    zoneOperation: zone("Bassin de Severomorsk", 33.4, 69.07, 20),
    naviresParticipants: nav("Russie|063"),
    coutEstimeEuros: 480000000,
    objectifs: ["Essais machine", "Requalification aviation"] },

  { nomCode: "MER DE CHINE 26-2", type: "PATROUILLE", statut: "EN_COURS",
    dateDebut: ISODate("2026-07-05T00:00:00Z"), dateFin: null,
    zoneOperation: zone("Mer de Chine meridionale", 115.0, 15.0, 850),
    naviresParticipants: nav("Chine|17", "Chine|101", "Chine|421"),
    coutEstimeEuros: 210000000,
    objectifs: ["Affirmation de souverainete", "Escorte de convois"] },

  { nomCode: "PREMIER APPAREILLAGE FUJIAN", type: "ESSAIS", statut: "TERMINEE",
    dateDebut: ISODate("2026-01-20T00:00:00Z"), dateFin: ISODate("2026-03-15T00:00:00Z"),
    zoneOperation: zone("Large de Hainan", 110.5, 18.0, 300),
    naviresParticipants: nav("Chine|18"),
    coutEstimeEuros: 175000000,
    objectifs: ["Qualification catapultes", "Appontage de nuit"] },

  { nomCode: "ECOLE DE L'AIR 26", type: "EXERCICE", statut: "TERMINEE",
    dateDebut: ISODate("2026-02-01T00:00:00Z"), dateFin: ISODate("2026-02-28T00:00:00Z"),
    zoneOperation: zone("Mer Jaune", 123.0, 35.0, 400),
    naviresParticipants: nav("Chine|16", "Chine|101"),
    coutEstimeEuros: 38000000,
    objectifs: ["Formation des pilotes embarques"] },

  { nomCode: "KEEN EDGE 26", type: "EXERCICE", statut: "TERMINEE",
    dateDebut: ISODate("2026-02-05T00:00:00Z"), dateFin: ISODate("2026-02-19T00:00:00Z"),
    zoneOperation: zone("Sud de Kyushu", 131.0, 31.0, 350),
    naviresParticipants: nav("Japon|DDH-183", "Japon|DDG-179", "Etats-Unis|DDG-51"),
    coutEstimeEuros: 44000000,
    objectifs: ["Defense antimissile", "Commandement conjoint"] },

  { nomCode: "SURVEILLANCE TSUSHIMA", type: "SURVEILLANCE", statut: "EN_COURS",
    dateDebut: ISODate("2026-04-01T00:00:00Z"), dateFin: null,
    zoneOperation: zone("Detroit de Tsushima", 129.5, 34.3, 150),
    naviresParticipants: nav("Japon|SS-513"),
    coutEstimeEuros: 12000000,
    objectifs: ["Detection de transits sous-marins"] },

  { nomCode: "MALABAR 26", type: "EXERCICE", statut: "PLANIFIEE",
    dateDebut: ISODate("2026-10-05T00:00:00Z"), dateFin: ISODate("2026-10-22T00:00:00Z"),
    zoneOperation: zone("Golfe du Bengale", 88.0, 15.0, 700),
    naviresParticipants: nav("Inde|R11", "Inde|D66", "Japon|DDH-183", "Etats-Unis|SSN-774"),
    coutEstimeEuros: 190000000,
    objectifs: ["Exercice quadripartite", "Lutte anti-sous-marine"] },

  { nomCode: "SAGAR 26", type: "HUMANITAIRE", statut: "TERMINEE",
    dateDebut: ISODate("2026-05-12T00:00:00Z"), dateFin: ISODate("2026-06-08T00:00:00Z"),
    zoneOperation: zone("Cote du Mozambique", 40.5, -18.0, 450),
    naviresParticipants: nav("Inde|R33", "France|L9013"),
    coutEstimeEuros: 27000000,
    objectifs: ["Assistance apres cyclone", "Distribution d'eau potable"] },

  { nomCode: "MARE SICURO 26", type: "SURVEILLANCE", statut: "EN_COURS",
    dateDebut: ISODate("2026-01-02T00:00:00Z"), dateFin: null,
    zoneOperation: zone("Canal de Sicile", 12.5, 36.0, 300),
    naviresParticipants: nav("Italie|F590", "Italie|D553"),
    coutEstimeEuros: 55000000,
    objectifs: ["Sauvetage en mer", "Lutte contre les trafics"] },

  { nomCode: "MEDITERRANEE UNIE 26", type: "ESCORTE", statut: "TERMINEE",
    dateDebut: ISODate("2026-04-18T00:00:00Z"), dateFin: ISODate("2026-05-30T00:00:00Z"),
    zoneOperation: zone("Mediterranee centrale", 16.0, 36.5, 500),
    naviresParticipants: nav("Italie|C550", "Italie|D553", "France|D621"),
    coutEstimeEuros: 71000000,
    objectifs: ["Escorte de batiments logistiques", "Couverture aerienne"] }
]);

print("[amiraute] missions : " + base.missions.countDocuments());

// =============================================================================
// MISE EN FORME DOCUMENT
// =============================================================================
// Jusqu'ici, navires ressemblait a une table : 26 champs, les memes sur les
// 45 documents, et des identifiants nus en guise de clefs etrangeres.
//
// Cette section applique quatre patterns de modelisation MongoDB. C'est le
// moment ou le modele cesse d'etre relationnel.
// =============================================================================

// -----------------------------------------------------------------------------
// PATTERN 1 - POLYMORPHIC
//
// Un sous-marin et un porte-avions n'ont PAS les memes caracteristiques. En
// relationnel il faudrait trois tables, ou une table pleine de colonnes NULL.
// Ici : une seule collection, trois formes de document.
//
// Le champ _class est le DISCRIMINANT lu par Spring Data pour instancier la
// bonne sous-classe Java. On l'ecrit explicitement : c'est de la donnee, pas
// de la magie.
// -----------------------------------------------------------------------------

function classePour(type) {
  if (type === "SOUS_MARIN") { return "sous-marin"; }
  if (type === "PORTE_AVIONS" || type === "PORTE_HELICOPTERES") { return "porte-aeronefs"; }
  return "batiment-surface";
}

// Caracteristiques propres a chaque coque, indexees par (nation|numeroCoque).
const SPECIFIQUES = {
  // --- sous-marins : profondeur, tubes, mission strategique, discretion ----
  "France|S635":      { profondeurMaxMetres: 350, nombreTubesLanceTorpilles: 4, missionStrategique: "ATTAQUE",    autonomieImmersionJours: 70, discretionDecibels: 95 },
  "France|S619":      { profondeurMaxMetres: 400, nombreTubesLanceTorpilles: 4, missionStrategique: "DISSUASION", autonomieImmersionJours: 70, discretionDecibels: 90 },
  "France|S601":      { profondeurMaxMetres: 300, nombreTubesLanceTorpilles: 4, missionStrategique: "ATTAQUE",    autonomieImmersionJours: 45, discretionDecibels: 105 },
  "Etats-Unis|SSN-774":  { profondeurMaxMetres: 240, nombreTubesLanceTorpilles: 4, missionStrategique: "ATTAQUE", autonomieImmersionJours: 90, discretionDecibels: 95 },
  "Etats-Unis|SSGN-726": { profondeurMaxMetres: 240, nombreTubesLanceTorpilles: 4, missionStrategique: "ATTAQUE", autonomieImmersionJours: 90, discretionDecibels: 95 },
  "Royaume-Uni|S119": { profondeurMaxMetres: 300, nombreTubesLanceTorpilles: 6, missionStrategique: "ATTAQUE",    autonomieImmersionJours: 90, discretionDecibels: 90 },
  "Russie|K-535":     { profondeurMaxMetres: 450, nombreTubesLanceTorpilles: 6, missionStrategique: "DISSUASION", autonomieImmersionJours: 90, discretionDecibels: 108 },
  "Chine|421":        { profondeurMaxMetres: 300, nombreTubesLanceTorpilles: 6, missionStrategique: "DISSUASION", autonomieImmersionJours: 80, discretionDecibels: 110 },
  "Japon|SS-513":     { profondeurMaxMetres: 250, nombreTubesLanceTorpilles: 6, missionStrategique: "ATTAQUE",    autonomieImmersionJours: 30, discretionDecibels: 95 },
  "Inde|S2":          { profondeurMaxMetres: 300, nombreTubesLanceTorpilles: 6, missionStrategique: "DISSUASION", autonomieImmersionJours: 60, discretionDecibels: 110 },

  // --- porte-aeronefs : catapulte, piste, et un GROUPE AERIEN embarque -----
  "France|R91": { typeCatapulte: "CATOBAR", nombreAeronefs: 40, longueurPisteMetres: 195, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "Rafale M", role: "CHASSE", quantite: 30 },
                   { modele: "E-2C Hawkeye", role: "GUET_AERIEN", quantite: 2 },
                   { modele: "NH90 Caiman", role: "SECOURS", quantite: 2 }] },
  "France|L9013": { typeCatapulte: "HELICOPTERES", nombreAeronefs: 16, longueurPisteMetres: 0, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "NH90 Caiman", role: "TRANSPORT", quantite: 8 },
                   { modele: "Tigre HAD", role: "ATTAQUE", quantite: 8 }] },
  "Etats-Unis|CVN-78": { typeCatapulte: "CATOBAR", nombreAeronefs: 75, longueurPisteMetres: 332, nombreAscenseurs: 3,
    groupeAerien: [{ modele: "F/A-18E Super Hornet", role: "CHASSE", quantite: 44 },
                   { modele: "F-35C Lightning II", role: "CHASSE", quantite: 10 },
                   { modele: "E-2D Advanced Hawkeye", role: "GUET_AERIEN", quantite: 5 },
                   { modele: "MH-60R Seahawk", role: "LUTTE_SOUS_MARINE", quantite: 8 }] },
  "Etats-Unis|CVN-69": { typeCatapulte: "CATOBAR", nombreAeronefs: 90, longueurPisteMetres: 325, nombreAscenseurs: 4,
    groupeAerien: [{ modele: "F/A-18E Super Hornet", role: "CHASSE", quantite: 48 },
                   { modele: "E-2C Hawkeye", role: "GUET_AERIEN", quantite: 4 },
                   { modele: "MH-60S Knighthawk", role: "SECOURS", quantite: 11 }] },
  "Etats-Unis|LHA-6": { typeCatapulte: "STOVL", nombreAeronefs: 31, longueurPisteMetres: 250, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "F-35B Lightning II", role: "CHASSE", quantite: 20 },
                   { modele: "MV-22B Osprey", role: "TRANSPORT", quantite: 12 }] },
  "Royaume-Uni|R08": { typeCatapulte: "STOVL", nombreAeronefs: 40, longueurPisteMetres: 280, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "F-35B Lightning II", role: "CHASSE", quantite: 24 },
                   { modele: "Merlin HM2", role: "LUTTE_SOUS_MARINE", quantite: 9 }] },
  "Royaume-Uni|R09": { typeCatapulte: "STOVL", nombreAeronefs: 40, longueurPisteMetres: 280, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "F-35B Lightning II", role: "CHASSE", quantite: 24 },
                   { modele: "Merlin HM2", role: "LUTTE_SOUS_MARINE", quantite: 9 }] },
  "Royaume-Uni|R07": { typeCatapulte: "STOVL", nombreAeronefs: 22, longueurPisteMetres: 167, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "Sea Harrier FA2", role: "CHASSE", quantite: 12 }] },
  "Russie|063": { typeCatapulte: "STOBAR", nombreAeronefs: 40, longueurPisteMetres: 205, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "Su-33 Flanker-D", role: "CHASSE", quantite: 18 },
                   { modele: "Ka-27 Helix", role: "LUTTE_SOUS_MARINE", quantite: 15 }] },
  "Chine|18": { typeCatapulte: "CATOBAR", nombreAeronefs: 60, longueurPisteMetres: 300, nombreAscenseurs: 3,
    groupeAerien: [{ modele: "J-35", role: "CHASSE", quantite: 30 },
                   { modele: "J-15T", role: "CHASSE", quantite: 20 },
                   { modele: "KJ-600", role: "GUET_AERIEN", quantite: 6 }] },
  "Chine|17": { typeCatapulte: "STOBAR", nombreAeronefs: 44, longueurPisteMetres: 200, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "J-15 Flying Shark", role: "CHASSE", quantite: 32 },
                   { modele: "Z-18", role: "TRANSPORT", quantite: 12 }] },
  "Chine|16": { typeCatapulte: "STOBAR", nombreAeronefs: 36, longueurPisteMetres: 195, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "J-15 Flying Shark", role: "CHASSE", quantite: 24 },
                   { modele: "Z-18", role: "TRANSPORT", quantite: 12 }] },
  "Japon|DDH-183": { typeCatapulte: "STOVL", nombreAeronefs: 28, longueurPisteMetres: 248, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "F-35B Lightning II", role: "CHASSE", quantite: 12 },
                   { modele: "SH-60K", role: "LUTTE_SOUS_MARINE", quantite: 14 }] },
  "Japon|DDH-184": { typeCatapulte: "STOVL", nombreAeronefs: 28, longueurPisteMetres: 248, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "F-35B Lightning II", role: "CHASSE", quantite: 12 },
                   { modele: "SH-60K", role: "LUTTE_SOUS_MARINE", quantite: 14 }] },
  "Inde|R11": { typeCatapulte: "STOBAR", nombreAeronefs: 30, longueurPisteMetres: 203, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "MiG-29K", role: "CHASSE", quantite: 20 },
                   { modele: "Ka-31", role: "GUET_AERIEN", quantite: 4 }] },
  "Inde|R33": { typeCatapulte: "STOBAR", nombreAeronefs: 36, longueurPisteMetres: 198, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "MiG-29K", role: "CHASSE", quantite: 24 },
                   { modele: "Ka-31", role: "GUET_AERIEN", quantite: 6 }] },
  "Italie|C550": { typeCatapulte: "STOVL", nombreAeronefs: 20, longueurPisteMetres: 180, nombreAscenseurs: 2,
    groupeAerien: [{ modele: "F-35B Lightning II", role: "CHASSE", quantite: 10 },
                   { modele: "EH-101 Merlin", role: "LUTTE_SOUS_MARINE", quantite: 8 }] },

  // --- batiments de surface : systeme de combat, capacite VLS, helicos ------
  "France|D620":        { systemeCombat: "PAAMS",    capaciteVLS: 48,  nombreHelicopteres: 1, plateformeHelicoptere: true },
  "France|D621":        { systemeCombat: "PAAMS",    capaciteVLS: 48,  nombreHelicopteres: 1, plateformeHelicoptere: true },
  "France|D650":        { systemeCombat: "SETIS",    capaciteVLS: 32,  nombreHelicopteres: 1, plateformeHelicoptere: true },
  "France|D653":        { systemeCombat: "SETIS",    capaciteVLS: 32,  nombreHelicopteres: 1, plateformeHelicoptere: true },
  "France|D654":        { systemeCombat: "SETIS",    capaciteVLS: 32,  nombreHelicopteres: 1, plateformeHelicoptere: true },
  "Etats-Unis|DDG-1000":{ systemeCombat: "TSCE",     capaciteVLS: 80,  nombreHelicopteres: 2, plateformeHelicoptere: true },
  "Etats-Unis|DDG-51":  { systemeCombat: "AEGIS",    capaciteVLS: 96,  nombreHelicopteres: 2, plateformeHelicoptere: true },
  "Etats-Unis|CG-47":   { systemeCombat: "AEGIS",    capaciteVLS: 68,  nombreHelicopteres: 2, plateformeHelicoptere: true },
  "Royaume-Uni|D32":    { systemeCombat: "PAAMS",    capaciteVLS: 48,  nombreHelicopteres: 1, plateformeHelicoptere: true },
  "Royaume-Uni|F239":   { systemeCombat: "DNA-2",    capaciteVLS: 32,  nombreHelicopteres: 1, plateformeHelicoptere: true },
  "Russie|099":         { systemeCombat: "FORT",     capaciteVLS: 96,  nombreHelicopteres: 3, plateformeHelicoptere: true },
  "Russie|454":         { systemeCombat: "SIGMA",    capaciteVLS: 48,  nombreHelicopteres: 1, plateformeHelicoptere: true },
  "Russie|543":         { systemeCombat: "PURGA",    capaciteVLS: 32,  nombreHelicopteres: 2, plateformeHelicoptere: true },
  "Chine|101":          { systemeCombat: "H/ZBJ-1",  capaciteVLS: 112, nombreHelicopteres: 2, plateformeHelicoptere: true },
  "Japon|DDG-179":      { systemeCombat: "AEGIS",    capaciteVLS: 96,  nombreHelicopteres: 1, plateformeHelicoptere: true },
  "Inde|D66":           { systemeCombat: "EMCCA",    capaciteVLS: 48,  nombreHelicopteres: 2, plateformeHelicoptere: true },
  "Italie|D553":        { systemeCombat: "PAAMS",    capaciteVLS: 48,  nombreHelicopteres: 1, plateformeHelicoptere: true },
  "Italie|F590":        { systemeCombat: "SADOC-4",  capaciteVLS: 16,  nombreHelicopteres: 2, plateformeHelicoptere: true }
};

// -----------------------------------------------------------------------------
// PATTERN 2 - EXTENDED REFERENCE
//
// portAttacheId: "TOULON" devient
// portAttache: { id: "TOULON", nom: "Toulon", pays: "France" }
//
// On ne duplique QUE les deux champs affiches systematiquement avec le navire.
// La capacite du port, elle, reste dans la collection ports : elle change,
// donc on ne la recopie pas.
// -----------------------------------------------------------------------------

const ports   = {}; base.ports.find().forEach(function (p) { ports[p._id] = p; });
const flottes = {}; base.flottes.find().forEach(function (f) { flottes[f._id] = f; });

let polymorphes = 0;
base.navires.find().forEach(function (n) {
  const cle = n.nation + "|" + n.numeroCoque;
  const specifique = SPECIFIQUES[cle] || {};
  const port = ports[n.portAttacheId];
  const flotte = flottes[n.flotteId];

  const maj = Object.assign({}, specifique, {
    _class: classePour(n.type),
    portAttache: { id: port._id, nom: port.nom, pays: port.pays },
    flotte: { id: flotte._id, nom: flotte.nom, nation: flotte.nation },
    // PATTERN 4 - COMPUTED : agregats maintenus a l'ecriture, lus sans calcul.
    stats: {
      nombreMissions: base.missions.countDocuments({ "naviresParticipants.id": n._id }),
      effectifActuel: 0,          // renseigne par 00b, avec l'equipage
      dernierReleve: null         // renseigne par 00b, avec le journal de bord
    }
  });

  base.navires.updateOne({ _id: n._id }, {
    $set: maj,
    $unset: { portAttacheId: "", flotteId: "" }
  });
  polymorphes++;
});

print("[amiraute] " + polymorphes + " navires mis en forme document");

base.navires.aggregate([
  { $group: { _id: "$_class", n: { $sum: 1 } } }, { $sort: { n: -1 } }
]).forEach(function (c) { print("    " + c._id.padEnd(20) + c.n); });

print("");
print("=== Jeu de donnees AMIRAUTE charge ===");
print("  ports     : " + base.ports.countDocuments());
print("  flottes   : " + base.flottes.countDocuments());
print("  navires   : " + base.navires.countDocuments() + "  (3 formes de document)");
print("  missions  : " + base.missions.countDocuments());
print("");
print("Enchainer avec 00b-generer-volume.js : equipage, etat-major (Subset)");
print("et les 100 000 releves du journal de bord.");
