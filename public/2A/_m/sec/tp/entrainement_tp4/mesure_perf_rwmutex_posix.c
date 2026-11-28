#include <assert.h>
#include <pthread.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <threads.h>

constexpr unsigned int NBVERSION = 1'000;
constexpr int NBTHL = 10;
constexpr int NBTHE = 1;

atomic_int globalversion = 0;
atomic_int_least64_t globallectures = 0;

int lecteur(void *arg) {
  pthread_rwlock_t *l = (pthread_rwlock_t *)arg;
  int64_t nblectures = 0;
  bool done = false;
  while (!done) {
    pthread_rwlock_rdlock(l);
    int version = globalversion;
    pthread_rwlock_unlock(l);
    nblectures++;
    if (version == NBVERSION) {
      done = true;
    }
  }
  globallectures += nblectures;
  return 0;
};

int ecrivain(void *arg) {
  pthread_rwlock_t *l = (pthread_rwlock_t *)arg;
  printf("|");
  fflush(stdout);
  for (unsigned int i = 1; i <= NBVERSION; i++) {
    pthread_rwlock_wrlock(l);
    globalversion = i;
    printf("=");
    fflush(stdout);
    pthread_rwlock_unlock(l);
  }
  printf(">DONE\n");
  fflush(stdout);
  return 0;
};

int main(int argc, char * [static argc + 1]) {
  thrd_t lecteurs[NBTHL], ecrivains[NBTHE];
  pthread_rwlock_t l;

  int res = pthread_rwlock_init(&l, nullptr);
  assert(res == 0);
  for (int i = 0; i < NBTHE; i++) {
    thrd_create(&ecrivains[i], ecrivain, &l);
  }

  for (int i = 0; i < NBTHL; i++) {
    thrd_create(&lecteurs[i], lecteur, &l);
  }

  for (int i = 0; i < NBTHL; i++) {
    thrd_join(lecteurs[i], nullptr);
  }

  for (int i = 0; i < NBTHE; i++) {
    thrd_join(ecrivains[i], nullptr);
  }
  printf("nb de lectures totales: %ld (ratio: %g (%ld lectures/%d écritures)\n",
         globallectures, ((double)globallectures / globalversion),
         globallectures, globalversion);
  pthread_rwlock_destroy(&l);
  return EXIT_SUCCESS;
}
