#include <omp.h>
#include <stdio.h>

int main() {
	
	#pragma omp parallel 
	{
	int n = omp_get_thread_num();
	int nb = omp_get_num_threads();
	printf("je suis le thread %d / %d \n", n, nb);
	}
	
	return 0;
}
