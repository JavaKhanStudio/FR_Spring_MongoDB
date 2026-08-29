package fr.formation.amiraute.repository;

import fr.formation.amiraute.domain.demo.NavireReference;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository de demonstration : sert a comparer, en direct, la reference manuelle
 * et @DocumentReference sur les MEMES documents.
 */
@Repository
public interface NavireReferenceRepository extends MongoRepository<NavireReference, String> {

    List<NavireReference> findByNation(String nation);
}
