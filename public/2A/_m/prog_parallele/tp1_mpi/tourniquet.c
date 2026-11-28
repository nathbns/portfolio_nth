#include <stdio.h>
#include <mpi.h>


/*
 * C'est le contremaitre qui envoie le travail cette fois.
 * il procede par tour (avec 4 copies on a, W=3): 
 * 	tour1 -> envoie les taches 1, 2, 3 + attendre les reps
 * 	tours2 -> envoie 4, 5, 6 + attendre les reps
 * 	etc...
 * */

#define NB_TACHES = 1000000;

int main(int argc, char **argv) {
	MPI_Init(&argc, &argv);
	int rank, size;
	MPI_Comm_rank(MPI_COMM_WORLD, &rank);
	MPI_Comm_size(MPI_COMM_WORLD, &size);
	
	int W = size - 1;

	if(rank == 0) { // CONTRE-MAITRE
		for(int i=1; i<=NB_TACHES; i++) {
			int dernier = i + W - 1;
			if(dernier > NB_TACHES)
				dernier = NB_TACHES;
		}
	}
}
