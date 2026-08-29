package fr.formation.amiraute.repository.impl;

import fr.formation.amiraute.repository.NavireRepositoryCustom;
import fr.formation.amiraute.domain.Navire;
import fr.formation.amiraute.domain.enumeration.StatutNavire;
import fr.formation.amiraute.web.dto.NavireSearchCriteria;
import fr.formation.amiraute.web.dto.NavireProche;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * MongoTemplate : tout ce qui se construit DYNAMIQUEMENT.
 *
 * Le suffixe "Impl" n'est pas decoratif : c'est ainsi que Spring Data trouve
 * cette classe et l'assemble avec l'implementation generee de NavireRepository,
 * derriere un seul et meme proxy. Renommer la classe casse le mecanisme
 * silencieusement.
 */
public class NavireRepositoryCustomImpl implements NavireRepositoryCustom {

    private final MongoTemplate mongo;

    public NavireRepositoryCustomImpl(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    /**
     * LA methode qui justifie MongoTemplate.
     *
     * Treize criteres facultatifs et combinables. En requetes derivees il
     * faudrait une methode par combinaison ; ici, on empile des Criteria.
     */
    @Override
    public Page<Navire> searchAdvanced(NavireSearchCriteria c, Pageable pageable) {
        List<Criteria> conditions = new ArrayList<>();

        if (StringUtils.hasText(c.nation())) {
            conditions.add(Criteria.where("nation").is(c.nation()));
        }
        if (c.types() != null && !c.types().isEmpty()) {
            conditions.add(Criteria.where("type").in(c.types()));
        }
        if (c.statut() != null) {
            conditions.add(Criteria.where("statut").is(c.statut()));
        }
        if (c.propulsion() != null) {
            // Notation pointee : on descend dans le sous-document.
            conditions.add(Criteria.where("propulsion.type").is(c.propulsion()));
        }
        if (c.tonnageMin() != null || c.tonnageMax() != null) {
            // Les deux bornes doivent aller sur le MEME Criteria, sinon la
            // seconde ecrase la premiere dans le document BSON produit.
            Criteria tonnage = Criteria.where("deplacementTonnes");
            if (c.tonnageMin() != null) { tonnage = tonnage.gte(c.tonnageMin()); }
            if (c.tonnageMax() != null) { tonnage = tonnage.lte(c.tonnageMax()); }
            conditions.add(tonnage);
        }
        if (c.anneeMin() != null || c.anneeMax() != null) {
            Criteria annee = Criteria.where("anneeMiseEnService");
            if (c.anneeMin() != null) { annee = annee.gte(c.anneeMin()); }
            if (c.anneeMax() != null) { annee = annee.lte(c.anneeMax()); }
            conditions.add(annee);
        }
        if (StringUtils.hasText(c.nomContient())) {
            // Regex NON ancree : elle ne peut pas utiliser d'index. Acceptable
            // sur 45 navires, a proscrire sur une collection volumineuse.
            conditions.add(Criteria.where("nom").regex(c.nomContient(), "i"));
        }
        if (StringUtils.hasText(c.etiquette())) {
            conditions.add(Criteria.where("etiquettes").is(c.etiquette()));
        }
        if (c.hasGeoFilter()) {
            // withinSphere ($geoWithin) et NON near ($near) : $near impose son
            // propre tri par distance et se combine mal avec skip/limit.
            // $geoWithin se comporte comme un filtre ordinaire, donc il se
            // pagine et se trie normalement.
            conditions.add(Criteria.where("positionActuelle").withinSphere(
                    new org.springframework.data.geo.Circle(
                            new Point(c.longitude(), c.latitude()),
                            new Distance(c.rayonKm(), Metrics.KILOMETERS))));
        }

        Query requete = new Query();
        if (!conditions.isEmpty()) {
            requete.addCriteria(new Criteria().andOperator(conditions.toArray(new Criteria[0])));
        }

        // Compter AVANT d'appliquer la pagination, sur une copie de la requete :
        // with(pageable) modifie l'objet Query en place.
        long total = mongo.count(Query.of(requete), Navire.class);
        List<Navire> resultats = mongo.find(requete.with(pageable), Navire.class);

        return new PageImpl<>(resultats, pageable, total);
    }

    /**
     * $geoNear : la seule facon d'obtenir la DISTANCE calculee en retour.
     * $near la trie mais ne la renvoie pas.
     */
    @Override
    public List<NavireProche> findNearby(double longitude, double latitude, double rayonKm) {
        Aggregation pipeline = Aggregation.newAggregation(
                Aggregation.geoNear(
                        org.springframework.data.mongodb.core.query.NearQuery
                                .near(new Point(longitude, latitude))
                                .spherical(true)
                                .maxDistance(new Distance(rayonKm, Metrics.KILOMETERS)),
                        "distanceMetres"),
                Aggregation.project("nom", "nation")
                        .and("distanceMetres").divide(1000).as("distanceKm")
                        .and("_id").as("id"));

        AggregationResults<NavireProche> resultats =
                mongo.aggregate(pipeline, Navire.class, NavireProche.class);
        return resultats.getMappedResults();
    }

    /**
     * updateMulti : modifie N documents cote serveur, sans en charger un seul
     * en memoire. L'equivalent avec un repository serait findAll puis saveAll,
     * soit N+1 allers-retours et tout le jeu de donnees en RAM.
     */
    @Override
    public long updateStatutByNation(String nation, String ancienStatut, String nouveauStatut) {
        Query requete = new Query(Criteria.where("nation").is(nation)
                .and("statut").is(StatutNavire.valueOf(ancienStatut)));

        Update maj = new Update()
                .set("statut", StatutNavire.valueOf(nouveauStatut))
                .currentDate("dateModification");

        return mongo.updateMulti(requete, maj, Navire.class).getModifiedCount();
    }

    /** $addToSet : ajoute sans creer de doublon. Rejouable sans effet de bord. */
    @Override
    public long addEtiquette(List<String> navireIds, String etiquette) {
        Query requete = new Query(Criteria.where("_id").in(navireIds));
        Update maj = new Update().addToSet("etiquettes", etiquette);
        return mongo.updateMulti(requete, maj, Navire.class).getModifiedCount();
    }
}
