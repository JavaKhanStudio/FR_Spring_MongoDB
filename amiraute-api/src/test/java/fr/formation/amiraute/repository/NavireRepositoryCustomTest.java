package fr.formation.amiraute.repository;

import fr.formation.amiraute.MongoTestBase;
import fr.formation.amiraute.domain.Navire;
import fr.formation.amiraute.domain.enumeration.StatutNavire;
import fr.formation.amiraute.domain.enumeration.TypeNavire;
import fr.formation.amiraute.domain.enumeration.TypePropulsion;
import fr.formation.amiraute.web.dto.NavireSearchCriteria;
import fr.formation.amiraute.web.dto.NavireProche;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexType;
import org.springframework.data.mongodb.core.index.GeospatialIndex;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * La partie MongoTemplate du repository : c'est ici que la recherche multicritere
 * se verifie, combinaison par combinaison.
 */
@DataMongoTest
@DisplayName("NavireRepositoryCustom - Criteria dynamiques et operations en masse")
class NavireRepositoryCustomTest extends MongoTestBase {

    @Autowired
    private NavireRepository repository;

    @Autowired
    private MongoTemplate mongo;

    private static final PageRequest PREMIERE_PAGE =
            PageRequest.of(0, 20, Sort.by("nom"));

    @BeforeEach
    void preparer() {
        mongo.getCollection("navires").drop();
        mongo.indexOps(Navire.class).ensureIndex(
                new GeospatialIndex("positionActuelle")
                        .typed(GeoSpatialIndexType.GEO_2DSPHERE).named("idx_position"));
        repository.saveAll(TestData.navires());
    }

    private static NavireSearchCriteria vide() {
        return new NavireSearchCriteria(null, null, null, null, null, null,
                null, null, null, null, null, null, null);
    }

    @Test
    @DisplayName("aucun critere : tout remonte")
    void sansCritere() {
        assertThat(repository.searchAdvanced(vide(), PREMIERE_PAGE).getTotalElements())
                .isEqualTo(5);
    }

    @Test
    @DisplayName("un critere simple")
    void unCritere() {
        NavireSearchCriteria c = new NavireSearchCriteria("France", null, null, null, null, null,
                null, null, null, null, null, null, null);

        assertThat(repository.searchAdvanced(c, PREMIERE_PAGE).getTotalElements()).isEqualTo(4);
    }

    @Test
    @DisplayName("les deux bornes de tonnage vont sur le MEME Criteria")
    void encadrement() {
        NavireSearchCriteria c = new NavireSearchCriteria(null, null, null, null, 6000, 45000,
                null, null, null, null, null, null, null);

        assertThat(repository.searchAdvanced(c, PREMIERE_PAGE).getContent())
                .extracting(Navire::getNom)
                .containsExactly("Aquitaine", "Charles de Gaulle", "Forbin");
    }

    @Test
    @DisplayName("critere sur un sous-document, en notation pointee")
    void sousDocument() {
        NavireSearchCriteria c = new NavireSearchCriteria(null, null, null, TypePropulsion.NUCLEAIRE,
                null, null, null, null, null, null, null, null, null);

        assertThat(repository.searchAdvanced(c, PREMIERE_PAGE).getContent())
                .extracting(Navire::getNom)
                .containsExactly("Charles de Gaulle", "Gerald R. Ford", "Suffren");
    }

    @Test
    @DisplayName("six criteres combines")
    void combinaisonComplete() {
        NavireSearchCriteria c = new NavireSearchCriteria(
                "France",
                List.of(TypeNavire.PORTE_AVIONS, TypeNavire.DESTROYER),
                StatutNavire.ACTIF,
                null, 7000, 50000, 2000, 2015, "o", "otan",
                null, null, null);

        assertThat(repository.searchAdvanced(c, PREMIERE_PAGE).getContent())
                .extracting(Navire::getNom)
                .containsExactly("Forbin");
    }

    @Test
    @DisplayName("filtre geographique : $geoWithin se pagine, contrairement a $near")
    void filtreGeographique() {
        // Rayon de 300 km autour de Toulon : le CdG, le Forbin et le Suffren.
        NavireSearchCriteria c = new NavireSearchCriteria(null, null, null, null, null, null,
                null, null, null, null, 5.93, 43.12, 300.0);

        assertThat(repository.searchAdvanced(c, PREMIERE_PAGE).getContent())
                .extracting(Navire::getNom)
                .containsExactly("Charles de Gaulle", "Forbin", "Suffren");
    }

    @Test
    @DisplayName("le total est calcule AVANT la pagination")
    void totalIndependantDeLaPage() {
        var page = repository.searchAdvanced(vide(), PageRequest.of(0, 2, Sort.by("nom")));

        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getTotalElements()).isEqualTo(5);
        assertThat(page.getTotalPages()).isEqualTo(3);
    }

    @Test
    @DisplayName("$geoNear renvoie la distance, ce que $near ne fait pas")
    void distanceCalculee() {
        List<NavireProche> proches = repository.findNearby(5.93, 43.12, 300);

        assertThat(proches).isNotEmpty();
        assertThat(proches.get(0).distanceKm()).isNotNull().isLessThan(300.0);
        // $geoNear trie par distance croissante : le tri est gratuit.
        assertThat(proches).extracting(NavireProche::distanceKm).isSorted();
    }

    @Test
    @DisplayName("updateMulti modifie N documents sans en charger aucun")
    void miseAJourEnMasse() {
        long modifies = repository.updateStatutByNation("France", "ACTIF", "EN_RESERVE");

        assertThat(modifies).isEqualTo(3);
        assertThat(repository.countByStatut(StatutNavire.EN_RESERVE)).isEqualTo(3);
        assertThat(repository.countByStatut(StatutNavire.ACTIF)).isEqualTo(1);
    }

    @Test
    @DisplayName("$addToSet est rejouable sans creer de doublon")
    void etiquetageIdempotent() {
        List<String> ids = repository.findByNationOrderByDeplacementTonnesDesc("France")
                .stream().map(Navire::getId).toList();

        repository.addEtiquette(ids, "mediterranee");
        repository.addEtiquette(ids, "mediterranee");

        Navire cdg = repository.findByNationAndNumeroCoque("France", "R91").orElseThrow();
        assertThat(cdg.getEtiquettes()).containsOnlyOnce("mediterranee");
    }
}
