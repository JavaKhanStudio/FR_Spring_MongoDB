package fr.formation.amiraute.domain.embedded;

import fr.formation.amiraute.domain.enumeration.CategorieCapteur;

public record Capteur(
        String designation,
        CategorieCapteur categorie,
        Integer porteeKm) {
}
