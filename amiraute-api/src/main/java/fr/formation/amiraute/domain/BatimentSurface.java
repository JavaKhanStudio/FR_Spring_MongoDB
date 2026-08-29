package fr.formation.amiraute.domain;

import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Tout ce qui combat en surface sans mettre en oeuvre de groupe aerien :
 * croiseurs, destroyers, fregates, corvettes, patrouilleurs, ravitailleurs.
 *
 * Regrouper six types de navires sous une seule sous-classe est un CHOIX :
 * ils partagent les memes caracteristiques discriminantes. Le champ metier
 * "type" continue de les distinguer finement.
 *
 * A dire en salle : _class et type ne font PAS double emploi.
 *   _class  discriminant TECHNIQUE, choisi pour la forme du document
 *   type    discriminant METIER, choisi pour le vocabulaire de la marine
 * Les faire coincider serait une erreur : on aurait alors neuf sous-classes
 * Java dont six identiques.
 */
@Document("navires")
@TypeAlias("batiment-surface")
public class BatimentSurface extends Navire {

    /** AEGIS, PAAMS, SETIS... le systeme qui pilote la conduite de tir. */
    private String systemeCombat;

    /** Nombre de cellules de lancement vertical. */
    private Integer capaciteVLS;

    private Integer nombreHelicopteres;
    private Boolean plateformeHelicoptere;

    public String getSystemeCombat() { return systemeCombat; }
    public void setSystemeCombat(String systemeCombat) { this.systemeCombat = systemeCombat; }

    public Integer getCapaciteVLS() { return capaciteVLS; }
    public void setCapaciteVLS(Integer capaciteVLS) { this.capaciteVLS = capaciteVLS; }

    public Integer getNombreHelicopteres() { return nombreHelicopteres; }
    public void setNombreHelicopteres(Integer nombreHelicopteres) { this.nombreHelicopteres = nombreHelicopteres; }

    public Boolean getPlateformeHelicoptere() { return plateformeHelicoptere; }
    public void setPlateformeHelicoptere(Boolean plateformeHelicoptere) { this.plateformeHelicoptere = plateformeHelicoptere; }
}
