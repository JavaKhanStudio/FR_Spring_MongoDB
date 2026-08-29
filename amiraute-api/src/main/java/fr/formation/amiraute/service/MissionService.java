package fr.formation.amiraute.service;

import fr.formation.amiraute.repository.MissionRepository;
import fr.formation.amiraute.repository.NavireRepository;
import fr.formation.amiraute.domain.Mission;
import fr.formation.amiraute.domain.Navire;
import fr.formation.amiraute.domain.embedded.NavireRef;
import fr.formation.amiraute.domain.embedded.NavireStats;
import fr.formation.amiraute.domain.enumeration.StatutMission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class MissionService {

    private final MissionRepository missionRepository;
    private final NavireRepository navireRepository;

    public MissionService(MissionRepository missionRepository, NavireRepository navireRepository) {
        this.missionRepository = missionRepository;
        this.navireRepository = navireRepository;
    }

    public Mission findById(String id) {
        return missionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Mission introuvable : " + id));
    }

    public Page<Mission> listByStatut(StatutMission statut, Pageable pageable) {
        return missionRepository.findByStatut(statut, pageable);
    }

    public Mission create(Mission mission) {
        mission.setId(null);
        checkParticipants(mission);
        Mission enregistree = missionRepository.save(mission);
        recalculerCompteurs(enregistree.getNaviresParticipants());
        return enregistree;
    }

    /**
     * COMPUTED PATTERN : le compteur stats.nombreMissions ne vaut que s'il est
     * MAINTENU. Toute operation qui touche a la composition d'une mission doit
     * le recalculer, sinon il derive - et une derive de compteur ne provoque
     * aucune erreur, elle produit juste un chiffre faux que personne ne verra.
     *
     * En production on doublerait ceci d'un job de reconciliation nocturne :
     * la mise a jour synchrone est le chemin normal, le job est le filet.
     */
    private void recalculerCompteurs(List<NavireRef> refs) {
        for (NavireRef ref : refs) {
            recalculerCompteur(ref.id());
        }
    }

    private void recalculerCompteur(String navireId) {
        navireRepository.findById(navireId).ifPresent(navire -> {
            int total = missionRepository.findByNaviresParticipantsId(navireId).size();
            NavireStats avant = navire.getStats() == null ? NavireStats.vide() : navire.getStats();
            navire.setStats(new NavireStats(total, avant.effectifActuel(), avant.dernierReleve()));
            navireRepository.save(navire);
        });
    }

    /**
     * MongoDB ne verifie AUCUNE reference. Un identifiant inexistant s'insere
     * sans broncher et ne se decouvre qu'au $lookup, des mois plus tard.
     *
     * Avec une EXTENDED REFERENCE, ce controle fait plus que valider : il
     * RECONSTRUIT la copie a partir de la source de verite. On ne fait donc
     * jamais confiance aux champs recopies envoyes par le client - sinon la
     * denormalisation devient une porte d'entree pour de la donnee fausse.
     */
    private void checkParticipants(Mission mission) {
        List<NavireRef> verifies = new ArrayList<>();
        for (NavireRef ref : mission.getNaviresParticipants()) {
            verifies.add(refDepuisLaSource(ref.id()));
        }
        mission.setNaviresParticipants(verifies);
    }

    /** Construit la reference enrichie a partir du navire reel. */
    private NavireRef refDepuisLaSource(String navireId) {
        Navire navire = navireRepository.findById(navireId)
                .orElseThrow(() -> new IllegalArgumentException("Navire inconnu : " + navireId));
        return new NavireRef(navire.getId(), navire.getNom(),
                navire.getNumeroCoque(), navire.getType());
    }

    public Mission addParticipant(String missionId, String navireId) {
        Mission mission = findById(missionId);
        boolean dejaPresent = mission.getNaviresParticipants().stream()
                .anyMatch(r -> r.id().equals(navireId));
        if (!dejaPresent) {
            mission.getNaviresParticipants().add(refDepuisLaSource(navireId));
            missionRepository.save(mission);
            recalculerCompteur(navireId);
        }
        return mission;
    }

    public Mission removeParticipant(String missionId, String navireId) {
        Mission mission = findById(missionId);
        mission.getNaviresParticipants().removeIf(r -> r.id().equals(navireId));
        Mission enregistree = missionRepository.save(mission);
        recalculerCompteur(navireId);
        return enregistree;
    }

    public Mission close(String missionId, Instant dateFin) {
        Mission mission = findById(missionId);
        mission.setStatut(StatutMission.TERMINEE);
        mission.setDateFin(dateFin == null ? Instant.now() : dateFin);
        return missionRepository.save(mission);
    }

    public List<Mission> listByNavire(String navireId) {
        return missionRepository.findByNaviresParticipantsId(navireId);
    }

    public void delete(String id) {
        Mission mission = findById(id);
        missionRepository.delete(mission);
        recalculerCompteurs(mission.getNaviresParticipants());
    }
}
