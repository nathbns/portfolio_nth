#include<stdio.h>
#include<omp.h>
#include <unistd.h>

#define DEPS 1000000

void print_result(char* label, int reps, double balance, double total) {
  printf("Après %d dépôts de 1€, vous avez %0.2f€.\nL'opération '%s' a prit %0.10f secondes.\n\n", 
	 reps, balance, label, total);
}

int main() {
  int i;
  double amount = 0.0,
         atomicTime = 0.0;
  
  printf("Vous avez %0.2f€ sur votre compte.\n", amount);

  double startTime = omp_get_wtime();
#pragma omp parallel for 
  for (i = 0; i < DEPS; i++) {
#pragma omp atomic
    amount += 1;
  }
  atomicTime = omp_get_wtime() - startTime;
  print_result("atomic", DEPS, amount, atomicTime);
  
  double startTime_critical = omp_get_wtime();

  amount = 0.0;
#pragma omp parallel for
  for(i=0; i<DEPS; i++) { 
#pragma omp critical
	  amount += 1;
  }

  double criticalTime = omp_get_wtime() - startTime_critical;
  print_result("critical", DEPS, amount, criticalTime);
  return 0;
}

/*
 * 1. Les deux méthodes donnent le bon résultat (1 000 000 €), mais critical est environ 5 fois
 *    plus lent que atomic (avec 4 threads : atomic 0.029 s, critical 0.163 s).
 * 2. atomic : amount += 1 devient UNE seule instruction du processeur (lecture + addition +
 *    écriture d'un coup).
 * 3. critical : c'est un verrou (mutex). À chaque dépôt, le thread doit prendre le verrou
 *    (et attendre si un autre l'a), faire amount += 1, puis rendre le verrou.
 *    Plusieurs opérations au lieu d'une, un million de fois.
 * 4. Pour une simple mise à jour d'une variable, atomic est préférable.
 *    critical sert quand on doit protéger un BLOC de plusieurs instructions.
 * 5. omp_get_wtime() mesure le temps réel écoulé (wall clock), pas le temps CPU : le temps CPU
 *    additionne le travail de tous les cœurs, il serait plus grand que le temps réel.
 * */
