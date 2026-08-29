package fr.formation.amiraute.repository;

import fr.formation.amiraute.domain.Mission;
import fr.formation.amiraute.domain.enumeration.StatutMission;
import fr.formation.amiraute.domain.enumeration.TypeMission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface MissionRepository extends MongoRepository<Mission, String> {

    Optional<Mission> findByNomCode(String nomCode);

    Page<Mission> findByStatut(StatutMission statut, Pageable pageable);

    List<Mission> findByType(TypeMission type);

    /**
     * Interroge le sous-champ id du TABLEAU de references enrichies : c'est la question inverse de la
     * relation N-N. L'index multicle idx_mission_participants la rend aussi
     * rapide que la question directe.
     */
    List<Mission> findByNaviresParticipantsId(String navireId);

    List<Mission> findByDateDebutBetween(Instant debut, Instant fin);

    long countByStatut(StatutMission statut);
}
