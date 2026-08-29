package fr.formation.amiraute.repository;

import fr.formation.amiraute.domain.SousMarin;
import fr.formation.amiraute.domain.enumeration.MissionStrategique;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * LE PIEGE LE PLUS COUTEUX DU POLYMORPHISME EN SPRING DATA MONGODB.
 *
 * On s'attend a ce qu'un repository type sur SousMarin ne voie que les
 * sous-marins. CE N'EST PAS LE CAS. Verifie sur ce projet, Spring Boot 3.5 :
 *
 *     sousMarinRepository.findAll()   ->  find using query: {}  in navires
 *     sousMarinRepository.count()     ->  Executing count: {}   in navires
 *
 * Aucune restriction sur _class n'est ajoutee. Pire : les 45 documents sont
 * ensuite instancies DE FORCE en SousMarin, y compris les porte-avions. Les
 * champs propres aux autres formes sont perdus, ceux du sous-marin sont nuls,
 * et rien ne signale l'anomalie.
 *
 * C'est un mistypage SILENCIEUX : pas d'exception, pas de log, juste des
 * objets faux.
 *
 * LA PARADE : declarer le discriminant EXPLICITEMENT dans chaque requete.
 * C'est verbeux, et c'est le prix a payer pour que le polymorphisme soit sur.
 *
 * A verifier au moindre doute : activer le log DEBUG de MongoTemplate et LIRE
 * la requete reellement envoyee. C'est deja fait dans application.yml.
 */
@Repository
public interface SousMarinRepository extends MongoRepository<SousMarin, String> {

    String CLASSE = "'_class': 'sous-marin'";

    @Query("{ " + CLASSE + " }")
    List<SousMarin> findAllSousMarins();

    @Query(value = "{ " + CLASSE + " }", count = true)
    long countSousMarins();

    @Query("{ " + CLASSE + ", 'missionStrategique': ?0 }")
    List<SousMarin> findByMissionStrategique(MissionStrategique mission);

    @Query("{ " + CLASSE + ", 'profondeurMaxMetres': { $gt: ?0 } }")
    List<SousMarin> findByProfondeurMaxMetresGreaterThan(int metres);

    /** Les plus discrets d'abord : plus la valeur est basse, mieux c'est. */
    @Query(value = "{ " + CLASSE + ", 'nation': ?0 }", sort = "{ 'discretionDecibels': 1 }")
    List<SousMarin> findByNationOrderByDiscretionDecibelsAsc(String nation);
}
