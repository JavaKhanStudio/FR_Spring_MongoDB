# CORRIGÉ E11 — Le repository multicritère

Les cinq fichiers, dans l'ordre où les créer.

---

## 1. `web/dto/CritereMission.java`

```java
package fr.formation.amiraute.web.dto;

import fr.formation.amiraute.domain.enumeration.StatutMission;
import fr.formation.amiraute.domain.enumeration.TypeMission;

import java.time.Instant;

/** Tous les criteres sont facultatifs et combinables. */
public record CritereMission(
        TypeMission type,
        StatutMission statut,
        Instant dateDebutMin,
        Instant dateDebutMax,
        Long coutMin,
        Long coutMax,
        String navireId,
        String objectifContient,
        String zoneNom) {
}
```

---

## 2. `depot/MissionRepositoryPersonnalise.java`

```java
package fr.formation.amiraute.repository;

import fr.formation.amiraute.domain.Mission;
import fr.formation.amiraute.domain.enumeration.StatutMission;
import fr.formation.amiraute.web.dto.CritereMission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Map;

public interface MissionRepositoryPersonnalise {

    Page<Mission> searchAdvanced(CritereMission criteres, Pageable pageable);

    Map<StatutMission, Long> coutTotalParStatut();
}
```

---

## 3. `repository/impl/MissionRepositoryPersonnaliseImpl.java`

```java
package fr.formation.amiraute.repository.impl;

import fr.formation.amiraute.repository.MissionRepositoryPersonnalise;
import fr.formation.amiraute.domain.Mission;
import fr.formation.amiraute.domain.enumeration.StatutMission;
import fr.formation.amiraute.web.dto.CritereMission;
import org.bson.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Le suffixe Impl n'est PAS decoratif : c'est ainsi que Spring Data trouve
 * cette classe et l'assemble avec l'implementation generee de MissionRepository,
 * derriere un seul proxy. Renommer casse le mecanisme silencieusement.
 */
public class MissionRepositoryPersonnaliseImpl implements MissionRepositoryPersonnalise {

    private final MongoTemplate mongo;

    public MissionRepositoryPersonnaliseImpl(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    @Override
    public Page<Mission> searchAdvanced(CritereMission c, Pageable pageable) {
        List<Criteria> conditions = new ArrayList<>();

        if (c.type() != null) {
            conditions.add(Criteria.where("type").is(c.type()));
        }
        if (c.statut() != null) {
            conditions.add(Criteria.where("statut").is(c.statut()));
        }

        // PIEGE : les deux bornes vont sur le MEME Criteria. Deux
        // Criteria.where("dateDebut") separes produiraient un BSON ou le
        // second ecrase le premier - sans aucune erreur.
        if (c.dateDebutMin() != null || c.dateDebutMax() != null) {
            Criteria date = Criteria.where("dateDebut");
            if (c.dateDebutMin() != null) { date = date.gte(c.dateDebutMin()); }
            if (c.dateDebutMax() != null) { date = date.lte(c.dateDebutMax()); }
            conditions.add(date);
        }
        if (c.coutMin() != null || c.coutMax() != null) {
            Criteria cout = Criteria.where("coutEstimeEuros");
            if (c.coutMin() != null) { cout = cout.gte(c.coutMin()); }
            if (c.coutMax() != null) { cout = cout.lte(c.coutMax()); }
            conditions.add(cout);
        }

        // Sur un TABLEAU, l'egalite signifie "contient au moins cet element".
        // Aucun operateur special n'est necessaire, et l'index multicle
        // idx_mission_participants sert directement cette requete.
        if (StringUtils.hasText(c.navireId())) {
            conditions.add(Criteria.where("naviresParticipants.id").is(c.navireId()));
        }
        if (StringUtils.hasText(c.objectifContient())) {
            conditions.add(Criteria.where("objectifs").regex(c.objectifContient(), "i"));
        }
        if (StringUtils.hasText(c.zoneNom())) {
            conditions.add(Criteria.where("zoneOperation.nom").regex(c.zoneNom(), "i"));
        }

        Query requete = new Query();
        if (!conditions.isEmpty()) {
            requete.addCriteria(new Criteria().andOperator(conditions.toArray(new Criteria[0])));
        }

        // PIEGE : with(pageable) modifie la Query EN PLACE. On compte donc sur
        // une copie, avant d'appliquer la pagination.
        long total = mongo.count(Query.of(requete), Mission.class);
        List<Mission> resultats = mongo.find(requete.with(pageable), Mission.class);

        return new PageImpl<>(resultats, pageable, total);
    }

    @Override
    public Map<StatutMission, Long> coutTotalParStatut() {
        Aggregation pipeline = Aggregation.newAggregation(
                Aggregation.group("statut").sum("coutEstimeEuros").as("cout"));

        Map<StatutMission, Long> resultat = new EnumMap<>(StatutMission.class);
        for (Document d : mongo.aggregate(pipeline, Mission.class, Document.class)) {
            Object cle = d.get("_id");
            if (cle != null) {
                resultat.put(StatutMission.valueOf(cle.toString()),
                        ((Number) d.get("cout")).longValue());
            }
        }
        return resultat;
    }
}
```

---

## 4. `depot/MissionRepository.java` — une seule ligne à changer

```java
public interface MissionRepository extends MongoRepository<Mission, String>,
                                      MissionRepositoryPersonnalise {
```

**Rien d'autre.** Pas de `@Bean`, pas de configuration. Spring Data assemble
seul, à condition que la classe s'appelle `MissionRepositoryPersonnaliseImpl` et
qu'elle soit dans un paquet scanné.

---

## 5. `web/MissionController.java` — l'endpoint

```java
@GetMapping("/recherche")
public PageResponse<Mission> search(
        @RequestParam(required = false) TypeMission type,
        @RequestParam(required = false) StatutMission statut,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateDebutMin,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateDebutMax,
        @RequestParam(required = false) Long coutMin,
        @RequestParam(required = false) Long coutMax,
        @RequestParam(required = false) String navireId,
        @RequestParam(required = false) String objectifContient,
        @RequestParam(required = false) String zoneNom,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int taille) {

    CritereMission criteres = new CritereMission(type, statut, dateDebutMin,
            dateDebutMax, coutMin, coutMax, navireId, objectifContient, zoneNom);

    return PageResponse.de(service.search(criteres,
            PageRequest.of(page, taille, Sort.by(Sort.Direction.DESC, "dateDebut"))));
}
```

---

## 6. Où placer `coutTotalParStatut` ?

**Réponse attendue : dans `StatistiqueRepository`**, pas dans le repository personnalisé.

Le critère de découpage du projet est énoncé dans `CONCEPTION.md` §6.1 :

- `MissionRepositoryPersonnalise` sert les **requêtes** dynamiques — elles rendent
  des `Mission`.
- `StatistiqueRepository` sert les **calculs** — ils rendent des agrégats, pas des
  entités.

`coutTotalParStatut` ne rend aucune `Mission` : c'est un calcul. Le mettre dans
le repository personnalisé mélangerait deux responsabilités et compliquerait le test.

L'implémentation ci-dessus est fournie **à titre de comparaison** ; en cohérence
avec le projet, on la déplacerait.

---

## 7. Le test

```java
@DataMongoTest
@DisplayName("MissionRepositoryPersonnalise - Criteria dynamiques")
class MissionRepositoryPersonnaliseTest extends MongoTestBase {

    @Autowired private MissionRepository depot;
    @Autowired private NavireRepository navireRepository;
    @Autowired private MongoTemplate mongo;

    private String cdgId;

    private static final PageRequest PAGE = PageRequest.of(0, 20, Sort.by("nomCode"));

    private static CritereMission vide() {
        return new CritereMission(null, null, null, null, null, null, null, null, null);
    }

    @BeforeEach
    void preparer() {
        mongo.getCollection("missions").drop();
        mongo.getCollection("navires").drop();
        navireRepository.saveAll(TestData.navires());

        cdgId = navireRepository.findByNationAndNumeroCoque("France", "R91").orElseThrow().getId();
        String forbinId = navireRepository.findByNationAndNumeroCoque("France", "D620")
                .orElseThrow().getId();

        depot.save(TestData.mission("CLEMENCEAU 26", List.of(cdgId, forbinId)));
        depot.save(TestData.mission("AKILA 26", List.of(cdgId)));
        depot.save(TestData.mission("VIGIE ATLANTIQUE", List.of(forbinId)));
    }

    @Test
    void sansCritere() {
        assertThat(depot.searchAdvanced(vide(), PAGE).getTotalElements()).isEqualTo(3);
    }

    @Test
    void parStatut() {
        CritereMission c = new CritereMission(null, StatutMission.EN_COURS,
                null, null, null, null, null, null, null);
        assertThat(depot.searchAdvanced(c, PAGE).getTotalElements()).isEqualTo(3);
    }

    @Test
    void encadrementDeDates() {
        CritereMission c = new CritereMission(null, null,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-02-01T00:00:00Z"),
                null, null, null, null, null);
        assertThat(depot.searchAdvanced(c, PAGE).getTotalElements()).isEqualTo(3);
    }

    @Test
    @DisplayName("le filtre navireId interroge le TABLEAU de references")
    void parNavire() {
        CritereMission c = new CritereMission(null, null, null, null, null, null,
                cdgId, null, null);

        assertThat(depot.searchAdvanced(c, PAGE).getContent())
                .extracting(Mission::getNomCode)
                .containsExactly("AKILA 26", "CLEMENCEAU 26");
    }

    @Test
    @DisplayName("le total est calcule AVANT la pagination")
    void totalIndependantDeLaPage() {
        var page = depot.searchAdvanced(vide(), PageRequest.of(0, 2, Sort.by("nomCode")));
        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getTotalElements()).isEqualTo(3);
    }
}
```

---

## Pourquoi une simple égalité suffit sur `naviresParticipants.id`

Sur un champ **tableau**, MongoDB fait correspondre la condition à **chaque
élément**. `{ naviresParticipants.id: "abc" }` signifie donc « le tableau
contient `abc` », pas « le tableau est égal à `abc` ».

C'est aussi ce qui rend l'index `idx_mission_participants` **multiclé** : il
contient une entrée par élément de tableau, et sert cette requête directement.

Le piège inverse existe : pour tester l'égalité du tableau **entier**, il faut
passer le tableau complet, dans le bon ordre.

---

## Pour aller plus loin — `Window` et `ScrollPosition`

```java
Window<Mission> fenetre = mongo.query(Mission.class)
        .matching(requete)
        .scroll(ScrollPosition.keyset());
```

**Ce qu'on gagne** : plus de `count`, et surtout plus de `skip`. Sur la
page 5 000, `skip(100000)` oblige MongoDB à parcourir et jeter
100 000 documents ; la pagination par clé (*keyset*) part directement du
dernier élément vu.

**Ce qu'on perd** : le **nombre total de pages** et l'accès direct à une page
arbitraire. On ne peut qu'avancer.

**Quand c'est acceptable** : un défilement infini, un export, un traitement par
lots, une API de synchronisation. Bref, partout où personne ne clique sur
« page 47 ».

**Quand ça ne l'est pas** : un tableau administratif avec une pagination
numérotée — l'utilisateur *veut* savoir qu'il y a 312 résultats.
