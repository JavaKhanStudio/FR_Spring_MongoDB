// =============================================================================
// CORRIGE E13 - La mediatheque polymorphe
//     make charger F=exercices/corriges/E13-mediatheque-polymorphe.js
// =============================================================================
const base = db.getSiblingDB("amiraute");
function etape(n, t) { print("\n--- " + n + ". " + t + " " + "-".repeat(Math.max(0, 48 - t.length))); }
function l() { print("  " + Array.prototype.slice.call(arguments).join("  ")); }

base.ex_medias.drop();

etape(1, "ou passe la frontiere ?");
print("");
print("  TRONC COMMUN = ce sur quoi on fait des requetes TRANSVERSES.");
print("    titre, annee, langue, genres[], cote, disponible");
print("");
print("  SPECIFIQUE = ce qui n'a de sens que pour un type.");
print("    livre : isbn, auteurs, pages, format");
print("    film  : realisateur, dureeMinutes, support, sousTitres, casting");
print("    album : artiste, label, pistes[]");
print("");
print("  DEUX CAS LIMITES, et leur arbitrage :");
print("");
print("  a) 'duree' - un film et un album en ont une, un livre non.");
print("     La monter dans le tronc commun permettrait 'tout ce qui dure");
print("     moins d'une heure', toutes categories confondues.");
print("     -> On la LAISSE specifique : la question ne se pose jamais dans");
print("        cette mediatheque, et un champ commun absent sur un tiers des");
print("        documents n'est pas un tronc commun, c'est un piege a $exists.");
print("     Si l'ecran 'contenus courts' existait, la reponse s'inverserait.");
print("");
print("  b) 'auteurs' vs 'realisateur' vs 'artiste' - trois noms pour");
print("     'la personne creditee'. Les fusionner en 'createurs[]' rendrait");
print("     possible 'tout ce qu'a fait X, livre ou film'.");
print("     -> On les FUSIONNE si la mediatheque a une fiche auteur.");
print("        On les laisse separes sinon : le vocabulaire metier compte,");
print("        et un bibliothecaire ne dit pas 'createur'.");

etape(2, "le discriminant, et son nom");
base.ex_medias.insertMany([
  { type: "LIVRE", titre: "Vingt mille lieues sous les mers", annee: 2024, langue: "fr",
    genres: ["aventure", "mer"], cote: "R-12-B", disponible: true,
    isbn: "978-2-07-036822-8", auteurs: ["Jules Verne"], editeur: "Gallimard",
    pages: 608, format: "POCHE" },
  { type: "LIVRE", titre: "Le Vieil Homme et la Mer", annee: 2023, langue: "fr",
    genres: ["roman", "mer"], cote: "R-04-A", disponible: false,
    isbn: "978-2-07-036000-0", auteurs: ["Ernest Hemingway"], editeur: "Gallimard",
    pages: 152, format: "BROCHE" },
  { type: "LIVRE", titre: "Moby Dick", annee: 2024, langue: "en",
    genres: ["aventure", "mer"], cote: "R-12-C", disponible: true,
    isbn: "978-0-14-243724-7", auteurs: ["Herman Melville"], editeur: "Penguin",
    pages: 720, format: "RELIE" },

  { type: "FILM", titre: "Le Chant de la mer", annee: 2024, langue: "fr",
    genres: ["animation", "mer"], cote: "F-02-A", disponible: true,
    realisateur: "Tomm Moore", dureeMinutes: 93, support: "BLURAY",
    sousTitres: ["fr", "en"], casting: ["David Rawle", "Brendan Gleeson"] },
  { type: "FILM", titre: "En eaux troubles", annee: 2022, langue: "en",
    genres: ["action", "mer"], cote: "F-07-D", disponible: false,
    realisateur: "Ben Wheatley", dureeMinutes: 116, support: "DVD",
    sousTitres: ["fr"], casting: ["Jason Statham"] },
  { type: "FILM", titre: "Master and Commander", annee: 2024, langue: "en",
    genres: ["guerre", "mer"], cote: "F-03-B", disponible: true,
    realisateur: "Peter Weir", dureeMinutes: 138, support: "BLURAY",
    sousTitres: ["fr", "en", "es"], casting: ["Russell Crowe", "Paul Bettany"] },

  { type: "ALBUM", titre: "The Ocean", annee: 2024, langue: "en",
    genres: ["rock", "mer"], cote: "M-08-A", disponible: true,
    artiste: "Led Zeppelin", label: "Atlantic", pistes: [
      { titre: "The Ocean", dureeSecondes: 271 }, { titre: "The Rain Song", dureeSecondes: 462 }] },
  { type: "ALBUM", titre: "Oceania", annee: 2023, langue: "en",
    genres: ["rock"], cote: "M-02-C", disponible: true,
    artiste: "The Smashing Pumpkins", label: "EMI",
    pistes: Array.from({ length: 13 }, function (_, i) {
      return { titre: "Piste " + (i + 1), dureeSecondes: 180 + i * 12 }; }) },
  { type: "ALBUM", titre: "Marees", annee: 2024, langue: "fr",
    genres: ["chanson", "mer"], cote: "M-05-B", disponible: false,
    artiste: "Nolwenn Leroy", label: "Mercury",
    pistes: Array.from({ length: 14 }, function (_, i) {
      return { titre: "Chanson " + (i + 1), dureeSecondes: 200 + i * 7 }; }) }
]);
l("documents :", String(base.ex_medias.countDocuments()));
print("\n  Le champ s'appelle 'type', PAS '_class'.");
print("  _class appartient a Spring Data : le lui prendre casserait le mapping");
print("  le jour ou cette collection serait exposee par une application Spring.");
print("  Un discriminant METIER et un discriminant TECHNIQUE peuvent coexister,");
print("  mais ils ne doivent pas se disputer le meme nom.");

etape(3, "requetes TRANSVERSES - le discriminant est ignore");
l("sorties en 2024 :", String(base.ex_medias.countDocuments({ annee: 2024 })));
base.ex_medias.find({ annee: 2024 }, { _id: 0, type: 1, titre: 1 }).sort({ type: 1 })
  .forEach(function (d) { l("  " + d.type.padEnd(8), d.titre); });

print("");
base.ex_medias.aggregate([
  { $group: { _id: { type: "$type", langue: "$langue" }, n: { $sum: 1 } } },
  { $sort: { "_id.type": 1, "_id.langue": 1 } }
]).forEach(function (r) { l("  " + (r._id.type + " / " + r._id.langue).padEnd(16), String(r.n)); });

print("");
l("indisponibles :", base.ex_medias.find({ disponible: false })
    .toArray().map(function (d) { return d.titre; }).join(", "));
print("\n  Ces trois requetes seraient un UNION de trois SELECT en relationnel.");

etape(4, "requetes SPECIFIQUES");
l("livres > 500 pages :", base.ex_medias.find({ type: "LIVRE", pages: { $gt: 500 } })
    .toArray().map(function (d) { return d.titre; }).join(", "));
l("films BLURAY sous-titres :", base.ex_medias.find({
    type: "FILM", support: "BLURAY", sousTitres: { $exists: true, $ne: [] } })
    .toArray().map(function (d) { return d.titre; }).join(", "));
l("albums > 12 pistes :", base.ex_medias.find({
    type: "ALBUM", $expr: { $gt: [{ $size: "$pistes" }, 12] } })
    .toArray().map(function (d) { return d.titre; }).join(", "));
print("\n  Noter le 'type' EN TETE de chaque filtre. Ce n'est pas decoratif :");
print("  c'est ce qui permet a l'index compose de cibler.");

etape(5, "les index : combien ?");
base.ex_medias.createIndex({ type: 1, annee: -1 }, { name: "idx_type_annee" });
base.ex_medias.createIndex({ disponible: 1, annee: -1 }, { name: "idx_dispo_annee" });
base.ex_medias.createIndex({ titre: "text" }, { name: "idx_titre" });
print("");
base.ex_medias.getIndexes().forEach(function (i) {
  l("  " + i.name.padEnd(20), JSON.stringify(i.key));
});
print("\n  TROIS index (hors _id) servent les neuf requetes ci-dessus.");
print("");
print("  En trois collections separees il en faudrait NEUF - trois par");
print("  collection - et les requetes transverses resteraient impossibles");
print("  sans un $unionWith a la main, non indexable.");

etape(6, "explain : le cout d'oublier le discriminant");
function mesurer(libelle, filtre) {
  const e = base.ex_medias.find(filtre).explain("executionStats").executionStats;
  const st = []; let s = e.executionStages; while (s) { st.push(s.stage); s = s.inputStage; }
  l("  " + libelle.padEnd(34), String(e.totalDocsExamined).padStart(3) + " docs examines",
    st.join(" <- "));
}
mesurer("sans type : { pages > 500 }", { pages: { $gt: 500 } });
mesurer("avec type", { type: "LIVRE", pages: { $gt: 500 } });
print("\n  L'ecart est derisoire sur 9 documents - ET C'EST LE POINT.");
print("  Sur 100 000 medias dont 60 000 livres, sans le filtre 'type' MongoDB");
print("  examine les 40 000 films et albums pour rien, a chaque requete.");
print("");
print("  Regle : dans une collection polymorphe, le discriminant est TOUJOURS");
print("  la premiere clef de l'index, et toujours dans le filtre.");

etape(7, "on ajoute les jeux video");
base.ex_medias.insertOne({
  type: "JEU", titre: "Sea of Thieves", annee: 2024, langue: "en",
  genres: ["aventure", "mer"], cote: "J-01-A", disponible: true,
  editeur: "Rare", plateforme: "XBOX", pegi: 12, multijoueur: true
});
l("documents :", String(base.ex_medias.countDocuments()));
l("documents modifies :", "0");
l("index a recreer :", "0");
l("migration :", "aucune");
print("");
print("  On a insere un document d'une QUATRIEME forme dans une collection en");
print("  production, sans rien interrompre. Les requetes transverses le voient");
print("  deja :");
base.ex_medias.find({ annee: 2024, genres: "mer" }, { _id: 0, type: 1, titre: 1 })
  .forEach(function (d) { l("  " + d.type.padEnd(8), d.titre); });
print("");
print("  En relationnel : CREATE TABLE, un ALTER sur la vue d'union, un");
print("  deploiement coordonne, et une fenetre de maintenance.");

// -----------------------------------------------------------------------------
print("\n--- Pour aller plus loin " + "-".repeat(36));
print("");
print("  'dateAcquisition obligatoire sur 40 000 documents existants'");
print("");
print("  SCHEMA VERSIONING - on versionne le document, pas la base :");
print("");
print("    { schemaVersion: 2, dateAcquisition: ISODate(...), ... }   nouveau");
print("    { ...pas de schemaVersion... }                            ancien");
print("");
print("  1. Le code sait lire les DEUX versions. Absence de schemaVersion");
print("     = version 1, et dateAcquisition vaut alors une valeur par defaut.");
print("  2. Toute ECRITURE migre le document au passage.");
print("  3. Un job de fond migre le reliquat, par lots, sans verrou global.");
print("  4. Quand le compteur de version 1 tombe a zero, on retire le code");
print("     de compatibilite.");
print("");
print("  Aucune interruption, aucun verrou de table, et un retour arriere");
print("  possible a chaque etape.");
print("");
print("  ALTER TABLE ... NOT NULL sur 40 000 lignes : verrou exclusif, duree");
print("  imprevisible, et un rollback qui rejoue tout. C'est la difference");
print("  la plus concrete entre schema DECLARE et schema APPLICATIF.");

print("\n--- Nettoyage " + "-".repeat(47));
base.ex_medias.drop();
print("  ex_medias supprimee");
