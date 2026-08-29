# Raccourcis de la formation AMIRAUTE.
# Toutes les cibles sont sans effet destructeur sauf "purger".

COMPOSE = docker compose -f docker/docker-compose.yml
MONGOSH   = $(COMPOSE) exec -T mongo mongosh -u amiral -p amiral --authenticationDatabase admin --quiet amiraute
MONGOSH_S = $(COMPOSE) exec -T mongos mongosh --quiet amiraute

.PHONY: aide simple replique replique-charger partition extension etendre stop purger shell logs \
        charger charger-rs charger-shard amorcer cluster-charger cluster-etat \
        cluster-sonde cluster-reinit

aide:
	@echo "Cibles disponibles :"
	@echo "  make simple      - demarre le mongod autonome + mongo-express"
	@echo "  make replique    - demarre le replica set a 3 noeuds"
	@echo "  make partition   - demarre le cluster sharde"
	@echo "  make stop        - arrete tout, conserve les donnees"
	@echo "  make purger      - arrete tout et EFFACE les volumes"
	@echo "  make shell       - ouvre un mongosh sur la base amiraute"
	@echo "  make logs        - suit les logs du mongod"
	@echo "  make amorcer     - charge le jeu de donnees + le volume (profil simple)"
	@echo "  make charger F=mongosh/01-crud.js        - joue un script (profil simple)"
	@echo "  make replique-charger - charge le referentiel sur le replica set"
	@echo "  make charger-rs F=mongosh/07-...js       - idem sur le replica set"
	@echo "  make charger-shard F=mongosh/08-...js    - idem sur le routeur mongos"
	@echo ""
	@echo "Demonstration du cluster (profil partition) :"
	@echo "  make cluster-charger  - charge les 100 000 releves A TRAVERS le routeur"
	@echo "  make charger-shard F=mongosh/08-sharding.js   - la demonstration"
	@echo "  make etendre          - ajoute un 3e shard A CHAUD"
	@echo "  make cluster-etat     - repartition des chunks et des donnees"
	@echo "  make cluster-sonde    - lit en boucle pendant les migrations"
	@echo "  make cluster-reinit   - departitionne, pour rejouer la demo"

simple:
	$(COMPOSE) --profile simple up -d
	@echo "MongoDB   : mongodb://localhost:27017"
	@echo "Compass   : mongodb://amiral:amiral@localhost:27017/?authSource=admin"
	@echo "Express   : http://localhost:8081"

replique:
	$(COMPOSE) --profile replique up -d
	@echo "Noeuds : localhost:27018 27019 27020 (replica set rsAmiraute)"
	@echo "Enchainer avec : make replique-charger"

MONGOSH_R = $(COMPOSE) exec -T mongo1 mongosh --quiet amiraute

# Le referentiel seul : les scripts 07 et 09 n'ont pas besoin des
# 100 000 releves, et les charger ferait perdre deux minutes en salle.
replique-charger:
	$(MONGOSH_R) --file /projet/mongosh/00-jeu-de-donnees.js | tail -6
	@echo ""
	@echo "Enchainer : make charger-rs F=mongosh/07-replication.js"

partition:
	$(COMPOSE) --profile partition up -d
	@echo "Routeur mongos : mongodb://localhost:27117"
	@echo "Enchainer avec : make cluster-charger"

MONGOS = $(COMPOSE) exec -T mongos mongosh --quiet

# Charge le jeu de donnees A TRAVERS le routeur, sur une collection encore
# NON partitionnee : c'est le point de depart de la demonstration.
cluster-charger:
	$(MONGOSH_S) --file /projet/mongosh/00-jeu-de-donnees.js | tail -6
	$(MONGOSH_S) --file /projet/mongosh/00b-generer-volume.js | tail -4
	@echo ""
	@echo "Donnees chargees, collection NON partitionnee."
	@echo "Enchainer : make charger-shard F=mongosh/08-sharding.js"

# Ajoute un troisieme shard SANS rien arreter.
etendre:
	$(COMPOSE) --profile extension up -d
	@$(COMPOSE) logs -f shard3-init | head -20 || true

# La repartition reelle : chunks ET taille des donnees.
cluster-etat:
	@$(MONGOS) --eval 'const c=db.getSiblingDB("config").collections.findOne({_id:"amiraute.journauxBord"}); 	  if(!c){print("collection NON partitionnee");quit(0);} 	  const ch=db.getSiblingDB("config").chunks.aggregate([{$$match:{uuid:c.uuid}},{$$group:{_id:"$$shard",n:{$$sum:1}}},{$$sort:{_id:1}}]).toArray(); 	  const st=db.getSiblingDB("amiraute").journauxBord.aggregate([{$$collStats:{storageStats:{}}}]).toArray(); 	  ch.forEach(function(x){var s=st.filter(function(y){return y.shard===x._id;})[0]; 	    print("  "+x._id.padEnd(10)+String(x.n).padStart(3)+" chunks   "+ 	      (s?String(s.storageStats.count).padStart(7)+" docs "+String(Math.round(s.storageStats.size/1024)).padStart(6)+" Ko":""));}); 	  print("  total via le routeur : "+db.getSiblingDB("amiraute").journauxBord.countDocuments()); 	  print("  migration en cours   : "+(sh.isBalancerRunning().inBalancerRound||false));'

# Lit en boucle pendant les migrations : le compte ne doit jamais bouger.
cluster-sonde:
	@$(MONGOS) --eval 'while(true){ 	  try{ print(new Date().toISOString().slice(11,19)+"  "+db.getSiblingDB("amiraute").journauxBord.countDocuments()+" documents"); } 	  catch(e){ print("ERREUR : "+e.message); } sleep(2000); }'

# Departitionne, pour rejouer la demonstration a zero.
cluster-reinit:
	@$(MONGOS) amiraute --eval 'db.journauxBord.drop(); print("journauxBord supprimee et departitionnee");'
	@echo "Enchainer : make cluster-charger"

stop:
	$(COMPOSE) --profile simple --profile replique --profile partition --profile extension down --remove-orphans

purger:
	$(COMPOSE) --profile simple --profile replique --profile partition --profile extension down -v --remove-orphans

shell:
	$(COMPOSE) exec mongo mongosh -u amiral -p amiral --authenticationDatabase admin amiraute

logs:
	$(COMPOSE) logs -f mongo

# --file plutot que stdin : mongosh lu sur stdin se comporte en REPL, ce qui
# casse certaines constructions multi-lignes. Les scripts sont montes en /projet.
charger:
	@test -n "$(F)" || (echo "Usage : make charger F=mongosh/01-crud.js" && exit 1)
	$(MONGOSH) --file /projet/$(F)

charger-rs:
	@test -n "$(F)" || (echo "Usage : make charger-rs F=mongosh/07-replication.js" && exit 1)
	$(COMPOSE) exec -T mongo1 mongosh --quiet --file /projet/$(F)

charger-shard:
	@test -n "$(F)" || (echo "Usage : make charger-shard F=mongosh/08-sharding.js" && exit 1)
	$(COMPOSE) exec -T mongos mongosh --quiet amiraute --file /projet/$(F)

amorcer:
	$(MONGOSH) --file /projet/mongosh/00-jeu-de-donnees.js
	$(MONGOSH) --file /projet/mongosh/00b-generer-volume.js
