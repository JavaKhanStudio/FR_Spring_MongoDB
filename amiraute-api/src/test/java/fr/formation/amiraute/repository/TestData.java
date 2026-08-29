package fr.formation.amiraute.repository;

import fr.formation.amiraute.domain.BatimentSurface;
import fr.formation.amiraute.domain.Flotte;
import fr.formation.amiraute.domain.Mission;
import fr.formation.amiraute.domain.Navire;
import fr.formation.amiraute.domain.Port;
import fr.formation.amiraute.domain.PorteAeronefs;
import fr.formation.amiraute.domain.SousMarin;
import fr.formation.amiraute.domain.embedded.Aeronef;
import fr.formation.amiraute.domain.embedded.Amiral;
import fr.formation.amiraute.domain.embedded.Armement;
import fr.formation.amiraute.domain.embedded.Capteur;
import fr.formation.amiraute.domain.embedded.FlotteRef;
import fr.formation.amiraute.domain.embedded.MembreEtatMajor;
import fr.formation.amiraute.domain.embedded.NavireRef;
import fr.formation.amiraute.domain.embedded.NavireStats;
import fr.formation.amiraute.domain.embedded.PortRef;
import fr.formation.amiraute.domain.embedded.Propulsion;
import fr.formation.amiraute.domain.enumeration.CategorieArmement;
import fr.formation.amiraute.domain.enumeration.CategorieCapteur;
import fr.formation.amiraute.domain.enumeration.Grade;
import fr.formation.amiraute.domain.enumeration.MissionStrategique;
import fr.formation.amiraute.domain.enumeration.RoleAeronef;
import fr.formation.amiraute.domain.enumeration.RoleEtatMajor;
import fr.formation.amiraute.domain.enumeration.StatutMission;
import fr.formation.amiraute.domain.enumeration.StatutNavire;
import fr.formation.amiraute.domain.enumeration.TypeCatapulte;
import fr.formation.amiraute.domain.enumeration.TypeMission;
import fr.formation.amiraute.domain.enumeration.TypeNavire;
import fr.formation.amiraute.domain.enumeration.TypePropulsion;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Fixtures minimales : cinq navires de TROIS formes differentes.
 *
 * On ne recharge pas le jeu de reference complet : un test doit pouvoir
 * enoncer ses attentes en chiffres exacts, ce que 45 navires rendraient
 * illisible.
 *
 * La repartition est choisie pour que chaque sous-classe soit testable :
 *   2 PorteAeronefs, 2 BatimentSurface, 1 SousMarin.
 */
public final class TestData {

    private static final PortRef TOULON_REF = new PortRef("TOULON", "Toulon", "France");
    private static final PortRef BREST_REF  = new PortRef("BREST", "Brest", "France");
    private static final FlotteRef FAN_REF  = new FlotteRef("FAN", "Force d'Action Navale", "France");
    private static final FlotteRef FOST_REF = new FlotteRef("FOST", "Force Oceanique Strategique", "France");

    private TestData() {
    }

    public static List<Port> ports() {
        return List.of(
                port("TOULON", "Toulon", "France", 5.93, 43.12),
                port("BREST", "Brest", "France", -4.49, 48.38));
    }

    public static List<Flotte> flottes() {
        return List.of(
                flotte("FAN", "Force d'Action Navale", "France"),
                flotte("FOST", "Force Oceanique Strategique", "France"));
    }

    /** Cinq navires aux caracteristiques CHOISIES pour des assertions non ambigues. */
    public static List<Navire> navires() {
        PorteAeronefs cdg = new PorteAeronefs();
        base(cdg, "R91", "Charles de Gaulle", TypeNavire.PORTE_AVIONS, "France",
                2001, StatutNavire.ACTIF, 42500, 1950, TypePropulsion.NUCLEAIRE,
                TOULON_REF, FAN_REF, 5.93, 43.10, List.of("nucleaire", "aviation", "otan"));
        cdg.setArmements(List.of(
                new Armement("Aster 15", CategorieArmement.MISSILE_ANTIAERIEN, 32, 30, null),
                new Armement("Giat 20F2", CategorieArmement.CANON, 8, 2, 20)));
        cdg.setCapteurs(List.of(new Capteur("DRBJ-11B", CategorieCapteur.RADAR, 400)));
        cdg.setDevise("Servir sans faillir");
        cdg.setTypeCatapulte(TypeCatapulte.CATOBAR);
        cdg.setNombreAeronefs(40);
        cdg.setLongueurPisteMetres(195);
        cdg.setNombreAscenseurs(2);
        cdg.setGroupeAerien(List.of(
                new Aeronef("Rafale M", RoleAeronef.CHASSE, 30),
                new Aeronef("E-2C Hawkeye", RoleAeronef.GUET_AERIEN, 2)));
        cdg.setEtatMajor(etatMajor("Perrier", "M-2019-000001"));
        cdg.setStats(new NavireStats(0, 5, null));

        PorteAeronefs ford = new PorteAeronefs();
        base(ford, "CVN-78", "Gerald R. Ford", TypeNavire.PORTE_AVIONS, "Etats-Unis",
                2017, StatutNavire.ACTIF, 100000, 4539, TypePropulsion.NUCLEAIRE,
                TOULON_REF, FAN_REF, -72.10, 34.20, List.of("nucleaire", "aviation", "otan"));
        ford.setArmements(List.of(
                new Armement("RIM-162 ESSM", CategorieArmement.MISSILE_ANTIAERIEN, 32, 50, null)));
        ford.setCapteurs(List.of(new Capteur("AN/SPY-3", CategorieCapteur.RADAR, 320)));
        ford.setDevise("Integrity at the helm");
        ford.setTypeCatapulte(TypeCatapulte.CATOBAR);
        ford.setNombreAeronefs(75);
        ford.setLongueurPisteMetres(332);
        ford.setNombreAscenseurs(3);
        ford.setGroupeAerien(List.of(
                new Aeronef("F/A-18E Super Hornet", RoleAeronef.CHASSE, 44),
                new Aeronef("MH-60R Seahawk", RoleAeronef.LUTTE_SOUS_MARINE, 8)));
        ford.setEtatMajor(etatMajor("Caudle", "M-2018-000002"));
        ford.setStats(new NavireStats(0, 5, null));

        BatimentSurface forbin = new BatimentSurface();
        base(forbin, "D620", "Forbin", TypeNavire.DESTROYER, "France",
                2010, StatutNavire.ACTIF, 7050, 195, TypePropulsion.HYBRIDE,
                TOULON_REF, FAN_REF, 7.42, 41.55, List.of("defense-aerienne", "otan"));
        forbin.setArmements(List.of(
                new Armement("Aster 30", CategorieArmement.MISSILE_ANTIAERIEN, 48, 120, null),
                new Armement("Oto Melara 76", CategorieArmement.CANON, 2, 16, 76)));
        forbin.setCapteurs(List.of(new Capteur("EMPAR", CategorieCapteur.RADAR, 180)));
        forbin.setDevise("Fort et bon");
        forbin.setSystemeCombat("PAAMS");
        forbin.setCapaciteVLS(48);
        forbin.setNombreHelicopteres(1);
        forbin.setPlateformeHelicoptere(true);
        forbin.setEtatMajor(etatMajor("Vaujour", "M-2020-000003"));
        forbin.setStats(new NavireStats(0, 5, null));

        BatimentSurface aquitaine = new BatimentSurface();
        base(aquitaine, "D650", "Aquitaine", TypeNavire.FREGATE, "France",
                2012, StatutNavire.EN_MISSION, 6000, 145, TypePropulsion.HYBRIDE,
                BREST_REF, FAN_REF, -4.51, 48.35, List.of("lutte-sous-marine", "otan"));
        // Un canon de 24 km : le SEUL a satisfaire $elemMatch(CANON, >= 20).
        aquitaine.setArmements(List.of(
                new Armement("Canon longue portee", CategorieArmement.CANON, 1, 24, 127)));
        aquitaine.setCapteurs(List.of(new Capteur("CAPTAS-4", CategorieCapteur.SONAR, 100)));
        aquitaine.setDevise("Fiere et forte");
        aquitaine.setSystemeCombat("SETIS");
        aquitaine.setCapaciteVLS(32);
        aquitaine.setNombreHelicopteres(1);
        aquitaine.setPlateformeHelicoptere(true);
        aquitaine.setEtatMajor(etatMajor("Lemoine", "M-2021-000004"));
        aquitaine.setStats(new NavireStats(0, 5, null));

        SousMarin suffren = new SousMarin();
        base(suffren, "S635", "Suffren", TypeNavire.SOUS_MARIN, "France",
                2022, StatutNavire.ACTIF, 5300, 65, TypePropulsion.NUCLEAIRE,
                TOULON_REF, FOST_REF, 4.12, 41.90, List.of("nucleaire", "furtif"));
        suffren.setArmements(List.of(
                new Armement("F21 Artemis", CategorieArmement.TORPILLE, 20, 50, 533)));
        suffren.setCapteurs(List.of(new Capteur("S-Cube", CategorieCapteur.SONAR, 120)));
        suffren.setDevise("Discret et decisif");
        suffren.setAutonomieMillesNautiques(null);
        suffren.setProfondeurMaxMetres(350);
        suffren.setNombreTubesLanceTorpilles(4);
        suffren.setMissionStrategique(MissionStrategique.ATTAQUE);
        suffren.setAutonomieImmersionJours(70);
        suffren.setDiscretionDecibels(95);
        suffren.setEtatMajor(etatMajor("Barreau", "M-2022-000005"));
        suffren.setStats(new NavireStats(0, 5, null));

        return List.of(cdg, forbin, aquitaine, suffren, ford);
    }

    /** Construit une mission dont les participants sont des references ENRICHIES. */
    public static Mission mission(String nomCode, List<Navire> participants) {
        Mission m = new Mission();
        m.setNomCode(nomCode);
        m.setType(TypeMission.DEPLOIEMENT);
        m.setStatut(StatutMission.EN_COURS);
        m.setDateDebut(Instant.parse("2026-01-15T00:00:00Z"));
        m.setNaviresParticipants(new ArrayList<>(participants.stream()
                .map(n -> new NavireRef(n.getId(), n.getNom(), n.getNumeroCoque(), n.getType()))
                .toList()));
        m.setCoutEstimeEuros(1_000_000L);
        return m;
    }

    private static List<MembreEtatMajor> etatMajor(String nomCommandant, String matricule) {
        return List.of(
                new MembreEtatMajor(RoleEtatMajor.COMMANDANT, Grade.CAPITAINE_DE_VAISSEAU,
                        nomCommandant, "Jean", matricule),
                new MembreEtatMajor(RoleEtatMajor.SECOND, Grade.CAPITAINE_DE_FREGATE,
                        "Marchand", "Claire", matricule + "-B"),
                new MembreEtatMajor(RoleEtatMajor.CHEF_MECANICIEN, Grade.CAPITAINE_DE_CORVETTE,
                        "Ferrand", "Amine", matricule + "-C"),
                new MembreEtatMajor(RoleEtatMajor.OFFICIER_ARMEMENT, Grade.LIEUTENANT_DE_VAISSEAU,
                        "Nguyen", "Sofia", matricule + "-D"),
                new MembreEtatMajor(RoleEtatMajor.OFFICIER_NAVIGATION, Grade.LIEUTENANT_DE_VAISSEAU,
                        "Diallo", "Lucas", matricule + "-E"));
    }

    private static Port port(String id, String nom, String pays, double lon, double lat) {
        Port p = new Port();
        p.setId(id);
        p.setNom(nom);
        p.setPays(pays);
        p.setLocalisation(new GeoJsonPoint(lon, lat));
        p.setCapaciteNavires(60);
        p.setProfondeurBassinMetres(14.5);
        return p;
    }

    private static Flotte flotte(String id, String nom, String nation) {
        Flotte f = new Flotte();
        f.setId(id);
        f.setNom(nom);
        f.setNation(nation);
        f.setAnneeCreation(1990);
        f.setAmiralCommandant(new Amiral("Vice-amiral d'escadre", "Perrier"));
        return f;
    }

    private static void base(Navire n, String coque, String nom, TypeNavire type, String nation,
                             int annee, StatutNavire statut, int tonnes, int equipage,
                             TypePropulsion propulsion, PortRef port, FlotteRef flotte,
                             double lon, double lat, List<String> etiquettes) {
        n.setNumeroCoque(coque);
        n.setNom(nom);
        n.setClasse(nom);
        n.setType(type);
        n.setNation(nation);
        n.setAnneeMiseEnService(annee);
        n.setStatut(statut);
        n.setDeplacementTonnes(tonnes);
        n.setEquipageMax(equipage);
        n.setVitesseMaxNoeuds(30);
        n.setLongueurMetres(200.0);
        n.setPropulsion(new Propulsion(propulsion, 80000, 2,
                propulsion == TypePropulsion.NUCLEAIRE ? 2 : 0));
        n.setPortAttache(port);
        n.setFlotte(flotte);
        n.setPositionActuelle(new GeoJsonPoint(lon, lat));
        n.setEtiquettes(new ArrayList<>(etiquettes));
    }
}
