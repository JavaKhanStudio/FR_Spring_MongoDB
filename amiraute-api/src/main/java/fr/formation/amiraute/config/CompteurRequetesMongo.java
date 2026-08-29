package fr.formation.amiraute.config;

import com.mongodb.event.CommandFailedEvent;
import com.mongodb.event.CommandListener;
import com.mongodb.event.CommandStartedEvent;
import com.mongodb.event.CommandSucceededEvent;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Compte les requetes MongoDB declenchees par UN appel HTTP.
 *
 * POURQUOI CETTE CLASSE EXISTE
 * ----------------------------
 * Le N+1 et l'extended reference sont des concepts abstraits tant qu'on ne
 * les voit pas. Le log DEBUG de MongoTemplate les montre, mais il faut savoir
 * lire des logs et compter des lignes pendant qu'on parle.
 *
 * Ici, chaque page affiche en pied de page :
 *
 *     3 requetes Mongo - 12 ms
 *
 * La demonstration devient immediate : la meme liste rend 1 requete avec une
 * reference enrichie, et 11 avec une resolution N+1.
 *
 * LIMITE ASSUMEE : le compteur est un ThreadLocal. Le pilote synchrone
 * execute ses ecouteurs sur le thread appelant, donc cela fonctionne pour ce
 * projet. Avec le pilote reactif, il faudrait le Reactor Context.
 */
public class CompteurRequetesMongo implements CommandListener {

    /** Les commandes qui interessent la demonstration. */
    private static final Set<String> COMMANDES = Set.of(
            "find", "aggregate", "count", "distinct", "getMore",
            "insert", "update", "delete", "findAndModify");

    private static final ThreadLocal<Releve> COURANT = new ThreadLocal<>();

    /** Ce qu'on a mesure pendant un appel HTTP. */
    public record Releve(List<String> commandes, long[] dureeMicros) {

        public Releve() {
            this(new ArrayList<>(), new long[1]);
        }

        public int nombre() {
            return commandes.size();
        }

        public long dureeMs() {
            return TimeUnit.MICROSECONDS.toMillis(dureeMicros[0]);
        }

        public String resume() {
            return nombre() + (nombre() > 1 ? " requetes Mongo" : " requete Mongo")
                    + " - " + dureeMs() + " ms";
        }
    }

    public static void demarrer() {
        COURANT.set(new Releve());
    }

    /** Lit le releve courant SANS le liberer : le rendu du gabarit suit. */
    public static Releve lire() {
        Releve r = COURANT.get();
        return r == null ? new Releve() : r;
    }

    /** Libere le ThreadLocal. A appeler en fin d'appel, toujours. */
    public static void arreter() {
        COURANT.remove();
    }

    @Override
    public void commandStarted(CommandStartedEvent evenement) {
        Releve r = COURANT.get();
        if (r != null && COMMANDES.contains(evenement.getCommandName())) {
            // On garde le nom de la commande ET la collection visee : c'est ce
            // qui permet de dire "onze find sur ports" et non juste "onze".
            String collection = evenement.getCommand()
                    .get(evenement.getCommandName()) == null
                    ? "?" : evenement.getCommand().get(evenement.getCommandName()).toString();
            r.commandes().add(evenement.getCommandName() + " " + collection);
        }
    }

    @Override
    public void commandSucceeded(CommandSucceededEvent evenement) {
        cumuler(evenement.getCommandName(), evenement.getElapsedTime(TimeUnit.MICROSECONDS));
    }

    @Override
    public void commandFailed(CommandFailedEvent evenement) {
        cumuler(evenement.getCommandName(), evenement.getElapsedTime(TimeUnit.MICROSECONDS));
    }

    private void cumuler(String commande, long micros) {
        Releve r = COURANT.get();
        if (r != null && COMMANDES.contains(commande)) {
            r.dureeMicros()[0] += micros;
        }
    }
}
