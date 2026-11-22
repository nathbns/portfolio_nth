#include <omp.h>
#include <unistd.h>
#include <stdio.h>


#define NB_THREADS 2

void calculations1() {
#pragma omp critical(calc1)
  {
    sleep(1);
  }
}

void calculations2() {
#pragma omp critical (calc2)
  {
    sleep(2);
  }
}


int main() {
  omp_set_num_threads(2);
  double start = omp_get_wtime();
#pragma omp parallel
  {
    int id = omp_get_thread_num();
    if (id == 0) {
      calculations1();
    } else {
      calculations2();
    }
  }
  printf("Terminé en %f secondes.\n", omp_get_wtime() - start);
}

/*
 * 1. Sans nom : "Terminé en 3.007281 secondes."
 *    Le thread 0 fait sleep(1) et le thread 1 fait sleep(2), en parallèle : on attendrait
 *    max(1, 2) = 2 s. On obtient 1 + 2 = 3 s : les deux threads ont attendu l'un après l'autre.
 * 2. Pourquoi : toutes les sections critical SANS NOM partagent UN SEUL verrou, même si elles
 *    sont dans des fonctions différentes et protègent des choses sans rapport.
 *    Pendant que le thread 1 est dans son critical (sleep(2)), le thread 0 ne peut pas entrer
 *    dans le sien (sleep(1)) : il attend. Les deux blocs s'exécutent l'un après l'autre.
 * 3. Noms différents, critical(calc1) et critical(calc2) : "Terminé en 2.002044 secondes."
 *    Chaque nom a SON propre verrou : les deux threads ne se bloquent plus, les deux sleep
 *    se font en même temps, donc max(1, 2) = 2 s.
 * 4. Même nom pour les deux, critical(calc) : 3 s, comme sans nom.
 *    Même nom = même verrou : les threads s'attendent de nouveau l'un l'autre.
 * 5. À retenir : critical sans nom = un seul verrou pour TOUT le programme. Toujours nommer
 *    ses sections critiques, et donner le même nom uniquement aux sections qui protègent
 *    les mêmes données. Sinon, des blocs sans rapport se ralentissent, et c'est très
 *    difficile à repérer.
 * */
