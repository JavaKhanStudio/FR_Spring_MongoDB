package fr.formation.amiraute.domain.embedded;

import org.springframework.data.mongodb.core.geo.GeoJsonPoint;

public record ZoneOperation(
        String nom,
        GeoJsonPoint centre,
        Integer rayonKm) {
}
