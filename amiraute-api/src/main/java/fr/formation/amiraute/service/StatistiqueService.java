package fr.formation.amiraute.service;

import fr.formation.amiraute.repository.NavireRepository;
import fr.formation.amiraute.repository.aggregation.StatistiqueRepository;
import fr.formation.amiraute.web.dto.ArmementParNation;
import fr.formation.amiraute.web.dto.NavireAvecContexte;
import fr.formation.amiraute.web.dto.TableauDeBord;
import fr.formation.amiraute.web.dto.TonnageParNation;
import fr.formation.amiraute.web.dto.TrancheTonnage;
import org.bson.Document;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class StatistiqueService {

    private final StatistiqueRepository statistiqueRepository;
    private final NavireRepository navireRepository;

    public StatistiqueService(StatistiqueRepository statistiqueRepository, NavireRepository navireRepository) {
        this.statistiqueRepository = statistiqueRepository;
        this.navireRepository = navireRepository;
    }

    public List<TonnageParNation> tonnageParNation() {
        return statistiqueRepository.tonnageParNation();
    }

    public List<ArmementParNation> armementParNation() {
        return statistiqueRepository.armementParNation();
    }

    public List<TrancheTonnage> repartitionParTonnage() {
        return statistiqueRepository.repartitionParTonnage();
    }

    public List<NavireAvecContexte> contexte(String nation) {
        return statistiqueRepository.naviresAvecContexte(nation);
    }

    /** La meme donnee, obtenue a l'ancienne : pour la comparaison du J3. */
    public List<NavireAvecContexte> contexteParLookup(String nation) {
        return statistiqueRepository.naviresAvecContexteParLookup(nation);
    }

    public List<Document> repartitionParClasse() {
        return statistiqueRepository.repartitionParClasse();
    }

    public List<Document> aeronefsParRole() {
        return statistiqueRepository.aeronefsParRole();
    }

    public List<Document> journalParJour(String navireId, Instant debut, Instant fin) {
        return statistiqueRepository.vitesseMoyenneParJour(navireId, debut, fin);
    }

    /** Remet en forme la sortie heterogene du $facet. */
    @SuppressWarnings("unchecked")
    public TableauDeBord tableauDeBord() {
        Document brut = statistiqueRepository.tableauDeBordBrut();
        if (brut == null) {
            return new TableauDeBord(0, 0, 0, Map.of(), Map.of(), Map.of(), List.of(), List.of());
        }

        List<Document> totaux = (List<Document>) brut.get("totaux");
        Document t = totaux.isEmpty() ? new Document() : totaux.get(0);

        List<Document> nations = (List<Document>) brut.get("parNation");
        List<TonnageParNation> parNation = nations.stream()
                .map(d -> new TonnageParNation(
                        d.getString("nation"),
                        nombre(d, "nombreNavires").longValue(),
                        nombre(d, "tonnageTotal").longValue(),
                        nombre(d, "tonnageMoyen").doubleValue(),
                        nombre(d, "tonnageMax").intValue()))
                .toList();

        return new TableauDeBord(
                nombre(t, "nombreNavires").longValue(),
                nombre(t, "tonnageTotal").longValue(),
                nombre(t, "equipageTotal").longValue(),
                enCompteur((List<Document>) brut.get("parType")),
                enCompteur((List<Document>) brut.get("parStatut")),
                enCompteur((List<Document>) brut.get("parPropulsion")),
                parNation,
                (List<Map<String, Object>>) (List<?>) brut.get("lesPlusRapides"));
    }

    private static Map<String, Long> enCompteur(List<Document> lignes) {
        Map<String, Long> resultat = new LinkedHashMap<>();
        for (Document d : lignes) {
            Object cle = d.get("_id");
            resultat.put(cle == null ? "INCONNU" : cle.toString(), nombre(d, "nombre").longValue());
        }
        return resultat;
    }

    /**
     * Un $sum peut rendre un Integer, un Long ou un Double selon les valeurs
     * rencontrees : BSON ne promeut pas systematiquement. Passer par Number
     * evite un ClassCastException imprevisible en production.
     */
    private static Number nombre(Document d, String cle) {
        Object valeur = d.get(cle);
        return valeur instanceof Number n ? n : 0;
    }

    public long countNavires() {
        return navireRepository.count();
    }
}
