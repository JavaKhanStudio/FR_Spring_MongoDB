package fr.formation.amiraute.repository;

import fr.formation.amiraute.MongoTestBase;
import fr.formation.amiraute.domain.Navire;
import fr.formation.amiraute.repository.aggregation.StatistiqueRepository;
import fr.formation.amiraute.web.dto.ArmementParNation;
import fr.formation.amiraute.web.dto.NavireAvecContexte;
import fr.formation.amiraute.web.dto.TonnageParNation;
import fr.formation.amiraute.web.dto.TrancheTonnage;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * @DataMongoTest ne charge pas les beans @Repository ordinaires : seuls les
 * depots Spring Data le sont. StatistiqueRepository doit donc etre importe.
 */
@DataMongoTest
@Import(StatistiqueRepository.class)
@DisplayName("StatistiqueRepository - les pipelines d'agregation")
class StatistiqueRepositoryTest extends MongoTestBase {

    @Autowired
    private StatistiqueRepository statistiques;

    @Autowired
    private NavireRepository navireRepository;

    @Autowired
    private MongoTemplate mongo;

    @BeforeEach
    void preparer() {
        List.of("navires", "ports", "flottes", "missions")
                .forEach(c -> mongo.getCollection(c).drop());

        mongo.insertAll(TestData.ports());
        mongo.insertAll(TestData.flottes());
        navireRepository.saveAll(TestData.navires());

        Navire cdg = navireRepository.findByNationAndNumeroCoque("France", "R91").orElseThrow();
        Navire forbin = navireRepository.findByNationAndNumeroCoque("France", "D620").orElseThrow();
        mongo.save(TestData.mission("CLEMENCEAU 26", List.of(cdg, forbin)));
        mongo.save(TestData.mission("AKILA 26", List.of(cdg)));

        // COMPUTED PATTERN : stats.nombreMissions ne se met pas a jour tout
        // seul. En production c'est MissionService qui le recalcule ; ici on
        // fait le meme geste a la main, sinon le compteur reste a zero.
        // C'est exactement la derive que le pattern fait courir.
        recalculerCompteurs();
    }

    private void recalculerCompteurs() {
        navireRepository.findAll().forEach(navire -> {
            // LE MEME PIEGE QUE DANS LE MODELE : naviresParticipants.id est un
            // ObjectId en base. Interroger le driver brut avec le String rendu
            // par getId() ne remonterait RIEN, sans la moindre erreur.
            long n = mongo.getCollection("missions").countDocuments(
                    new org.bson.Document("naviresParticipants.id",
                            new org.bson.types.ObjectId(navire.getId())));
            navire.setStats(new fr.formation.amiraute.domain.embedded.NavireStats(
                    (int) n, 5, null));
            navireRepository.save(navire);
        });
    }

    @Test
    @DisplayName("$group : tonnage par nation, trie decroissant")
    void tonnageParNation() {
        List<TonnageParNation> resultats = statistiques.tonnageParNation();

        assertThat(resultats).hasSize(2);
        // Etats-Unis d'abord : 100 000 t pour un seul navire.
        assertThat(resultats.get(0).nation()).isEqualTo("Etats-Unis");
        assertThat(resultats.get(0).tonnageTotal()).isEqualTo(100000);
        assertThat(resultats.get(0).nombreNavires()).isEqualTo(1);

        TonnageParNation france = resultats.get(1);
        assertThat(france.nation()).isEqualTo("France");
        assertThat(france.nombreNavires()).isEqualTo(4);
        assertThat(france.tonnageTotal()).isEqualTo(42500 + 7050 + 6000 + 5300);
        assertThat(france.tonnageMax()).isEqualTo(42500);
    }

    @Test
    @DisplayName("$unwind : les quantites d'armement s'additionnent par categorie")
    void armementParNation() {
        List<ArmementParNation> resultats = statistiques.armementParNation();

        // Seuls les missiles sont retenus par le second $match.
        assertThat(resultats).allSatisfy(r -> assertThat(r.categorie()).contains("MISSILE"));

        ArmementParNation franceAA = resultats.stream()
                .filter(r -> r.nation().equals("France")
                        && r.categorie().equals("MISSILE_ANTIAERIEN"))
                .findFirst().orElseThrow();

        // Aster 15 (32) sur le CdG + Aster 30 (48) sur le Forbin.
        assertThat(franceAA.quantiteTotale()).isEqualTo(80);
        assertThat(franceAA.porteeMaximaleKm()).isEqualTo(120);
    }

    @Test
    @DisplayName("$bucket : chaque navire tombe dans une seule tranche")
    void repartitionParTonnage() {
        List<TrancheTonnage> tranches = statistiques.repartitionParTonnage();

        assertThat(tranches.stream().mapToLong(TrancheTonnage::nombre).sum()).isEqualTo(5);
        assertThat(tranches).anySatisfy(t -> {
            assertThat(t.borneInferieure()).isEqualTo(5000);
            // Suffren 5 300, Aquitaine 6 000, Forbin 7 050
            assertThat(t.nombre()).isEqualTo(3);
        });
    }

    @Test
    @DisplayName("$lookup : trois jointures a plat en une requete")
    void naviresAvecContexte() {
        List<NavireAvecContexte> resultats = statistiques.naviresAvecContexte("France");

        assertThat(resultats).hasSize(4);

        NavireAvecContexte cdg = resultats.stream()
                .filter(n -> n.nom().equals("Charles de Gaulle")).findFirst().orElseThrow();

        assertThat(cdg.portAttacheNom()).isEqualTo("Toulon");
        assertThat(cdg.portAttachePays()).isEqualTo("France");
        assertThat(cdg.flotteNom()).isEqualTo("Force d'Action Navale");
        assertThat(cdg.amiralNom()).isEqualTo("Perrier");
        assertThat(cdg.nombreMissions()).isEqualTo(2);

        // $lookup est une jointure GAUCHE : un navire sans mission remonte
        // quand meme, avec un tableau vide.
        NavireAvecContexte suffren = resultats.stream()
                .filter(n -> n.nom().equals("Suffren")).findFirst().orElseThrow();
        assertThat(suffren.nombreMissions()).isZero();
    }

    @Test
    @DisplayName("$facet : chaque branche calcule sur le meme flux d'entree")
    void tableauDeBord() {
        Document brut = statistiques.tableauDeBordBrut();

        assertThat(brut).isNotNull();
        assertThat(brut.keySet()).contains("totaux", "parType", "parStatut",
                "parPropulsion", "parNation", "lesPlusRapides");

        @SuppressWarnings("unchecked")
        List<Document> totaux = (List<Document>) brut.get("totaux");
        assertThat(((Number) totaux.get(0).get("nombreNavires")).longValue()).isEqualTo(5);
        assertThat(((Number) totaux.get(0).get("tonnageTotal")).longValue())
                .isEqualTo(42500 + 7050 + 6000 + 5300 + 100000);
    }
}
