package fr.formation.amiraute.domain.embedded;

import org.springframework.data.mongodb.core.mapping.Field;

/** EXTENDED REFERENCE vers une flotte. Meme raisonnement que PortRef. */

/*
 * PIEGE : Spring Data mappe TOUTE propriete nommee "id" vers la clef "_id",
 * y compris dans un sous-document. Sans @Field("id"), ce record serait ecrit
 *     { "_id": "TOULON", "nom": "Toulon" }
 * alors que les scripts mongosh du cours ecrivent
 *     { "id":  "TOULON", "nom": "Toulon" }
 *
 * Les deux formats coexisteraient alors dans la meme collection, et tout
 * $lookup sur "portAttache.id" ne verrait que la moitie des documents. La
 * divergence est SILENCIEUSE : aucune erreur, juste des jointures vides.
 *
 * Ici "id" n'est pas l'identifiant du document mais un champ ordinaire qui
 * PORTE une reference. On force donc la clef stockee.
 */
public record FlotteRef(@Field("id") String id, String nom, String nation) {
}
