package fr.formation.amiraute.domain.embedded;

import fr.formation.amiraute.domain.enumeration.RoleAeronef;

/**
 * Un type d'aeronef du groupe aerien embarque.
 *
 * N'existe QUE sur PorteAeronefs : un sous-marin n'a pas de groupe aerien.
 * C'est le pattern polymorphe vu depuis le sous-document.
 */
public record Aeronef(String modele, RoleAeronef role, Integer quantite) {
}
