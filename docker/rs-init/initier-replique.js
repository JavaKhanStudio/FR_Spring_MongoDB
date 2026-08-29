// Initie le replica set rsAmiraute puis attend qu'un primaire soit elu.

try {
  rs.status();
  print("[amiraute] replica set deja initie, rien a faire");
  quit(0);
} catch (e) {
  // code 94 = NotYetInitialized : c'est le cas nominal au premier demarrage.
}

rs.initiate({
  _id: "rsAmiraute",
  members: [
    { _id: 0, host: "mongo1:27017", priority: 2 },
    { _id: 1, host: "mongo2:27017", priority: 1 },
    { _id: 2, host: "mongo3:27017", priority: 1 }
  ]
});

let tours = 0;
while (!db.hello().isWritablePrimary && tours < 30) {
  sleep(1000);
  tours++;
}

print("[amiraute] replica set rsAmiraute initie, primaire = " + db.hello().primary);
