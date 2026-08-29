package fr.formation.amiraute.web;

import fr.formation.amiraute.domain.Port;
import fr.formation.amiraute.domain.demo.NavireReference;
import fr.formation.amiraute.repository.NavireReferenceRepository;
import fr.formation.amiraute.repository.PortRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Support de la demonstration "extended reference contre resolution N+1".
 *
 * A jouer avec le log DEBUG de MongoTemplate actif - il l'est deja dans
 * application.yml. On COMPTE les lignes de log : c'est tout le message.
 */
@RestController
@RequestMapping("/api/demo")
public class DemoController {

    private final NavireReferenceRepository navires;
    private final PortRepository ports;

    public DemoController(NavireReferenceRepository navires, PortRepository ports) {
        this.navires = navires;
        this.ports = ports;
    }

    /**
     * EXTENDED REFERENCE : le nom du port est deja dans le document.
     * UNE requete, quel que soit le nombre de navires.
     */
    @GetMapping("/extended-reference")
    public Map<String, Object> extendedReference(@RequestParam String nation) {
        List<NavireReference> liste = navires.findByNation(nation);

        List<Map<String, Object>> lignes = liste.stream()
                .map(n -> ligne(n, n.getPortAttache() == null ? null : n.getPortAttache().nom()))
                .toList();

        return Map.of("requetesMongo", 1, "navires", liste.size(), "lignes", lignes);
    }

    /**
     * RESOLUTION N+1 : ce que fait @DocumentReference sous le capot, rendu
     * visible. Une requete pour la liste, puis UNE PAR NAVIRE.
     *
     * Sur 10 navires c'est indolore. Sur une liste paginee de 50 lignes
     * appelee 1 000 fois par minute, c'est 50 000 requetes par minute.
     */
    @GetMapping("/resolution-n-plus-1")
    public Map<String, Object> resolutionNPlusUn(@RequestParam String nation) {
        List<NavireReference> liste = navires.findByNation(nation);

        List<Map<String, Object>> lignes = liste.stream()
                .map(n -> {
                    // LA requete de trop, repetee pour chaque navire.
                    String nom = ports.findById(n.getPortAttache().id())
                            .map(Port::getNom).orElse(null);
                    return ligne(n, nom);
                })
                .toList();

        return Map.of("requetesMongo", 1 + liste.size(),
                "navires", liste.size(), "lignes", lignes);
    }

    private static Map<String, Object> ligne(NavireReference n, String port) {
        Map<String, Object> ligne = new LinkedHashMap<>();
        ligne.put("nom", n.getNom());
        ligne.put("numeroCoque", n.getNumeroCoque());
        ligne.put("port", port);
        return ligne;
    }
}
