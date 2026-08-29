package fr.formation.amiraute.domain.embedded;

import fr.formation.amiraute.domain.enumeration.CategorieArmement;

public record Armement(
        String designation,
        CategorieArmement categorie,
        Integer quantite,
        Integer porteeKm,
        Integer calibreMm) {
}
