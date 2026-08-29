package fr.formation.amiraute.repository;

import fr.formation.amiraute.domain.MembreEquipage;
import fr.formation.amiraute.domain.enumeration.Specialite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Le depot qui justifie le choix du "referred" : on pagine dans l'equipage,
 * ce qu'un tableau embarque dans Navire ne permettrait pas.
 */
@Repository
public interface MembreEquipageRepository extends MongoRepository<MembreEquipage, String> {

    Page<MembreEquipage> findByNavireId(String navireId, Pageable pageable);

    Optional<MembreEquipage> findByMatricule(String matricule);

    List<MembreEquipage> findByNavireIdAndSpecialite(String navireId, Specialite specialite);

    long countByNavireId(String navireId);
}
