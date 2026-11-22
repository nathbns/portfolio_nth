#!/bin/sh
# Ouvre un shell Linux (GCC 15, glibc, man, info) dans ce dossier, monté sur /tp.
#   ./tp.sh              -> shell interactif
#   ./tp.sh make bench   -> lance juste la commande dans le conteneur
cd "$(dirname "$0")" || exit 1

if ! docker info >/dev/null 2>&1; then
	echo "Démarrage de Docker Desktop..."
	open -a Docker
	until docker info >/dev/null 2>&1; do sleep 2; done
fi

docker image inspect tp-sec >/dev/null 2>&1 || docker build -t tp-sec .

if [ -t 0 ]; then TTY=-it; else TTY=-i; fi
[ $# -eq 0 ] && set -- bash
exec docker run --rm $TTY -v "$PWD":/tp tp-sec "$@"
