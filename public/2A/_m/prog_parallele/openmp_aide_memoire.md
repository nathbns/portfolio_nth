# OpenMP : aide-mémoire

Tout ce qu'on a vu aux TP1 et TP2, sur une page. Les exemples et les résultats sont dans [tp1_openmp](tp1_openmp/) et [tp2_openmp](tp2_openmp/).

## 1. Compiler et lancer

```sh
gcc -Wall -Wextra -fopenmp prog.c -o prog   # Linux / machine d'exam
./prog                                      # par défaut : autant de threads que de CPU logiques
OMP_NUM_THREADS=4 ./prog                    # 4 threads, pour cette commande seulement
export OMP_NUM_THREADS=4                    # 4 threads pour toute la session
unset OMP_NUM_THREADS                       # retour au défaut
lscpu                                       # CPU(s) = sockets × cœurs par socket × threads par cœur
nproc                                       # nombre de CPU logiques
```

- Toujours `#include <omp.h>`.
- Sans `-fopenmp`, les `#pragma omp` sont ignorés : le programme tourne sur 1 thread.
- Pas d'espace autour du `=` dans `OMP_NUM_THREADS=4`.

**Sur mon Mac**, `gcc` est en fait clang, qui refuse `-fopenmp`. Deux solutions :

- `gcc-16 -Wall -Wextra -fopenmp prog.c -o prog` (le vrai GCC, installé avec Homebrew) ;
- un Linux dans Docker (image `tp-sec` du TP de SEC) :
  ```sh
  open -a Docker                           # attendre que la baleine soit stable dans la barre de menus
  docker run --rm -it -v $PWD:/tp tp-sec   # shell Linux dans le dossier courant (monté sur /tp)
  ```
  Un binaire compilé dans Docker est un binaire Linux : depuis le terminal du Mac, il donne `exec format error`.

## 2. Le modèle fork / join

```
main()                       1 seul thread (le n° 0)
  │
#pragma omp parallel  {      FORK : création de N threads
  ├── T0 ──┐
  ├── T1 ──┤                 chacun exécute TOUT le bloc
  ├── T2 ──┤
  └── T3 ──┘
}                            JOIN : barrière, on attend que tous aient fini
  │                          de nouveau 1 seul thread
```

- Le compilateur transforme le bloc `{ }` en fonction et la lance sur N threads (comme `pthread_create` puis `pthread_join`).
- OpenMP ne répartit pas le travail tout seul. Pour que les threads fassent des choses différentes, on utilise `omp_get_thread_num()` ou une directive de partage (`for`, `sections`).

## 3. Fonctions

| Fonction | Rôle |
|---|---|
| `omp_get_thread_num()` | mon numéro, de 0 à N−1 |
| `omp_get_num_threads()` | nombre de threads de l'équipe : **vaut 1 en dehors d'une région parallèle** |
| `omp_set_num_threads(n)` | fixe N pour les régions parallèles suivantes |
| `omp_get_wtime()` | temps réel écoulé (wall clock), en secondes |

Mesurer un temps :

```c
double t = omp_get_wtime();
/* ... calcul ... */
printf("%f s\n", omp_get_wtime() - t);
```

`omp_get_wtime()` mesure le temps réel. Le temps CPU, lui, additionne le travail de tous les cœurs : en parallèle, il est plus grand que le temps réel.

Qui décide du nombre de threads, du plus fort au plus faible : `num_threads(n)` sur le pragma, puis `omp_set_num_threads(n)`, puis `OMP_NUM_THREADS`, puis le défaut (nombre de CPU logiques).

## 4. Directives

| Directive | Ce qu'elle fait |
|---|---|
| `#pragma omp parallel` | crée N threads ; **chacun exécute tout le bloc** `{ }` ; barrière à la fin |
| `#pragma omp for` | *à l'intérieur* d'une région parallèle : partage les itérations de la boucle qui suit ; barrière à la fin |
| `#pragma omp parallel for` | les deux en une ligne, placée juste au-dessus du `for` |
| `#pragma omp sections` + `#pragma omp section` | des blocs de code **différents** : chaque bloc est exécuté **une seule fois**, par un seul thread |
| `#pragma omp atomic` | rend **une** mise à jour simple indivisible : `x++`, `x += e`, `x -= e`… |
| `#pragma omp critical (nom)` | **un seul thread à la fois** dans le bloc (c'est un verrou) |
| `#pragma omp threadprivate(x)` | juste après la déclaration d'une **globale** : une copie par thread, visible partout |

## 5. Clauses

```c
#pragma omp parallel shared(a) private(b) firstprivate(c)
#pragma omp for lastprivate(d)
#pragma omp parallel for reduction(+:somme)
```

| Clause | Une copie par thread ? | Valeur de départ de la copie | Après la région ou la boucle |
|---|---|---|---|
| `shared(x)` | non, une seule `x` | — | garde les modifications (**à protéger**) |
| `private(x)` | oui | **au hasard** (non initialisée) | `x` d'origine inchangée |
| `firstprivate(x)` | oui | la valeur d'avant la région | `x` d'origine inchangée |
| `lastprivate(x)` (sur `for`) | oui | au hasard | copie de la **dernière itération**, même si elle n'a rien écrit |
| `lastprivate(conditional:x)` (sur `for`) | oui | au hasard | valeur de la dernière itération qui a **vraiment écrit** dans `x` |
| `reduction(op:x)` | oui | valeur neutre de `op` (0 pour `+`, 1 pour `*`) | `x` d'origine combinée avec toutes les copies |

Autres clauses vues : `num_threads(n)` (sur `parallel`), `schedule(static, 1)` (sur `for` : répartition cyclique au lieu de blocs).

## 6. Partagé ou privé par défaut ?

```c
int a;                         // déclarée AVANT la région  → partagée
int j;
#pragma omp parallel for
for (int i = 0; i < N; i++) {  // indice de la boucle parallélisée → privé automatiquement
    int t;                     // déclarée DEDANS → privée
    for (j = 0; j < M; j++)    // j déclaré avant → PARTAGÉ → il faut private(j)
        ...
}
```

## 7. Protéger une variable partagée

**Règle : variable partagée + au moins un thread qui écrit dedans = protection obligatoire.**

| Outil | Protège | Coût | Quand l'utiliser |
|---|---|---|---|
| `reduction(op:x)` | une accumulation (somme, produit, max…) | quasi nul | dès que c'est possible |
| `atomic` | **une** instruction simple | moyen : les threads font la queue | une mise à jour simple isolée |
| `critical (nom)` | un **bloc** entier | le plus cher : un verrou | plusieurs instructions ou variables à garder cohérentes |

Mesuré au TP1, sur 1 million d'additions : `critical` est environ 5× plus lent qu'`atomic`, et `atomic` environ 100× plus lent que `reduction`.

## 8. Pièges

- Appeler `omp_get_thread_num()` ou `omp_get_num_threads()` **avant** la région : on obtient 0 et 1.
- Race condition : le résultat est faux **au hasard**. Un test qui passe ne prouve rien.
- `private` donne une copie **non initialisée**. Pour garder la valeur d'avant : `firstprivate`.
- `private` ne s'applique qu'au code écrit **entre les accolades** : une fonction appelée voit toujours la globale. Pour une globale : `threadprivate`.
- `critical` **sans nom** utilise un seul verrou pour tout le programme : toujours nommer ses sections critiques.
- Pour garantir une règle sur plusieurs variables (`x == y`), protéger les écritures **et** les lectures, avec le même verrou.
- Paralléliser la boucle **extérieure** (les threads ne sont créés qu'une fois) et mettre ses indices internes en `private`.
- Deux `printf` séparés peuvent être coupés par la ligne d'un autre thread : un seul `printf` par information.
- Plus de threads que de cœurs ne va pas plus vite : le gain plafonne vers le nombre de cœurs physiques.
- L'ordre des affichages n'est jamais garanti.

## 9. Sans pragma (§9 du TP1, à faire)

```c
#pragma omp parallel shared(a)          // avec pragma
[[omp::directive(parallel shared(a))]]  // même chose sans pragma (testé avec GCC 15)
```

## 10. Les tâches (TP2)

Une **tâche** = un bout de travail posé dans une réserve commune. Tout thread libre de l'équipe en prend une et l'exécute.

```c
#pragma omp parallel                    // crée l'équipe de threads
#pragma omp single                      // UN SEUL thread crée les tâches
#pragma omp taskloop reduction(+: s)    // découpe la boucle en tâches
for (long i = 0; i < N; i++) s += f(i);

#pragma omp parallel masked taskloop reduction(+: s)   // même chose en une ligne
```

| Directive / clause | Ce qu'elle fait |
|---|---|
| `#pragma omp single` | un seul thread (n'importe lequel) exécute le bloc ; barrière à la fin |
| `#pragma omp masked` | seul le thread principal (n° 0) exécute le bloc ; pas de barrière |
| `#pragma omp taskloop` | découpe la boucle en tâches, puis attend qu'elles soient toutes finies |
| `num_tasks(t)` | exactement t tâches (t > 0) |
| `grainsize(g)` | entre g et 2g itérations par tâche |
| `reduction(+: s)` | une copie privée de `s` par tâche, additionnées à la fin |

**`for` ou `taskloop` ?** Dans les deux cas, tous les threads calculent.

| | qui découpe ? | comment chaque thread reçoit son travail |
|---|---|---|
| `omp for` | chaque thread calcule sa part avec son numéro | part fixée d'avance |
| `taskloop` | un seul thread | il pioche une tâche dès qu'il est libre (créateur compris) |

Pièges :

- `taskloop` (ou `task`) dans une région `parallel` **sans `single`** : chaque thread crée toute la boucle, donc le travail est fait p fois (au TP2 : π × p).
- Sans `parallel`, le résultat est juste mais avec 1 seul thread : un bon résultat ne prouve pas que c'est parallèle.
- Trop peu de tâches : des threads n'ont rien à faire. Trop de tâches : leur coût de gestion domine. Viser quelques tâches par thread.
- GCC : au-delà de 64 × p tâches en attente, le créateur les exécute lui-même, et la boucle redevient séquentielle.

Mesurer : au moins 3 exécutions, garder le minimum. Accélération S_p = T_seq / T_p, avec T_seq le temps de la version **séquentielle** (pas de la version parallèle lancée sur 1 thread).
