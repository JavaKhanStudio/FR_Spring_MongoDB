package fr.formation.amiraute.domain;

import fr.formation.amiraute.domain.embedded.Armement;
import fr.formation.amiraute.domain.embedded.FlotteRef;
import fr.formation.amiraute.domain.embedded.MembreEtatMajor;
import fr.formation.amiraute.domain.embedded.NavireStats;
import fr.formation.amiraute.domain.embedded.PortRef;
import fr.formation.amiraute.domain.embedded.Capteur;
import fr.formation.amiraute.domain.embedded.Propulsion;
import fr.formation.amiraute.domain.enumeration.StatutNavire;
import fr.formation.amiraute.domain.enumeration.TypeNavire;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexType;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexed;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Le document riche du projet - et la RACINE D'UNE HIERARCHIE.
 *
 * POLYMORPHIC PATTERN
 * -------------------
 * Un sous-marin et un porte-avions n'ont pas les memes caracteristiques. En
 * relationnel il faudrait trois tables, ou une table criblee de colonnes NULL.
 * Ici : UNE SEULE COLLECTION, trois formes de document.
 *
 *   SousMarin        profondeurMaxMetres, missionStrategique, discretionDecibels
 *   PorteAeronefs    typeCatapulte, groupeAerien[], longueurPisteMetres
 *   BatimentSurface  systemeCombat, capaciteVLS, nombreHelicopteres
 *
 * Spring Data ecrit un champ _class dans chaque document et s'en sert pour
 * instancier la bonne sous-classe a la lecture. @TypeAlias remplace le nom de
 * classe complet par un libelle court et stable : renommer ou deplacer la
 * classe Java ne casse alors PAS les documents deja ecrits.
 *
 * PIEGE, verifie sur ce projet : un repository type sur SousMarin ne filtre
 * PAS tout seul. Spring Data n'ajoute aucune restriction sur _class, et
 * instancie de force les 45 documents en SousMarin. Le discriminant doit etre
 * ecrit a la main dans chaque @Query - voir SousMarinRepository.
 *
 * Les annotations d'index DOCUMENTENT l'intention ; elles ne creent rien :
 * spring.data.mongodb.auto-index-creation est a false. La creation reelle est
 * faite par IndexConfig, au demarrage et de facon maitrisee.
 */
/*
 * DEUX discriminants, et ce n'est pas un doublon.
 *
 *   _class     ecrit par Spring Data dans MongoDB, pilote par @TypeAlias.
 *   categorie  ecrit par Jackson dans le JSON de l'API, pilote ci-dessous.
 *
 * Ils portent les memes valeurs, volontairement, mais ils servent deux
 * frontieres differentes : la base et le reseau. Rien n'oblige a les faire
 * coincider - les aligner est juste une politesse envers le lecteur.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.EXISTING_PROPERTY,
              property = "categorie", visible = true)
@JsonSubTypes({
        @JsonSubTypes.Type(value = SousMarin.class,       name = "sous-marin"),
        @JsonSubTypes.Type(value = PorteAeronefs.class,   name = "porte-aeronefs"),
        @JsonSubTypes.Type(value = BatimentSurface.class, name = "batiment-surface")
})
@Document("navires")
@CompoundIndex(name = "idx_nation_coque_unique", def = "{'nation': 1, 'numeroCoque': 1}", unique = true)
@CompoundIndex(name = "idx_nation_type_deplacement", def = "{'nation': 1, 'type': 1, 'deplacementTonnes': -1}")
@CompoundIndex(name = "idx_classe_nation", def = "{'_class': 1, 'nation': 1}")
@CompoundIndex(name = "idx_port_attache", def = "{'portAttache.id': 1}")
public abstract class Navire {

    @Id
    private String id;

    @NotBlank
    private String numeroCoque;

    @NotBlank
    private String nom;

    private String classe;

    @NotNull
    private TypeNavire type;

    @NotBlank
    @Indexed(name = "idx_nation")
    private String nation;

    private Integer anneeMiseEnService;

    @NotNull
    private StatutNavire statut;

    @Positive
    private Integer deplacementTonnes;

    private Double longueurMetres;
    private Double largeurMetres;
    private Double tirantEauMetres;
    private Integer vitesseMaxNoeuds;

    /** null = illimitee (propulsion nucleaire). Absent = donnee inconnue. */
    private Integer autonomieMillesNautiques;

    private Integer equipageMax;

    private Propulsion propulsion;

    private List<Armement> armements = new ArrayList<>();
    private List<Capteur> capteurs = new ArrayList<>();

    @GeoSpatialIndexed(name = "idx_position", type = GeoSpatialIndexType.GEO_2DSPHERE)
    private GeoJsonPoint positionActuelle;

    /**
     * EXTENDED REFERENCE, et non plus un identifiant nu.
     * L'ecran de liste affiche le nom du port sans aucun $lookup.
     * L'index porte sur portAttache.id.
     */
    private PortRef portAttache;

    /** EXTENDED REFERENCE vers la flotte. Meme raisonnement. */
    private FlotteRef flotte;

    private String devise;
    private List<String> etiquettes = new ArrayList<>();

    /**
     * SUBSET PATTERN : les 5 officiers affiches sur la fiche navire.
     * L'equipage complet reste dans membresEquipage.
     */
    private List<MembreEtatMajor> etatMajor = new ArrayList<>();

    /** COMPUTED PATTERN : agregats maintenus a l'ecriture. */
    private NavireStats stats = NavireStats.vide();

    @CreatedDate
    private Instant dateCreation;

    @LastModifiedDate
    private Instant dateModification;

    /** Verrouillage optimiste : incremente a chaque save, controle a l'ecriture. */
    @Version
    private Long version;

    /**
     * Discriminant expose dans le JSON. Il est DERIVE de la classe reelle :
     * impossible de le desynchroniser, contrairement a un champ stocke.
     * @Transient : il n'est pas ecrit en base, _class y suffit.
     */
    @org.springframework.data.annotation.Transient
    public String getCategorie() {
        org.springframework.data.annotation.TypeAlias alias =
                getClass().getAnnotation(org.springframework.data.annotation.TypeAlias.class);
        return alias == null ? "navire" : alias.value();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNumeroCoque() { return numeroCoque; }
    public void setNumeroCoque(String numeroCoque) { this.numeroCoque = numeroCoque; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getClasse() { return classe; }
    public void setClasse(String classe) { this.classe = classe; }

    public TypeNavire getType() { return type; }
    public void setType(TypeNavire type) { this.type = type; }

    public String getNation() { return nation; }
    public void setNation(String nation) { this.nation = nation; }

    public Integer getAnneeMiseEnService() { return anneeMiseEnService; }
    public void setAnneeMiseEnService(Integer anneeMiseEnService) { this.anneeMiseEnService = anneeMiseEnService; }

    public StatutNavire getStatut() { return statut; }
    public void setStatut(StatutNavire statut) { this.statut = statut; }

    public Integer getDeplacementTonnes() { return deplacementTonnes; }
    public void setDeplacementTonnes(Integer deplacementTonnes) { this.deplacementTonnes = deplacementTonnes; }

    public Double getLongueurMetres() { return longueurMetres; }
    public void setLongueurMetres(Double longueurMetres) { this.longueurMetres = longueurMetres; }

    public Double getLargeurMetres() { return largeurMetres; }
    public void setLargeurMetres(Double largeurMetres) { this.largeurMetres = largeurMetres; }

    public Double getTirantEauMetres() { return tirantEauMetres; }
    public void setTirantEauMetres(Double tirantEauMetres) { this.tirantEauMetres = tirantEauMetres; }

    public Integer getVitesseMaxNoeuds() { return vitesseMaxNoeuds; }
    public void setVitesseMaxNoeuds(Integer vitesseMaxNoeuds) { this.vitesseMaxNoeuds = vitesseMaxNoeuds; }

    public Integer getAutonomieMillesNautiques() { return autonomieMillesNautiques; }
    public void setAutonomieMillesNautiques(Integer autonomieMillesNautiques) { this.autonomieMillesNautiques = autonomieMillesNautiques; }

    public Integer getEquipageMax() { return equipageMax; }
    public void setEquipageMax(Integer equipageMax) { this.equipageMax = equipageMax; }

    public Propulsion getPropulsion() { return propulsion; }
    public void setPropulsion(Propulsion propulsion) { this.propulsion = propulsion; }

    public List<Armement> getArmements() { return armements; }
    public void setArmements(List<Armement> armements) { this.armements = armements; }

    public List<Capteur> getCapteurs() { return capteurs; }
    public void setCapteurs(List<Capteur> capteurs) { this.capteurs = capteurs; }

    public GeoJsonPoint getPositionActuelle() { return positionActuelle; }
    public void setPositionActuelle(GeoJsonPoint positionActuelle) { this.positionActuelle = positionActuelle; }

    public PortRef getPortAttache() { return portAttache; }
    public void setPortAttache(PortRef portAttache) { this.portAttache = portAttache; }

    public FlotteRef getFlotte() { return flotte; }
    public void setFlotte(FlotteRef flotte) { this.flotte = flotte; }

    public List<MembreEtatMajor> getEtatMajor() { return etatMajor; }
    public void setEtatMajor(List<MembreEtatMajor> etatMajor) { this.etatMajor = etatMajor; }

    public NavireStats getStats() { return stats; }
    public void setStats(NavireStats stats) { this.stats = stats; }

    public String getDevise() { return devise; }
    public void setDevise(String devise) { this.devise = devise; }

    public List<String> getEtiquettes() { return etiquettes; }
    public void setEtiquettes(List<String> etiquettes) { this.etiquettes = etiquettes; }

    public Instant getDateCreation() { return dateCreation; }
    public void setDateCreation(Instant dateCreation) { this.dateCreation = dateCreation; }

    public Instant getDateModification() { return dateModification; }
    public void setDateModification(Instant dateModification) { this.dateModification = dateModification; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
