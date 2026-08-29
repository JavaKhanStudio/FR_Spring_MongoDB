package fr.formation.amiraute.web;

import fr.formation.amiraute.service.StatistiqueService;
import fr.formation.amiraute.web.dto.ArmementParNation;
import fr.formation.amiraute.web.dto.NavireAvecContexte;
import fr.formation.amiraute.web.dto.TableauDeBord;
import fr.formation.amiraute.web.dto.TonnageParNation;
import fr.formation.amiraute.web.dto.TrancheTonnage;
import org.bson.Document;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/** Chaque endpoint expose un pipeline de mongosh/06-agregations.js. */
@RestController
@RequestMapping("/api/statistiques")
public class StatistiqueController {

    private final StatistiqueService service;

    public StatistiqueController(StatistiqueService service) {
        this.service = service;
    }

    /** $match -> $group -> $project -> $sort */
    @GetMapping("/tonnage-par-nation")
    public List<TonnageParNation> tonnageParNation() {
        return service.tonnageParNation();
    }

    /** $unwind puis second $match sur les elements eclates */
    @GetMapping("/armement-par-nation")
    public List<ArmementParNation> armementParNation() {
        return service.armementParNation();
    }

    /** $bucket */
    @GetMapping("/tranches-tonnage")
    public List<TrancheTonnage> tranches() {
        return service.repartitionParTonnage();
    }

    /** Trois $lookup enchaines */
    @GetMapping("/contexte")
    public List<NavireAvecContexte> contexte(@RequestParam String nation) {
        return service.contexte(nation);
    }

    /** La MEME donnee, a l'ancienne : trois $lookup. Pour comparer. */
    @GetMapping("/contexte-par-lookup")
    public List<NavireAvecContexte> contexteParLookup(@RequestParam String nation) {
        return service.contexteParLookup(nation);
    }

    /** POLYMORPHIC : grouper sur _class, le discriminant */
    @GetMapping("/repartition-par-forme")
    public List<Document> repartitionParForme() {
        return service.repartitionParClasse();
    }

    /** POLYMORPHIC : agreger sur un champ propre a une seule sous-classe */
    @GetMapping("/aeronefs-par-role")
    public List<Document> aeronefsParRole() {
        return service.aeronefsParRole();
    }

    /** $facet : six analyses en une passe */
    @GetMapping("/tableau-de-bord")
    public TableauDeBord tableauDeBord() {
        return service.tableauDeBord();
    }

    /** Agregation sur les 100 000 releves, adossee a idx_navire_temps */
    @GetMapping("/journal/{navireId}")
    public List<Document> journal(
            @PathVariable String navireId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant debut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fin) {
        return service.journalParJour(navireId, debut, fin);
    }
}
