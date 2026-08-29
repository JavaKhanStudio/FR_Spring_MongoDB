package fr.formation.amiraute.repository;

import fr.formation.amiraute.domain.Flotte;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FlotteRepository extends MongoRepository<Flotte, String> {

    List<Flotte> findByNation(String nation);
}
