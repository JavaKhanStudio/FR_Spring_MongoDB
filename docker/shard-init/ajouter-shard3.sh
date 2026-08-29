#!/bin/bash
# Ajoute un TROISIEME shard a un cluster qui tourne deja, sans l'interrompre.
set -e

echo "[amiraute] initiation de rsShard3"
mongosh --host shard3 --quiet --eval "
  try { rs.status(); print('  deja initie'); }
  catch (e) {
    rs.initiate({ _id: 'rsShard3', members: [ { _id: 0, host: 'shard3:27017' } ] });
    print('  initie');
  }"

echo "[amiraute] rattachement au routeur"
mongosh --host mongos --quiet --eval "
  const avant = db.getSiblingDB('config').shards.countDocuments();
  sh.addShard('rsShard3/shard3:27017');
  const apres = db.getSiblingDB('config').shards.countDocuments();
  print('  shards : ' + avant + ' -> ' + apres);
  print('');
  print('  Le repartiteur va maintenant deplacer des chunks vers shard3.');
  print('  Observer en direct :');
  print('    make cluster-etat');
"
