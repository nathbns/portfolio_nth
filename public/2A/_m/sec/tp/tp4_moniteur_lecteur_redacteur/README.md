# TP RWMutex : lecteurs-rédacteurs en moniteur

[![Vidéo d'explication du TP (10 min)](video.jpg)](video.mp4)

Sujet : [sujet_tp_rwmutex.pdf](sujet_tp_rwmutex.pdf) (énoncé `rwmutex.1`, indications `rwmutex.info`). Les commandes sont dans l'[aide-mémoire](../../synchro_aide_memoire.md).

| Étape | Fichier |
|---|---|
| Prérequis 1 : version POSIX, puis priorité aux rédacteurs | [mesure_perf_rwmutex_posix.c](mesure_perf_rwmutex_posix.c) |
| Le moniteur, avec priorité aux rédacteurs | [rwmutex.h](rwmutex.h), [rwmutex.c](rwmutex.c) |
| Programme de test du moniteur | [mesure_perf_rwmutex_moniteur.c](mesure_perf_rwmutex_moniteur.c) |

Mesures dans Docker (GCC 15, glibc 2.41) sur un Mac 12 cœurs.

---

## Le problème

Lire à plusieurs ne casse rien. Écrire pendant qu'un autre lit ou écrit, si. La règle : **plusieurs lecteurs ensemble, ou un rédacteur seul**.

Le programme de test : 10 lecteurs lisent `globalversion` en boucle, 1 rédacteur écrit les versions 1 à 1000 (un `=` affiché par écriture). Un lecteur s'arrête quand il lit la version 1000.

## Prérequis 1 : POSIX par défaut, la famine

Mesuré : au bout de 20 s, `|` puis **aucun `=`** (0 écriture sur 1000), et 200 s de CPU en 20 s (10 cœurs à 100 %).

```
L1 : ██████  ██████  ██████  ██████
L2 :    ██████  ██████  ██████  ███
L3 : ███  ██████  ██████  ██████
base : jamais vide  →  R attend pour toujours
```

Par défaut, glibc donne la **priorité aux lecteurs** : un lecteur entre même si un rédacteur attend. Les 10 lecteurs se relaient, donc la base n'est jamais vide.

C'est une **famine**, pas un interblocage : les lecteurs, eux, avancent (100 % de CPU).

## Le moniteur

1. **Un mutex** : TOUTES les fonctions commencent par `mtx_lock` et finissent par `mtx_unlock`.
2. **Une condition = une file d'attente** : `cnd_wait(&cond, &mutex)` relâche le mutex et endort le thread, d'un seul coup ; au réveil, il reprend le mutex.
3. **`while`, jamais `if`** : être réveillé ne donne pas la main, un autre thread a pu passer avant. On reteste.

La structure : 4 compteurs qui décrivent l'état, plus le mutex et **une condition par type de thread**.

| Champ | Rôle |
|---|---|
| `nb_lecteur_attente`, `nb_ecrivain_attente` | combien attendent |
| `nb_lecteur_actif`, `ecrivain_actif` | qui est dans la base |
| `cnd_lecteurs`, `cnd_ecrivains` | où dorment les lecteurs, où dorment les rédacteurs |

## Les 4 fonctions

| Fonction | Attend tant que (`while`) | Sur | En sortant, réveille |
|---|---|---|---|
| `rdlock` | `ecrivain_actif \|\| nb_ecrivain_attente > 0` | `cnd_lecteurs` | |
| `rdunlock` | | | si dernier lecteur et un rédacteur attend : `cnd_signal(&cnd_ecrivains)` |
| `wrlock` | `ecrivain_actif \|\| nb_lecteur_actif > 0` | `cnd_ecrivains` | |
| `wrunlock` | | | un rédacteur attend : `cnd_signal(&cnd_ecrivains)` ; sinon : `cnd_broadcast(&cnd_lecteurs)` |

- **La priorité aux rédacteurs**, c'est `nb_ecrivain_attente > 0` dans `rdlock` : un lecteur qui arrive se range derrière le rédacteur qui attend, même si la base est en lecture.
- **`signal` pour un rédacteur** (un seul peut écrire), **`broadcast` pour les lecteurs** (ils lisent tous ensemble).
- `wrlock` attend aussi les lecteurs encore dans la base (`nb_lecteur_actif > 0`) : le pseudo-code du `.info` ne le dit pas, mais c'est indispensable.
- **`try`** : même test que le `while`, mais `return false` au lieu d'attendre. Elles ne touchent pas aux compteurs d'attente, puisqu'elles n'attendent jamais.

## Deux bugs dans ma première version (corrigés)

| Bug | Symptôme mesuré |
|---|---|
| `init` mettait `nb_lecteur_attente` à 0 deux fois, et jamais `nb_ecrivain_attente` (valeur au hasard) | le rédacteur fait ses 1000 écritures et affiche `DONE`, puis le programme ne se termine jamais, à 0 % de CPU |
| `wrlock` attendait sur `cnd_lecteurs`, alors que les réveils arrivent sur `cnd_ecrivains` | seul, ce bug bloque tout de suite : 0 écriture |

**Bug 1.** Les lecteurs croient qu'un rédacteur attend : ils dorment dès le début. À la fin, le rédacteur croit qu'un autre rédacteur attend : il réveille `cnd_ecrivains` (vide) au lieu des lecteurs, qui dorment pour toujours.

**Bug 2.** Le dernier lecteur réveille `cnd_ecrivains`, mais le rédacteur dort dans `cnd_lecteurs` : **réveil perdu**. Les nouveaux lecteurs voient un rédacteur en attente et dorment aussi.

> **À retenir.** Chaque `cnd_wait` se fait sur la condition où les autres envoient le réveil. Programme figé à 0 % de CPU = interblocage ou réveil perdu.

## Résultats

| Version | Temps | Lectures par écriture |
|---|---|---|
| POSIX par défaut | jamais fini (0 écriture en 20 s) | |
| POSIX, `PREFER_WRITER_NP` | jamais fini (0 écriture en 15 s) | |
| POSIX, `PREFER_WRITER_NONRECURSIVE_NP` | 0,04 s | ≈ 700 |
| Mon moniteur (corrigé) | 0,03 s | ≈ 20 |

**Priorité aux rédacteurs en POSIX** :

```c
pthread_rwlockattr_t attr;
pthread_rwlockattr_init(&attr);
pthread_rwlockattr_setkind_np(&attr, PTHREAD_RWLOCK_PREFER_WRITER_NONRECURSIVE_NP);
pthread_rwlock_init(&l, &attr);
pthread_rwlockattr_destroy(&attr);
```

- `_np` = non portable : extension de glibc.
- **Piège** : `PTHREAD_RWLOCK_PREFER_WRITER_NP` existe, mais glibc l'ignore (`man pthread_rwlockattr_setkind_np`). POSIX permet à un thread de reprendre en lecture un verrou qu'il tient déjà. Avec la priorité aux rédacteurs, il attendrait le rédacteur, qui l'attend lui : interblocage. La version `NONRECURSIVE` interdit ce cas.

**Pourquoi POSIX fait ≈ 30 fois plus de lectures.** Dans glibc, prendre le verrou en lecture est une seule opération atomique, sans mutex : les lecteurs entrent vraiment ensemble. Dans le moniteur, chaque `rdlock` et chaque `rdunlock` passe par le mutex : les lecteurs font la queue pour entrer et pour sortir.

## Destruction

`rwmutex_destroy` : `cnd_destroy` des deux conditions, puis `mtx_destroy`, appelé à la fin du `main`. Côté POSIX : `pthread_rwlock_destroy`. Sous Linux, ce ne sont que des entiers, mais pas sur tous les systèmes.
