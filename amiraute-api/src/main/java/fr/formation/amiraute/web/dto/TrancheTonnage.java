package fr.formation.amiraute.web.dto;

import java.util.List;

public record TrancheTonnage(
        int borneInferieure,
        long nombre,
        List<String> exemples) {
}
