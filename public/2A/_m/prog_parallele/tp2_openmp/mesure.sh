#!/bin/sh
# Lance un programme pour 1, 2, 4, ..., 2^i threads, jusqu'au nombre de cœurs
# de la machine (et avec exactement ce nombre).
#
# Usage : ./mesure.sh ./programme [arguments...]
# Exemple : ./mesure.sh ./tri_fusion v1 16777216 10000
#
max=$(getconf _NPROCESSORS_ONLN)
p=1
while [ "$p" -lt "$max" ]; do
  OMP_NUM_THREADS=$p "$@" || exit 1
  p=$((p * 2))
done
OMP_NUM_THREADS=$max "$@"
