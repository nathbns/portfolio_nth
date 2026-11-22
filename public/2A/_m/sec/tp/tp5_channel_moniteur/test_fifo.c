// Vérifie que les deux channels rendent les messages dans l'ordre (FIFO).
// Le programme de mesure ne le vérifie pas : il s'arrête même si les messages sont faux.
//   gcc -Wall -O2 test_fifo.c channel_moniteur.c channel_sem.c -o test_fifo && ./test_fifo
#include "channel_moniteur.h"
#include "channel_sem.h"
#include <assert.h>
#include <stdio.h>

constexpr unsigned int N = 200'000;

int producteur_moniteur(void *arg) {
  for (unsigned int i = 0; i < N; i++) addChannel_moniteur(arg, i);
  return 0;
}

int producteur_sem(void *arg) {
  for (unsigned int i = 0; i < N; i++) addChannel_sem(arg, i);
  return 0;
}

int main(void) {
  channel_moniteur_t *m = newChannel_moniteur(3);
  channel_sem_t *s = newChannel_sem(3);

  // 1. Sans thread : add 1, 2, 3 puis 3 pop doivent rendre 1, 2, 3.
  for (unsigned int i = 1; i <= 3; i++) addChannel_moniteur(m, i);
  for (unsigned int i = 1; i <= 3; i++) assert(popChannel_moniteur(m) == i);
  for (unsigned int i = 1; i <= 3; i++) addChannel_sem(s, i);
  for (unsigned int i = 1; i <= 3; i++) assert(popChannel_sem(s) == i);

  // 2. 1 producteur et 1 consommateur (le main) : l'ordre doit être conservé,
  //    alors que le tampon de 3 cases se remplit et se vide sans arrêt.
  thrd_t t;
  thrd_create(&t, producteur_moniteur, m);
  for (unsigned int i = 0; i < N; i++) assert(popChannel_moniteur(m) == i);
  thrd_join(t, nullptr);

  thrd_create(&t, producteur_sem, s);
  for (unsigned int i = 0; i < N; i++) assert(popChannel_sem(s) == i);
  thrd_join(t, nullptr);

  deleteChannel_moniteur(m);
  deleteChannel_sem(s);
  puts("FIFO OK (moniteur et sémaphores)");
  return 0;
}
