package fr.formation.amiraute.repository;

import fr.formation.amiraute.domain.Navire;
import fr.formation.amiraute.domain.enumeration.StatutNavire;
import fr.formation.amiraute.domain.enumeration.TypeNavire;
import fr.formation.amiraute.web.dto.NavireSummary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * MongoRepository : tout ce qui est CONNU A LA COMPILATION.
 *
 * CRUD, requetes derivees du nom de methode, @Query simple, pagination,
 * projections. Des que la requete se construit dynamiquement, on bascule sur
 * NavireRepositoryCustom (MongoTemplate). La ligne de partage est nette, et
 * le service n'injecte qu'UNE seule interface : celle-ci les etend toutes deux.
 */
@Repository
public interface NavireRepository extends MongoRepository<Navire, String>, NavireRepositoryCustom {

    // --- Requetes derivees : Spring Data lit le NOM de la methode -----------

    Optional<Navire> findByNationAndNumeroCoque(String nation, String numeroCoque);

    List<Navire> findByNationOrderByDeplacementTonnesDesc(String nation);

    Page<Navire> findByType(TypeNavire type, Pageable pageable);

    List<Navire> findByStatutAndNation(StatutNavire statut, String nation);

    long countByStatut(StatutNavire statut);

    boolean existsByNationAndNumeroCoque(String nation, String numeroCoque);

    // Between, GreaterThan, In, Containing... le vocabulaire est fixe.
    List<Navire> findByDeplacementTonnesBetween(int min, int max);

    List<Navire> findByTypeInAndStatutNot(List<TypeNavire> types, StatutNavire statut);

    /** Sur un tableau, l'egalite signifie "contient". Aucun mot-cle special. */
    List<Navire> findByEtiquettes(String etiquette);

    // --- @Query : quand le nom de methode deviendrait illisible -------------

    /**
     * L'equivalent derive s'appellerait
     * findByArmementsCategorieAndArmementsPorteeKmGreaterThan - et surtout il
     * serait FAUX : Spring Data genererait deux conditions independantes sur
     * le tableau, la ou il faut $elemMatch pour les porter sur le MEME element.
     */
    @Query("{ 'armements': { $elemMatch: { 'categorie': ?0, 'porteeKm': { $gte: ?1 } } } }")
    List<Navire> findByArmement(String categorie, int porteeMinimaleKm);

    /** Le second argument de @Query est la PROJECTION. */
    @Query(value = "{ 'nation': ?0 }", fields = "{ 'nom': 1, 'type': 1, 'deplacementTonnes': 1 }")
    List<Navire> findByNationProjected(String nation);

    /** Recherche plein texte : s'appuie sur l'index texte cree au demarrage. */
    @Query("{ $text: { $search: ?0 } }")
    List<Navire> searchTexte(String expression);

    // --- Projection par interface : Mongo ne renvoie que ces champs ---------

    List<NavireSummary> findByNation(String nation);
}
