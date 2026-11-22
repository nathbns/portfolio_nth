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
  #pragma omp parallel for
	for(int i=0; i<size; i++) {
  #pragma omp atomic
		sum += tab[i];
	}
  return sum;
}

/*
 *
1. Sans atomic, sum += x se fait en 3 temps : lire sum, ajouter x, réécrire sum.
2. Deux threads peuvent lire la même valeur en même temps, et chacun réécrit la sienne : une addition est perdue.
3. #pragma omp atomic fait les 3 temps d'un seul coup, sans que personne ne puisse s'intercaler.
4. Si un autre thread veut toucher sum pendant ce temps, il attend son tour.
5. Le résultat est juste, mais lent, car les threads font la queue devant la même variable.
 * */
