// =============================================================================
// E07 - Amorce : 200 000 produits, AUCUN index.
//     make charger F=exercices/corriges/E07-amorce.js
// Duree : 20 a 60 secondes.
// =============================================================================
const base = db.getSiblingDB("amiraute");
base.ex_produits.drop();
base.createCollection("ex_produits");

let graine = 7654321;
function alea() { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; }
function entier(a, b) { return a + Math.floor(alea() * (b - a + 1)); }
function parmi(l) { return l[entier(0, l.length - 1)]; }

const CATEGORIES = ["audio", "informatique", "telephonie", "photo", "maison",
                    "sport", "jardin", "jeux", "librairie", "mode"];
const MARQUES = ["Kappa", "Orion", "Vesta", "Neora", "Lumen",
                 "Falco", "Miran", "Solis", "Corvus", "Altair"];
const OBJETS = ["Casque audio", "Enceinte", "Clavier", "Souris", "Ecran",
                "Chargeur", "Sacoche", "Support", "Cable", "Adaptateur"];

const CIBLE = 200000;
let lot = [];
for (let i = 1; i <= CIBLE; i++) {
  const cat = parmi(CATEGORIES);
  lot.push({
    reference: "REF-" + String(i).padStart(6, "0"),
    libelle: parmi(OBJETS) + " " + parmi(MARQUES) + " " + entier(1, 9),
    categorie: cat,
    marque: parmi(MARQUES),
    prixCentimes: entier(299, 249900),
    stock: entier(0, 500),
    // 78 % de disponibles : assez desequilibre pour que l'ordre des cles
    // de l'index compose ait un effet mesurable.
    disponible: alea() < 0.78,
    note: Math.round(alea() * 40 + 10) / 10,
    dateAjout: new Date(Date.UTC(2023, entier(0, 11), entier(1, 28)))
  });
  if (lot.length >= 5000) {
    base.ex_produits.insertMany(lot, { ordered: false });
    lot = [];
    if (i % 50000 === 0) { print("  " + i + " / " + CIBLE); }
  }
}
if (lot.length) { base.ex_produits.insertMany(lot, { ordered: false }); }

print("\nex_produits : " + base.ex_produits.countDocuments() + " documents");
print("index       : " + base.ex_produits.getIndexes()
        .map(function (i) { return i.name; }).join(", "));
print("\nAucun index hors _id : c'est le point de depart de l'exercice.");
