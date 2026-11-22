# Synchronisation en C : aide-mémoire

Tout ce qu'on a vu aux TPs RWMutex et Channel, sur une page. Les exemples et les résultats sont dans [tp_moniteur_lecteur_redacteur](tp/tp4_moniteur_lecteur_redacteur/) et [channel_moniteur](tp/tp5_channel_moniteur/).

## 1. Compiler et lancer

Sur Mac, ça ne marche pas en natif : pas de `<threads.h>`, et `sem_init` renvoie -1 (non implémenté). On passe par un Linux dans Docker (image `tp-sec` : GCC 15, glibc, man, info, gdb).

```sh
open -a Docker                                   # attendre que la baleine soit stable
docker build -t tp-sec .                         # une seule fois (Dockerfile dans chaque dossier de TP)
docker run --rm -it -v "$PWD":/tp tp-sec bash    # shell Linux dans le dossier courant (ou ./tp.sh)

gcc -Wall -O2 mesure.c module.c -o prog          # GCC 15 : C23 par défaut (constexpr, nullptr, 1'000)
time ./prog                                      # real = temps écoulé ; user, sys = CPU, additionné sur tous les cœurs
top                                              # 0 % de CPU = bloqué ; 100 % = ça tourne (peut-être pour rien)
```

- Pas de `-std=c23` strict : glibc y cache `pthread_rwlock_t`. Le défaut (`gnu23`) marche.
- `sys` = temps passé dans le noyau, par exemple à endormir et réveiller des threads.
- Documentation, dans le conteneur : `man -l sujet.1`, `info -f ./sujet.info`, `info libc "ISO C Threads"`, `man sem_init`, `man pthread_rwlock_init`.

## 2. Threads ISO C (`<threads.h>`)

| Fonction | Rôle |
|---|---|
| `thrd_create(&t, f, arg)` | lance `int f(void *arg)` dans un nouveau thread |
| `thrd_join(t, nullptr)` | attend la fin du thread `t` |
| `mtx_init(&m, mtx_plain)` / `mtx_destroy(&m)` | créer / détruire un mutex |
| `mtx_lock(&m)` / `mtx_unlock(&m)` | prendre / rendre le mutex |
| `cnd_init(&c)` / `cnd_destroy(&c)` | créer / détruire une condition |
| `cnd_wait(&c, &m)` | relâche `m` et dort, d'un seul coup ; au réveil, reprend `m` |
| `cnd_signal(&c)` | réveille **un** thread qui dort sur `c` |
| `cnd_broadcast(&c)` | réveille **tous** les threads qui dorment sur `c` |

## 3. Le moniteur

Un état partagé, protégé par **un** mutex, et des conditions pour attendre qu'il change.

```c
mtx_lock(&m);                       // au début de TOUTES les fonctions
nb_attente++;
while (!je_peux_continuer)          // while, jamais if
    cnd_wait(&ma_file, &m);
nb_attente--;
/* modifier l'état */
if (nb_attente_autre_cote > 0)
    cnd_signal(&file_autre_cote);   // ou broadcast, voir ci-dessous
mtx_unlock(&m);                     // à la fin de TOUTES les fonctions
```

- **`while`** : être réveillé ne donne pas la main ; un autre thread a pu passer avant et rendre le test de nouveau faux.
- **Une condition par raison d'attendre** : `signal` réveille alors toujours le bon type de thread.
- **Une seule condition pour deux types** (channel) : obligatoirement `broadcast`. Avec `signal`, on peut réveiller le mauvais type : réveil perdu, interblocage.
- **`signal` si un seul peut avancer** (un rédacteur), **`broadcast` si tous peuvent** (des lecteurs).
- **Un signal sans personne qui dort est perdu** : la condition n'a pas de mémoire.
- Les compteurs de threads en attente servent à décider qui réveiller, et à ne réveiller que s'il y a quelqu'un.

## 4. Sémaphores POSIX (`<semaphore.h>`)

Une boîte à jetons : un compteur jamais négatif.

| Fonction | Rôle |
|---|---|
| `sem_init(&s, 0, k)` | `k` jetons au départ ; `0` = partagé entre les threads d'un même processus |
| `sem_wait(&s)` | prend un jeton, ou dort s'il n'y en a pas |
| `sem_post(&s)` | rend un jeton ; si un thread dormait, il repart avec |
| `sem_destroy(&s)` | détruit le sémaphore |

- **Il a une mémoire** : un `sem_post` sans personne qui attend n'est pas perdu. Donc pas de `while` autour de `sem_wait`.
- Un mutex est rendu par le thread qui l'a pris ; un sémaphore peut être posté par un thread et attendu par un autre.
- **`sem_wait` avant `mtx_lock`** : ne jamais dormir en tenant un mutex.

## 5. Verrou lecteurs-rédacteurs POSIX (`<pthread.h>`)

```c
pthread_rwlock_t l;
pthread_rwlockattr_t attr;
pthread_rwlockattr_init(&attr);
pthread_rwlockattr_setkind_np(&attr, PTHREAD_RWLOCK_PREFER_WRITER_NONRECURSIVE_NP);  // priorité aux rédacteurs
pthread_rwlock_init(&l, &attr);          // nullptr au lieu de &attr : priorité aux lecteurs
pthread_rwlockattr_destroy(&attr);

pthread_rwlock_rdlock(&l);  /* lire */   pthread_rwlock_unlock(&l);
pthread_rwlock_wrlock(&l);  /* écrire */ pthread_rwlock_unlock(&l);
pthread_rwlock_destroy(&l);
```

`PTHREAD_RWLOCK_PREFER_WRITER_NP` (sans `NONRECURSIVE`) est ignoré par glibc.

## 6. Les classes de bugs

| Classe | Symptôme | Exemple |
|---|---|---|
| Interblocage, réveil perdu | figé, **0 % de CPU** | 1 condition + `signal` ; `cnd_wait` sur la mauvaise condition ; dormir sur un sémaphore en tenant le mutex commun |
| Famine | un thread n'avance jamais, les autres oui (100 % de CPU) | rédacteur avec un `pthread_rwlock` par défaut |
| Test non revérifié | dépassement : `nbmessage > n` | `if` au lieu de `while` |
| Accès concurrent non protégé | compteurs ou messages faux, pas reproductible | modifier `i_write` sans tenir le mutex |
| Accès hors du tableau | `Segmentation fault` | oublier le `% n` |
| Variable non initialisée | comportement au hasard | champ oublié dans `init` : ni la pile ni `malloc` ne mettent à zéro |

Un programme qui se termine n'est pas forcément correct, et un programme lent n'est pas forcément bloqué.
