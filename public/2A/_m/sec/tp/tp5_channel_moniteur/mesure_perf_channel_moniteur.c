#include "channel_moniteur.h"
#include <stdlib.h>

constexpr unsigned int N= 1'000'000;
constexpr int NBTH = 4;

int producteur(void *arg) {
  channel_moniteur_t *c = (channel_moniteur_t*)arg;
  for (unsigned int i = 0; i < N; i++) {
      addChannel_moniteur(c, i);
  }
  return 0;
};

int consommateur(void *arg) {
    channel_moniteur_t *c = (channel_moniteur_t*)arg;
    for (unsigned int i = 0; i < N; i++) {
	popChannel_moniteur(c);
    }
   return 0;
};

int main(int argc, char * [static argc + 1]) {
  thrd_t prod[NBTH], conso[NBTH];
  channel_moniteur_t *chan = newChannel_moniteur(NBTH - 1);

  for (int i = 0; i < NBTH; i++) {
    thrd_create(&prod[i], producteur, chan);
    thrd_create(&conso[i], consommateur, chan);
  }
  for (int i = 0; i < NBTH; i++) {
      thrd_join(prod[i], nullptr);
      thrd_join(conso[i], nullptr);
  }
  deleteChannel_moniteur(chan);
  return EXIT_SUCCESS; 
}
