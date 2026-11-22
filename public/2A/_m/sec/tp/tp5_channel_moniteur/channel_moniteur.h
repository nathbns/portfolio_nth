#pragma once

#include <threads.h>

typedef struct {
	mtx_t mutex;
	cnd_t cond; // une seul cond demande
	unsigned int n; // taille du tampon
	unsigned int nbmessage; // nbmessage dans tampon
	unsigned int i_read; // prochaine case a lire
	unsigned int i_write;
	unsigned int nb_block_read;
	unsigned int nb_block_write;
	unsigned int tab[];
} channel_moniteur_t;

channel_moniteur_t *newChannel_moniteur(const unsigned int NBTH);

void addChannel_moniteur(channel_moniteur_t *c, unsigned int i);

unsigned int popChannel_moniteur(channel_moniteur_t *c);

void deleteChannel_moniteur(channel_moniteur_t *chan);
