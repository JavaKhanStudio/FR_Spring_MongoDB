package fr.formation.amiraute.domain;

import fr.formation.amiraute.domain.enumeration.Grade;
import fr.formation.amiraute.domain.enumeration.Specialite;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * LE CONTRE-EXEMPLE du cours.
 *
 * Pourquoi l'equipage n'est-il pas embarque dans Navire ?
 *   - cardinalite non bornee : jusqu'a 5 680 marins sur un Nimitz
 *   - MongoDB reecrit le document ENTIER a chaque modification
 *   - on ne pagine pas proprement dans un tableau embarque
 *   - lire la fiche du navire ramenerait tout l'equipage a chaque appel
 *
 * C'est ce contre-exemple qui donne du sens a la regle de l'embedded.
 */
@Document("membresEquipage")
@CompoundIndex(name = "idx_equipage_navire_nom", def = "{'navireId': 1, 'nom': 1, 'prenom': 1}")
public class MembreEquipage {

    @Id
    private String id;

    /**
     * PIEGE DE TYPE, verifie a l'execution.
     *
     * La base stocke un ObjectId ; le modele Java declare un String. La
     * LECTURE fonctionne - Spring convertit ObjectId -> String - et on voit un
     * identifiant hexadecimal parfaitement normal.
     *
     * Mais les REQUETES construites depuis ce String envoient un String au
     * serveur, qui le compare a un ObjectId : aucune correspondance. Zero
     * resultat, aucune erreur.
     *
     * targetType = OBJECT_ID dit a Spring de convertir dans les DEUX sens :
     * String cote Java, ObjectId cote base et cote requete.
     */
    @Field(targetType = FieldType.OBJECT_ID)
    private String navireId;

    @Indexed(name = "idx_matricule_unique", unique = true)
    private String matricule;

    private String nom;
    private String prenom;
    private Grade grade;
    private Specialite specialite;
    private Instant dateEnrolement;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNavireId() { return navireId; }
    public void setNavireId(String navireId) { this.navireId = navireId; }

    public String getMatricule() { return matricule; }
    public void setMatricule(String matricule) { this.matricule = matricule; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }

    public Grade getGrade() { return grade; }
    public void setGrade(Grade grade) { this.grade = grade; }

    public Specialite getSpecialite() { return specialite; }
    public void setSpecialite(Specialite specialite) { this.specialite = specialite; }

    public Instant getDateEnrolement() { return dateEnrolement; }
    public void setDateEnrolement(Instant dateEnrolement) { this.dateEnrolement = dateEnrolement; }
}
