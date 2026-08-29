package fr.formation.amiraute.config;

import fr.formation.amiraute.domain.Flotte;
import fr.formation.amiraute.domain.JournalBord;
import fr.formation.amiraute.domain.MembreEquipage;
import fr.formation.amiraute.domain.Mission;
import fr.formation.amiraute.domain.Navire;
import fr.formation.amiraute.domain.Port;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.index.IndexResolver;
import org.springframework.data.mongodb.core.index.PartialIndexFilter;
import org.springframework.data.mongodb.core.index.TextIndexDefinition;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Creation MAITRISEE des index, au demarrage.
 *
 * Pourquoi ne pas laisser auto-index-creation faire le travail ?
 *   - elle declenche la creation au PREMIER acces a la collection, donc a un
 *     moment imprevisible, potentiellement en pleine charge ;
 *   - l'ordre de creation n'est pas maitrise ;
 *   - un index retire du code reste en base : personne ne le supprime jamais.
 *
 * Ici, tout se passe au demarrage, dans un ordre connu, et c'est tracable
 * dans les logs.
 *
 * Les index declares par annotation sont relus par l'IndexResolver : les
 * annotations restent la source unique. Seuls les index qu'une annotation ne
 * sait PAS exprimer sont ecrits a la main plus bas.
 */
@Component
public class IndexConfig implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(IndexConfig.class);

    private static final List<Class<?>> DOCUMENTS = List.of(
            Navire.class, Port.class, Flotte.class,
            Mission.class, MembreEquipage.class, JournalBord.class);

    private final MongoTemplate mongo;
    private final MongoMappingContext contexte;
    private final boolean actif;

    public IndexConfig(MongoTemplate mongo, MongoMappingContext contexte,
                              @Value("${amiraute.index.creer-au-demarrage:true}") boolean actif) {
        this.mongo = mongo;
        this.contexte = contexte;
        this.actif = actif;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!actif) {
            log.warn("Creation des index DESACTIVEE (amiraute.index.creer-au-demarrage=false)");
            return;
        }

        long debut = System.currentTimeMillis();
        creerDepuisLesAnnotations();
        creerIndexPartiel();
        creerIndexTexte();
        log.info("Index prets en {} ms", System.currentTimeMillis() - debut);
        journaliser();
    }

    /** Relit @Indexed, @CompoundIndex et @GeoSpatialIndexed sur chaque document. */
    private void creerDepuisLesAnnotations() {
        IndexResolver resolveur = IndexResolver.create(contexte);
        for (Class<?> type : DOCUMENTS) {
            IndexOperations operations = mongo.indexOps(type);
            resolveur.resolveIndexFor(type).forEach(operations::ensureIndex);
        }
    }

    /**
     * Index PARTIEL : aucune annotation ne sait l'exprimer.
     *
     * evenement est ABSENT sur 99,7 % des 100 000 releves. Indexer les 100 000
     * pour n'en interroger que 250 serait du gaspillage pur : l'index partiel
     * rend le meme service pour une fraction du cout en RAM et a l'ecriture.
     *
     * LE CHOIX DU FILTRE N'EST PAS LIBRE. Mesure sur ce jeu de donnees, pour
     * la requete { evenement: "AVARIE_MINEURE" } :
     *
     *   $exists: true    IXSCAN,   30 docs lus   <- retenu
     *   $gt: ""          IXSCAN,   30 docs lus
     *   $type: "string"  COLLSCAN, 100 000 docs lus
     *   $ne: null        REFUSE a la creation ($not non supporte)
     *
     * Le planificateur n'utilise l'index que s'il peut PROUVER que la requete
     * est incluse dans le filtre partiel. Il n'a pas su prouver qu'une chaine
     * litterale satisfait $type: "string" - alors que c'est vrai.
     */
    private void creerIndexPartiel() {
        mongo.indexOps(JournalBord.class).ensureIndex(
                new Index()
                        .on("evenement", org.springframework.data.domain.Sort.Direction.ASC)
                        .on("horodatage", org.springframework.data.domain.Sort.Direction.DESC)
                        .named("idx_evenement_partiel")
                        .partial(PartialIndexFilter.of(Criteria.where("evenement").exists(true))));
    }

    /**
     * Index TEXTE : une collection ne peut en porter qu'UN SEUL. Les poids
     * font remonter une correspondance sur le nom avant une correspondance
     * sur la devise.
     */
    private void creerIndexTexte() {
        mongo.indexOps(Navire.class).ensureIndex(
                TextIndexDefinition.builder()
                        .named("idx_texte")
                        .onField("nom", 10F)
                        .onField("classe", 5F)
                        .onField("devise", 1F)
                        .withDefaultLanguage("french")
                        .build());
    }

    private void journaliser() {
        for (Class<?> type : DOCUMENTS) {
            String noms = mongo.indexOps(type).getIndexInfo().stream()
                    .map(i -> i.getName())
                    .reduce((a, b) -> a + ", " + b).orElse("aucun");
            log.info("{} : {}", type.getSimpleName(), noms);
        }
    }
}
