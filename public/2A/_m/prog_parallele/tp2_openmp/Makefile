# TP OpenMP 2 : la programmation par tâches.
#
# Il faut un compilateur C23 + OpenMP : gcc >= 13 (Debian Trixie convient).
#
# make définit CC=cc par défaut : on ne remplace que ce défaut-là, pour
# qu'un « make CC=... » reste prioritaire.
ifeq ($(origin CC),default)
CC := gcc
endif
CFLAGS ?= -std=gnu2x -O2 -Wall -Wextra -g -fopenmp
LDLIBS := -lm

SRC  := $(wildcard *.c)
PROG := $(SRC:.c=)

.PHONY: all clean

all: $(PROG)

clean:
	$(RM) $(PROG)
