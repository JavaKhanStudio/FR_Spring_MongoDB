package fr.formation.amiraute.service;

import com.mongodb.ExplainVerbosity;
import com.mongodb.client.model.Sorts;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Le module Performance et diagnostic (J3 apres-midi), pilotable depuis REST.
 *
 * Tout passe par le pilote MongoDB natif : Spring Data n'expose pas explain(),
 * et c'est normal - c'est un outil d'analyse, pas de production.
 */
@Service
public class DiagnosticService {

    private static final Logger log = LoggerFactory.getLogger(DiagnosticService.class);

    private final MongoTemplate mongo;

    public DiagnosticService(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    /**
     * explain() sur une requete quelconque.
     *
     * La sortie brute fait des centaines de lignes : on n'en extrait que les
     * cinq chiffres qui servent a decider.
     */
    public Map<String, Object> expliquer(String collection, Document filtre, Document tri) {
        return expliquer(collection, filtre, tri, 0);
    }

    /**
     * Le "limite" n'est pas cosmetique : sans lui, l'explain porte sur une
     * requete DIFFERENTE de celle qu'execute l'application, et le ratio
     * docs lus / rendus devient inexploitable (100 000 / 100 000 = 1).
     */
    public Map<String, Object> expliquer(String collection, Document filtre, Document tri, int limite) {
        var curseur = mongo.getCollection(collection).find(filtre);
        if (tri != null && !tri.isEmpty()) {
            curseur = curseur.sort(tri);
        }
        if (limite > 0) {
            curseur = curseur.limit(limite);
        }
        return resumer(curseur.explain(ExplainVerbosity.EXECUTION_STATS));
    }

    /**
     * LA demonstration du module : la meme requete, avec et sans index.
     *
     * Le tri porte sur carburantPourcent, volontairement NON indexe. L'etape
     * SORT apparait dans le plan, MongoDB trie 100 000 documents en memoire.
     * Creer l'index fait disparaitre l'etape.
     */
    public Map<String, Object> comparerAvecEtSansIndex() {
        Map<String, Object> resultat = new LinkedHashMap<>();

        Document tri = new Document("carburantPourcent", 1);
        resultat.put("triNonIndexe", expliquer("journauxBord", new Document(), tri));

        // L'identifiant est un ObjectId en base. Le passer en String ne
        // remonterait RIEN - c'est exactement le piege que corrige
        // @Field(targetType = OBJECT_ID) sur JournalBord.navireId.
        Object navireId = mongo.getCollection("navires").find().first().get("_id");
        resultat.put("filtreIndexe",
                expliquer("journauxBord", new Document("navireId", navireId), null));

        resultat.put("lecture",
                "Comparer 'docsExamines'. Le tri non indexe lit toute la collection "
                + "et ajoute une etape SORT ; le filtre indexe ne lit que ce qu'il rend.");
        return resultat;
    }

    /** Extrait d'un explain les chiffres qui comptent. */
    private Map<String, Object> resumer(Document brut) {
        Map<String, Object> resume = new LinkedHashMap<>();
        Document stats = brut.get("executionStats", Document.class);
        if (stats == null) {
            resume.put("erreur", "pas d'executionStats dans la sortie");
            return resume;
        }

        int rendus = stats.getInteger("nReturned", 0);
        int docsLus = stats.getInteger("totalDocsExamined", 0);

        resume.put("rendus", rendus);
        resume.put("clesExaminees", stats.getInteger("totalKeysExamined", 0));
        resume.put("docsExamines", docsLus);
        resume.put("dureeMs", stats.getInteger("executionTimeMillis", 0));
        resume.put("etapes", etapes(stats.get("executionStages", Document.class)));
        // LE ratio a regarder : proche de 1, l'index fait le travail.
        resume.put("ratioLusParRendu", rendus == 0 ? null : (double) docsLus / rendus);
        return resume;
    }

    /** Deroule la chaine inputStage : COLLSCAN, IXSCAN, FETCH, SORT... */
    private List<String> etapes(Document etage) {
        List<String> noms = new ArrayList<>();
        Document courant = etage;
        while (courant != null) {
            noms.add(courant.getString("stage"));
            courant = courant.get("inputStage", Document.class);
        }
        return noms;
    }

    /** $indexStats : quels index servent reellement. */
    public List<Document> statistiquesIndex(String collection) {
        List<Document> resultat = new ArrayList<>();
        mongo.getCollection(collection)
                .aggregate(List.of(new Document("$indexStats", new Document())))
                .forEach(d -> resultat.add(new Document("nom", d.getString("name"))
                        .append("cle", d.get("key"))
                        .append("utilisations", d.get("accesses", Document.class).get("ops"))
                        .append("depuis", d.get("accesses", Document.class).get("since"))));
        return resultat;
    }

    /** $collStats : taille des donnees, taille des index, nombre d'index. */
    public Map<String, Object> statistiquesCollection(String collection) {
        Document brut = mongo.getCollection(collection)
                .aggregate(List.of(new Document("$collStats",
                        new Document("storageStats", new Document()))))
                .first();

        Map<String, Object> resume = new LinkedHashMap<>();
        if (brut == null) {
            resume.put("erreur", "collection introuvable : " + collection);
            return resume;
        }
        Document s = brut.get("storageStats", Document.class);
        resume.put("documents", s.get("count"));
        resume.put("tailleDonneesKo", octetsEnKo(s.get("size")));
        resume.put("tailleIndexKo", octetsEnKo(s.get("totalIndexSize")));
        resume.put("nombreIndex", s.get("nindexes"));
        resume.put("tailleParIndexKo", parIndex(s.get("indexSizes", Document.class)));
        return resume;
    }

    private Map<String, Long> parIndex(Document tailles) {
        Map<String, Long> resultat = new LinkedHashMap<>();
        if (tailles != null) {
            tailles.forEach((nom, taille) -> resultat.put(nom, octetsEnKo(taille)));
        }
        return resultat;
    }

    private static long octetsEnKo(Object octets) {
        return octets instanceof Number n ? Math.round(n.doubleValue() / 1024) : 0;
    }

    /**
     * Active le profileur. Niveau 0 eteint, 1 les requetes lentes, 2 TOUTES.
     * Le niveau 2 ne se justifie que quelques secondes, en recette.
     *
     * LE SEUIL N'EST PAS REGLABLE ICI, et c'est voulu. slowms est un parametre
     * SERVEUR, global a l'instance : le changer depuis une connexion
     * applicative exige des droits de niveau cluster. Verifie sur ce projet :
     *
     *   { profile: 1 }              -> autorise avec l'action enableProfiler
     *   { profile: 1, slowms: 20 }  -> Unauthorized (code 13)
     *
     * Le seuil est donc fixe au demarrage de mongod (--slowms=20 dans le
     * Compose). C'est la bonne separation : le NIVEAU est une decision
     * d'exploitation ponctuelle, le SEUIL est une decision d'infrastructure.
     */
    public Document reglerProfileur(int niveau) {
        log.warn("Profileur MongoDB : niveau={} (seuil fixe cote serveur)", niveau);
        return mongo.getDb().runCommand(new Document("profile", niveau));
    }

    /** Le seuil courant, lu sans le modifier. */
    public Document etatProfileur() {
        return mongo.getDb().runCommand(new Document("profile", -1));
    }

    /** Les requetes retenues par le profileur, les plus recentes d'abord. */
    public List<Document> requetesLentes(int limite) {
        List<Document> resultat = new ArrayList<>();
        mongo.getCollection("system.profile")
                .find()
                .sort(Sorts.descending("ts"))
                .limit(limite)
                .forEach(d -> resultat.add(new Document("dureeMs", d.get("millis"))
                        .append("operation", d.get("op"))
                        .append("collection", d.get("ns"))
                        .append("docsExamines", d.get("docsExamined"))
                        .append("rendus", d.get("nreturned"))
                        .append("plan", d.get("planSummary"))
                        .append("horodatage", d.get("ts"))));
        return resultat;
    }

    /**
     * La requete lente PLANTEE VOLONTAIREMENT dans le projet.
     *
     * Elle trie 100 000 documents sur un champ non indexe. L'exercice consiste
     * a la retrouver PAR LES OUTILS - profileur ou logs - et non en lisant ce
     * commentaire.
     */
    public Map<String, Object> requeteLenteVolontaire() {
        long debut = System.currentTimeMillis();
        List<Document> echantillon = new ArrayList<>();
        mongo.getCollection("journauxBord")
                .find()
                .sort(Sorts.ascending("carburantPourcent"))
                .limit(20)
                .forEach(echantillon::add);

        Map<String, Object> resultat = new LinkedHashMap<>();
        resultat.put("dureeMs", System.currentTimeMillis() - debut);
        resultat.put("rendus", echantillon.size());
        resultat.put("explain", expliquer("journauxBord", new Document(),
                new Document("carburantPourcent", 1), 20));
        return resultat;
    }
}
