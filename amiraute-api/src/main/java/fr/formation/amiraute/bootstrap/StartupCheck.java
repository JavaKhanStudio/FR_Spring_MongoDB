package fr.formation.amiraute.bootstrap;

import fr.formation.amiraute.repository.FlotteRepository;
import fr.formation.amiraute.repository.JournalBordRepository;
import fr.formation.amiraute.repository.MembreEquipageRepository;
import fr.formation.amiraute.repository.MissionRepository;
import fr.formation.amiraute.repository.NavireRepository;
import fr.formation.amiraute.repository.PortRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * L'application ne CHARGE PAS les donnees : elle se branche sur une base deja
 * peuplee par mongosh/00-jeu-de-donnees.js et 00b-generer-volume.js.
 *
 * C'est un choix de conception : le referentiel est du materiel de cours, pas
 * du materiel applicatif. Cela evite d'avoir la meme donnee ecrite a deux
 * endroits, et cela reproduit le cas reel - une application qui se connecte a
 * une base operationnelle existante.
 *
 * Ce runner se contente donc de VERIFIER, et de dire quoi faire si c'est vide.
 */
@Component
@Order(100)
public class StartupCheck implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupCheck.class);

    private final NavireRepository navires;
    private final PortRepository ports;
    private final FlotteRepository flottes;
    private final MissionRepository missions;
    private final MembreEquipageRepository equipages;
    private final JournalBordRepository journaux;

    public StartupCheck(NavireRepository navires, PortRepository ports, FlotteRepository flottes,
                                 MissionRepository missions, MembreEquipageRepository equipages,
                                 JournalBordRepository journaux) {
        this.navires = navires;
        this.ports = ports;
        this.flottes = flottes;
        this.missions = missions;
        this.equipages = equipages;
        this.journaux = journaux;
    }

    @Override
    public void run(ApplicationArguments args) {
        long nbNavires = navires.count();
        long nbJournaux = journaux.count();

        log.info("Base amiraute : {} navires, {} ports, {} flottes, {} missions, "
                        + "{} membres d'equipage, {} releves",
                nbNavires, ports.count(), flottes.count(), missions.count(),
                equipages.count(), nbJournaux);

        if (nbNavires == 0) {
            log.warn("");
            log.warn("La base est VIDE. Depuis la racine du projet :");
            log.warn("    make amorcer");
            log.warn("");
        } else if (nbJournaux == 0) {
            log.warn("journauxBord est vide : le module Performance n'aura rien a mesurer.");
            log.warn("    make charger F=mongosh/00b-generer-volume.js");
        }
    }
}
