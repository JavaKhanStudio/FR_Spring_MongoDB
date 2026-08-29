package fr.formation.amiraute.web.dto;

import fr.formation.amiraute.domain.enumeration.StatutNavire;
import fr.formation.amiraute.domain.enumeration.TypeNavire;

/**
 * PROJECTION PAR DTO (un record), et non par interface.
 *
 * POURQUOI PAS UNE INTERFACE, sur une hierarchie polymorphe
 * ---------------------------------------------------------
 * Une projection par interface fait d'abord materialiser le DOCUMENT dans le
 * type declare du repository - ici Navire - avant de poser le proxy. Or la
 * projection ne remonte que les champs declares : _class n'en fait pas
 * partie. Spring ne sait donc plus quelle sous-classe instancier, retombe sur
 * Navire, qui est ABSTRAITE, et echoue :
 *
 *     MappingInstantiationException: Failed to instantiate Navire
 *     Caused by: BeanInstantiationException: Class is abstract
 *
 * Un DTO, lui, est instancie DIRECTEMENT par son constructeur : l'entite n'est
 * jamais construite, le discriminant n'est jamais requis.
 *
 * Regle : sur une collection polymorphe, projeter vers un DTO, pas vers une
 * interface. C'est un piege qui ne se voit qu'a l'execution.
 */
public record NavireSummary(
        String nom,
        String numeroCoque,
        TypeNavire type,
        StatutNavire statut,
        Integer deplacementTonnes) {
}
