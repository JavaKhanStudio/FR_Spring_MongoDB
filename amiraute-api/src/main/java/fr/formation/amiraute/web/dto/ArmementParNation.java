package fr.formation.amiraute.web.dto;

public record ArmementParNation(
        String nation,
        String categorie,
        long quantiteTotale,
        int porteeMaximaleKm) {
}
