#include <stdio.h>
#include <mpi.h>

int main(int argc, char **argv) {
	MPI_Init(&argc, &argv);
	int rank, size;
	MPI_Comm_rank(MPI_COMM_WORLD, &rank);
	MPI_Comm_size(MPI_COMM_WORLD, &size);

	/*
	char name_proc[MPI_MAX_PROCESSOR_NAME];
	int name_len;
	MPI_Get_processor_name(name_proc, &name_len);
	*/

	int jeton;
	int suivant = (rank + 1) % size; // le dernier envoie à 0
	int precedent = (rank - 1 + size) % size; // 0 recoit de size - 1 et non de -1 

	for(int i=0; i<1000; i++) {
		if(rank == 0) {
			jeton = 0;
			double debut = MPI_Wtime();
			MPI_Send(&jeton, 1, MPI_INT, suivant, 0, MPI_COMM_WORLD);
			MPI_Recv(&jeton, 1, MPI_INT, precedent, 0, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
			//le jeton est revenu
			double fin = MPI_Wtime();
			printf("on lit: %d, un tour: %g\n", jeton, fin - debut); // la valeur reçu
		} else {
			MPI_Recv(&jeton, 1, MPI_INT, precedent, 0, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
			jeton++;
			MPI_Send(&jeton, 1, MPI_INT, suivant, 0, MPI_COMM_WORLD);
		}
	}

	MPI_Finalize();
	return 0;
}	
