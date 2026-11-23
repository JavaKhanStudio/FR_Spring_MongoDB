#!/bin/sh
# Ecrit par Ficelle (activite/gen.py) depuis activite/checks.toml b1a3c1b01346 : ne pas modifier a la main.
# Verifie ce que l'activite demande ; au premier manque, dit quoi faire et sort en erreur (1).
OS=${ACTIVITE_OS:-}
if [ -z "$OS" ]; then case "$(uname -s)" in Darwin) OS=macos ;; *) OS=linux ;; esac; fi
DISTRO=${ACTIVITE_DISTRO:-}
if [ -z "$DISTRO" ] && [ -r /etc/os-release ]; then
  ids=" $(. /etc/os-release; echo "$ID $ID_LIKE") "
  case "$ids" in
    *" fedora "*|*" rhel "*) DISTRO=fedora ;;
    *" debian "*|*" ubuntu "*) DISTRO=debian ;;
  esac
fi
ok() { printf '  ok  %s\n' "$1"; }
manque() {
  A=$1; shift
  printf '\n  \342\234\227   %s\n\n      %s\n      %s\n' "$1" "$2" "$3"
  shift 3
  if [ $# -gt 0 ]; then printf '\n'; for l in "$@"; do printf '          %s\n' "$l"; done; fi
  if [ -n "$PAGE" ]; then printf '\n      Pas à pas : %s#%s\n' "$PAGE" "$A"; fi
  printf '\n'
  exit 1
}
ecoute() { bash -c "exec 3<>/dev/tcp/127.0.0.1/$1" 2>/dev/null; }
conteneur() {
  CN=$(docker ps --format '{{.Names}} {{.Ports}}' 2>/dev/null | sed -n "s/^\([^ ]*\) .*:$1->.*/\1/p" | head -1)
  [ -n "$CN" ]
}
tient() {
  HN=; HP=
  if [ "$OS" = macos ]; then
    set -- $(lsof -nP -iTCP:"$1" -sTCP:LISTEN -Fpc 2>/dev/null | sed -n 's/^p//p;s/^c//p' | head -2)
    HP=$1; HN=$2
  else
    set -- $(ss -ltnpH "sport = :$1" 2>/dev/null | sed -n 's/.*users:(("\([^"]*\)",pid=\([0-9]*\).*/\1 \2/p' | head -1)
    HN=$1; HP=$2
  fi
  H=; [ -n "$HN" ] && H=" ($HN, pid $HP)"
}
PAGE='https://simonbedardprog.com/ficelle/mongodb/carnet/direct/'
printf '%s (%s)\n\n' 'Vérification : Le carnet, en direct' "$OS"

# docker.present
if command -v docker >/dev/null 2>&1; then ok 'Docker est installé'
else
  case "$OS" in
    macos) manque docker-present 'Docker n'\''est pas installé sur cet ordinateur.' 'Docker fait tourner la base de données de l'\''activité dans un conteneur : une petite machine isolée, déjà prête.' 'Téléchargez Docker Desktop sur https://docs.docker.com/desktop/setup/install/mac-install/ (Apple ou Intel, selon votre Mac), ouvrez le fichier .dmg, glissez Docker dans Applications, ouvrez-le une fois, puis relancez la vérification.' ;;
    *) case "$DISTRO" in fedora) manque docker-present 'Docker n'\''est pas installé sur cet ordinateur.' 'Docker fait tourner la base de données de l'\''activité dans un conteneur : une petite machine isolée, déjà prête.' 'Installez Docker et démarrez-le, puis relancez la vérification :' 'sudo dnf install -y moby-engine docker-compose' 'sudo systemctl enable --now docker' ;; debian) manque docker-present 'Docker n'\''est pas installé sur cet ordinateur.' 'Docker fait tourner la base de données de l'\''activité dans un conteneur : une petite machine isolée, déjà prête.' 'Installez Docker et démarrez-le, puis relancez la vérification :' 'sudo apt-get update' 'sudo apt-get install -y docker.io docker-compose-v2' 'sudo systemctl enable --now docker' ;; *) manque docker-present 'Docker n'\''est pas installé sur cet ordinateur.' 'Docker fait tourner la base de données de l'\''activité dans un conteneur : une petite machine isolée, déjà prête.' 'Installez Docker en suivant https://docs.docker.com/engine/install/ pour votre distribution, puis relancez la vérification.' ;; esac ;;
  esac
fi

if [ "$OS" = linux ]; then
# docker.socket
if case "$('docker' 'info' 2>&1)" in *'permission denied'*) false ;; *) true ;; esac; then ok 'Votre compte a le droit d'\''utiliser Docker'
else
  case "$OS" in
    *) case "$DISTRO" in  *) manque docker-socket 'Docker refuse votre compte : il faut faire partie du groupe « docker ».' 'Un groupe donne un droit à des comptes ; celui-ci donne le droit de lancer des conteneurs.' 'Ajoutez votre compte au groupe, puis fermez votre session et rouvrez-la (ou redémarrez), et relancez la vérification :' 'sudo usermod -aG docker $USER' ;; esac ;;
  esac
fi
fi

# docker.running
if 'docker' 'info' >/dev/null 2>&1; then ok 'Docker tourne'
else
  case "$OS" in
    macos) manque docker-running 'Docker est installé, mais il ne tourne pas.' 'Docker doit être démarré pour lancer les conteneurs de l'\''activité.' 'Ouvrez Docker (dossier Applications) ou tapez la commande ci-dessous. Attendez que la baleine, en haut de l'\''écran, ne bouge plus, puis relancez la vérification :' 'open -a Docker' ;;
    *) case "$DISTRO" in  *) manque docker-running 'Docker est installé, mais il ne tourne pas.' 'Docker doit être démarré pour lancer les conteneurs de l'\''activité.' 'Démarrez le service Docker, puis relancez la vérification :' 'sudo systemctl start docker' ;; esac ;;
  esac
fi

# compose.present
if 'docker' 'compose' 'version' >/dev/null 2>&1; then ok 'Docker Compose est là'
else
  case "$OS" in
    macos) manque compose-present 'La commande « docker compose » ne répond pas.' 'Docker Compose lance d'\''un coup les conteneurs que l'\''activité décrit dans son fichier docker-compose.yml.' 'Il vient avec Docker Desktop : mettez Docker Desktop à jour (menu de la baleine, « Check for updates »), puis relancez la vérification.' ;;
    *) case "$DISTRO" in fedora) manque compose-present 'La commande « docker compose » ne répond pas.' 'Docker Compose lance d'\''un coup les conteneurs que l'\''activité décrit dans son fichier docker-compose.yml.' 'Installez Docker Compose, puis relancez la vérification :' 'sudo dnf install -y docker-compose' ;; debian) manque compose-present 'La commande « docker compose » ne répond pas.' 'Docker Compose lance d'\''un coup les conteneurs que l'\''activité décrit dans son fichier docker-compose.yml.' 'Installez Docker Compose, puis relancez la vérification :' 'sudo apt-get install -y docker-compose-v2' ;; *) manque compose-present 'La commande « docker compose » ne répond pas.' 'Docker Compose lance d'\''un coup les conteneurs que l'\''activité décrit dans son fichier docker-compose.yml.' 'Installez le greffon Compose de Docker (https://docs.docker.com/compose/install/linux/), puis relancez la vérification.' ;; esac ;;
  esac
fi

# port.free
if ! ecoute 27017; then ok 'Le port 27017 est libre'
elif conteneur 27017; then ok 'L'\''activité tourne déjà'" (conteneur $CN)"' : rien à faire pour le port 27017'
else
  tient 27017
  case "$OS" in
    macos) if [ "$HN" = mongod ]; then manque port-free 'Le port 27017 est déjà pris par un autre programme'"$H"'.' 'Un port est un numéro de porte sur l'\''ordinateur : un seul programme à la fois peut écouter derrière chacune, et l'\''activité a besoin du 27017.' 'C'\''est un MongoDB déjà installé sur cet ordinateur. Arrêtez-le le temps de l'\''activité, puis relancez la vérification :' 'brew services stop mongodb-community'; fi; manque port-free 'Le port 27017 est déjà pris par un autre programme'"$H"'.' 'Un port est un numéro de porte sur l'\''ordinateur : un seul programme à la fois peut écouter derrière chacune, et l'\''activité a besoin du 27017.' 'Fermez ce programme, puis relancez la vérification. Si c'\''est un MongoDB installé avec Homebrew :' 'brew services stop mongodb-community' ;;
    *) case "$DISTRO" in  *) if [ "$HN" = mongod ]; then manque port-free 'Le port 27017 est déjà pris par un autre programme'"$H"'.' 'Un port est un numéro de porte sur l'\''ordinateur : un seul programme à la fois peut écouter derrière chacune, et l'\''activité a besoin du 27017.' 'C'\''est un MongoDB déjà installé sur cet ordinateur. Arrêtez-le le temps de l'\''activité, puis relancez la vérification :' 'sudo systemctl stop mongod'; fi; manque port-free 'Le port 27017 est déjà pris par un autre programme'"$H"'.' 'Un port est un numéro de porte sur l'\''ordinateur : un seul programme à la fois peut écouter derrière chacune, et l'\''activité a besoin du 27017.' 'Fermez ce programme, puis relancez la vérification. Si c'\''est le service MongoDB :' 'sudo systemctl stop mongod' ;; esac ;;
  esac
fi

# port.free
if ! ecoute 8820; then ok 'Le port 8820 est libre'
elif conteneur 8820; then ok 'L'\''activité tourne déjà'" (conteneur $CN)"' : rien à faire pour le port 8820'
else
  tient 8820
  case "$OS" in
    macos) if [ "$HN" = mongod ]; then manque port-free 'Le port 8820 est déjà pris par un autre programme'"$H"'.' 'Un port est un numéro de porte sur l'\''ordinateur : un seul programme à la fois peut écouter derrière chacune, et l'\''activité a besoin du 8820.' 'C'\''est un MongoDB déjà installé sur cet ordinateur. Arrêtez-le le temps de l'\''activité, puis relancez la vérification :' 'brew services stop mongodb-community'; fi; manque port-free 'Le port 8820 est déjà pris par un autre programme'"$H"'.' 'Un port est un numéro de porte sur l'\''ordinateur : un seul programme à la fois peut écouter derrière chacune, et l'\''activité a besoin du 8820.' 'Fermez ce programme, puis relancez la vérification. Si c'\''est un MongoDB installé avec Homebrew :' 'brew services stop mongodb-community' ;;
    *) case "$DISTRO" in  *) if [ "$HN" = mongod ]; then manque port-free 'Le port 8820 est déjà pris par un autre programme'"$H"'.' 'Un port est un numéro de porte sur l'\''ordinateur : un seul programme à la fois peut écouter derrière chacune, et l'\''activité a besoin du 8820.' 'C'\''est un MongoDB déjà installé sur cet ordinateur. Arrêtez-le le temps de l'\''activité, puis relancez la vérification :' 'sudo systemctl stop mongod'; fi; manque port-free 'Le port 8820 est déjà pris par un autre programme'"$H"'.' 'Un port est un numéro de porte sur l'\''ordinateur : un seul programme à la fois peut écouter derrière chacune, et l'\''activité a besoin du 8820.' 'Fermez ce programme, puis relancez la vérification. Si c'\''est le service MongoDB :' 'sudo systemctl stop mongod' ;; esac ;;
  esac
fi

# mongosh.present
if command -v mongosh >/dev/null 2>&1; then ok 'mongosh est installé'
else
  case "$OS" in
    macos) manque mongosh-present 'mongosh n'\''est pas installé sur cet ordinateur.' 'mongosh est le programme où l'\''on tape les commandes MongoDB.' 'Téléchargez mongosh pour macOS sur https://www.mongodb.com/try/download/shell, puis relancez la vérification. Avec Homebrew :' 'brew install mongosh' ;;
    *) case "$DISTRO" in  *) manque mongosh-present 'mongosh n'\''est pas installé sur cet ordinateur.' 'mongosh est le programme où l'\''on tape les commandes MongoDB.' 'Téléchargez mongosh pour votre distribution sur https://www.mongodb.com/try/download/shell, puis relancez la vérification.' ;; esac ;;
  esac
fi

printf '\n  Tout est prêt.\n\n'
exit 0
