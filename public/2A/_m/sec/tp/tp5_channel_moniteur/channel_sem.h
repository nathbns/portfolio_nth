#pragma once

#include <threads.h>
#include <semaphore.h>

typedef struct {
	mtx_t mutex_read;
	mtx_t mutex_write;
	sem_t case_libres; // dans le tampon
	sem_t case_occupees;
	unsigned int n;
	unsigned int i_read;
	unsigned int i_write;
	unsigned int tab[];
} channel_sem_t;

channel_sem_t *newChannel_sem(const unsigned int NBTH);

void addChannel_sem(channel_sem_t *c, unsigned int i);

unsigned int popChannel_sem(channel_sem_t *c);

void deleteChannel_sem(channel_sem_t *sem);
