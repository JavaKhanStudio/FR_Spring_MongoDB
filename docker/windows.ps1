# =====================================================================
#  Le Makefile, pour Windows : sans make, sans WSL, sans Git Bash.
#  On ne l'appelle pas directement : make.cmd, a la racine, le lance.
#
#      .\make simple                          comme   make simple
#      .\make charger F=mongosh/01-crud.js    comme   make charger F=...
#      .\make shell
#
# Chaque cible fait ce que fait celle du Makefile : les memes commandes
# docker compose, les memes .js joues dans le conteneur.
# Une cible qui change dans le Makefile change ici aussi.
#
# Ecrit pour Windows PowerShell 5.1 (celui de Windows 10 et 11) :
#   - ce fichier reste en ASCII pur : 5.1 lit un .ps1 sans BOM comme de
#     l'ANSI, et un accent y deviendrait du charabia ;
#   - aucun guillemet double dans un argument passe a docker : 5.1 les
#     avale en route. Le JavaScript de --eval n'utilise que des simples.
# =====================================================================

$Racine   = Split-Path -Parent $PSScriptRoot
$Compose  = @('compose', '-f', (Join-Path $Racine 'docker/docker-compose.yml'))
$Profils  = @('--profile', 'simple', '--profile', 'replique', '--profile', 'partition', '--profile', 'extension')
$Auth     = @('-u', 'amiral', '-p', 'amiral', '--authenticationDatabase', 'admin')

# F= : le script a jouer, comme dans le Makefile.
$Reglages = @{ F = '' }

# Pas nommee Docker : PowerShell ne distingue pas les majuscules, et
# & docker se rappellerait lui-meme.
function Lancer {
    & docker @args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# $(MONGOSH), $(MONGOSH_R), $(MONGOSH_S) / $(MONGOS) du Makefile.
function Mongosh  { Lancer @Compose exec -T mongo mongosh @Auth --quiet amiraute @args }
function MongoshR { Lancer @Compose exec -T mongo1 mongosh --quiet amiraute @args }
function MongoshS { Lancer @Compose exec -T mongos mongosh --quiet amiraute @args }
function Mongos   { Lancer @Compose exec -T mongos mongosh --quiet @args }

# Le | tail -6 du Makefile.
function Fin([int]$n) { $input | Select-Object -Last $n }

function Aide {
    @'
Cibles disponibles :
  .\make simple      - demarre le mongod autonome + mongo-express
  .\make replique    - demarre le replica set a 3 noeuds
  .\make partition   - demarre le cluster sharde
  .\make stop        - arrete tout, conserve les donnees
  .\make purger      - arrete tout et EFFACE les volumes
  .\make shell       - ouvre un mongosh sur la base amiraute
  .\make logs        - suit les logs du mongod
  .\make amorcer     - charge le jeu de donnees + le volume (profil simple)
  .\make charger F=mongosh/01-crud.js        - joue un script (profil simple)
  .\make replique-charger - charge le referentiel sur le replica set
  .\make charger-rs F=mongosh/07-...js       - idem sur le replica set
  .\make charger-shard F=mongosh/08-...js    - idem sur le routeur mongos

Demonstration du cluster (profil partition) :
  .\make cluster-charger  - charge les 100 000 releves A TRAVERS le routeur
  .\make charger-shard F=mongosh/08-sharding.js   - la demonstration
  .\make etendre          - ajoute un 3e shard A CHAUD
  .\make cluster-etat     - repartition des chunks et des donnees
  .\make cluster-sonde    - lit en boucle pendant les migrations
  .\make cluster-reinit   - departitionne, pour rejouer la demo
'@ | Write-Host
}

function Docker-Pret {
    & docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host '  Docker ne repond pas. Lancer Docker Desktop, attendre que'
        Write-Host '  la baleine arrete de clignoter, et recommencer.'
        Write-Host ''
        exit 1
    }
}

# F=mongosh/01-crud.js, ou F=mongosh\01-crud.js : le conteneur veut des /.
function Script([string]$Exemple) {
    if (-not $Reglages.F) { Write-Host "Usage : .\make $Exemple"; exit 1 }
    '/projet/' + ($Reglages.F -replace '\\', '/')
}

$ClusterEtat = @'
const c=db.getSiblingDB('config').collections.findOne({_id:'amiraute.journauxBord'});
if(!c){print('collection NON partitionnee');quit(0);}
const ch=db.getSiblingDB('config').chunks.aggregate([{$match:{uuid:c.uuid}},{$group:{_id:'$shard',n:{$sum:1}}},{$sort:{_id:1}}]).toArray();
const st=db.getSiblingDB('amiraute').journauxBord.aggregate([{$collStats:{storageStats:{}}}]).toArray();
ch.forEach(function(x){var s=st.filter(function(y){return y.shard===x._id;})[0];
  print('  '+x._id.padEnd(10)+String(x.n).padStart(3)+' chunks   '+
    (s?String(s.storageStats.count).padStart(7)+' docs '+String(Math.round(s.storageStats.size/1024)).padStart(6)+' Ko':''));});
print('  total via le routeur : '+db.getSiblingDB('amiraute').journauxBord.countDocuments());
print('  migration en cours   : '+(sh.isBalancerRunning().inBalancerRound||false));
'@

$ClusterSonde = @'
while(true){
  try{ print(new Date().toISOString().slice(11,19)+'  '+db.getSiblingDB('amiraute').journauxBord.countDocuments()+' documents'); }
  catch(e){ print('ERREUR : '+e.message); } sleep(2000); }
'@

function Cible([string]$c) {
    switch ($c) {
        'aide'      { Aide }
        'simple'    {
            Docker-Pret
            Lancer @Compose --profile simple up -d
            Write-Host 'MongoDB   : mongodb://localhost:27017'
            Write-Host 'Compass   : mongodb://amiral:amiral@localhost:27017/?authSource=admin'
            Write-Host 'Express   : http://localhost:8081'
        }
        'replique'  {
            Docker-Pret
            Lancer @Compose --profile replique up -d
            Write-Host 'Noeuds : localhost:27018 27019 27020 (replica set rsAmiraute)'
            Write-Host 'Enchainer avec : .\make replique-charger'
        }
        # Le referentiel seul : les scripts 07 et 09 n'ont pas besoin des
        # 100 000 releves, et les charger ferait perdre deux minutes en salle.
        'replique-charger' {
            MongoshR --file /projet/mongosh/00-jeu-de-donnees.js | Fin 6
            Write-Host ''
            Write-Host 'Enchainer : .\make charger-rs F=mongosh/07-replication.js'
        }
        'partition' {
            Docker-Pret
            Lancer @Compose --profile partition up -d
            Write-Host 'Routeur mongos : mongodb://localhost:27117'
            Write-Host 'Enchainer avec : .\make cluster-charger'
        }
        # Charge le jeu de donnees A TRAVERS le routeur, sur une collection encore
        # NON partitionnee : c'est le point de depart de la demonstration.
        'cluster-charger' {
            MongoshS --file /projet/mongosh/00-jeu-de-donnees.js | Fin 6
            MongoshS --file /projet/mongosh/00b-generer-volume.js | Fin 4
            Write-Host ''
            Write-Host 'Donnees chargees, collection NON partitionnee.'
            Write-Host 'Enchainer : .\make charger-shard F=mongosh/08-sharding.js'
        }
        # Ajoute un troisieme shard SANS rien arreter.
        'etendre'   {
            Lancer @Compose --profile extension up -d
            & docker @Compose logs -f shard3-init | Select-Object -First 20
        }
        # La repartition reelle : chunks ET taille des donnees.
        'cluster-etat'   { Mongos --eval $ClusterEtat }
        # Lit en boucle pendant les migrations : le compte ne doit jamais bouger.
        'cluster-sonde'  { Mongos --eval $ClusterSonde }
        # Departitionne, pour rejouer la demonstration a zero.
        'cluster-reinit' {
            Mongos amiraute --eval 'db.journauxBord.drop(); print(''journauxBord supprimee et departitionnee'');'
            Write-Host 'Enchainer : .\make cluster-charger'
        }
        'stop'      { Lancer @Compose @Profils down --remove-orphans }
        'purger'    { Lancer @Compose @Profils down -v --remove-orphans }
        'shell'     { Lancer @Compose exec mongo mongosh @Auth amiraute }
        'logs'      { Lancer @Compose logs -f mongo }
        # --file plutot que stdin : mongosh lu sur stdin se comporte en REPL, ce qui
        # casse certaines constructions multi-lignes. Les scripts sont montes en /projet.
        'charger'   { $f = Script 'charger F=mongosh/01-crud.js'; Mongosh --file $f }
        'charger-rs' {
            $f = Script 'charger-rs F=mongosh/07-replication.js'
            Lancer @Compose exec -T mongo1 mongosh --quiet --file $f
        }
        'charger-shard' {
            $f = Script 'charger-shard F=mongosh/08-sharding.js'
            MongoshS --file $f
        }
        'amorcer'   {
            Mongosh --file /projet/mongosh/00-jeu-de-donnees.js
            Mongosh --file /projet/mongosh/00b-generer-volume.js
        }
        default     { Write-Host "  Cible inconnue : $c   (.\make aide liste tout)"; exit 2 }
    }
}

# Comme make : les NOM=valeur reglent, le reste sont des cibles jouees
# dans l'ordre. Sans cible, l'aide.
$Cibles = @()
foreach ($a in $args) {
    if ($a -match '^([A-Za-z]+)=(.*)$') {
        # Garder les deux morceaux AVANT le test suivant : un -match reussi
        # remplace $Matches.
        $nom = $Matches[1].ToUpper()
        $val = $Matches[2]
        if (-not $Reglages.ContainsKey($nom)) { Write-Host "  Reglage inconnu : $nom (F)"; exit 2 }
        $Reglages[$nom] = $val
    } else {
        $Cibles += $a
    }
}
if ($Cibles.Count -eq 0) { $Cibles = @('aide') }
foreach ($c in $Cibles) { Cible $c }
