// mongodb-en-visuel r935 : la base des exercices et son compte d'ecriture, pour la console de MongoDB en visuel.
// Joue en amiral par le service console-init a CHAQUE demarrage du profil simple (pas par mongo-init/, qui ne tourne
// qu'a la creation du volume : un poste qui a deja sa base n'aurait jamais eu ce compte). Rejouable : le compte est cree
// s'il manque, et ses droits remis a readWrite sur EXERCICES seule s'il existe. Ce mot de passe est public (depot du
// cours) : le serveur refuse a ce compte toute ecriture hors d'EXERCICES, et toute lecture aussi.
// Source : MongoDB_en_visuel lab/course_console, copiee par tools/pont_course.py ; ne pas modifier ici.
const base = db.getSiblingDB("EXERCICES");
const droits = [{ role: "readWrite", db: "EXERCICES" }];
if (base.getUser("mousse")) base.updateUser("mousse", { roles: droits });
else base.createUser({ user: "mousse", pwd: "MOUSSE-1", roles: droits });   // push-check: allow (le compte public des exercices, EXERCICES seule)
print("[exercices] compte mousse : readWrite sur EXERCICES seule");
