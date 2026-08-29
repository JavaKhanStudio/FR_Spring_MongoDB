package fr.formation.amiraute.service;

import fr.formation.amiraute.repository.MembreEquipageRepository;
import fr.formation.amiraute.repository.MissionRepository;
import fr.formation.amiraute.repository.NavireRepository;
import fr.formation.amiraute.domain.MembreEquipage;
import fr.formation.amiraute.domain.Mission;
import fr.formation.amiraute.domain.Navire;
import fr.formation.amiraute.domain.enumeration.StatutNavire;
import fr.formation.amiraute.web.dto.NavireSearchCriteria;
import fr.formation.amiraute.web.dto.NavireProche;
import fr.formation.amiraute.web.dto.NavireSummary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * Le service n'injecte QU'UNE interface : NavireRepository.
 *
 * Derriere elle, deux moteurs - l'implementation generee par Spring Data et
 * NavireRepositoryCustomImpl (MongoTemplate). Le service ne sait pas lequel
 * repond, et c'est exactement ce qu'on veut.
 */
@Service
public class NavireService {

    private final NavireRepository navireRepository;
    private final MembreEquipageRepository equipageRepository;
    private final MissionRepository missionRepository;

    public NavireService(NavireRepository navireRepository, MembreEquipageRepository equipageRepository,
                         MissionRepository missionRepository) {
        this.navireRepository = navireRepository;
        this.equipageRepository = equipageRepository;
        this.missionRepository = missionRepository;
    }

    public Navire findById(String id) {
        return navireRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Navire introuvable : " + id));
    }

    public Navire findByCoque(String nation, String numeroCoque) {
        return navireRepository.findByNationAndNumeroCoque(nation, numeroCoque)
                .orElseThrow(() -> new NoSuchElementException(
                        "Aucun navire " + numeroCoque + " pour la nation " + nation));
    }

    public List<NavireSummary> listByNation(String nation) {
        return navireRepository.findByNation(nation);
    }

    public Page<Navire> search(NavireSearchCriteria criteres, Pageable pageable) {
        return navireRepository.searchAdvanced(criteres, pageable);
    }

    public List<NavireProche> nearby(double longitude, double latitude, double rayonKm) {
        return navireRepository.findNearby(longitude, latitude, rayonKm);
    }

    public List<Navire> searchTexte(String expression) {
        return navireRepository.searchTexte(expression);
    }

    public Navire create(Navire navire) {
        if (navireRepository.existsByNationAndNumeroCoque(navire.getNation(), navire.getNumeroCoque())) {
            throw new IllegalArgumentException(
                    "Le numero de coque " + navire.getNumeroCoque()
                    + " existe deja pour la nation " + navire.getNation());
        }
        // L'id doit etre nul pour que save() fasse un insert et non un replace.
        navire.setId(null);
        navire.setVersion(null);
        return navireRepository.save(navire);
    }

    /**
     * save() sur un document portant un @Version non nul devient un update
     * CONDITIONNEL : si la version en base a change entre-temps, MongoDB ne
     * modifie rien et Spring leve OptimisticLockingFailureException.
     *
     * C'est ce qui evite que deux operateurs s'ecrasent l'un l'autre.
     */
    public Navire update(String id, Navire modifie) {
        Navire existant = findById(id);

        existant.setNom(modifie.getNom());
        existant.setClasse(modifie.getClasse());
        existant.setType(modifie.getType());
        existant.setStatut(modifie.getStatut());
        existant.setDeplacementTonnes(modifie.getDeplacementTonnes());
        existant.setVitesseMaxNoeuds(modifie.getVitesseMaxNoeuds());
        existant.setEquipageMax(modifie.getEquipageMax());
        existant.setPropulsion(modifie.getPropulsion());
        existant.setArmements(modifie.getArmements());
        existant.setCapteurs(modifie.getCapteurs());
        existant.setPositionActuelle(modifie.getPositionActuelle());
        existant.setPortAttache(modifie.getPortAttache());
        existant.setFlotte(modifie.getFlotte());
        existant.setDevise(modifie.getDevise());
        existant.setEtiquettes(modifie.getEtiquettes());

        return navireRepository.save(existant);
    }

    /**
     * Suppression d'un navire : ses membres d'equipage et ses missions le
     * referencent. MongoDB n'a AUCUNE integrite referentielle - pas de clef
     * etrangere, pas de ON DELETE CASCADE. Le nettoyage est a la charge du
     * code applicatif, et c'est un point a marteler en salle.
     */
    public void delete(String id) {
        Navire navire = findById(id);

        equipageRepository.deleteAll(equipageRepository.findByNavireId(id,
                Pageable.unpaged()).getContent());

        for (Mission mission : missionRepository.findByNaviresParticipantsId(id)) {
            mission.getNaviresParticipants().removeIf(r -> r.id().equals(id));
            missionRepository.save(mission);
        }

        navireRepository.delete(navire);
    }

    public Page<MembreEquipage> listEquipage(String navireId, Pageable pageable) {
        findById(navireId);
        return equipageRepository.findByNavireId(navireId, pageable);
    }

    public List<Mission> listMissions(String navireId) {
        findById(navireId);
        return missionRepository.findByNaviresParticipantsId(navireId);
    }

    /** Les 45 navires, toutes formes confondues : NavireRepository ne filtre pas. */
    public long countTous() {
        return navireRepository.count();
    }

    public long countByStatut(StatutNavire statut) {
        return navireRepository.countByStatut(statut);
    }

    public long updateStatutByNation(String nation, String ancien, String nouveau) {
        return navireRepository.updateStatutByNation(nation, ancien, nouveau);
    }

    public long addEtiquette(List<String> ids, String etiquette) {
        return navireRepository.addEtiquette(ids, etiquette);
    }
}
