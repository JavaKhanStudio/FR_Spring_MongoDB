package fr.formation.amiraute.web.dto;

/**
 * Le resultat d'un $lookup a plat : navire + son port + sa flotte, en une
 * seule requete serveur au lieu de trois allers-retours.
 */
public record NavireAvecContexte(
        String id,
        String nom,
        String numeroCoque,
        String nation,
        String type,
        String statut,
        Integer deplacementTonnes,
        String portAttacheNom,
        String portAttachePays,
        String flotteNom,
        String amiralNom,
        int nombreMissions) {
}
