package fr.formation.amiraute.repository;

import fr.formation.amiraute.MongoTestBase;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.data.mongodb.core.MongoTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Garde-fou sur le FORMAT REELLEMENT STOCKE.
 *
 * Les scripts mongosh du cours et l'application ecrivent dans la MEME
 * collection. Si leurs formats divergent, rien ne casse bruyamment : les
 * $lookup renvoient simplement des tableaux vides, et on ne s'en apercoit
 * que des semaines plus tard.
 *
 * Ces tests verrouillent les deux points ou la divergence est arrivee.
 */
@DataMongoTest
@DisplayName("Format stocke - le contrat entre les scripts et l'application")
class FormatStockageTest extends MongoTestBase {

    @Autowired
    private NavireRepository repository;

    @Autowired
    private MongoTemplate mongo;

    @Autowired
    private SousMarinRepository sousMarinRepository;

    @Autowired
    private PorteAeronefsRepository porteAeronefsRepository;

    @Autowired
    private BatimentSurfaceRepository batimentSurfaceRepository;

    @BeforeEach
    void preparer() {
        mongo.getCollection("navires").drop();
        repository.saveAll(TestData.navires());
    }

    private Document premierNavire() {
        return mongo.getCollection("navires").find().first();
    }

    @Test
    @DisplayName("une reference enrichie stocke 'id', et surtout PAS '_id'")
    void referenceEnrichieStockeId() {
        Document navire = premierNavire();

        for (String champ : new String[] { "portAttache", "flotte" }) {
            Document ref = navire.get(champ, Document.class);
            assertThat(ref).as(champ).isNotNull();
            assertThat(ref.keySet())
                    .as("Spring mappe toute propriete 'id' vers '_id', meme imbriquee. "
                        + "Sans @Field(\"id\") sur le record, le format diverge de celui "
                        + "des scripts mongosh et les $lookup remontent vide.")
                    .contains("id")
                    .doesNotContain("_id");
        }
    }

    @Test
    @DisplayName("le discriminant _class porte l'alias court, pas le nom de classe Java")
    void discriminantCourt() {
        assertThat(mongo.getCollection("navires").distinct("_class", String.class))
                .as("Sans @TypeAlias, Spring ecrit le nom de classe complet et "
                    + "renommer le paquet rend la collection illisible.")
                .containsExactlyInAnyOrder("sous-marin", "porte-aeronefs", "batiment-surface");
    }

    @Test
    @DisplayName("un repository de sous-classe NE filtre PAS tout seul sur _class")
    void leRepositoryDeSousClasseNeFiltrePas() {
        // Comportement VERIFIE, pas suppose. Spring Data n'ajoute aucune
        // restriction sur _class du seul fait que le repository est type sur
        // une sous-classe : count() renvoie les 5 navires du jeu de test.
        assertThat(sousMarinRepository.count())
                .as("Si ce test casse, Spring Data a change de comportement : "
                    + "verifier si les @Query explicites restent necessaires.")
                .isEqualTo(5);

        // Avec le discriminant declare a la main, le compte est juste.
        assertThat(sousMarinRepository.countSousMarins()).isEqualTo(1);
        assertThat(porteAeronefsRepository.countPorteAeronefs()).isEqualTo(2);
        assertThat(batimentSurfaceRepository.countBatimentsSurface()).isEqualTo(2);
    }

    @Test
    @DisplayName("sans discriminant, les documents sont instancies DE FORCE dans la sous-classe")
    void mistypageSilencieux() {
        // 5 documents remontent, tous convertis en SousMarin - y compris les
        // deux porte-avions. Aucune exception, aucun log : des objets faux.
        assertThat(sousMarinRepository.findAll()).hasSize(5);

        // Avec le discriminant, seul le vrai sous-marin remonte.
        assertThat(sousMarinRepository.findAllSousMarins())
                .singleElement()
                .satisfies(sm -> assertThat(sm.getProfondeurMaxMetres()).isEqualTo(350));
    }

    @Test
    @DisplayName("le lookup sur la reference enrichie remonte bien la flotte")
    void leLookupFonctionne() {
        Document flotte = new Document("_id", "FAN")
                .append("nom", "Force d'Action Navale")
                .append("amiralCommandant", new Document("grade", "Vice-amiral").append("nom", "Perrier"));
        mongo.getCollection("flottes").drop();
        mongo.getCollection("flottes").insertOne(flotte);

        var resultat = mongo.getCollection("navires").aggregate(java.util.List.of(
                new Document("$match", new Document("numeroCoque", "R91")),
                new Document("$lookup", new Document("from", "flottes")
                        .append("localField", "flotte.id")
                        .append("foreignField", "_id")
                        .append("as", "f")),
                new Document("$project", new Document("amiral",
                        new Document("$arrayElemAt", java.util.List.of("$f.amiralCommandant.nom", 0))))
        )).first();

        assertThat(resultat).isNotNull();
        assertThat(resultat.getString("amiral")).isEqualTo("Perrier");
    }
}
