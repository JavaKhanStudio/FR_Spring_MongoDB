// Cree les collections avec leurs options non modifiables apres coup.
// Tout le reste (documents, index) est charge par l'application Spring
// ou par les scripts mongosh/.

const base = db.getSiblingDB("amiraute");

["navires", "ports", "flottes", "missions", "membresEquipage"].forEach(function (nom) {
  base.createCollection(nom);
});

// journauxBord reste une collection ORDINAIRE, volontairement.
//
// Une collection time series serait defendable ici (horodatage + navireId),
// mais elle change la sortie d'explain() : on n'y voit plus des documents mais
// des "buckets" internes. Or journauxBord porte justement la demonstration
// COLLSCAN vs IXSCAN du module Performance. On garde donc une collection
// classique, et le type time series est traite a part, dans l'annexe
// d'exercices (micro-domaine "capteurs meteo").
//
// La syntaxe, pour memoire, a montrer sans l'executer :
//
//   base.createCollection("journauxBord", {
//     timeseries: { timeField: "horodatage", metaField: "navireId",
//                   granularity: "minutes" }
//   });
base.createCollection("journauxBord");

print("[amiraute] 6 collections creees");
