package fr.formation.amiraute.web;

import fr.formation.amiraute.domain.MembreEquipage;
import fr.formation.amiraute.domain.Mission;
import fr.formation.amiraute.domain.BatimentSurface;
import fr.formation.amiraute.domain.Navire;
import fr.formation.amiraute.domain.PorteAeronefs;
import fr.formation.amiraute.domain.SousMarin;
import fr.formation.amiraute.domain.enumeration.MissionStrategique;
import fr.formation.amiraute.domain.enumeration.TypeCatapulte;
import fr.formation.amiraute.repository.BatimentSurfaceRepository;
import fr.formation.amiraute.repository.PorteAeronefsRepository;
import fr.formation.amiraute.repository.SousMarinRepository;
import fr.formation.amiraute.domain.enumeration.StatutNavire;
import fr.formation.amiraute.domain.enumeration.TypeNavire;
import fr.formation.amiraute.domain.enumeration.TypePropulsion;
import fr.formation.amiraute.service.NavireService;
import fr.formation.amiraute.web.dto.NavireSearchCriteria;
import fr.formation.amiraute.web.dto.NavireProche;
import fr.formation.amiraute.web.dto.NavireSummary;
import fr.formation.amiraute.web.dto.PageResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * L'API REST n'est PAS le sujet de la formation : elle sert de declencheur aux
 * requetes MongoDB. Chaque endpoint est volontairement adosse a un concept
 * precis, indique dans son commentaire.
 */
@RestController
@RequestMapping("/api/navires")
public class NavireController {

    private final NavireService service;
    private final SousMarinRepository sousMarinRepository;
    private final PorteAeronefsRepository porteAeronefsRepository;
    private final BatimentSurfaceRepository batimentSurfaceRepository;

    public NavireController(NavireService service,
                            SousMarinRepository sousMarinRepository,
                            PorteAeronefsRepository porteAeronefsRepository,
                            BatimentSurfaceRepository batimentSurfaceRepository) {
        this.service = service;
        this.sousMarinRepository = sousMarinRepository;
        this.porteAeronefsRepository = porteAeronefsRepository;
        this.batimentSurfaceRepository = batimentSurfaceRepository;
    }

    /** Requete derivee + projection par interface. */
    @GetMapping
    public List<NavireSummary> list(@RequestParam String nation) {
        return service.listByNation(nation);
    }

    /** MongoTemplate + Criteria : treize criteres facultatifs. */
    @GetMapping("/recherche")
    public PageResponse<Navire> search(
            @RequestParam(required = false) String nation,
            @RequestParam(required = false) List<TypeNavire> types,
            @RequestParam(required = false) StatutNavire statut,
            @RequestParam(required = false) TypePropulsion propulsion,
            @RequestParam(required = false) Integer tonnageMin,
            @RequestParam(required = false) Integer tonnageMax,
            @RequestParam(required = false) Integer anneeMin,
            @RequestParam(required = false) Integer anneeMax,
            @RequestParam(required = false) String nomContient,
            @RequestParam(required = false) String etiquette,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double rayonKm,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int taille,
            @RequestParam(defaultValue = "nom") String triPar,
            @RequestParam(defaultValue = "ASC") Sort.Direction sens) {

        NavireSearchCriteria criteres = new NavireSearchCriteria(nation, types, statut, propulsion,
                tonnageMin, tonnageMax, anneeMin, anneeMax, nomContient, etiquette,
                longitude, latitude, rayonKm);

        Pageable pageable = PageRequest.of(page, taille, Sort.by(sens, triPar));
        return PageResponse.de(service.search(criteres, pageable));
    }

    /** Index texte : $text + poids par champ. */
    @GetMapping("/recherche-texte")
    public List<Navire> searchTexte(@RequestParam String q) {
        return service.searchTexte(q);
    }

    /** $geoNear : renvoie la distance calculee, ce que $near ne fait pas. */
    @GetMapping("/autour")
    public List<NavireProche> autour(@RequestParam double longitude,
                                     @RequestParam double latitude,
                                     @RequestParam(defaultValue = "500") double rayonKm) {
        return service.nearby(longitude, latitude, rayonKm);
    }

    /**
     * POLYMORPHIC.
     *
     * ATTENTION : contrairement a ce qu'on attend, Spring Data n'ajoute PAS
     * de filtre sur _class parce que le repository est type sur SousMarin.
     * Le discriminant est declare a la main dans SousMarinRepository - lire
     * le commentaire de cette interface, il vaut le detour.
     */
    @GetMapping("/sous-marins")
    public List<SousMarin> sousMarins(
            @RequestParam(required = false) MissionStrategique mission) {
        return mission == null
                ? sousMarinRepository.findAllSousMarins()
                : sousMarinRepository.findByMissionStrategique(mission);
    }

    /** Champs qui n'existent QUE sur les porte-aeronefs. */
    @GetMapping("/porte-aeronefs")
    public List<PorteAeronefs> porteAeronefs(
            @RequestParam(required = false) TypeCatapulte catapulte) {
        return catapulte == null
                ? porteAeronefsRepository.findAllPorteAeronefs()
                : porteAeronefsRepository.findByTypeCatapulte(catapulte);
    }

    @GetMapping("/batiments-surface")
    public List<BatimentSurface> batimentsSurface(
            @RequestParam(required = false) String systemeCombat) {
        return systemeCombat == null
                ? batimentSurfaceRepository.findAllBatimentsSurface()
                : batimentSurfaceRepository.findBySystemeCombat(systemeCombat);
    }

    /**
     * Le comptage qui rend le polymorphisme evident au videoprojecteur - ET
     * le piege avec.
     *
     * Les lignes "count() nu" montrent ce que renvoie le count() herite de
     * MongoRepository : 45 partout, parce qu'AUCUN filtre sur _class n'est
     * ajoute. Les lignes "avec discriminant" montrent le vrai decompte.
     *
     * A projeter cote a cote : c'est la demonstration la plus utile du module.
     */
    @GetMapping("/comptage-par-forme")
    public Map<String, Object> comptageParForme() {
        Map<String, Object> resultat = new java.util.LinkedHashMap<>();
        resultat.put("TOTAL (NavireRepository)", service.countTous());

        Map<String, Long> nu = new java.util.LinkedHashMap<>();
        nu.put("SousMarinRepository.count()", sousMarinRepository.count());
        nu.put("PorteAeronefsRepository.count()", porteAeronefsRepository.count());
        nu.put("BatimentSurfaceRepository.count()", batimentSurfaceRepository.count());
        resultat.put("count() nu - AUCUN filtre _class, donc faux", nu);

        Map<String, Long> vrai = new java.util.LinkedHashMap<>();
        vrai.put("sous-marin", sousMarinRepository.countSousMarins());
        vrai.put("porte-aeronefs", porteAeronefsRepository.countPorteAeronefs());
        vrai.put("batiment-surface", batimentSurfaceRepository.countBatimentsSurface());
        resultat.put("avec discriminant explicite", vrai);

        return resultat;
    }

    @GetMapping("/{id}")
    public Navire byId(@PathVariable String id) {
        return service.findById(id);
    }

    @GetMapping("/coque/{nation}/{numeroCoque}")
    public Navire byCoque(@PathVariable String nation, @PathVariable String numeroCoque) {
        return service.findByCoque(nation, numeroCoque);
    }

    /** Le 1-N referenced, pagine - ce qu'un tableau embarque ne permettrait pas. */
    @GetMapping("/{id}/equipage")
    public PageResponse<MembreEquipage> equipage(
            @PathVariable String id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int taille) {
        return PageResponse.de(service.listEquipage(id, PageRequest.of(page, taille,
                Sort.by("nom", "prenom"))));
    }

    /** Le N-N vu depuis le navire : index multicle sur le tableau de references. */
    @GetMapping("/{id}/missions")
    public List<Mission> missions(@PathVariable String id) {
        return service.listMissions(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Navire create(@Valid @RequestBody Navire navire) {
        return service.create(navire);
    }

    /** Verrouillage optimiste : renvoie 409 si la version a change entre-temps. */
    @PutMapping("/{id}")
    public Navire update(@PathVariable String id, @Valid @RequestBody Navire navire) {
        return service.update(id, navire);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** updateMulti : N documents modifies cote serveur, aucun charge en memoire. */
    @PutMapping("/statut")
    public java.util.Map<String, Object> changerStatut(@RequestParam String nation,
                                                       @RequestParam String ancien,
                                                       @RequestParam String nouveau) {
        long modifies = service.updateStatutByNation(nation, ancien, nouveau);
        return java.util.Map.of("modifies", modifies);
    }

    /** $addToSet : rejouable sans creer de doublon. */
    @PutMapping("/etiquettes")
    public java.util.Map<String, Object> addEtiquette(@RequestBody List<String> ids,
                                                   @RequestParam String etiquette) {
        return java.util.Map.of("modifies", service.addEtiquette(ids, etiquette));
    }
}
