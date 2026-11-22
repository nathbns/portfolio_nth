// Le calcul de pi du TP 1, en tâches avec taskloop.
//
// Usage : ./pi_taches [version] [nb_taches]
//   version : seq | for | piege | taskloop
//   nb_taches : nombre de tâches pour taskloop (défaut : 0 = laisser choisir
//               le support d'exécution)
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <omp.h>

#define NB_TERMES 100000000

// La version séquentielle
static double pi_seq(void) {
  double pi = 0.0;
  for (long i = 0; i < NB_TERMES; i++) {
    pi += 4.0 / (4.0 * i + 1.0);
    pi -= 4.0 / (4.0 * i + 3.0);
  }
  return pi;
}

// La solution du TP 1 avec paralell for + reduction.
static double pi_for(void) {
  double pi = 0.0;
#pragma omp parallel for reduction(+: pi)
  for (long i = 0; i < NB_TERMES; i++) {
    pi += 4.0 / (4.0 * i + 1.0);
    pi -= 4.0 / (4.0 * i + 3.0);
  }
  return pi;
}

// Question 2.1 : parallel + taskloop, SANS single.
static double pi_piege(void) {
  double pi = 0.0;
  // TODO
#pragma omp parallel
#pragma omp taskloop reduction(+: pi)
  for (long i = 0; i < NB_TERMES; i++) {
    pi += 4.0 / (4.0 * i + 1.0);
    pi -= 4.0 / (4.0 * i + 3.0);
  }
  return pi;
}

// Questions 2.2 et 2.3 : taskloop avec un seul thread créateur de tâches.
static double pi_taskloop(long nb_taches) {
  double pi = 0.0;
  (void)nb_taches; // TODO : à utiliser à la question 2.3
  // TODO
#pragma omp parallel masked taskloop num_tasks(nb_taches) reduction(+: pi)
  for (long i = 0; i < NB_TERMES; i++) {
    pi += 4.0 / (4.0 * i + 1.0);
    pi -= 4.0 / (4.0 * i + 3.0);
  }
  return pi;
}

int main(int argc, char *argv[]) {
  const char *version = argc > 1 ? argv[1] : "seq";
  long nb_taches = argc > 2 ? atol(argv[2]) : 0;
  double pi;
  double debut = omp_get_wtime();
  if (strcmp(version, "seq") == 0)
    pi = pi_seq();
  else if (strcmp(version, "for") == 0)
    pi = pi_for();
  else if (strcmp(version, "piege") == 0)
    pi = pi_piege();
  else if (strcmp(version, "taskloop") == 0)
    pi = pi_taskloop(nb_taches);
  else {
    fprintf(stderr, "version inconnue : %s\n", version);
    return EXIT_FAILURE;
  }
  printf("%-8s tâches=%ld threads=%d pi=%.10f temps=%.3f\n", version,
         nb_taches, omp_get_max_threads(), pi, omp_get_wtime() - debut);
  return EXIT_SUCCESS;
}
