# Algorithmique et programmation parallèle

| Contenu | |
|---|---|
| [Aide-mémoire OpenMP](openmp_aide_memoire.md) | directives, clauses, fonctions et commandes, sur une page : à relire avant chaque TP |
| [TP1 OpenMP : les bases](tp1_openmp/) | explications exercice par exercice, résultats mesurés et code commenté. [Vidéo](tp1_openmp/video.mp4) |
| [TP2 OpenMP : les tâches](tp2_openmp/) | mise en place ([question1.txt](tp2_openmp/question1.txt)), π avec `taskloop` ([question2.md](tp2_openmp/question2.md)), tri par fusion en tâches V1 à V3, Q3.1 à Q3.17 ([question3.md](tp2_openmp/question3.md)). [Vidéo](tp2_openmp/video.mp4) |
| [TP Go : goroutines et channels](tp_go/) | goroutines et `WaitGroup` ([question1.md](tp_go/question1.md)), channels ([question2.md](tp_go/question2.md)), simulation d'impression jusqu'au serveur avec `select` ([question3.md](tp_go/question3.md)). [Vidéo](tp_go/video.mp4) |
| [CM Go : goroutines, channels, select, pipeline](cm_go/) | `go`, `sync.WaitGroup`, channels avec ou sans tampon, `close`, `select`, un pipeline, et le deadlock quand on oublie de fermer. [Vidéo](cm_go/video.mp4) |
| [CM MPI : messages, interblocage et collectives](cm_mpi/) | `MPI_Send` et `MPI_Recv`, interblocage de l'échange symétrique, `MPI_Sendrecv`, communications non bloquantes, Scatter, Reduce, Bcast, coût d'un message. [Vidéo](cm_mpi/video.mp4) |
| [CM OpenMP et performance](cm_openmp/) | accélération et efficacité, absolue ou relative, lois d'Amdahl et de Gustafson, bornes W/m et chemin critique, bien mesurer. Cours : CM2. [Vidéo](cm_openmp/video.mp4) |

Les prochains TPs seront ajoutés ici.

Liste des TP à faire, avec ce qui est fait : [tp_liste.md](tp_liste.md).
