package fr.formation.amiraute.domain.embedded;

import fr.formation.amiraute.domain.enumeration.TypeNavire;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

/**
 * EXTENDED REFERENCE vers un navire, portee par Mission.naviresParticipants.
 *
 * L'ecran "mission et ses participants" affichait auparavant un tableau
 * d'ObjectId illisibles, qu'il fallait resoudre par un $lookup. Il se rend
 * desormais en une seule lecture.
 *
 * L'index multicle porte sur naviresParticipants.id : la question inverse -
 * "dans quelles missions ce navire ?" - reste aussi rapide qu'avant.
 */
public record NavireRef(
        // Voir PortRef : sans @Field, Spring ecrirait "_id".
        // targetType : la base stocke un ObjectId, le modele expose un String.
        // Sans lui, toute requete sur naviresParticipants.id rend zero resultat.
        @Field(value = "id", targetType = FieldType.OBJECT_ID) String id, String nom, String numeroCoque, TypeNavire type) {
}
