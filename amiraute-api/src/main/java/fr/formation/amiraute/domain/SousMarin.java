package fr.formation.amiraute.domain;

import fr.formation.amiraute.domain.enumeration.MissionStrategique;
import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Sous-marin. Meme collection que tous les navires, forme differente.
 *
 * @TypeAlias fixe la valeur ecrite dans le champ _class : "sous-marin", et
 * non "fr.formation.amiraute.domain.SousMarin". Deux benefices :
 *   - les documents restent lisibles pour qui ne connait pas le code Java ;
 *   - renommer ou deplacer la classe ne casse PAS les documents deja ecrits.
 *
 * Sans @TypeAlias, un simple refactoring de package rendrait toute la
 * collection illisible. C'est le genre de piege qu'on ne decouvre qu'en
 * production.
 */
@Document("navires")
@TypeAlias("sous-marin")
public class SousMarin extends Navire {

    /** Profondeur maximale d'immersion. N'a de sens que sous l'eau. */
    private Integer profondeurMaxMetres;

    private Integer nombreTubesLanceTorpilles;

    /** ATTAQUE (SNA) ou DISSUASION (SNLE) : deux metiers distincts. */
    private MissionStrategique missionStrategique;

    /** Duree maximale en plongee, limitee par les vivres, pas par l'energie. */
    private Integer autonomieImmersionJours;

    /** Signature acoustique. Plus c'est bas, moins on est detectable. */
    private Integer discretionDecibels;

    public Integer getProfondeurMaxMetres() { return profondeurMaxMetres; }
    public void setProfondeurMaxMetres(Integer profondeurMaxMetres) { this.profondeurMaxMetres = profondeurMaxMetres; }

    public Integer getNombreTubesLanceTorpilles() { return nombreTubesLanceTorpilles; }
    public void setNombreTubesLanceTorpilles(Integer nombreTubesLanceTorpilles) { this.nombreTubesLanceTorpilles = nombreTubesLanceTorpilles; }

    public MissionStrategique getMissionStrategique() { return missionStrategique; }
    public void setMissionStrategique(MissionStrategique missionStrategique) { this.missionStrategique = missionStrategique; }

    public Integer getAutonomieImmersionJours() { return autonomieImmersionJours; }
    public void setAutonomieImmersionJours(Integer autonomieImmersionJours) { this.autonomieImmersionJours = autonomieImmersionJours; }

    public Integer getDiscretionDecibels() { return discretionDecibels; }
    public void setDiscretionDecibels(Integer discretionDecibels) { this.discretionDecibels = discretionDecibels; }
}
