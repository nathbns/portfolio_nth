#include "channel_moniteur.h"
#include <stdlib.h>

channel_moniteur_t *newChannel_moniteur(const unsigned int N) {
	channel_moniteur_t *c = malloc(sizeof(channel_moniteur_t) + N * sizeof(unsigned int));
	if(c == nullptr) return nullptr;
	mtx_init(&c->mutex, mtx_plain);
	cnd_init(&c->cond);
	c->n = N;
	c->nbmessage = 0;
	c->i_read = 0;
	c->i_write = 0;
	c->nb_block_read = 0;
	c->nb_block_write = 0;
	return c;
}

void deleteChannel_moniteur(channel_moniteur_t *c) {
	cnd_destroy(&c->cond);
	mtx_destroy(&c->mutex);
	free(c);
}

void addChannel_moniteur(channel_moniteur_t *c, unsigned int msg) {
	mtx_lock(&c->mutex);
	c->nb_block_write++;
	while(c->n == c->nbmessage)
		cnd_wait(&c->cond, &c->mutex);
	c->nb_block_write--;
	c->tab[c->i_write] = msg;
	c->i_write++;
	c->i_write = c->i_write % c->n;
	c->nbmessage++;
	if(c->nb_block_read > 0) cnd_broadcast(&c->cond);
	mtx_unlock(&c->mutex);
}

unsigned int popChannel_moniteur(channel_moniteur_t *c) {
	mtx_lock(&c->mutex);
	c->nb_block_read++;
	while(c->nbmessage == 0) 
		cnd_wait(&c->cond, &c->mutex);
	c->nb_block_read--;
	unsigned int msg = c->tab[c->i_read];
	c->i_read++;
	c->i_read = c->i_read % c->n;
	c->nbmessage--;
	if(c->nb_block_write > 0) cnd_broadcast(&c->cond);
	mtx_unlock(&c->mutex);
	return msg;
}
