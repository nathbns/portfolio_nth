#include <stdio.h>
#include <mpi.h>

/*
 * rank 0: le contre-maitre = il ne calcule rien, il reçoit les resultat
 * rank 1 à size - 1: les travailleurs = il y en a W = size - 1
 * Statique, veut dire que chaque travailleur sait d'avance quelles taches sont les siennes.
 * */

#define NB_TACHES 1000000

int main(int argc, char **argv) {
	MPI_Init(&argc, &argv);
	int rank, size;
	MPI_Comm_rank(MPI_COMM_WORLD, &rank);
	MPI_Comm_size(MPI_COMM_WORLD, &size);
	
	int W = size - 1; // nb travailleur = tous le monde sauf 0 (le contre-maitre)
	
	if(rank == 0) { // contre-maitre
		double debut = MPI_Wtime();
		for(int i=1; i<=NB_TACHES; i++) {
			int qui = 1 + i % W; // qui fait la tache i
			int res;
			MPI_Recv(&res, 1, MPI_INT, qui, 0, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
			if(res != i + 1)
				printf("erreur tache %d\n", i);
		}
		double fin = MPI_Wtime();
		printf("temps: %g\n", fin - debut);
	} else { // travailleurs
		for(int i=1; i<=NB_TACHES; i++) {
			if(1 + i % W == rank) {
				int res = i + 1;
				MPI_Send(&res, 1, MPI_INT, 0, 0, MPI_COMM_WORLD); // envoyer au 0
			}
		}
	}

	MPI_Finalize();
	return 0;
}
