package fr.formation.amiraute.web;

import fr.formation.amiraute.service.DiagnosticService;
import org.bson.Document;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Le module Performance et diagnostic, pilotable depuis un client HTTP.
 *
 * A n'exposer QUE dans un contexte de formation : reglerProfileur et
 * expliquer permettent d'agir sur le serveur MongoDB.
 */
@RestController
@RequestMapping("/api/diagnostic")
public class DiagnosticController {

    private final DiagnosticService service;

    public DiagnosticController(DiagnosticService service) {
        this.service = service;
    }

    /** POST /api/diagnostic/explain?collection=navires  corps = le filtre BSON */
    @PostMapping("/explain")
    public Map<String, Object> expliquer(@RequestParam String collection,
                                         @RequestBody(required = false) Document filtre,
                                         @RequestParam(required = false) String triPar,
                                         @RequestParam(defaultValue = "1") int sens) {
        Document tri = triPar == null ? null : new Document(triPar, sens);
        return service.expliquer(collection, filtre == null ? new Document() : filtre, tri);
    }

    /** La demonstration avant / apres index. */
    @GetMapping("/comparaison-index")
    public Map<String, Object> comparaison() {
        return service.comparerAvecEtSansIndex();
    }

    /** La requete lente plantee volontairement dans le projet. */
    @GetMapping("/requete-lente")
    public Map<String, Object> requeteLente() {
        return service.requeteLenteVolontaire();
    }

    @GetMapping("/index/{collection}")
    public List<Document> index(@PathVariable String collection) {
        return service.statistiquesIndex(collection);
    }

    @GetMapping("/collection/{collection}")
    public Map<String, Object> collection(@PathVariable String collection) {
        return service.statistiquesCollection(collection);
    }

    /**
     * niveau 0 eteint, 1 requetes lentes, 2 toutes (jamais en production).
     *
     * Le SEUIL n'est pas un parametre : slowms est global a l'instance et se
     * fixe au demarrage de mongod. Voir DiagnosticService.
     */
    @PostMapping("/profileur")
    public Document profileur(@RequestParam int niveau) {
        return service.reglerProfileur(niveau);
    }

    /** Niveau et seuil courants, sans rien modifier. */
    @GetMapping("/profileur")
    public Document etatProfileur() {
        return service.etatProfileur();
    }

    @GetMapping("/requetes-lentes")
    public List<Document> requetesLentes(@RequestParam(defaultValue = "20") int limite) {
        return service.requetesLentes(limite);
    }
}
