package fr.formation.amiraute.domain.embedded;

/**
 * COMPUTED PATTERN : agregats maintenus a l'ECRITURE, lus sans calcul.
 *
 * nombreMissions serait un $lookup + $size a chaque affichage.
 * effectifActuel serait un countDocuments sur membresEquipage.
 * dernierReleve serait un tri sur 100 000 documents.
 *
 * Le prix a payer : ces champs doivent etre remis a jour quand la donnee
 * source change. C'est le compromis assume de tout pattern denormalisant -
 * on deplace le cout de la lecture vers l'ecriture, parce qu'on lit
 * beaucoup plus souvent qu'on n'ecrit.
 */
public record NavireStats(
        Integer nombreMissions,
        Integer effectifActuel,
        DernierReleve dernierReleve) {

    public static NavireStats vide() {
        return new NavireStats(0, 0, null);
    }
}
