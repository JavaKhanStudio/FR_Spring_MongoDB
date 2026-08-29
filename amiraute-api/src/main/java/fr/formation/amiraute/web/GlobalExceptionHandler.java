package fr.formation.amiraute.web;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * Traduit les exceptions techniques en reponses HTTP lisibles.
 *
 * Les deux cas interessants pour la formation sont DuplicateKeyException
 * (l'index unique a fait son travail) et OptimisticLockingFailureException
 * (@Version a evite un ecrasement).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NoSuchElementException.class)
    public ProblemDetail introuvable(NoSuchElementException e) {
        return probleme(HttpStatus.NOT_FOUND, "Ressource introuvable", e.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail requeteInvalide(IllegalArgumentException e) {
        return probleme(HttpStatus.BAD_REQUEST, "Requete invalide", e.getMessage());
    }

    /**
     * Levee par l'index unique (nation, numeroCoque). C'est le SERVEUR qui a
     * refuse, pas l'application : la contrainte tient meme si deux instances
     * de l'API ecrivent en meme temps.
     */
    @ExceptionHandler(DuplicateKeyException.class)
    public ProblemDetail doublon(DuplicateKeyException e) {
        return probleme(HttpStatus.CONFLICT, "Doublon refuse par un index unique",
                "Un document portant la meme cle unique existe deja.");
    }

    /**
     * Levee par @Version : le document a ete modifie entre la lecture et
     * l'ecriture. Le client doit relire puis rejouer sa modification.
     */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ProblemDetail conflitDeVersion(OptimisticLockingFailureException e) {
        return probleme(HttpStatus.CONFLICT, "Conflit de version",
                "Le document a ete modifie entre-temps. Relire puis rejouer la modification.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validation(MethodArgumentNotValidException e) {
        String detail = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " : " + f.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return probleme(HttpStatus.BAD_REQUEST, "Validation echouee", detail);
    }

    private static ProblemDetail probleme(HttpStatus statut, String titre, String detail) {
        ProblemDetail pd = ProblemDetail.forStatus(statut);
        pd.setTitle(titre);
        pd.setDetail(detail);
        return pd;
    }
}
