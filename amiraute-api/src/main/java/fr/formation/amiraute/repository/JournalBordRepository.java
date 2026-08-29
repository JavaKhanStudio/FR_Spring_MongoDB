package fr.formation.amiraute.repository;

import fr.formation.amiraute.domain.JournalBord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

/**
 * 100 000 documents : le depot ou chaque requete DOIT etre indexee.
 * Toute methode ajoutee ici sans index correspondant devient un COLLSCAN.
 */
@Repository
public interface JournalBordRepository extends MongoRepository<JournalBord, String> {

    /** Couverte par idx_navire_temps : egalite puis intervalle et tri. */
    Page<JournalBord> findByNavireIdAndHorodatageBetween(
            String navireId, Instant debut, Instant fin, Pageable pageable);

    /** Couverte par idx_evenement_partiel. */
    List<JournalBord> findByEvenement(String evenement);

    long countByNavireId(String navireId);
}
