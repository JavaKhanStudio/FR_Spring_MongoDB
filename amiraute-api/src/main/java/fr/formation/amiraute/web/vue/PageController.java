package fr.formation.amiraute.web.vue;

import fr.formation.amiraute.domain.Navire;
import fr.formation.amiraute.domain.Port;
import fr.formation.amiraute.repository.NavireRepository;
import fr.formation.amiraute.repository.PortRepository;
import fr.formation.amiraute.service.DiagnosticService;
import fr.formation.amiraute.service.NavireService;
import fr.formation.amiraute.service.StatistiqueService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Quatre pages, pas une de plus.
 *
 * Chacune est adossee a UN concept MongoDB, et chacune affiche en pied de page
 * le nombre de requetes qu'elle a reellement declenchees. C'est ce compteur
 * qui fait la valeur pedagogique : il rend visible ce qu'un log DEBUG oblige
 * a dechiffrer.
 *
 * @Controller et non @RestController : on rend des vues, pas du JSON.
 */
@Controller
@RequestMapping("/vue")
public class PageController {

    private final NavireService navireService;
    private final StatistiqueService statistiqueService;
    private final DiagnosticService diagnosticService;
    private final NavireRepository navireRepository;
    private final PortRepository portRepository;
    private final org.springframework.data.mongodb.core.MongoTemplate mongo;

    public PageController(NavireService navireService,
                          StatistiqueService statistiqueService,
                          DiagnosticService diagnosticService,
                          NavireRepository navireRepository,
                          PortRepository portRepository,
                          org.springframework.data.mongodb.core.MongoTemplate mongo) {
        this.navireService = navireService;
        this.statistiqueService = statistiqueService;
        this.diagnosticService = diagnosticService;
        this.navireRepository = navireRepository;
        this.portRepository = portRepository;
        this.mongo = mongo;
    }

    /**
     * EXTENDED REFERENCE, rendue visible.
     *
     * Les colonnes Port, Flotte et Missions sortent du document lui-meme :
     * AUCUNE jointure. Le compteur affiche 2 - la liste des navires, et le
     * distinct() qui alimente le filtre par nation. Deux, quel que soit le
     * nombre de navires affiches.
     *
     * Avec ?nplusun=true, on resout le port navire par navire - exactement ce
     * que ferait @DocumentReference. Le compteur passe alors a N+1, sans que
     * la page change d'un pixel.
     */
    @GetMapping("/navires")
    public String navires(@RequestParam(defaultValue = "France") String nation,
                          @RequestParam(defaultValue = "false") boolean nplusun,
                          Model modele) {
        List<Navire> navires = navireRepository.findByNationOrderByDeplacementTonnesDesc(nation);

        List<String> ports = new ArrayList<>();
        for (Navire n : navires) {
            if (nplusun) {
                // LA requete de trop, repetee pour chaque navire.
                ports.add(portRepository.findById(n.getPortAttache().id())
                        .map(Port::getNom).orElse("?"));
            } else {
                // Deja dans le document.
                ports.add(n.getPortAttache().nom());
            }
        }

        modele.addAttribute("nation", nation);
        modele.addAttribute("navires", navires);
        modele.addAttribute("ports", ports);
        modele.addAttribute("nplusun", nplusun);
        // distinct() cote serveur : une requete legere, pas un findAll complet.
        modele.addAttribute("nations", mongo.findDistinct(
                new org.springframework.data.mongodb.core.query.Query(),
                "nation", Navire.class, String.class).stream().sorted().toList());
        return "navires";
    }

    /**
     * POLYMORPHIC, rendu visible.
     *
     * La page affiche des blocs DIFFERENTS selon la forme du document : un
     * sous-marin montre sa profondeur d'immersion, un porte-aeronefs son
     * groupe aerien. C'est le concept le plus abstrait du cours, et une page
     * le rend evident en trois secondes.
     */
    @GetMapping("/navires/{id}")
    public String navire(@PathVariable String id, Model modele) {
        Navire navire = navireService.findById(id);
        modele.addAttribute("navire", navire);
        modele.addAttribute("equipage",
                navireService.listEquipage(id, org.springframework.data.domain.PageRequest.of(0, 8)));
        modele.addAttribute("missions", navireService.listMissions(id));
        return "navire";
    }

    /** $facet : six analyses en une passe, rendues en un ecran. */
    @GetMapping("/tableau-de-bord")
    public String tableauDeBord(Model modele) {
        modele.addAttribute("tb", statistiqueService.tableauDeBord());
        modele.addAttribute("tranches", statistiqueService.repartitionParTonnage());
        return "tableau-de-bord";
    }

    /**
     * Le module Performance, rendu sensible.
     *
     * Un ratio dans un explain() convainc moins qu'une page qui rame. Ici les
     * deux sont cote a cote.
     */
    @GetMapping("/diagnostic")
    public String diagnostic(Model modele) {
        Map<String, Object> lente = diagnosticService.requeteLenteVolontaire();
        modele.addAttribute("lente", lente);
        modele.addAttribute("explain", lente.get("explain"));
        modele.addAttribute("comparaison", diagnosticService.comparerAvecEtSansIndex());
        modele.addAttribute("index", diagnosticService.statistiquesIndex("journauxBord"));
        modele.addAttribute("collection", diagnosticService.statistiquesCollection("journauxBord"));
        return "diagnostic";
    }
}
