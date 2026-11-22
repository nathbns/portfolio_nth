#include "channel_sem.h"
#include <stdlib.h>

constexpr unsigned int N= 1'000'000;
constexpr int NBTH = 4;

int producteur(void *arg) {
  channel_sem_t *c = (channel_sem_t*)arg;
  for (unsigned int i = 0; i < N; i++) {
      addChannel_sem(c, i);
  }
  return 0;
};

int consommateur(void *arg) {
    channel_sem_t *c = (channel_sem_t*)arg;
    for (unsigned int i = 0; i < N; i++) {
	popChannel_sem(c);
    }
   return 0;
};


int main(int argc, char * [static argc + 1]) {
  thrd_t prod[NBTH], conso[NBTH];
  channel_sem_t *c = newChannel_sem(NBTH - 1);

  for (int i = 0; i < NBTH; i++) {
    thrd_create(&prod[i], producteur, c);
    thrd_create(&conso[i], consommateur, c);
  }
  for (int i = 0; i < NBTH; i++) {
      thrd_join(prod[i], nullptr);
      thrd_join(conso[i], nullptr);
  }
  deleteChannel_sem(c);
  return EXIT_SUCCESS; 
}
