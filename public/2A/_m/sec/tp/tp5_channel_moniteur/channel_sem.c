#include "channel_sem.h"
#include <stdlib.h>

channel_sem_t *newChannel_sem(const unsigned int N) {
	channel_sem_t *c = malloc(sizeof(channel_sem_t) + N * sizeof(unsigned int));
	if(c == nullptr) return nullptr;
	mtx_init(&c->mutex_read, mtx_plain);
	mtx_init(&c->mutex_write, mtx_plain);
	sem_init(&c->case_libres, 0, N);
	sem_init(&c->case_occupees, 0, 0);
	c->n = N;
	c->i_read = 0;
	c->i_write = 0;
	return c;	
}

void deleteChannel_sem(channel_sem_t *c) {
	mtx_destroy(&c->mutex_read);
	mtx_destroy(&c->mutex_write);
	sem_destroy(&c->case_libres);
	sem_destroy(&c->case_occupees);
	free(c);
}

void addChannel_sem(channel_sem_t *c, unsigned int msg) {
	/*
	 * sem_wait, prend un jeton case_libres
	 * s'il y en a plus, le tampon est plein, et le thread dort
	 * jusqua quun consommateur en rende un.
	 * */
	sem_wait(&c->case_libres); // --
	mtx_lock(&c->mutex_write);
	c->tab[c->i_write] = msg;
	c->i_write++;
	c->i_write = c->i_write % c->n;
	mtx_unlock(&c->mutex_write);
	/*
	 * sem_post, ajoute un jeton a case_occupees
	 * cad un message de plus,
	 * si un consommateur dormait il repart
	 * */
	sem_post(&c->case_occupees); // ++
}

unsigned int popChannel_sem(channel_sem_t *c) {
	sem_wait(&c->case_occupees); // --
	mtx_lock(&c->mutex_read);
	unsigned int msg = c->tab[c->i_read];
	c->i_read++;
	c->i_read = c->i_read % c->n;
	mtx_unlock(&c->mutex_read);
	sem_post(&c->case_libres); // ++
	return msg;
}
