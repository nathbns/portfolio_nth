#include "rwmutex.h"

void rwmutex_init(rwmutex_t *l) {
	mtx_init(&l->m, mtx_plain);
	cnd_init(&l->cnd_lecteurs);
	cnd_init(&l->cnd_ecrivains);
	l->nb_lecteur_attente = 0;
	l->nb_ecrivain_attente = 0;
	l->nb_lecteur_actif = 0;
	l->ecrivain_actif = false;
}

void rwmutex_rdlock(rwmutex_t *l) {
	mtx_lock(&l->m);
	l->nb_lecteur_attente++;
	while(l->ecrivain_actif || l->nb_ecrivain_attente > 0)
		cnd_wait(&l->cnd_lecteurs, &l->m);
	l->nb_lecteur_attente--;
	l->nb_lecteur_actif++;
	mtx_unlock(&l->m);
}

void rwmutex_rdunlock(rwmutex_t *l) {
	mtx_lock(&l->m);
	l->nb_lecteur_actif--;
	if(l->nb_lecteur_actif == 0 && l->nb_ecrivain_attente > 0)
	       cnd_signal(&l->cnd_ecrivains);
	mtx_unlock(&l->m);	
}

void rwmutex_wrlock(rwmutex_t *l) {
	mtx_lock(&l->m);
	l->nb_ecrivain_attente++;
	while(l->ecrivain_actif || l->nb_lecteur_actif > 0)
		cnd_wait(&l->cnd_ecrivains, &l->m);
	l->nb_ecrivain_attente--;
	l->ecrivain_actif = true;
	mtx_unlock(&l->m);
}

void rwmutex_wrunlock(rwmutex_t *l) {
	mtx_lock(&l->m);
	l->ecrivain_actif = false;
	if(l->nb_ecrivain_attente > 0)
		cnd_signal(&l->cnd_ecrivains);
	else if(l->nb_lecteur_attente > 0)
		cnd_broadcast(&l->cnd_lecteurs);
	mtx_unlock(&l->m);
}

bool rwmutex_tryrdlock(rwmutex_t *l) {
	mtx_lock(&l->m);
	bool ok = !l->ecrivain_actif && l->nb_ecrivain_attente == 0;
	if(ok) l->nb_lecteur_actif++;
	mtx_unlock(&l->m);
	return ok;	
}

bool rwmutex_trywrlock(rwmutex_t *l) {
	mtx_lock(&l->m);
	bool ok = l->nb_lecteur_actif == 0 && l->ecrivain_actif == false;
	if(ok) l->ecrivain_actif = true;
	mtx_unlock(&l->m);
	return ok;
}

void rwmutex_destroy(rwmutex_t *l) {
	mtx_destroy(&l->m);
	cnd_destroy(&l->cnd_lecteurs);
	cnd_destroy(&l->cnd_ecrivains);
}
