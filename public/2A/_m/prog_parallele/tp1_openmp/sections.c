#include <stdio.h>
#include <omp.h>

void f1(void) { printf("f1 exécutée par le thread %d\n", omp_get_thread_num()); }
void f2(void) { printf("f2 exécutée par le thread %d\n", omp_get_thread_num()); }
void f3(void) { printf("f3 exécutée par le thread %d\n", omp_get_thread_num()); }

int main(void) {

  #pragma omp parallel
   {
   //int n = omp_get_thread_num();
   //int nb = omp_get_num_threads();
  #pragma omp sections
     {
  #pragma omp section
       {
       f1();
       }

  #pragma omp section
       {
       f2();
       }

  #pragma omp section
       {
       f3();
       }
     }
   }
  return 0;
}


/*
 * Observation question 3.1:
 *
 * avec OMP_NUM_THREADS=8, on a bien 8 threads
 * mais les fonctions f1, f2 et f3 sont exec 1 seule fois.
 * Seul 3 threads diff apparaissent.
 *
 * Les 5 autres threads n'ont donc rien d'autres à faire.
 *
 * Conclusion au dela de 3 threads, on irait pas plus vite.
 *
 * C'est la diff avec parallel for, ou le travail est reparti entre 
 * tous les threads dispo, + de threads donne des morceaux + petits
 * */
