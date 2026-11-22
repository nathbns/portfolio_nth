#pragma once
#include <threads.h>


typedef struct {
	mtx_t mutex;
	cnd_t cnd_lecteurs; //file d'attente lecteurs
	cnd_t cnd_ecrivains; //file d'attente redacteur
	int nb_lecteur_attente;
	int nb_ecrivain_attente;
	int nb_lecteur_actif;
	bool ecrivain_actif;
} rwmutex_t;

void rwmutex_init(rwmutex_t *l);
void rwmutex_rdlock(rwmutex_t *l);
void rwmutex_rdunlock(rwmutex_t *l);
void rwmutex_wrlock(rwmutex_t *l);
void rwmutex_wrunlock(rwmutex_t *l);
bool rwmutex_tryrdlock(rwmutex_t *l);
bool rwmutex_trywrlock(rwmutex_t *l);
void rwmutex_destroy(rwmutex_t *l);
