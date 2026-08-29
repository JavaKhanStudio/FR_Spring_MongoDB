package fr.formation.amiraute.domain;

import fr.formation.amiraute.domain.embedded.Aeronef;
import fr.formation.amiraute.domain.enumeration.TypeCatapulte;
import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * Porte-avions et porte-helicopteres : tout ce qui met en oeuvre des aeronefs.
 *
 * Le groupe aerien est un TABLEAU DE SOUS-DOCUMENTS qui n'existe que sur cette
 * sous-classe. C'est le polymorphisme jusqu'au bout : ce n'est pas seulement
 * un champ scalaire qui change, c'est une structure entiere qui apparait.
 */
@Document("navires")
@TypeAlias("porte-aeronefs")
public class PorteAeronefs extends Navire {

    /** CATOBAR, STOBAR, STOVL ou HELICOPTERES : determine ce qui peut voler. */
    private TypeCatapulte typeCatapulte;

    private Integer nombreAeronefs;
    private Integer longueurPisteMetres;
    private Integer nombreAscenseurs;

    /** N'existe sur AUCUNE autre sous-classe. */
    private List<Aeronef> groupeAerien = new ArrayList<>();

    public TypeCatapulte getTypeCatapulte() { return typeCatapulte; }
    public void setTypeCatapulte(TypeCatapulte typeCatapulte) { this.typeCatapulte = typeCatapulte; }

    public Integer getNombreAeronefs() { return nombreAeronefs; }
    public void setNombreAeronefs(Integer nombreAeronefs) { this.nombreAeronefs = nombreAeronefs; }

    public Integer getLongueurPisteMetres() { return longueurPisteMetres; }
    public void setLongueurPisteMetres(Integer longueurPisteMetres) { this.longueurPisteMetres = longueurPisteMetres; }

    public Integer getNombreAscenseurs() { return nombreAscenseurs; }
    public void setNombreAscenseurs(Integer nombreAscenseurs) { this.nombreAscenseurs = nombreAscenseurs; }

    public List<Aeronef> getGroupeAerien() { return groupeAerien; }
    public void setGroupeAerien(List<Aeronef> groupeAerien) { this.groupeAerien = groupeAerien; }
}
