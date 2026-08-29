// Rattache les shards au routeur et prepare le cluster pour la demonstration.
//
// On ne partitionne DELIBEREMENT aucune collection ici : le scenario du
// script mongosh/08-sharding.js part d'une collection deja pleine et NON
// partitionnee, puis la partitionne en direct. C'est ce qui rend le
// decoupage et la migration observables.

sh.addShard("rsShard1/shard1:27017");
sh.addShard("rsShard2/shard2:27017");

sh.enableSharding("amiraute");

// TAILLE DE CHUNK : 1 Mo, le minimum autorise.
//
// Par defaut un chunk fait 128 Mo. Le jeu de donnees de la formation pese
// ~20 Mo : il tiendrait donc ENTIEREMENT dans un seul chunk, et le cluster
// ne partitionnerait jamais rien. La demonstration montrerait un cluster
// sharde qui ne shard pas.
//
// A 1 Mo, les 20 Mo produisent une vingtaine de chunks : le decoupage et les
// migrations deviennent visibles a l'oeil nu.
//
// C'est un reglage DE DEMONSTRATION. En production on ne touche pas a cette
// valeur : 128 Mo est le bon compromis entre cout de migration et granularite.
db.getSiblingDB("config").settings.updateOne(
  { _id: "chunksize" }, { $set: { value: 1 } }, { upsert: true });

print("[amiraute] cluster pret");
print("  shards      : " + db.getSiblingDB("config").shards.find().toArray()
                              .map(function (s) { return s._id; }).join(", "));
print("  chunk size  : " + db.getSiblingDB("config").settings
                              .findOne({ _id: "chunksize" }).value + " Mo");
print("  amiraute    : partitionnement active, AUCUNE collection partitionnee");
print("");
print("Suite : charger les donnees, puis jouer mongosh/08-sharding.js");
