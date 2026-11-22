#include <assert.h>
#include <stdatomic.h>
#include <stdint.h>
#include <threads.h>
#include <unistd.h>
#include <stdlib.h>
#include <pthread.h>

static int a = 0;
static int b = 0;
//static bool occupation = false;
//static atomic_int tour = 0;
//static mtx_t m;
static pthread_rwlock_t rw;

constexpr uint64_t NB = 10'000'000;

void debutSectionCritique([[maybe_unused]] int me) {
  pthread_rwlock_wrlock(&rw);
}



void finSectionCritique([[maybe_unused]] int me) {
  pthread_rwlock_unlock(&rw);
}

void DoubleInc(int me) {
  debutSectionCritique(me);
  a++;
  b++;
  finSectionCritique(me);
}

void Check(int me) {
  pthread_rwlock_rdlock(&rw);
  //debutSectionCritique(me);
  assert(a == b);
  finSectionCritique(me);
}

int ManyTimes(void *arg) {
  int me = (long int)arg;
  assert(me == 0 || me == 1);
  for (uint64_t i = 0; i < NB; i++) {
    DoubleInc(me);
    Check(me);
  }
  return 0;
}

int ManyChecks(void *arg) {
  int me = (long int)arg;
  for (uint64_t i = 0; i < NB; i++) {
    Check(me);
  }
  return 0;
}

int main() {
  thrd_t lecteurs[10], t1, t2;

  pthread_rwlock_init(&rw, nullptr);

  for(long i=0; i<10; i++) thrd_create(&lecteurs[i], ManyChecks, (void *) i);

  thrd_create(&t1, ManyTimes, (void *) 0);
  thrd_create(&t2, ManyTimes, (void *) 1);

  for(int i=0; i<10; i++) thrd_join(lecteurs[i], nullptr); 
  thrd_join(t1, nullptr);
  thrd_join(t2, nullptr);

  pthread_rwlock_destroy(&rw);

  assert(a == 2 * NB);
  assert(b == 2 * NB);

  return 0;
}
