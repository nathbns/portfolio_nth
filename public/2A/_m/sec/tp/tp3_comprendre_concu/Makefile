# TP Comprendre la concurrence (Dekker)
# À lancer dans le conteneur (GCC 15, C23) :
#   ./tp.sh make         compile toutes les versions
#   ./tp.sh make clean   supprime les exécutables
# Puis, dans ./tp.sh :  time ./v1   (ou time timeout 10 ./v2 pour celles qui bloquent)

CC     = gcc
CFLAGS = -Wall -Wextra -g

PROGS = synbugs v0 v1 v2 v3 v4 v5 v55 v6 dekker peterson v_mutex v_rwmutex spinlock

all: $(PROGS)

synbugs: synbugs_skel.c
	$(CC) $(CFLAGS) $< -o $@

%: %.c
	$(CC) $(CFLAGS) $< -o $@

clean:
	rm -f $(PROGS)

.PHONY: all clean
