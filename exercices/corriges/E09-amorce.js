// =============================================================================
// E09 - Amorce : 150 000 entrees de journal d'acces sur 7 jours.
//     make charger F=exercices/corriges/E09-amorce.js
// =============================================================================
const base = db.getSiblingDB("amiraute");
base.ex_acces.drop();
base.createCollection("ex_acces");

let graine = 424242;
function alea() { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; }
function entier(a, b) { return a + Math.floor(alea() * (b - a + 1)); }
function parmi(l) { return l[entier(0, l.length - 1)]; }

// Chaque chemin a un profil propre : latence de base, taux d'erreur, poids.
const CHEMINS = [
  { chemin: "/",                 base:  20, erreur: 0.005, poids: 25 },
  { chemin: "/api/produits",     base:  80, erreur: 0.010, poids: 30 },
  { chemin: "/api/recherche",    base: 190, erreur: 0.020, poids: 15 },
  { chemin: "/api/panier",       base:  60, erreur: 0.015, poids: 12 },
  { chemin: "/api/paiement",     base: 240, erreur: 0.120, poids:  6 },  // erreurs
  { chemin: "/api/rapports",     base: 1400, erreur: 0.030, poids:  4 }, // lent
  { chemin: "/static/app.js",    base:  10, erreur: 0.002, poids:  8 }
];
const TIRAGE = [];
CHEMINS.forEach(function (c) { for (let i = 0; i < c.poids; i++) { TIRAGE.push(c); } });

const AGENTS = ["navigateur", "navigateur", "navigateur", "mobile", "robot"];
const DEBUT = Date.UTC(2026, 7, 17, 0, 0, 0);          // 17 aout 2026
const DUREE = 7 * 24 * 3600 * 1000;
const CIBLE = 150000;

let lot = [];
for (let i = 0; i < CIBLE; i++) {
  const c = parmi(TIRAGE);

  // Trafic module par l'heure : creux la nuit, pic en milieu de journee.
  let t = DEBUT + Math.floor(alea() * DUREE);
  const heure = new Date(t).getUTCHours();
  const facteur = 0.3 + 0.7 * Math.sin(Math.PI * heure / 24);
  if (alea() > facteur) { t = DEBUT + Math.floor(alea() * DUREE); }

  const enErreur = alea() < c.erreur;
  const statut = enErreur ? parmi([400, 401, 403, 404, 422, 500, 502, 503])
                          : parmi([200, 200, 200, 200, 201, 204, 301, 304]);

  lot.push({
    horodatage: new Date(t),
    chemin: c.chemin,
    methode: c.chemin.indexOf("/api/") === 0 ? parmi(["GET", "GET", "POST", "PUT"]) : "GET",
    codeStatut: statut,
    dureeMs: Math.max(1, Math.round(c.base * (0.5 + alea() * 1.6))),
    octets: entier(180, 48000),
    ip: "10." + entier(0, 9) + "." + entier(0, 255) + "." + entier(1, 254),
    agent: parmi(AGENTS)
  });

  if (lot.length >= 5000) {
    base.ex_acces.insertMany(lot, { ordered: false });
    lot = [];
    if ((i + 1) % 50000 === 0) { print("  " + (i + 1) + " / " + CIBLE); }
  }
}
if (lot.length) { base.ex_acces.insertMany(lot, { ordered: false }); }

base.ex_acces.createIndex({ horodatage: 1 }, { name: "idx_horodatage" });
base.ex_acces.createIndex({ chemin: 1, horodatage: 1 }, { name: "idx_chemin_temps" });

print("\nex_acces : " + base.ex_acces.countDocuments() + " entrees");
print("periode  : 17 au 24 aout 2026");
print("index    : idx_horodatage, idx_chemin_temps");
