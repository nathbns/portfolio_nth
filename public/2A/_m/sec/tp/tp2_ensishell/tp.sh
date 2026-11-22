#!/bin/sh
# Ouvre un shell Linux (GCC 15, Guile, readline, ruby) dans ce dossier, monté sur /tp.
#   ./tp.sh                       -> shell interactif, dans ensishell/
#   ./tp.sh sh -c 'cd build && make'  -> lance juste la commande
cd "$(dirname "$0")" || exit 1

if ! docker info >/dev/null 2>&1; then
	echo "Démarrage de Docker Desktop..."
	open -a Docker
	until docker info >/dev/null 2>&1; do sleep 2; done
fi

docker image inspect tp-ensishell >/dev/null 2>&1 || docker build -t tp-ensishell .

if [ -t 0 ]; then TTY=-it; else TTY=-i; fi
[ $# -eq 0 ] && set -- bash
exec docker run --rm $TTY -v "$PWD":/tp tp-ensishell "$@"
