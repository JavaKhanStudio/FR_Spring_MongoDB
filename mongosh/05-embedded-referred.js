// =============================================================================
// 05 - EMBEDDED ET REFERRED                                           [J2 am]
// =============================================================================
// Programme : "Embedded et Referred"
//
//     make charger F=mongosh/05-embedded-referred.js
//
// Le module le plus important de la formation : c'est la seule decision de
// modelisation qu'on ne peut pas rattraper facilement plus tard.
// =============================================================================

const base = db.getSiblingDB("amiraute");
function titre(t) { print("\n--- " + t + " " + "-".repeat(Math.max(0, 60 - t.length))); }


// =============================================================================
titre("1. EMBARQUE - lire un navire complet");
// =============================================================================

const cdg = base.navires.findOne({ numeroCoque: "R91", nation: "France" });

print("\nUNE requete a rendu :");
print("  le navire, ses " + cdg.armements.length + " armements, ses " +
      cdg.capteurs.length + " capteurs, sa propulsion et sa position.");
print("  taille du document : " + bsonsize(cdg) + " octets");

print("\nEn modele relationnel, la meme information demanderait :");
print("  navire, armement, navire_armement, capteur, navire_capteur, propulsion");
print("  soit 6 tables et 5 jointures pour reconstituer cet ecran.");

print("\nLa question n'est pas 'quel modele est plus beau' mais :");
print("  -> a quelle frequence lit-on ces donnees ENSEMBLE ?");
print("  Ici : toujours. Donc elles vivent ensemble.");


// =============================================================================
titre("2. Les trois criteres de decision");
// =============================================================================

print("\n  1. CYCLE DE VIE   l'enfant existe-t-il sans le parent ?");
print("     armement  -> non, il est monte SUR ce navire        => embarque");
print("     port      -> oui, Toulon existe seul                => reference");

print("\n  2. CARDINALITE    combien d'enfants, et est-ce borne ?");
print("     armements -> " + cdg.armements.length + ", borne, ne bouge presque jamais => embarque");
print("     equipage  -> " + cdg.equipageMax + " marins, rotation constante  => reference");

print("\n  3. ACCES          les lit-on ensemble ou separement ?");
print("     capteurs  -> toujours avec le navire                 => embarque");
print("     missions  -> une mission se consulte seule           => reference");

print("\nLes trois criteres se contredisent parfois. Quand c'est le cas,");
print("la CARDINALITE tranche : un tableau non borne est toujours un piege.");


// =============================================================================
titre("3. REFERENCE - le cout d'une lecture");
// =============================================================================

const navire = base.navires.findOne({ numeroCoque: "D620", nation: "France" });

print("\nSi le navire ne stockait qu'un identifiant nu :");
print("    portAttacheId: \"" + navire.portAttache.id + "\"");
print("");
print("...il faudrait une SECONDE requete pour afficher le nom du port :");
const port = base.ports.findOne({ _id: navire.portAttache.id });
print("    2e requete -> " + port.nom + ", " + port.pays);
print("");
print("C'est le prix du referenced : N+1 requetes, ou un $lookup.");

print("\nAvec $lookup, en une seule commande cote serveur :");
base.navires.aggregate([
  { $match: { nation: "France", type: "FREGATE" } },
  { $lookup: { from: "ports", localField: "portAttache.id", foreignField: "_id", as: "port" } },
  { $unwind: "$port" },
  { $project: { _id: 0, nom: 1, port: "$port.nom", profondeur: "$port.profondeurBassinMetres" } }
]).forEach(function (n) {
  print("  " + n.nom.padEnd(20) + n.port.padEnd(12) + n.profondeur + " m");
});

print("\n$lookup est une jointure GAUCHE, executee sur le serveur. Elle marche,");
print("mais elle ne remplace pas un vrai SGBD relationnel : pas d'optimiseur");
print("de jointure, et elle coute cher sur de gros volumes des deux cotes.");

print("\nMAIS - regardez ce que contient reellement le navire :");
printjson(navire.portAttache);
print("");
print("Le nom du port est DEJA LA. Aucune seconde requete n'est necessaire.");
print("C'est l'EXTENDED REFERENCE, et c'est le sujet du script 05b.");

titre("4. REFERENCE - le cout d'une ECRITURE, et sa contrepartie");
// =============================================================================

const nbANavires = base.navires.countDocuments({ "portAttache.id": "TOULON" });
print("\nnavires bases a Toulon : " + nbANavires);

print("\nLa capacite du port passe de 60 a 65 places.");
print("  modele reference : 1 document a modifier");
base.ports.updateOne({ _id: "TOULON" }, { $set: { capaciteNavires: 65 } });
print("  modele embarque  : " + nbANavires + " documents a modifier, et il faut");
print("                     tous les retrouver sans en oublier un seul");
base.ports.updateOne({ _id: "TOULON" }, { $set: { capaciteNavires: 60 } });

print("\nC'est la raison d'etre du referenced : la donnee partagee n'a qu'un");
print("seul proprietaire, donc un seul endroit ou la corriger.");


// =============================================================================
titre("5. LE CONTRE-EXEMPLE - pourquoi l'equipage n'est PAS embarque");
// =============================================================================

const unMembre = base.membresEquipage.findOne();
const tailleMembre = bsonsize(unMembre);

print("\ntaille d'un membre d'equipage : " + tailleMembre + " octets");
print("equipage du Charles de Gaulle : " + cdg.equipageMax + " marins");
print("taille du tableau embarque    : ~" +
      Math.round(tailleMembre * cdg.equipageMax / 1024) + " Ko");
print("limite MongoDB par document   : 16 384 Ko");

print("\nOn passe. Alors pourquoi refuser ?");

print("\n  a) La limite de 16 Mo n'est pas un objectif, c'est un mur. Un porte-");
print("     avions plus gros, un champ ajoute par marin, et on le touche.");
print("  b) MongoDB reecrit le document ENTIER a chaque modification. Muter un");
print("     marin, c'est reecrire " + Math.round(tailleMembre * cdg.equipageMax / 1024) + " Ko.");
print("  c) Lire la fiche du navire ramenerait " + cdg.equipageMax + " marins dont on");
print("     n'a pas besoin, sur chaque appel.");
print("  d) On ne peut pas paginer proprement dans un tableau embarque.");

print("\nDemonstration du point d - pagination de l'equipage :");
base.membresEquipage.find({ navireId: cdg._id }, { _id: 0, nom: 1, prenom: 1, grade: 1 })
  .sort({ nom: 1, prenom: 1 }).skip(0).limit(5)
  .forEach(function (m) { print("  " + (m.prenom + " " + m.nom).padEnd(24) + m.grade); });
print("  ... page suivante : .skip(5).limit(5), trivial en collection separee");


// =============================================================================
titre("6. LE COMPROMIS - la reference enrichie");
// =============================================================================

print("\nEntre les deux, une troisieme voie : garder la reference ET recopier");
print("le ou les champs qu'on affiche systematiquement.");
print("");
print("Ce projet l'applique DEJA. Le navire ne stocke pas un identifiant nu :");
printjson(base.navires.findOne({ numeroCoque: "D620", nation: "France" },
                               { _id: 0, nom: 1, portAttache: 1, flotte: 1 }));

print("\nCe qu'on recopie   : id, nom, pays - ils ne changent jamais.");
print("Ce qu'on NE recopie PAS :");
print("  capaciteNavires        elle change -> reste dans ports");
print("  profondeurBassinMetres elle change -> reste dans ports");
print("  amiralCommandant       il change de poste -> reste dans flottes");

print("\nLa regle : on denormalise CHAMP PAR CHAMP, selon la frequence de");
print("changement. Jamais un objet entier, jamais en bloc.");

print("\nDemonstration du cout : renommer un port.");
const impactes = base.navires.countDocuments({ "portAttache.id": "TOULON" });
print("  navires portant la copie 'Toulon' : " + impactes);
print("  les renommer imposerait un updateMany, et de ne pas l'oublier.");
print("  C'est acceptable UNIQUEMENT parce qu'un port ne se renomme jamais.");

titre("7. Recapitulatif");
// =============================================================================

print("");
print("  DONNEE               CHOIX        POURQUOI");
print("  " + "-".repeat(66));
print("  propulsion           embarque     1-1, indissociable du navire");
print("  armements            embarque     borne, lu avec le navire, stable");
print("  capteurs             embarque     idem");
print("  positionActuelle     embarque     1-1, appartient au navire");
print("  portAttache          ref. enrichie partage, mais nom recopie");
print("  flotte               ref. enrichie partage, mais nom recopie");
print("  etatMajor            subset       5 officiers sur 1 950 marins");
print("  stats                computed     agregats maintenus a l'ecriture");
print("  amiralCommandant     embarque     1-1 dans flotte, jamais partage");
print("  membresEquipage      reference    cardinalite non bornee, rotation");
print("  journauxBord         reference    volume illimite dans le temps");
print("  missions <-> navires reference    N-N des deux cotes");
print("");
print("A retenir en une phrase :");
print("  On embarque ce qu'on lit toujours ensemble et dont le nombre est borne.");
print("  On reference tout le reste.");
print("");
print("Mais ce n'est que la PREMIERE question. Entre embarquer et referencer,");
print("MongoDB a un vocabulaire de patterns nommes - Polymorphic, Extended");
print("Reference, Subset, Computed, Bucket - et c'est lui qui fait la");
print("difference entre du NoSQL et du SQL deguise en JSON.");
print("");
print("  -> script 05b-patterns.js");
