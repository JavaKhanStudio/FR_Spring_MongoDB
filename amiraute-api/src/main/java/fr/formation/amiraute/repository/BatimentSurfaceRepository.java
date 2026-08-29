package fr.formation.amiraute.repository;

import fr.formation.amiraute.domain.BatimentSurface;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Meme precaution que SousMarinRepository : le discriminant est explicite. */
@Repository
public interface BatimentSurfaceRepository extends MongoRepository<BatimentSurface, String> {

    String CLASSE = "'_class': 'batiment-surface'";

    @Query("{ " + CLASSE + " }")
    List<BatimentSurface> findAllBatimentsSurface();

    @Query(value = "{ " + CLASSE + " }", count = true)
    long countBatimentsSurface();

    @Query("{ " + CLASSE + ", 'systemeCombat': ?0 }")
    List<BatimentSurface> findBySystemeCombat(String systemeCombat);

    @Query(value = "{ " + CLASSE + ", 'capaciteVLS': { $gte: ?0 } }",
           sort = "{ 'capaciteVLS': -1 }")
    List<BatimentSurface> findByCapaciteVLSGreaterThanEqual(int cellules);
}
