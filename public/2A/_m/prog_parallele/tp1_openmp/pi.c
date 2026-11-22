#include <stdio.h>
#include <omp.h>

#define NB_TERMES 100000000

int main(void) {
  double pi = 0.0;
  double debut = omp_get_wtime();
#pragma omp parallel for reduction(+:pi)
  for (long i = 0; i < NB_TERMES; i++) {
    pi += 4.0 / (4.0 * i + 1.0);
    pi -= 4.0 / (4.0 * i + 3.0);
  }
  printf("pi vaut environ %f (calculé en %f secondes)\n", pi, omp_get_wtime() - debut);
  return 0;
}

/*
 * 1. reduction(+:pi) : chaque thread calcule sa somme partielle, OpenMP les additionne à la fin.
 *    pi vaut environ 3.141593 quel que soit le nombre de threads.
 * 2. Temps mesurés (meilleur de 5 essais, Mac 8 cœurs performance + 4 efficacité, dans Docker) :
 *      threads :  1      2      4      8      12     24
 *      temps   :  0.161  0.083  0.044  0.024  0.024  0.024  s
 *      gain    :  1      1.9    3.6    6.8    6.7    6.7   (gain = temps à 1 thread / temps)
 * 3. Jusqu'à 8 threads, le temps diminue presque proportionnellement : 2 fois plus de threads,
 *    presque 2 fois plus rapide. Pas exactement, car créer les threads et combiner les copies
 *    de la réduction coûte un peu de temps.
 * 4. Au-delà de 8 threads, on ne gagne plus rien :
 *    - le Mac n'a que 8 cœurs rapides, les 4 autres (efficacité) sont plus lents. Chaque thread
 *      reçoit autant d'itérations, donc les threads sur les cœurs lents finissent en dernier
 *      et le temps total ne baisse plus ;
 *    - au-delà de 12 threads, il y a plus de threads que de cœurs : ils se partagent les cœurs,
 *      ça ne va pas plus vite.
 * 5. Sur un PC Intel/AMD avec hyperthreading (machine d'exam) : le gain plafonne vers le nombre
 *    de cœurs PHYSIQUES. Les threads hyperthreading partagent un cœur et rapportent peu.
 * 6. Les temps varient d'un lancement à l'autre (autres programmes, démarrage) : lancer plusieurs
 *    fois et garder le meilleur.
 * */
