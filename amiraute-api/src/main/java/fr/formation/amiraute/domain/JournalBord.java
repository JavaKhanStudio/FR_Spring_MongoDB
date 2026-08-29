package fr.formation.amiraute.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Le VOLUME : 100 000 documents, trois champs utiles.
 *
 * Seule collection assez grosse pour que explain() produise un ecart visible
 * entre COLLSCAN et IXSCAN. C'est le support du module Performance (J3 pm).
 *
 * L'index compose suit la regle ESR : navireId en Egalite d'abord,
 * horodatage ensuite pour le Sort et le Range.
 */
@Document("journauxBord")
@CompoundIndex(name = "idx_navire_temps", def = "{'navireId': 1, 'horodatage': 1}")
public class JournalBord {

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
    private Instant horodatage;
    private GeoJsonPoint position;

    private Double vitesseNoeuds;
    private Integer capDegres;
    private Double carburantPourcent;

    /**
     * ABSENT dans 99,7 % des cas - et non pas null. Un champ a null EXISTE,
     * et serait donc indexe par un partiel { $exists: true }.
     */
    private String evenement;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNavireId() { return navireId; }
    public void setNavireId(String navireId) { this.navireId = navireId; }

    public Instant getHorodatage() { return horodatage; }
    public void setHorodatage(Instant horodatage) { this.horodatage = horodatage; }

    public GeoJsonPoint getPosition() { return position; }
    public void setPosition(GeoJsonPoint position) { this.position = position; }

    public Double getVitesseNoeuds() { return vitesseNoeuds; }
    public void setVitesseNoeuds(Double vitesseNoeuds) { this.vitesseNoeuds = vitesseNoeuds; }

    public Integer getCapDegres() { return capDegres; }
    public void setCapDegres(Integer capDegres) { this.capDegres = capDegres; }

    public Double getCarburantPourcent() { return carburantPourcent; }
    public void setCarburantPourcent(Double carburantPourcent) { this.carburantPourcent = carburantPourcent; }

    public String getEvenement() { return evenement; }
    public void setEvenement(String evenement) { this.evenement = evenement; }
}
