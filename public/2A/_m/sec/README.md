# Systèmes d'exploitation et Cloud (SEC)

Ordre des TP et des CM : celui du [site du cours](https://systemes.pages.ensimag.fr/sec/).

Examen : écrit d'1 h et examen de TP de 2 h sur machine (dates à préciser).

[Aide-mémoire synchronisation](synchro_aide_memoire.md) : threads ISO C, moniteur, sémaphores, `pthread_rwlock`, classes de bugs et commandes, sur une page. À relire avant chaque TP.

## TP

| TP | |
|---|---|
| [TP2 Ensishell : écrire un shell](tp/tp2_ensishell/) | Partie 1 (semaine 2) : `fork` + `execvp` + `waitpid`, `commande &` et zombie, `executer` appelé depuis Scheme. Partie 2 (pipe, redirections, `jobs`) en semaine 8. |
| [TP3 Comprendre la concurrence : Dekker](tp/tp3_comprendre_concu/) | Versions buggées de la section critique en attente active (exclusion violée, interblocage, famine, livelock), Dekker, Peterson, piège `bool` / `atomic_bool`, mutex, rwlock (famine des écrivains), spinlock, mesures. [Vidéo](tp/tp3_comprendre_concu/video.mp4) |
| [TP4 RWMutex : lecteurs-rédacteurs](tp/tp4_moniteur_lecteur_redacteur/) | moniteur avec priorité aux rédacteurs, famine du verrou POSIX, deux bugs corrigés, mesures. [Vidéo](tp/tp4_moniteur_lecteur_redacteur/video.mp4) |
| [TP5 Channel : producteurs-consommateurs](tp/tp5_channel_moniteur/) | tampon circulaire en moniteur puis en sémaphores, classes de bugs, mesures. [Vidéo](tp/tp5_channel_moniteur/video.mp4) |

Les autres TP ([liste](tp_liste.md)) seront ajoutés ici.

## CM

| CM | |
|---|---|
| [CM2 Processus : fork, execvp, waitpid](cm/cm02_processus/) | Comment un shell lance une commande : processus, `fork`, `execvp`, `waitpid`, zombie, boucle de `fork`. [Vidéo](cm/cm02_processus/video.mp4) |
| [CM3 Concurrence : section critique et Peterson](cm/cm03_concurrence/) | `compteur++` non atomique, les 20 entrelacements, section critique, attente active, Peterson, interblocage, famine, mutex. [Vidéo](cm/cm03_concurrence/video.mp4) |
| [CM4 Moniteurs : pourquoi `while` et pas `if`](cm/cm04_moniteurs/) | Mutex et variables de condition, ce que fait `cnd_wait`, signal et broadcast, le scénario du parking, lecteurs-rédacteurs. [Vidéo](cm/cm04_moniteurs/video.mp4) |
| [CM5 Sémaphores : le tampon borné](cm/cm05_semaphores/) | P et V, `sem_init`, producteurs-consommateurs avec les sémaphores vides, pleines et mutex, interblocage si l'ordre est inversé, lien avec les channels. [Vidéo](cm/cm05_semaphores/video.mp4) |
| [CM6 Allocation mémoire : l'allocateur buddy (exercice)](cm/cm06_allocation_memoire/) | Fragmentation, découpe en compagnons, compagnon = adresse XOR taille, fusion à la libération. [Vidéo](cm/cm06_allocation_memoire/video.mp4) |
| [CM7 Pagination : de l'adresse virtuelle à l'adresse physique (exercice)](cm/cm07_pagination/) | Taille des tables et nombre de niveaux, découpe d'une adresse x86-64, calcul de l'adresse physique, TLB, défaut de page. [Vidéo](cm/cm07_pagination/video.mp4) |
| [CM8 Fichiers : descripteurs, redirection et tube](cm/cm08_fichiers/) | Table des descripteurs, `open`, `dup2`, `close`, redirection `>`, `pipe`, et pourquoi `wc` attend si une extrémité d'écriture reste ouverte. [Vidéo](cm/cm08_fichiers/video.mp4) |
| [CM10 Remplacement de pages : FIFO, LRU, horloge (exercice)](cm/cm10_remplacement_pages/) | FIFO (7 défauts) contre LRU (5 défauts) sur la même suite, horloge, temps d'accès moyen, écroulement. [Vidéo](cm/cm10_remplacement_pages/video.mp4) |
