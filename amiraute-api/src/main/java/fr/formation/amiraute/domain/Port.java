package fr.formation.amiraute.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexType;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexed;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Poche de simplicite volontaire : six champs.
 *
 * L'_id est une CHAINE lisible ("TOULON") et non un ObjectId. Les sorties de
 * $lookup restent dechiffrables au videoprojecteur, et la reference stockee
 * dans Navire.portAttache.id se lit sans traduction.
 *
 * ATTENTION : capaciteNavires et profondeurBassinMetres ne sont PAS recopies
 * dans l'extended reference du navire. Ils changent, donc cette collection
 * reste leur unique source de verite.
 */
@Document("ports")
public class Port {

    @Id
    private String id;

    @Indexed(name = "idx_port_nom_unique", unique = true)
    private String nom;

    private String pays;

    @GeoSpatialIndexed(name = "idx_port_position", type = GeoSpatialIndexType.GEO_2DSPHERE)
    private GeoJsonPoint localisation;

    private Integer capaciteNavires;
    private Double profondeurBassinMetres;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getPays() { return pays; }
    public void setPays(String pays) { this.pays = pays; }

    public GeoJsonPoint getLocalisation() { return localisation; }
    public void setLocalisation(GeoJsonPoint localisation) { this.localisation = localisation; }

    public Integer getCapaciteNavires() { return capaciteNavires; }
    public void setCapaciteNavires(Integer capaciteNavires) { this.capaciteNavires = capaciteNavires; }

    public Double getProfondeurBassinMetres() { return profondeurBassinMetres; }
    public void setProfondeurBassinMetres(Double profondeurBassinMetres) { this.profondeurBassinMetres = profondeurBassinMetres; }
}
