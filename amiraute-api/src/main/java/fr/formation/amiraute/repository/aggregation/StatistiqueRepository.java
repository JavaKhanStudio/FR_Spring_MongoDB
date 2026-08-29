package fr.formation.amiraute.repository.aggregation;

import fr.formation.amiraute.domain.JournalBord;
import fr.formation.amiraute.domain.Navire;
import fr.formation.amiraute.domain.enumeration.StatutNavire;
import fr.formation.amiraute.web.dto.ArmementParNation;
import fr.formation.amiraute.web.dto.NavireAvecContexte;
import fr.formation.amiraute.web.dto.TonnageParNation;
import fr.formation.amiraute.web.dto.TrancheTonnage;
import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.ArrayOperators;
import org.springframework.data.mongodb.core.aggregation.DateOperators;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

import static org.springframework.data.mongodb.core.aggregation.Aggregation.bucket;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.group;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.limit;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.lookup;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.match;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.newAggregation;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.project;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.sort;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.unwind;

/**
 * Les agregations, isolees dans leur propre couche.
 *
 * Un pipeline n'est ni du CRUD ni une requete : c'est un CALCUL. Le melanger
 * aux depots de lecture brouille la lecture du code et complique le test.
 * Ici, un seul outil : MongoTemplate.
 *
 * Chaque methode est le portage direct d'un pipeline de mongosh/06-agregations.js.
 */
@Repository
public class StatistiqueRepository {

    private final MongoTemplate mongo;

    public StatistiqueRepository(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    /** $match -> $group -> $project -> $sort. Le pipeline de base. */
    public List<TonnageParNation> tonnageParNation() {
        Aggregation pipeline = newAggregation(
                // $match EN PREMIER : c'est la seule etape qui peut utiliser
                // un index, et elle reduit le flux avant les etapes couteuses.
                match(Criteria.where("statut").ne(StatutNavire.DESARME)),
                group("nation")
                        .count().as("nombreNavires")
                        .sum("deplacementTonnes").as("tonnageTotal")
                        .avg("deplacementTonnes").as("tonnageMoyen")
                        .max("deplacementTonnes").as("tonnageMax"),
                // _id porte la cle de regroupement : on le renomme.
                project("nombreNavires", "tonnageTotal", "tonnageMoyen", "tonnageMax")
                        .and("_id").as("nation"),
                sort(Sort.Direction.DESC, "tonnageTotal"));

        return mongo.aggregate(pipeline, Navire.class, TonnageParNation.class)
                .getMappedResults();
    }

    /** $unwind : une ligne par armement, puis regroupement. */
    public List<ArmementParNation> armementParNation() {
        Aggregation pipeline = newAggregation(
                match(Criteria.where("statut").ne(StatutNavire.DESARME)),
                unwind("armements"),
                // SECOND $match, apres le $unwind : il filtre les ELEMENTS
                // eclates, ce que le premier ne pouvait pas faire.
                match(Criteria.where("armements.categorie")
                        .in("MISSILE_ANTIAERIEN", "MISSILE_ANTINAVIRE",
                            "MISSILE_CROISIERE", "MISSILE_BALISTIQUE")),
                group("nation", "armements.categorie")
                        .sum("armements.quantite").as("quantiteTotale")
                        .max("armements.porteeKm").as("porteeMaximaleKm"),
                project("quantiteTotale", "porteeMaximaleKm")
                        .and("_id.nation").as("nation")
                        .and("_id.categorie").as("categorie"),
                sort(Sort.Direction.DESC, "quantiteTotale"));

        return mongo.aggregate(pipeline, Navire.class, ArmementParNation.class)
                .getMappedResults();
    }

    /** $bucket : des tranches aux bornes choisies. */
    public List<TrancheTonnage> repartitionParTonnage() {
        Aggregation pipeline = newAggregation(
                match(Criteria.where("statut").ne(StatutNavire.DESARME)),
                bucket("deplacementTonnes")
                        .withBoundaries(0, 5000, 10000, 30000, 60000, 120000)
                        .withDefaultBucket("hors bornes")
                        .andOutputCount().as("nombre")
                        .andOutput("nom").push().as("exemples"),
                project("nombre", "exemples").and("_id").as("borneInferieure"));

        return mongo.aggregate(pipeline, Navire.class, TrancheTonnage.class)
                .getMappedResults();
    }

    /**
     * AVANT les patterns : trois $lookup enchaines pour reconstituer une
     * ligne d'ecran. Conserve pour la COMPARAISON du J3.
     *
     * Un $lookup produit toujours un tableau, meme pour une relation 1-1 :
     * $arrayElemAt le remet a plat. Oublier cette etape est l'erreur numero un.
     */
    public List<NavireAvecContexte> naviresAvecContexteParLookup(String nation) {
        Aggregation pipeline = newAggregation(
                match(Criteria.where("nation").is(nation)),
                lookup("ports", "portAttache.id", "_id", "p"),
                lookup("flottes", "flotte.id", "_id", "f"),
                lookup("missions", "_id", "naviresParticipants.id", "m"),
                project("nom", "numeroCoque", "nation", "type", "statut", "deplacementTonnes")
                        .and("_id").as("id")
                        .and(ArrayOperators.ArrayElemAt.arrayOf("p.nom").elementAt(0)).as("portAttacheNom")
                        .and(ArrayOperators.ArrayElemAt.arrayOf("p.pays").elementAt(0)).as("portAttachePays")
                        .and(ArrayOperators.ArrayElemAt.arrayOf("f.nom").elementAt(0)).as("flotteNom")
                        .and(ArrayOperators.ArrayElemAt.arrayOf("f.amiralCommandant.nom").elementAt(0)).as("amiralNom")
                        .and(ArrayOperators.Size.lengthOfArray("m")).as("nombreMissions"),
                sort(Sort.Direction.ASC, "nom"));

        return mongo.aggregate(pipeline, Navire.class, NavireAvecContexte.class)
                .getMappedResults();
    }

    /**
     * APRES les patterns : le meme ecran, UN SEUL $lookup.
     *
     *   portAttache.nom  -> deja dans le document (EXTENDED REFERENCE)
     *   flotte.nom       -> deja dans le document (EXTENDED REFERENCE)
     *   nombreMissions   -> deja dans le document (COMPUTED)
     *
     * Il ne reste qu'une jointure : le nom de l'amiral. Et c'est VOLONTAIRE -
     * un amiral change de poste, on ne recopie donc pas son nom sur 45 navires.
     *
     * C'est la lecon du module : la denormalisation n'est pas un interrupteur.
     * On recopie champ par champ, en fonction de sa frequence de changement.
     */
    public List<NavireAvecContexte> naviresAvecContexte(String nation) {
        Aggregation pipeline = newAggregation(
                match(Criteria.where("nation").is(nation)),
                lookup("flottes", "flotte.id", "_id", "f"),
                project("nom", "numeroCoque", "nation", "type", "statut", "deplacementTonnes")
                        .and("_id").as("id")
                        .and("portAttache.nom").as("portAttacheNom")
                        .and("portAttache.pays").as("portAttachePays")
                        .and("flotte.nom").as("flotteNom")
                        .and(ArrayOperators.ArrayElemAt.arrayOf("f.amiralCommandant.nom").elementAt(0)).as("amiralNom")
                        .and("stats.nombreMissions").as("nombreMissions"),
                sort(Sort.Direction.ASC, "nom"));

        return mongo.aggregate(pipeline, Navire.class, NavireAvecContexte.class)
                .getMappedResults();
    }

    /**
     * POLYMORPHIC : compter par forme de document.
     *
     * _class est un champ comme un autre - on peut grouper dessus, le filtrer,
     * et l'indexer. C'est ce qui rend le polymorphisme interrogeable, la ou un
     * heritage relationnel imposerait trois requetes ou un UNION.
     */
    public List<Document> repartitionParClasse() {
        Aggregation pipeline = newAggregation(
                group("_class").count().as("nombre")
                        .sum("deplacementTonnes").as("tonnageTotal"),
                project("nombre", "tonnageTotal").and("_id").as("classe"),
                sort(Sort.Direction.DESC, "nombre"));

        return mongo.aggregate(pipeline, Navire.class, Document.class).getMappedResults();
    }

    /**
     * POLYMORPHIC : agreger sur un champ qui n'existe QUE sur une sous-classe.
     *
     * groupeAerien n'est present que sur les porte-aeronefs. Le $match sur
     * _class evite de balayer les 35 autres navires pour rien.
     */
    public List<Document> aeronefsParRole() {
        Aggregation pipeline = newAggregation(
                match(Criteria.where("_class").is("porte-aeronefs")),
                unwind("groupeAerien"),
                group("groupeAerien.role")
                        .sum("groupeAerien.quantite").as("total")
                        .addToSet("nation").as("nations"),
                project("total", "nations").and("_id").as("role"),
                sort(Sort.Direction.DESC, "total"));

        return mongo.aggregate(pipeline, Navire.class, Document.class).getMappedResults();
    }

    /**
     * $facet : plusieurs analyses sur le MEME flux d'entree, en une passe.
     *
     * Le resultat est trop heterogene pour un record : on renvoie le Document
     * brut, que StatistiqueService remet en forme. Limite a connaitre : aucune
     * branche de $facet ne peut utiliser d'index.
     */
    public Document tableauDeBordBrut() {
        AggregationOperation facette = context -> new Document("$facet", new Document()
                .append("totaux", List.of(
                        new Document("$group", new Document("_id", null)
                                .append("nombreNavires", new Document("$sum", 1))
                                .append("tonnageTotal", new Document("$sum", "$deplacementTonnes"))
                                .append("equipageTotal", new Document("$sum", "$equipageMax")))))
                .append("parType", groupeEtTrie("$type"))
                .append("parStatut", groupeEtTrie("$statut"))
                .append("parPropulsion", groupeEtTrie("$propulsion.type"))
                .append("parNation", List.of(
                        new Document("$group", new Document("_id", "$nation")
                                .append("nombreNavires", new Document("$sum", 1))
                                .append("tonnageTotal", new Document("$sum", "$deplacementTonnes"))
                                .append("tonnageMoyen", new Document("$avg", "$deplacementTonnes"))
                                .append("tonnageMax", new Document("$max", "$deplacementTonnes"))),
                        new Document("$project", new Document("_id", 0)
                                .append("nation", "$_id")
                                .append("nombreNavires", 1).append("tonnageTotal", 1)
                                .append("tonnageMoyen", 1).append("tonnageMax", 1)),
                        new Document("$sort", new Document("tonnageTotal", -1))))
                .append("lesPlusRapides", List.of(
                        new Document("$sort", new Document("vitesseMaxNoeuds", -1)),
                        new Document("$limit", 5),
                        new Document("$project", new Document("_id", 0)
                                .append("nom", 1).append("vitesseMaxNoeuds", 1)))));

        Aggregation pipeline = newAggregation(
                match(Criteria.where("statut").ne(StatutNavire.DESARME)),
                facette);

        return mongo.aggregate(pipeline, Navire.class, Document.class).getUniqueMappedResult();
    }

    private static List<Document> groupeEtTrie(String champ) {
        return List.of(
                new Document("$group", new Document("_id", champ)
                        .append("nombre", new Document("$sum", 1))),
                new Document("$sort", new Document("nombre", -1)));
    }

    /**
     * Agregation sur le VOLUME : 100 000 releves.
     *
     * Le $match initial descend dans idx_navire_temps. Sans lui, ce pipeline
     * balaierait toute la collection.
     */
    public List<Document> vitesseMoyenneParJour(String navireId, Instant debut, Instant fin) {
        Aggregation pipeline = newAggregation(
                match(Criteria.where("navireId").is(navireId)
                        .and("horodatage").gte(debut).lt(fin)),
                project("vitesseNoeuds", "carburantPourcent")
                        .and(DateOperators.DateToString.dateOf("horodatage")
                                .toString("%Y-%m-%d")).as("jour"),
                group("jour")
                        .count().as("releves")
                        .avg("vitesseNoeuds").as("vitesseMoyenne")
                        .min("carburantPourcent").as("carburantMin"),
                project("releves", "vitesseMoyenne", "carburantMin").and("_id").as("jour"),
                sort(Sort.Direction.ASC, "jour"),
                limit(31));

        return mongo.aggregate(pipeline, JournalBord.class, Document.class).getMappedResults();
    }
}
