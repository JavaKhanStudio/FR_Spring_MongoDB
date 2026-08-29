package fr.formation.amiraute.domain;

import fr.formation.amiraute.domain.embedded.NavireRef;
import fr.formation.amiraute.domain.embedded.ZoneOperation;
import fr.formation.amiraute.domain.enumeration.StatutMission;
import fr.formation.amiraute.domain.enumeration.TypeMission;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * La relation N-N, en EXTENDED REFERENCE.
 *
 * naviresParticipants ne porte pas des ObjectId nus mais { id, nom,
 * numeroCoque, type } : l'ecran "mission et ses participants" se rend en une
 * seule lecture, la ou il fallait un $lookup.
 *
 * L'index multicle porte sur naviresParticipants.id, donc la question inverse
 * - "dans quelles missions ce navire ?" - reste aussi rapide qu'avant.
 *
 * Ce qu'on accepte en echange : renommer un navire impose de propager la copie
 * dans ses missions. Un nom de navire ne change jamais - le pari est bon. Son
 * STATUT, lui, change tout le temps : c'est pourquoi il n'est PAS recopie ici.
 */
@Document("missions")
@CompoundIndex(name = "idx_mission_statut_debut", def = "{'statut': 1, 'dateDebut': -1}")
public class Mission {

    @Id
    private String id;

    @Indexed(name = "idx_mission_code_unique", unique = true)
    private String nomCode;

    private TypeMission type;
    private StatutMission statut;

    private Instant dateDebut;

    /** null tant que la mission est en cours. */
    private Instant dateFin;

    private ZoneOperation zoneOperation;

    @Indexed(name = "idx_mission_participants")  // porte sur naviresParticipants.id
    private List<NavireRef> naviresParticipants = new ArrayList<>();

    private Long coutEstimeEuros;
    private List<String> objectifs = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNomCode() { return nomCode; }
    public void setNomCode(String nomCode) { this.nomCode = nomCode; }

    public TypeMission getType() { return type; }
    public void setType(TypeMission type) { this.type = type; }

    public StatutMission getStatut() { return statut; }
    public void setStatut(StatutMission statut) { this.statut = statut; }

    public Instant getDateDebut() { return dateDebut; }
    public void setDateDebut(Instant dateDebut) { this.dateDebut = dateDebut; }

    public Instant getDateFin() { return dateFin; }
    public void setDateFin(Instant dateFin) { this.dateFin = dateFin; }

    public ZoneOperation getZoneOperation() { return zoneOperation; }
    public void setZoneOperation(ZoneOperation zoneOperation) { this.zoneOperation = zoneOperation; }

    public List<NavireRef> getNaviresParticipants() { return naviresParticipants; }
    public void setNaviresParticipants(List<NavireRef> naviresParticipants) { this.naviresParticipants = naviresParticipants; }

    public Long getCoutEstimeEuros() { return coutEstimeEuros; }
    public void setCoutEstimeEuros(Long coutEstimeEuros) { this.coutEstimeEuros = coutEstimeEuros; }

    public List<String> getObjectifs() { return objectifs; }
    public void setObjectifs(List<String> objectifs) { this.objectifs = objectifs; }
}
