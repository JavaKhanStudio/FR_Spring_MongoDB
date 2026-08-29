// Execute une seule fois, a la creation du volume, par l'entrypoint de l'image.
// Cree l'utilisateur applicatif utilise par Spring : droits limites a la base
// amiraute. Le compte "amiral" reste le compte d'administration.

const base = db.getSiblingDB("amiraute");

// ---------------------------------------------------------------------------
// ROLE SUR MESURE : exactement ce qu'exige le module Performance du J3.
//
// $indexStats, le profileur et la lecture de system.profile ne sont autorises
// NI par readWrite, NI par dbAdmin. Sans ce role, /api/diagnostic/* repond :
//     Command failed with error 13 (Unauthorized):
//     not authorized on amiraute to execute command { $indexStats: {} }
//
// On aurait pu empiler des roles predefinis jusqu'a ce que ca passe. On declare
// plutot les ACTIONS precises : c'est le principe du moindre privilege, et
// cela montre qu'un role MongoDB se compose action par action.
//
// En production, ce role irait a un compte d'observabilite distinct, utilise
// par l'outillage - jamais au compte applicatif.
// ---------------------------------------------------------------------------
base.createRole({
  role: "observateur",
  privileges: [
    {
      resource: { db: "amiraute", collection: "" },   // toutes les collections
      actions: ["indexStats", "collStats", "dbStats", "enableProfiler"]
    },
    {
      // system.profile est une collection SYSTEME : elle n'est PAS couverte
      // par collection:"" et exige sa propre entree de privilege.
      resource: { db: "amiraute", collection: "system.profile" },
      actions: ["find"]
    }
  ],
  roles: []
});

base.createUser({
  user: "amiraute_app",
  pwd: "amiraute",
  roles: [
    { role: "readWrite",   db: "amiraute" },
    { role: "observateur", db: "amiraute" }
  ]
});

// Un utilisateur en lecture seule : sert la demonstration des roles,
// et permet d'ouvrir Compass en salle sans risque d'ecriture accidentelle.
base.createUser({
  user: "amiraute_lecture",
  pwd: "amiraute",
  roles: [{ role: "read", db: "amiraute" }]
});

print("[amiraute] utilisateurs applicatifs crees sur la base amiraute");
