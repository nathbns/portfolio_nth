# §2. Calcul de π avec `taskloop`

Code : [pi_taches.c](pi_taches.c). Mesures sur Mac M4 Pro (8 cœurs performance + 4 efficacité), GCC 15 dans Docker.

## Q2.1 : le piège (`parallel` + `taskloop`, sans `single`)

```c
double pi = 0.0;
#pragma omp parallel
#pragma omp taskloop reduction(+: pi)
for (long i = 0; i < NB_TERMES; i++) { ... }
```

| threads | π obtenu | temps |
|---|---|---|
| 1 | 3,1415926486 | 0,132 s |
| 2 | 6,2831852972 (= 2π) | 0,131 s |
| 4 | 12,5663705944 (= 4π) | 0,138 s |
| 12 | 37,6991117831 (= 12π) | 0,152 s |

**Résultat : π × nombre de threads, et aucun gain de temps.**

**Pourquoi.** Dans une région `parallel`, chaque thread exécute tout le bloc, donc les p threads rencontrent le `taskloop`. Chaque thread découpe alors **toute** la boucle en tâches : le calcul est fait p fois. Chaque `taskloop` ajoute sa somme (≈ π) au même `pi` partagé, d'où p × π. Le temps ne baisse pas, puisque p threads font p fois le travail.

> **À retenir.** `for` *partage* une boucle entre les threads. `taskloop` *crée* des tâches pour toute la boucle. Un seul thread doit donc le rencontrer (`single`, ou `masked` : le thread principal), et les autres exécutent les tâches. Forme combinée du cours : `#pragma omp parallel masked taskloop`.

**Piège dans le piège.** Sans `#pragma omp parallel`, on obtient le bon π, mais avec un seul thread : un résultat correct ne prouve pas que le code est parallèle.

## Q2.2 : `pi_taskloop` correct

```c
#pragma omp parallel
#pragma omp single
#pragma omp taskloop reduction(+: pi)
for (long i = 0; i < NB_TERMES; i++) { ... }
```

`parallel` crée les threads, `single` en laisse passer **un** qui crée les tâches, et les autres les exécutent en attendant à la barrière de fin du `single`.

| version (12 threads, min de 3) | π | temps |
|---|---|---|
| seq | 3,1415926486 | 0,102 s |
| for | 3,1415926486 | 0,013 s |
| taskloop | 3,1415926486 | 0,014 s |

**Conclusion.** Résultat juste, et même temps que `for` (accélération ≈ 7,5). Ici, toutes les itérations coûtent pareil, donc l'équilibrage dynamique des tâches n'apporte rien de plus que le découpage statique de `for`.

### `omp for` ou `taskloop` : qui fait quoi ?

Dans les deux cas, **tous les threads calculent**. Ce qui change, c'est comment chacun reçoit son travail.

**`omp for`** : chaque thread **calcule lui-même sa part** à partir de son numéro, sans parler aux autres (c'est le code « à la main » du cours 2) :

```c
debut = id * N / nb_threads;
fin   = (id + 1) * N / nb_threads;
```

Personne ne distribue : la répartition est une formule, connue d'avance. (Le premier arrivé, premier servi n'existe qu'avec `schedule(dynamic)`, cours 3.)

**`taskloop`** : le thread créateur **ne décide pas qui fait quoi**. Il :
1. **découpe** la boucle en paquets (les tâches) et les pose dans une réserve commune ;
2. **attend** la fin des tâches (taskgroup implicite), et pendant ce temps **exécute des tâches lui aussi**.

Chaque thread libre se sert dans la réserve : premier arrivé, premier servi.

| | qui découpe ? | qui calcule ? | comment ? |
|---|---|---|---|
| `omp for` | chaque thread calcule sa part | tous | part fixée d'avance |
| `taskloop` | un seul thread | tous (créateur compris) | chacun pioche dès qu'il est libre |

## Q2.3 : `num_tasks` et `grainsize`

```c
#pragma omp parallel masked taskloop num_tasks(nb_taches) reduction(+: pi)
```

| tâches (12 threads, min de 3) | temps |
|---|---|
| 0 (choix d'OpenMP) | 0,015 s |
| 1 | 0,102 s |
| 12 = p | 0,014 s |
| 120 = 10 p | 0,012 s |
| 10⁴ | 0,102 s |
| 10⁶ | 0,106 s |

**1 tâche** : toute la boucle est dans une seule tâche, qu'un seul thread exécute. C'est le temps séquentiel.

**p à 10 p** : le meilleur cas. 10 p est même un peu mieux que p : avec des tâches plus petites, les threads rapides en prennent plus, ce qui compense les cœurs efficacité plus lents.

**10⁴ et 10⁶** : en théorie, trop de tâches minuscules, donc leur coût de création domine. Mais ici, on retombe *exactement* sur le temps séquentiel, à cause de GCC : au-delà de **64 × p tâches** (768 pour 12 threads), il ne les met plus en réserve, et le thread créateur les exécute toutes lui-même. Vérifié : 700 tâches donnent 0,013 s, 800 tâches 0,104 s.

**`num_tasks` ou `grainsize`** : `num_tasks(t)` fixe le **nombre** de tâches (t tâches). `grainsize(g)` fixe leur **taille** (entre g et 2g itérations par tâche). L'un choisit combien de paquets, l'autre combien d'itérations par paquet.

Exemple avec N = 10⁸ itérations :

| clause | nombre de tâches | taille d'une tâche |
|---|---|---|
| `num_tasks(100)` | 100 (fixé) | 10⁶ itérations (calculé) |
| `grainsize(10⁶)` | ≈ 100 (calculé) | entre 10⁶ et 2·10⁶ itérations (fixé) |

Quand utiliser lequel :
- `num_tasks` : pour s'adapter au **nombre de threads** (par exemple quelques tâches par thread).
- `grainsize` : pour garantir **assez de travail par tâche**, quel que soit N, afin que le coût de création reste négligeable.

Test avec `grainsize(g)` à la place de `num_tasks` (N = 10⁸, 12 threads). Plus g est grand, **moins** il y a de tâches :

| g | tâches | temps | pourquoi |
|---|---|---|---|
| 1 | 10⁸ | 0,45 s | une tâche par itération : 4× plus lent que seq |
| 10³, 10⁵ | 10⁵, 10³ | 0,10 s | plus de 768 tâches : GCC repasse en séquentiel |
| 10⁶ | ≈ 100 | **0,013 s** | quelques tâches par thread : le meilleur |
| 10⁷ | ≈ 10 | 0,016 s | moins de tâches que de threads |
| 10⁸ | 1 | 0,10 s | une seule tâche : séquentiel |

> **À retenir.** Trop peu de tâches : des threads n'ont rien à faire. Trop de tâches : leur coût de gestion domine. Il faut quelques tâches par thread.

**Remarque.** La norme exige `num_tasks` > 0. `num_tasks(0)` marche avec GCC (il choisit lui-même), mais ce n'est pas portable : la version propre fait un `if (nb_taches > 0)` avec deux `taskloop`.
