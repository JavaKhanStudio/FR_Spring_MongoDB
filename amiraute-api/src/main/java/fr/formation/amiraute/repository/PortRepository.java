package fr.formation.amiraute.repository;

import fr.formation.amiraute.domain.Port;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PortRepository extends MongoRepository<Port, String> {

    Optional<Port> findByNom(String nom);

    List<Port> findByPays(String pays);

    /** Requete derivee GEOSPATIALE : exige l'index 2dsphere sur localisation. */
    List<Port> findByLocalisationNear(Point point, Distance distance);
}
