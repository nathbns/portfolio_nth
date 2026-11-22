#include <stdio.h>

/*
 * A n'importe quel moment, une lecture simultanée des deux variables doit donner le même
 * résultat. Soit x est toujours égal à y.
 */
void inc_both(int* x, int* y) {
  #pragma omp critical
  {
  (*x)++;
  (*y)++;
  } 
}

int main() {
  int x = 0, y = 0;
  #pragma omp parallel for
  for (int i = 0 ; i < 1000 ; i++) {
    inc_both(&x, &y);
    if (x != y) {
      printf("Erreur\n");
    }
  }
  return 0;
}

/*
 * 1. Pourquoi les deux atomic ne suffisent pas : chaque atomic protège UN seul incrément,
 *    séparément. Or la règle (x == y à tout moment) porte sur les DEUX variables ensemble.
 * 2. Entre (*x)++ et (*y)++, il y a un moment où x a été augmenté mais pas encore y.
 *    Si un autre thread fait if (x != y) à cet instant, il voit x = y + 1 : "Erreur".
 *      Thread A : (*x)++        -> x = 1, y = 0
 *      Thread B : if (x != y)   -> lit x = 1, y = 0 -> "Erreur"
 *      Thread A : (*y)++        -> x = 1, y = 1
 * 3. atomic garantit qu'aucun incrément n'est perdu (à la fin x = y = 1000), mais PAS que
 *    les deux variables sont modifiées ensemble, d'un seul bloc. Pour ça il faut critical.
 * 4. Correction (dans inc_both) : une seule section critical autour des deux incréments.
 *    Un seul thread à la fois peut être dans le bloc, donc x++ et y++ se font ensemble.
 *    Résultat : on passe d'environ 2 exécutions sur 3 avec "Erreur" à 3 sur 500.
 * 5. Les rares erreurs restantes viennent de la LECTURE if (x != y) du main, qui n'est pas
 *    protégée : critical n'arrête que les threads qui essaient d'ENTRER dans un critical,
 *    pas un thread qui lit x et y ailleurs. Un thread peut donc lire pendant qu'un autre
 *    est entre x++ et y++. Pour une garantie totale, il faudrait aussi faire la lecture
 *    dans un critical (même verrou) : 0 erreur sur 500 exécutions.
 * 6. À retenir : pour garantir une règle sur des variables partagées, il faut protéger
 *    les écritures ET les lectures avec le même verrou.
 * */
