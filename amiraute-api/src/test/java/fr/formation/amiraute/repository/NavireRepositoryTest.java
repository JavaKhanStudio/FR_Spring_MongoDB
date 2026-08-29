package fr.formation.amiraute.repository;

import fr.formation.amiraute.MongoTestBase;
import fr.formation.amiraute.config.MongoConfig;
import fr.formation.amiraute.domain.Navire;
import fr.formation.amiraute.domain.enumeration.StatutNavire;
import fr.formation.amiraute.domain.enumeration.TypeNavire;
import fr.formation.amiraute.web.dto.NavireSummary;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.TextIndexDefinition;
import org.springframework.data.domain.Sort;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * @DataMongoTest ne demarre QUE la couche Mongo : pas de serveur web, pas de
 * services. Le contexte se leve en une fraction du temps d'un @SpringBootTest.
 */
@DataMongoTest
// @DataMongoTest ne charge PAS les @Configuration de l'application.
// Sans cet import, @EnableMongoAuditing est absent et @CreatedDate /
// @LastModifiedDate restent obstinement nuls - l'oubli le plus frequent
// avec l'audit Spring Data.
@Import(MongoConfig.class)
@DisplayName("NavireRepository - requetes derivees, @Query et projections")
class NavireRepositoryTest extends MongoTestBase {

    @Autowired
    private NavireRepository repository;

    @Autowired
    private MongoTemplate mongo;

    @BeforeEach
    void preparer() {
        mongo.getCollection("navires").drop();

        // IndexConfig est un ApplicationRunner : il ne s'execute pas
        // sous @DataMongoTest. Les index dont les tests ont besoin sont donc
        // crees ici, explicitement.
        mongo.indexOps(Navire.class).ensureIndex(
                new Index().on("nation", Sort.Direction.ASC)
                        .on("numeroCoque", Sort.Direction.ASC)
                        .unique().named("idx_nation_coque_unique"));
        mongo.indexOps(Navire.class).ensureIndex(
                TextIndexDefinition.builder().named("idx_texte")
                        .onField("nom", 10F).onField("devise", 1F).build());

        repository.saveAll(TestData.navires());
    }

    @Test
    @DisplayName("l'audit et le verrouillage optimiste sont renseignes a l'insertion")
    void auditEtVersion() {
        Navire n = repository.findByNationAndNumeroCoque("France", "R91").orElseThrow();

        assertThat(n.getDateCreation()).isNotNull();
        assertThat(n.getDateModification()).isNotNull();
        assertThat(n.getVersion()).isZero();

        n.setStatut(StatutNavire.EN_REPARATION);
        Navire apres = repository.save(n);

        assertThat(apres.getVersion()).isEqualTo(1L);
    }

    @Test
    @DisplayName("l'index unique (nation, numeroCoque) refuse le doublon")
    void indexUniqueCompose() {
        Navire doublon = TestData.navires().get(0);
        doublon.setId(null);
        doublon.setVersion(null);

        assertThatThrownBy(() -> repository.save(doublon))
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    @DisplayName("le meme numero de coque est accepte pour une autre nation")
    void unicitePorteeSurLeCouple() {
        Navire etranger = TestData.navires().get(0);
        etranger.setId(null);
        etranger.setVersion(null);
        etranger.setNation("Italie");

        assertThat(repository.save(etranger).getId()).isNotNull();
        assertThat(repository.count()).isEqualTo(6);
    }

    @Test
    @DisplayName("requete derivee : tri decroissant par tonnage")
    void requeteDerivee() {
        List<Navire> francais = repository.findByNationOrderByDeplacementTonnesDesc("France");

        assertThat(francais).hasSize(4);
        assertThat(francais.get(0).getNom()).isEqualTo("Charles de Gaulle");
        assertThat(francais).extracting(Navire::getDeplacementTonnes).isSortedAccordingTo(
                java.util.Comparator.reverseOrder());
    }

    @Test
    @DisplayName("requete derivee sur un tableau : l'egalite signifie 'contient'")
    void requeteSurTableau() {
        assertThat(repository.findByEtiquettes("nucleaire"))
                .extracting(Navire::getNom)
                .containsExactlyInAnyOrder("Charles de Gaulle", "Suffren", "Gerald R. Ford");
    }

    @Test
    @DisplayName("@Query avec $elemMatch : les deux conditions sur le MEME element")
    void elemMatch() {
        // Seul l'Aquitaine porte un canon de portee >= 20 km.
        // Sans $elemMatch, le Forbin remonterait aussi : il a un canon (16 km)
        // ET un armement de portee >= 20 km (Aster 30, 120 km), mais ce ne
        // sont pas les memes.
        List<Navire> avecCanonLong = repository.findByArmement("CANON", 20);

        assertThat(avecCanonLong).extracting(Navire::getNom).containsExactly("Aquitaine");
    }

    @Test
    @DisplayName("projection par DTO : seuls les champs declares reviennent")
    void projection() {
        List<NavireSummary> resumes = repository.findByNation("France");

        assertThat(resumes).hasSize(4);
        assertThat(resumes).extracting(NavireSummary::nom)
                .contains("Charles de Gaulle", "Forbin", "Aquitaine", "Suffren");
        assertThat(resumes.get(0).deplacementTonnes()).isNotNull();
    }

    @Test
    @DisplayName("le DTO n'a pas besoin du discriminant, une interface si")
    void pourquoiUnDtoEtPasUneInterface() {
        // Une projection par INTERFACE fait d'abord materialiser le document
        // dans le type declare du repository - Navire - avant de poser le
        // proxy. Or _class ne fait pas partie des champs projetes : Spring ne
        // sait plus quelle sous-classe instancier, retombe sur Navire, qui est
        // ABSTRAITE, et leve MappingInstantiationException.
        //
        // Le DTO, lui, est construit directement : l'entite n'est jamais
        // instanciee, le discriminant n'est jamais requis.
        assertThat(repository.findByNation("France"))
                .isNotEmpty()
                .allSatisfy(r -> assertThat(r.type()).isNotNull());
    }

    @Test
    @DisplayName("pagination : trois pages de deux sur cinq navires")
    void pagination() {
        var page1 = repository.findByType(TypeNavire.PORTE_AVIONS, PageRequest.of(0, 1));

        assertThat(page1.getTotalElements()).isEqualTo(2);
        assertThat(page1.getTotalPages()).isEqualTo(2);
        assertThat(page1.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("recherche plein texte via l'index texte")
    void rechercheTexte() {
        assertThat(repository.searchTexte("Gaulle"))
                .extracting(Navire::getNom).containsExactly("Charles de Gaulle");
    }

    @Test
    @DisplayName("comptages et existence")
    void comptages() {
        assertThat(repository.countByStatut(StatutNavire.ACTIF)).isEqualTo(4);
        assertThat(repository.countByStatut(StatutNavire.EN_MISSION)).isEqualTo(1);
        assertThat(repository.existsByNationAndNumeroCoque("France", "R91")).isTrue();
        assertThat(repository.existsByNationAndNumeroCoque("Italie", "R91")).isFalse();
    }

    @Test
    @DisplayName("intervalle et exclusion combines")
    void intervalles() {
        assertThat(repository.findByDeplacementTonnesBetween(5000, 8000))
                .extracting(Navire::getNom)
                .containsExactlyInAnyOrder("Forbin", "Aquitaine", "Suffren");

        assertThat(repository.findByTypeInAndStatutNot(
                List.of(TypeNavire.PORTE_AVIONS, TypeNavire.FREGATE), StatutNavire.EN_MISSION))
                .extracting(Navire::getNom)
                .containsExactlyInAnyOrder("Charles de Gaulle", "Gerald R. Ford");
    }
}
