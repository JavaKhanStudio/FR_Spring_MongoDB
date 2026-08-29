package fr.formation.amiraute.domain.embedded;

import fr.formation.amiraute.domain.enumeration.Grade;
import fr.formation.amiraute.domain.enumeration.RoleEtatMajor;

/**
 * SUBSET PATTERN.
 *
 * L'equipage complet vit dans membresEquipage : cardinalite non bornee, on ne
 * l'embarque pas. Mais la fiche du navire affiche TOUJOURS l'etat-major, et
 * jamais les 1 949 autres marins.
 *
 * On promeut donc ce sous-ensemble dans le navire. La fiche se rend en une
 * lecture, et la pagination de l'equipage complet reste possible.
 *
 * C'est la troisieme voie, entre le tout-embarque et le tout-reference.
 */
public record MembreEtatMajor(
        RoleEtatMajor role,
        Grade grade,
        String nom,
        String prenom,
        String matricule) {
}
