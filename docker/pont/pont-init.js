// r72: the bridge's account on the course's `simple` stack, on ANY volume. The course's
// mongo-init scripts run once, when the volume is created, so a student whose volume exists
// would never get it: this runs at every `up` (the pont-init service, as amiral) and does
// nothing when the account is already there.
// The capsule's own database, never amiraute: the profiler level is per database, and J3's
// Performance module reads amiraute's. Its name is Ficelle_<capsule> (Simon, r72): the capsule
// that lays the bridge sets PONT_DB, and a name of any other shape is refused.
const nom = process.env.PONT_DB || "";
if (!/^Ficelle_[A-Za-z0-9_-]+$/.test(nom)) { print(`[pont] PONT_DB doit etre Ficelle_<capsule>, pas "${nom}"`); quit(2); }
const base = db.getSiblingDB(nom);
if (!base.getRole("observateur_pont")) {
  base.createRole({ role: "observateur_pont", roles: [], privileges: [
    { resource: { db: nom, collection: "" }, actions: ["enableProfiler"] },
    // system.profile is a system collection: collection "" does not cover it.
    { resource: { db: nom, collection: "system.profile" }, actions: ["find"] } ] });
  print(`[pont] role observateur_pont cree sur ${nom}`);
}
if (!base.getUser("pont")) {
  // It reads and may run the profiler on this one database. No write, nothing on amiraute.
  base.createUser({ user: "pont", pwd: "pont", roles: [{ role: "read", db: nom }, { role: "observateur_pont", db: nom }] });
  print(`[pont] utilisateur pont cree sur ${nom}`);
} else print(`[pont] utilisateur pont deja present sur ${nom}`);

// The seed (Simon, r72): a dozen of the course's own ships (mongosh/00-jeu-de-donnees.js, its
// first twelve, top-level fields only, words unchanged), loaded only while the database holds no
// collection of its own, so a student's later inserts and deletes are never undone by an `up`.
// It runs after the account: a failed seed leaves the bridge working on an empty database.
// r125: a capsule may bring its own seed instead: PONT_SEED, an Extended JSON array (carnet: the 139 turtles of
// code/trouver/turtles.json, its _ids kept so the beach knows each one), loaded into PONT_COLL.
const seed = process.env.PONT_SEED || "", into = process.env.PONT_COLL || "navires";
// r233: a seed that is not a file path (/site/...) is fetched: a URL, or a path under PONT_URL (the deployed site the
// course's bridge serves, docker/compose.pont.yml of the course repo). mongosh does not wait on a promise in a --file
// script: sleep() lets the fetch run until it lands.
function lire(s) {
  if (s.startsWith("/")) return require("fs").readFileSync(s, "utf8");
  const url = new URL(s, process.env.PONT_URL || undefined).href;
  let texte, echec;
  fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))).then((t) => { texte = t; }, (e) => { echec = e; });
  for (let i = 0; texte === undefined && !echec && i < 600; i++) sleep(50);
  if (texte === undefined) throw new Error(`[pont] graine ${url} : ${echec ? echec.message : "pas de reponse en 30 s"}`);
  return texte;
}
if (base.getCollectionNames().filter((c) => !c.startsWith("system.")).length > 0) print(`[pont] ${nom} a deja ses collections : pas de graine`);
else if (seed) {
  base.getCollection(into).insertMany(EJSON.parse(lire(seed), { relaxed: false }));
  print(`[pont] graine : ${base.getCollection(into).countDocuments()} documents de ${seed} charges dans ${nom}.${into}`);
} else {
  base.navires.insertMany([
    { numeroCoque: "R91", nom: "Charles de Gaulle", classe: "Charles de Gaulle", type: "PORTE_AVIONS", nation: "France", anneeMiseEnService: 2001, statut: "ACTIF" },
    { numeroCoque: "L9013", nom: "Mistral", classe: "Mistral", type: "PORTE_HELICOPTERES", nation: "France", anneeMiseEnService: 2006, statut: "ACTIF" },
    { numeroCoque: "D620", nom: "Forbin", classe: "Horizon", type: "DESTROYER", nation: "France", anneeMiseEnService: 2010, statut: "ACTIF" },
    { numeroCoque: "D621", nom: "Chevalier Paul", classe: "Horizon", type: "DESTROYER", nation: "France", anneeMiseEnService: 2011, statut: "EN_REPARATION" },
    { numeroCoque: "D650", nom: "Aquitaine", classe: "FREMM", type: "FREGATE", nation: "France", anneeMiseEnService: 2012, statut: "ACTIF" },
    { numeroCoque: "D653", nom: "Languedoc", classe: "FREMM", type: "FREGATE", nation: "France", anneeMiseEnService: 2016, statut: "ACTIF" },
    { numeroCoque: "D654", nom: "Auvergne", classe: "FREMM", type: "FREGATE", nation: "France", anneeMiseEnService: 2017, statut: "EN_MISSION" },
    { numeroCoque: "S635", nom: "Suffren", classe: "Barracuda", type: "SOUS_MARIN", nation: "France", anneeMiseEnService: 2022, statut: "ACTIF" },
    { numeroCoque: "S619", nom: "Le Terrible", classe: "Triomphant", type: "SOUS_MARIN", nation: "France", anneeMiseEnService: 2010, statut: "ACTIF" },
    { numeroCoque: "S601", nom: "Rubis", classe: "Rubis", type: "SOUS_MARIN", nation: "France", anneeMiseEnService: 1983, statut: "DESARME" },
    { numeroCoque: "CVN-78", nom: "Gerald R. Ford", classe: "Gerald R. Ford", type: "PORTE_AVIONS", nation: "Etats-Unis", anneeMiseEnService: 2017, statut: "ACTIF" },
    { numeroCoque: "CVN-69", nom: "Dwight D. Eisenhower", classe: "Nimitz", type: "PORTE_AVIONS", nation: "Etats-Unis", anneeMiseEnService: 1977, statut: "ACTIF" }]);
  print(`[pont] graine : ${base.navires.countDocuments()} navires charges dans ${nom}`);
}
