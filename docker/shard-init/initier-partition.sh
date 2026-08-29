#!/bin/bash
# Initie les trois replica sets du cluster sharde. Chacun est mono-noeud :
# suffisant pour demontrer le partitionnement sans saturer un poste.
set -e

initier() {
  local hote=$1 nom=$2 extra=$3
  echo "[amiraute] initiation de $nom sur $hote"
  mongosh --host "$hote" --quiet --eval "
    try { rs.status(); print('  deja initie'); }
    catch (e) {
      rs.initiate({ _id: '$nom', $extra members: [ { _id: 0, host: '$hote:27017' } ] });
      print('  initie');
    }
  "
}

initier configsvr rsConfig "configsvr: true,"
initier shard1    rsShard1 ""
initier shard2    rsShard2 ""

echo "[amiraute] les trois replica sets sont prets"
