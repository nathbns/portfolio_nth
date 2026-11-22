#include <omp.h>
#include <stdio.h>

int main() {
	int a = 10;
	int b = 20;
	int c = 30;
	int d;
	//int nb = omp_get_num_threads();
	#pragma omp parallel shared(a) private(b) firstprivate(c)
	{
	int n = omp_get_thread_num();
	#pragma omp atomic
	a++;
	printf("a = %d from %d\n", a, n);
	printf("b = %d from %d\n", b, n);
	c++;
	printf("c = %d from %d\n", c, n);

	#pragma omp for lastprivate(conditional:d)
	for(int i=0; i<8; i++) {
		if(i==0) d = i;
		//printf("d = %d dans le thread %d\n", d, n);
	} 
	printf("APRÈS: d = %d dans le thread %d\n", d, n);
	}
	
	printf("Après : a = %d, b = %d, c = %d, d = %d\n", a, b, c, d);
	return 0;
}

/*
 * 1. shared(a) : un seul a pour tous les threads. Il faut la protéger (atomic), et elle garde ses modifications après la région (14 avec 4 threads).
 * 2. private(b) : chaque thread a sa copie de b, non initialisée (valeur au hasard).
 * 3. firstprivate(c) : chaque thread a sa copie de c, initialisée avec la valeur d'avant (30).
 * 4. À la fin de la région, les copies privées sont jetées : après, b vaut toujours 20 et c toujours 30.
 * 5. Par défaut, une variable déclarée avant le pragma est partagée, et une variable déclarée dedans est privée (comme n).
 * 6. lastprivate(d) : se met sur "#pragma omp for" (pas sur parallel), car il faut une boucle.
 *    Chaque thread a sa copie de d pendant la boucle, non initialisée (comme private).
 * 7. À la fin de la boucle, le vrai d reçoit la copie de la DERNIÈRE itération (i = 7),
 *    quel que soit le thread qui l'a exécutée : avec d = i, d = 7 après.
 *    Attention : avec if (i == 0) d = i, la dernière itération n'écrit pas dans d,
 *    on récupère une copie jamais remplie : d = valeur au hasard après.
 * 8. lastprivate(conditional:d) : le vrai d reçoit la valeur de la dernière itération
 *    qui a VRAIMENT écrit dans d. Avec if (i == 0) d = i, d = 0 après.
 * */
