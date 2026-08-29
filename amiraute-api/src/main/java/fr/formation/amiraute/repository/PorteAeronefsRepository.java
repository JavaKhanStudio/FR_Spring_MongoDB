package fr.formation.amiraute.repository;

import fr.formation.amiraute.domain.PorteAeronefs;
import fr.formation.amiraute.domain.enumeration.TypeCatapulte;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Meme precaution que SousMarinRepository : le discriminant est explicite. */
@Repository
public interface PorteAeronefsRepository extends MongoRepository<PorteAeronefs, String> {

    String CLASSE = "'_class': 'porte-aeronefs'";

    @Query("{ " + CLASSE + " }")
    List<PorteAeronefs> findAllPorteAeronefs();

    @Query(value = "{ " + CLASSE + " }", count = true)
    long countPorteAeronefs();

    @Query("{ " + CLASSE + ", 'typeCatapulte': ?0 }")
    List<PorteAeronefs> findByTypeCatapulte(TypeCatapulte catapulte);

    @Query("{ " + CLASSE + ", 'nombreAeronefs': { $gte: ?0 } }")
    List<PorteAeronefs> findByNombreAeronefsGreaterThanEqual(int nombre);

    /**
     * Interroge un tableau de sous-documents qui n'existe que sur cette
     * sous-classe. Le $elemMatch est indispensable : sans lui, on trouverait
     * les batiments ayant UN aeronef de chasse et UN aeronef en quantite >= N,
     * sans que ce soit le meme.
     */
    @Query("{ " + CLASSE + ", 'groupeAerien': { $elemMatch: { 'role': ?0, 'quantite': { $gte: ?1 } } } }")
    List<PorteAeronefs> findByGroupeAerien(String role, int quantiteMinimale);
}
