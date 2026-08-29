package fr.formation.amiraute.web.dto;

import fr.formation.amiraute.domain.enumeration.StatutNavire;
import fr.formation.amiraute.domain.enumeration.TypeNavire;
import fr.formation.amiraute.domain.enumeration.TypePropulsion;

import java.util.List;

/**
 * Criteres de la recherche avancee. TOUS facultatifs, tous combinables.
 *
 * C'est l'exemple canonique du projet : 2^10 combinaisons possibles. Aucune
 * requete derivee ne peut couvrir cela, et ecrire 1024 methodes n'est pas une
 * option. D'ou MongoTemplate et Criteria.
 */
public record NavireSearchCriteria(
        String nation,
        List<TypeNavire> types,
        StatutNavire statut,
        TypePropulsion propulsion,
        Integer tonnageMin,
        Integer tonnageMax,
        Integer anneeMin,
        Integer anneeMax,
        String nomContient,
        String etiquette,
        Double longitude,
        Double latitude,
        Double rayonKm) {

    /** Le trio geographique n'a de sens que complet. */
    public boolean hasGeoFilter() {
        return longitude != null && latitude != null && rayonKm != null;
    }
}
