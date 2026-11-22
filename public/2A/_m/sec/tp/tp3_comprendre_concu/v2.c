#include <assert.h>
#include <stdatomic.h>
#include <stdint.h>
#include <threads.h>

static int a = 0;
static int b = 0;
static bool occupation = false;

constexpr uint64_t NB = 10'000'000;

void debutSectionCritique([[maybe_unused]] int me) {
  occupation = true;
  alpha: 
	if(occupation)
		goto alpha;
}

void finSectionCritique([[maybe_unused]] int me) {
  occupation = false;
}

void DoubleInc(int me) {
  debutSectionCritique(me);
  a++;
  b++;
  finSectionCritique(me);
}

void Check(int me) {
  debutSectionCritique(me);
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

int main() {
  thrd_t t1, t2;

  thrd_create(&t1, ManyTimes, (void *)0);
  thrd_create(&t2, ManyTimes, (void *)1);
  thrd_join(t1, nullptr);
  thrd_join(t2, nullptr);

  assert(a == 2 * NB);
  assert(b == 2 * NB);
  return 0;
}
