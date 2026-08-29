package fr.formation.amiraute.domain.embedded;

import fr.formation.amiraute.domain.enumeration.TypePropulsion;

/**
 * Sous-document 1-1. Aucun @Document : il n'a pas de collection a lui,
 * il vit a l'interieur du navire.
 */
public record Propulsion(
        TypePropulsion type,
        Integer puissanceChevaux,
        Integer nombreHelices,
        Integer nombreReacteurs) {
}
