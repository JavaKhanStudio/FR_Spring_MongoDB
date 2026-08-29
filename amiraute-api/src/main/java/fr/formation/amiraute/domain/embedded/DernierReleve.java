package fr.formation.amiraute.domain.embedded;

import java.time.Instant;

/**
 * COMPUTED PATTERN.
 *
 * Recopie du dernier releve du journal de bord. Sans lui, afficher la fiche
 * d'un navire imposerait un tri sur 100 000 documents. Avec lui, c'est une
 * lecture de champ.
 */
public record DernierReleve(
        Instant horodatage,
        Double vitesseNoeuds,
        Double carburantPourcent) {
}
