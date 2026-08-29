package fr.formation.amiraute.web.dto;

/**
 * Resultat d'agregation. Le champ _id du $group est projete vers "nation"
 * par une etape $project du pipeline.
 */
public record TonnageParNation(
        String nation,
        long nombreNavires,
        long tonnageTotal,
        double tonnageMoyen,
        int tonnageMax) {
}
