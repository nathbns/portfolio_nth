#include <stdio.h>
#include <mpi.h>

void hello() {
	printf("Hello\n");
}

int main(int argc, char **argv) {
	int rank, size;
	MPI_Init(&argc, &argv);
	MPI_Comm_rank(MPI_COMM_WORLD, &rank);
	MPI_Comm_size(MPI_COMM_WORLD, &size);
	
	char name_proc[MPI_MAX_PROCESSOR_NAME];
	int name_len;
	MPI_Get_processor_name(name_proc, &name_len);

	hello();
	printf("processor name: %s ,rank %d, size %d\n", name_proc, rank, size);

	MPI_Finalize();
	return 0;
}
