#include <stdio.h>
#include <omp.h>
#include <stdlib.h>
#include <time.h>

#define SIZE 1000000

void init(int* tab, int size);
int seq_sum(int* tab, int size);
int par_sum(int* tab, int size);

int main(int argc, char** argv) {
  
  int tab[SIZE];
  init(tab, SIZE);
  
  printf("Somme séquentielle = %d\n", seq_sum(tab, SIZE));
  printf("Somme parallele = %d\n", par_sum(tab, SIZE));
}

void init(int* tab, int size) {
  srand(time(NULL));
  for (int i = 0 ; i < size ; i++) {
    tab[i] = rand() % 1000;
  }
}

int seq_sum(int* tab, int size) {
  int sum = 0;
  for (int i = 0 ; i < size ; i++) {
    sum += tab[i];
  }
  return sum;
}


int par_sum(int* tab, int size) {
  int sum = 0;
  #pragma omp parallel for reduction(+:sum)
	for(int i=0; i<size; i++) {
		sum += tab[i];
	}
  return sum;
}

/*
 * 1. reduction(+:sum) remplace le #pragma omp atomic : même résultat que la somme séquentielle.
 * 2. Ce que fait OpenMP :
 *    - chaque thread a SA copie de sum, initialisée à 0 (valeur neutre de +) ;
 *    - chaque thread additionne ses éléments dans sa copie, sans protection (personne d'autre
 *      n'y touche) ;
 *    - à la fin de la boucle, OpenMP additionne les copies dans le vrai sum.
 *        thread 0 : sum_0 = tab[0] + ... + tab[249999]
 *        thread 1 : sum_1 = tab[250000] + ... + tab[499999]
 *        ...
 *        à la fin : sum = sum_0 + sum_1 + sum_2 + sum_3
 * 3. Pourquoi c'est mieux qu'atomic : avec atomic, les threads font la queue devant sum un
 *    million de fois. Avec reduction, chacun travaille dans son coin et on ne combine que
 *    4 valeurs à la fin. Mesuré avec 4 threads : atomic 0.0158 s, reduction 0.0001 s.
 * 4. Autres opérateurs : reduction(*:x), reduction(-:x), reduction(max:x), reduction(min:x)...
 *    La copie de chaque thread démarre à la valeur neutre de l'opérateur (0 pour +, 1 pour *).
 * */
