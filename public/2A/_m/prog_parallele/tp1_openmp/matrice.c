#include <stdio.h>
#include <stdlib.h>

#define NRA 62
#define NCA 15
#define NCB 7

int main(void) {
  double a[NRA][NCA], b[NCA][NCB], c[NRA][NCB];
  int i, j, k;

#pragma omp parallel for private(j)
  for (i = 0; i < NRA; i++)
    for (j = 0; j < NCA; j++)
      a[i][j] = i + j;

#pragma omp parallel for private(j)
  for (i = 0; i < NCA; i++)
    for (j = 0; j < NCB; j++)
      b[i][j] = i * j;

#pragma omp parallel for private(j)
  for (i = 0; i < NRA; i++)
    for (j = 0; j < NCB; j++)
      c[i][j] = 0;

#pragma omp parallel for private(j, k)
  for (i = 0; i < NRA; i++)
    for (j = 0; j < NCB; j++)
      for (k = 0; k < NCA; k++)
        c[i][j] += a[i][k] * b[k][j];

  double somme = 0;

#pragma omp parallel for private(j) reduction(+:somme)
  for (i = 0; i < NRA; i++)
    for (j = 0; j < NCB; j++)
      somme += c[i][j];
  printf("Somme de contrôle : %f\n", somme);

  return 0;
}

/*
 * Somme de contrôle correcte : 5491185 (180 exécutions sur 180 avec 1, 2, 4, 8, 12, 24 threads).
 *
 * Règles générales :
 * - On met le pragma sur la boucle la plus EXTÉRIEURE (i) : l'équipe de threads est créée une
 *   seule fois. Un pragma sur une boucle intérieure recrée les threads à chaque tour de la
 *   boucle extérieure (ex. 62 x 7 = 434 fois pour le produit) : c'est lent.
 * - Seul l'indice de la boucle parallélisée (i) devient privé automatiquement. j et k sont
 *   déclarés en haut du main, donc PARTAGÉS par défaut : il faut private(j) / private(j, k),
 *   sinon les threads se volent leurs compteurs de boucle (résultat faux, testé).
 *
 * 1. Initialisation de a : #pragma omp parallel for private(j)
 *    Chaque thread remplit des lignes entières a[i][...]. Deux threads n'écrivent jamais
 *    la même case, donc pas besoin d'atomic. private(j) : chaque thread a son propre j.
 * 2. Initialisation de b : #pragma omp parallel for private(j)
 *    Même raisonnement : chaque thread remplit des lignes b[i][...] différentes.
 * 3. Mise à zéro de c : #pragma omp parallel for private(j)
 *    Même raisonnement : lignes c[i][...] différentes pour chaque thread.
 * 4. Produit c = a x b : #pragma omp parallel for private(j, k)
 *    Chaque thread calcule des LIGNES ENTIÈRES de c : c[i][j] n'est écrit que par le thread
 *    qui a la ligne i, donc pas de conflit. a et b sont seulement lus : partagés sans risque.
 *    À NE PAS FAIRE : paralléliser la boucle k. Tous les threads feraient alors
 *    c[i][j] += ... sur la MÊME case : race condition, somme fausse (testé).
 * 5. Somme de contrôle : #pragma omp parallel for private(j) reduction(+:somme)
 *    Tous les threads ajoutent dans la même variable somme : reduction donne à chaque thread
 *    sa copie (à 0) et additionne les copies à la fin. Le pragma est sur la boucle i
 *    (extérieure) avec private(j), comme les autres : les threads ne sont créés qu'une fois.
 *    (Sur la boucle j, ce serait juste aussi, mais les threads seraient recréés 62 fois.)
 * */
