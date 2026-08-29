package fr.formation.amiraute.domain;

import fr.formation.amiraute.domain.embedded.Amiral;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Poche de simplicite. Demontre qu'un SOUS-DOCUMENT (amiralCommandant) et une
 * REFERENCE ENRICHIE (depuis Navire.flotte) coexistent sans contradiction : la
 * question n'est jamais "lequel est meilleur" mais "qui possede la donnee".
 *
 * amiralCommandant n'est deliberement PAS recopie dans Navire.flotte : un
 * amiral change de poste. Recopier son nom sur 45 navires imposerait de les
 * reecrire tous a chaque mutation.
 */
@Document("flottes")
public class Flotte {

    @Id
    private String id;

    @Indexed(name = "idx_flotte_nom_unique", unique = true)
    private String nom;

    private String nation;
    private Integer anneeCreation;

    /** Un amiral n'existe pas hors de sa flotte, et n'est jamais partage. */
    private Amiral amiralCommandant;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getNation() { return nation; }
    public void setNation(String nation) { this.nation = nation; }

    public Integer getAnneeCreation() { return anneeCreation; }
    public void setAnneeCreation(Integer anneeCreation) { this.anneeCreation = anneeCreation; }

    public Amiral getAmiralCommandant() { return amiralCommandant; }
    public void setAmiralCommandant(Amiral amiralCommandant) { this.amiralCommandant = amiralCommandant; }
}
