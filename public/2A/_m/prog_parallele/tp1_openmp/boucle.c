#include <omp.h>
#include <stdio.h>

#define REPS 10

void main() {
/*
#pragma omp parallel
  { 
    int n = omp_get_thread_num();
    int nb = omp_get_num_threads();  
    for (int i = n ; i < REPS ; i += nb) {
      printf("%d\n", i);
    }
  }
*/
#pragma omp parallel for 
	for(int i=0; i<REPS; i++) printf("%d\n",  i);
}
