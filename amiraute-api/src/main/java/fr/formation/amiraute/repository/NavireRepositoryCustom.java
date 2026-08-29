package fr.formation.amiraute.repository;

import fr.formation.amiraute.domain.Navire;
import fr.formation.amiraute.web.dto.NavireSearchCriteria;
import fr.formation.amiraute.web.dto.NavireProche;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * Le contrat de la partie MongoTemplate.
 *
 * NavireRepository etend cette interface : Spring Data assemble automatiquement
 * l'implementation generee ET NavireRepositoryCustomImpl derriere un seul
 * proxy. C'est le motif "custom repository implementation", et la convention
 * de nommage - suffixe Impl - n'est pas negociable.
 */
public interface NavireRepositoryCustom {

    /** Recherche multicritere : tous les criteres sont facultatifs. */
    Page<Navire> searchAdvanced(NavireSearchCriteria criteres, Pageable pageable);

    /** Navires dans un rayon donne autour d'un point. */
    List<NavireProche> findNearby(double longitude, double latitude, double rayonKm);

    /** Mise a jour en masse, sans charger les documents en memoire. */
    long updateStatutByNation(String nation, String ancienStatut, String nouveauStatut);

    /** Ajoute une etiquette a plusieurs navires en une seule commande. */
    long addEtiquette(List<String> navireIds, String etiquette);
}
