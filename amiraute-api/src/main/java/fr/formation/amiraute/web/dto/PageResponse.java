package fr.formation.amiraute.web.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Enveloppe de pagination stable.
 *
 * Serialiser directement un Page<T> de Spring Data expose une structure JSON
 * qui a change entre versions, et Boot le signale d'ailleurs par un
 * avertissement. On expose donc notre propre contrat.
 */
public record PageResponse<T>(
        List<T> contenu,
        int page,
        int taille,
        long total,
        int nombreDePages) {

    public static <T> PageResponse<T> de(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
