package fr.formation.amiraute;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Socle commun des tests d'integration : un VRAI MongoDB dans un conteneur.
 *
 * Pas de Mongo embarque : il figerait une version, ne reproduirait ni les
 * index ni le planificateur, et laisserait passer des bugs qui n'apparaissent
 * qu'en production.
 *
 * MOTIF DU CONTENEUR UNIQUE (singleton container)
 * -----------------------------------------------
 * Le conteneur est demarre UNE FOIS dans un bloc statique, et jamais arrete :
 * la JVM de test s'en va avec.
 *
 * On n'utilise deliberement PAS @Testcontainers + @Container. Ces annotations
 * gerent le cycle de vie a l'echelle de LA CLASSE : avec un champ statique
 * declare dans une classe de base partagee, le conteneur est arrete a la fin
 * de la premiere classe de tests, et les suivantes echouent en
 * "Connection refused" sur l'ancien port publie. Symptome observe : une classe
 * verte, la suivante en MongoTimeout pendant cinq minutes.
 *
 * Le motif singleton demarre un seul conteneur pour toute la suite : plus
 * rapide, et surtout correct.
 */
public abstract class MongoTestBase {

    static final MongoDBContainer MONGO =
            new MongoDBContainer(DockerImageName.parse("mongo:8.0"))
                    // CONTOURNEMENT SERVER-121912 - le meme que dans le Compose.
                    // MongoDB 8.0+ refuse de demarrer sur un noyau Linux >= 6.19 :
                    // son TCMalloc est incompatible avec les "restartable
                    // sequences" de ces noyaux. Sans cette variable, TOUS les
                    // tests echouent avec un conteneur qui meurt en boucle.
                    .withEnv("GLIBC_TUNABLES", "glibc.pthread.rseq=1");

    static {
        MONGO.start();
    }

    /**
     * L'URI n'est connue qu'apres le demarrage : le port publie est tire au
     * sort. @DynamicPropertySource l'injecte dans le contexte Spring au bon
     * moment.
     */
    @DynamicPropertySource
    static void proprietesMongo(DynamicPropertyRegistry registre) {
        registre.add("spring.data.mongodb.uri", MONGO::getReplicaSetUrl);
    }
}
