package fr.formation.amiraute.web.dto;

import java.util.List;
import java.util.Map;

/**
 * Produit par UN SEUL pipeline utilisant $facet : chaque bloc est une branche
 * calculee sur le meme flux d'entree. Un aller-retour reseau, un balayage.
 */
public record TableauDeBord(
        long nombreNavires,
        long tonnageTotal,
        long equipageTotal,
        Map<String, Long> parType,
        Map<String, Long> parStatut,
        Map<String, Long> parPropulsion,
        List<TonnageParNation> parNation,
        List<Map<String, Object>> lesPlusRapides) {
}
