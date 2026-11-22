#include <stdio.h>
#include <omp.h>

int n = 10;
#pragma omp threadprivate(n)

void imprime(void) {
  printf("n vaut %d\n", n);
}

int main(void) {
  printf("Avant la région parallèle, n = %d\n", n);
#pragma omp parallel
  {
    int id = omp_get_thread_num();
    n = id;
    printf("Thread %d : n = %d (variable locale à la région)\n", id, n);
    imprime();
  }
  return 0;
}


/*
 * 1. Avec private(n) : imprime() affiche toujours "n vaut 10", pour tous les threads, alors que
 *    dans la région chaque thread a mis n = id. Ce n'est pas ce qu'on attendrait d'une variable
 *    private : private ne remplace n par la copie privée que dans le code écrit entre les
 *    accolades de la région. imprime() est une fonction à part : elle voit toujours la variable
 *    globale partagée, jamais modifiée (tous les n = id vont dans les copies), donc 10.
 * 2. Avec #pragma omp threadprivate(n), juste après la déclaration de la globale : chaque thread
 *    a sa propre copie de la globale, visible PARTOUT, y compris dans les fonctions qu'il appelle.
 *    imprime() affiche maintenant la même valeur que la région (n = id).
 *    La copie est persistante : elle garde sa valeur d'une région parallèle à la suivante
 *    (si le nombre de threads ne change pas).
 * 3. Différence : private agit sur le CODE de la région (le texte entre les accolades),
 *    threadprivate agit sur la VARIABLE elle-même, pour tout le code exécuté par le thread.
 *    threadprivate se déclare une seule fois, à côté de la globale, pas dans le pragma parallel.
 * */
