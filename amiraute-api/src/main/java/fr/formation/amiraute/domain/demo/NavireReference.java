package fr.formation.amiraute.domain.demo;

import fr.formation.amiraute.domain.embedded.PortRef;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * LES QUATRE FACONS DE LIER DEUX DOCUMENTS EN SPRING DATA MONGODB.
 *
 * Cette classe vise la MEME collection "navires" que Navire : deux entites
 * peuvent viser une meme collection, chacune ne lisant que ce qu'elle declare.
 * Elle ne sert qu'a la demonstration du J3.
 *
 * ==========================================================================
 * 1. EXTENDED REFERENCE - le choix du projet
 *
 *     private PortRef portAttache;   // { id, nom, pays }
 *
 *     + UNE lecture. Le nom du port est deja la.
 *     + Requetable : on filtre, on groupe, on indexe sur portAttache.id
 *       comme sur portAttache.pays.
 *     + Le format stocke reste du JSON ordinaire, lisible par n'importe quel
 *       client, migrable vers autre chose.
 *     - Il faut propager les copies quand la source change. On ne recopie
 *       donc QUE les champs qui ne bougent pas.
 *
 * ==========================================================================
 * 2. REFERENCE MANUELLE NUE - ce qu'on faisait avant
 *
 *     private String portAttacheId;  // "TOULON"
 *
 *     + Rien a propager.
 *     - Deux allers-retours, ou un $lookup, sur l'ecran le plus consulte.
 *     C'est la forme dont ce projet est PARTI, et qu'il a quittee : elle
 *     reproduisait une clef etrangere relationnelle.
 *
 * ==========================================================================
 * 3. @DocumentReference - le confort de mapping
 *
 *     @DocumentReference(lazy = true) private Port portAttache;
 *
 *     Stocke l'identifiant seul, resout au premier getter.
 *     - Le chargement reste INVISIBLE dans le code appelant : c'est un N+1
 *       qui ne se voit qu'en activant le log DEBUG de MongoTemplate.
 *     - Incompatible avec notre format : nos documents stockent un OBJET
 *       { id, nom, pays }, pas un identifiant nu.
 *
 * ==========================================================================
 * 4. @DBRef - l'historique, a reconnaitre et a ne plus ecrire
 *
 *     @DBRef private Port portAttache;
 *
 *     Impose SON format en base :
 *         { "portAttache": { "$ref": "ports", "$id": "TOULON" } }
 *
 *     Chargement eager par defaut, une requete par document parcouru, et une
 *     reference que le serveur ne sait pas exploiter dans un $lookup.
 *
 * ==========================================================================
 * LA LECON, ET ELLE VAUT POUR LES QUATRE
 *
 * Le choix de mapping DECIDE DU FORMAT STOCKE. Ce n'est pas un detail
 * d'implementation qu'on change plus tard : c'est un engagement sur la forme
 * des documents, donc sur ce que tous les autres clients pourront lire.
 *
 * @DBRef est le pire de ce point de vue - il inscrit une convention Java
 * dans la base. L'extended reference est le meilleur : le document reste du
 * JSON que n'importe qui comprend.
 */
@Document("navires")
public class NavireReference {

    @Id
    private String id;

    private String nom;

    private String numeroCoque;

    private String nation;

    /** Approche 1 : l'extended reference, telle qu'elle est reellement stockee. */
    private PortRef portAttache;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getNumeroCoque() { return numeroCoque; }
    public void setNumeroCoque(String numeroCoque) { this.numeroCoque = numeroCoque; }

    public String getNation() { return nation; }
    public void setNation(String nation) { this.nation = nation; }

    public PortRef getPortAttache() { return portAttache; }
    public void setPortAttache(PortRef portAttache) { this.portAttache = portAttache; }
}
