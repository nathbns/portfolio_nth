# §3. Le tri par fusion

Code : [tri_fusion.c](tri_fusion.c). Mesures sur Mac M4 Pro (8 cœurs performance + 4 efficacité), GCC 15 dans Docker.

## Q3.1 : version séquentielle

`./tri_fusion seq` (n = 2²⁴) : **T_seq ≈ 1,27 s** (min de 5). Le nombre de threads ne change rien : `seq` n'a aucune directive OpenMP.

> Mesurer T_seq **dans la même session** que la version parallèle : d'un jour à l'autre, il a varié de 1,19 à 1,27 s.

## Q3.2 : V1, la récursion en tâches

```c
static void tri_v1_rec(int *t, int *tmp, size_t lo, size_t hi) {
  if (hi - lo < 2) return;
  size_t mid = lo + (hi - lo) / 2;
#pragma omp task
  tri_v1_rec(t, tmp, lo, mid);
#pragma omp task
  tri_v1_rec(t, tmp, mid, hi);
#pragma omp taskwait          // la fusion attend les deux moitiés
  fusion(t, tmp, lo, mid, hi);
}

static void tri_v1(int *t, int *tmp, size_t n, size_t seuil) {
#pragma omp parallel          // crée les threads
#pragma omp single            // un seul thread lance le tri
  tri_v1_rec(t, tmp, 0, n);
}
```

- **`single`** : sans lui, les p threads lancent chacun le tri du même tableau, et ils s'écrasent mutuellement.
- **Une tâche est exécutée par un seul thread**, du début à la fin. Le parallélisme vient de ce qu'une tâche en crée d'autres, exécutées par d'autres threads.
- **Bug rencontré** : `mid = (hi - lo) / 2` est une longueur, pas une position. Sur la moitié droite, `mid < lo`, et `hi - lo` en `size_t` « fait le tour » vers un nombre énorme : segfault. Il faut `mid = lo + (hi - lo) / 2`.

## Q3.3 : sans `taskwait`

```
ERREUR : t[10256] = 707683356 > t[10257] = 141618881
ERREUR : t[487] = 2124489958 > t[488] = 8190137
ERREUR : t[14] = 1454112568 > t[15] = 76715487
```

**Pourquoi.** `task` ne fait que *créer* la tâche, sans attendre qu'elle soit faite. Sans `taskwait`, la fusion démarre tout de suite, alors que les deux moitiés ne sont pas encore triées. Pire : les tâches de tri tournent **en même temps** que la fusion, sur les mêmes cases de `t` et `tmp`. C'est une course entre threads : le tableau est faux, et l'endroit de l'erreur change à chaque exécution.

> **À retenir.** Une tâche est exécutée *plus tard*. Si on a besoin de son résultat, il faut l'attendre : `taskwait` attend la fin des tâches **filles**.

## Q3.4 : attributs de partage dans les tâches

`t`, `lo` et `mid` sont des paramètres ou des variables locales de la fonction, donc **`firstprivate`** par défaut : chaque tâche reçoit une **copie de leur valeur au moment de sa création**.

**C'est correct :**
- `lo` et `mid` : chaque tâche garde les bornes de *sa* moitié, même si la tâche s'exécute plus tard.
- `t` : seul le **pointeur** est copié. La copie pointe vers **le même tableau** : toutes les tâches travaillent bien sur le tableau commun, chacune dans sa zone.

> `firstprivate` copie la variable : parfait pour **donner** une valeur à une tâche, inutilisable pour en **récupérer** une (la tâche écrirait dans sa copie, qui disparaît). Pour récupérer un résultat dans une variable locale, il faut `shared` (exemple `fibo` du cours : `task shared(n2)`). Dans le tri, aucun souci : les tâches écrivent dans le tableau, via le pointeur.

## Q3.5 : coût de la V1 (n = 10⁶, 12 threads)

| version | temps |
|---|---|
| seq | 0,080 s |
| v1 | 2,75 s (**≈ 34× plus lent**) |

**Nombre de tâches : 2(n − 1).**
- La récursion coupe jusqu'à des morceaux de 1 élément : n morceaux à la fin.
- Pour obtenir n morceaux en coupant en deux, il faut **n − 1 coupes**, donc n − 1 appels qui ne font pas `return`.
- Chacun crée **2 tâches**, donc 2(n − 1) tâches.

Exemple avec n = 4 :

```
[0,4)                     → crée 2 tâches : [0,2) et [2,4)
  [0,2)                   → crée 2 tâches : [0,1) et [1,2)
  [2,4)                   → crée 2 tâches : [2,3) et [3,4)
  [0,1) [1,2) [2,3) [3,4) → taille 1 : return, aucune tâche
```

3 coupes (= n − 1) × 2 tâches = **6 tâches = 2(4 − 1)**. Pour n = 10⁶ : 1 999 998 tâches, **≈ 2 millions**.

**Pourquoi c'est si lent.** Presque toutes ces tâches trient 1 ou 2 éléments : le travail utile est minuscule, et le coût de chaque tâche (création, file d'attente, `taskwait`) domine. Ici ≈ (2,75 − 0,08) / 2·10⁶ ≈ **1,3 µs par tâche**, pour un travail de quelques nanosecondes.

> Une tâche doit contenir **beaucoup plus de travail** que son coût de création. D'où le seuil de la partie 3.2.

Pour n = 2²⁴ sans seuil : v1 ≈ 33 s, contre ≈ 1,05 s pour seq.

## Q3.6 à 3.9 : trois façons d'arrêter de créer des tâches

**Le principe, commun aux trois** : des tâches pour les **gros** morceaux, du tri **séquentiel** pour les petits (sous le `seuil`). Seule la façon de l'écrire change.

### Q3.6 : la clause `if`

```c
static void tri_v1_rec(int *t, int *tmp, size_t lo, size_t hi, size_t seuil) {
  if (hi - lo < 2) return;
  size_t mid = lo + (hi - lo) / 2;
#pragma omp task if(hi - lo > seuil)
  tri_v1_rec(t, tmp, lo, mid, seuil);
#pragma omp task if(hi - lo > seuil)
  tri_v1_rec(t, tmp, mid, hi, seuil);
#pragma omp taskwait
  fusion(t, tmp, lo, mid, hi);
}
```

- `if(cond)` se lit : « crée une **vraie** tâche si gros morceau ».
- Sous le seuil, la tâche est exécutée **tout de suite, par le thread qui la crée**, au lieu d'aller dans la réserve.
- Mais la récursion continue jusqu'à 1 élément, et **chaque appel reste une tâche** (juste exécutée immédiatement).

**Erreur à éviter** : un `if` du C sous le pragma n'est pas la clause `if`. La tâche serait créée quand même, et sous le seuil elle ne trierait rien : résultat faux.

### Q3.7 : la clause `final`

```c
static void tri_v1_rec(int *t, int *tmp, size_t lo, size_t hi, size_t seuil) {
  if (omp_in_final()) {          // dans une tâche finale : tri séquentiel direct
    tri_seq(t, tmp, lo, hi);
    return;
  }
  if (hi - lo < 2) return;
  size_t mid = lo + (hi - lo) / 2;
#pragma omp task final(hi - lo <= seuil)
  tri_v1_rec(t, tmp, lo, mid, seuil);
#pragma omp task final(hi - lo <= seuil)
  tri_v1_rec(t, tmp, mid, hi, seuil);
#pragma omp taskwait
  fusion(t, tmp, lo, mid, hi);
}
```

- `final(cond)` se lit : « **arrête** les tâches si petit morceau ». La condition est l'**inverse** de celle de `if`.
- Une tâche finale est exécutée tout de suite, **et toutes ses descendantes aussi**.
- `omp_in_final()` permet de le savoir : on appelle alors directement `tri_seq`, sans plus passer par les pragmas.

**Erreurs à éviter** :
- `final(hi - lo > seuil)` : condition inversée, les premières tâches sont déjà finales, et un seul thread trie tout.
- Mettre le test `omp_in_final()` **sous** le pragma : c'est lui qui devient la tâche, et le `return` dans une tâche ne compile pas (« invalid branch to/from OpenMP structured block »). Le test se met **au début de la fonction**.

### Q3.8 : la bascule explicite

```c
static void tri_v1_rec(int *t, int *tmp, size_t lo, size_t hi, size_t seuil) {
  if (hi - lo <= seuil) {        // petit morceau : tri séquentiel, pas de tâche
    tri_seq(t, tmp, lo, hi);
    return;
  }
  size_t mid = lo + (hi - lo) / 2;
#pragma omp task
  tri_v1_rec(t, tmp, lo, mid, seuil);
#pragma omp task
  tri_v1_rec(t, tmp, mid, hi, seuil);
#pragma omp taskwait
  fusion(t, tmp, lo, mid, hi);
}
```

- Un simple test du C : sous le seuil, on appelle `tri_seq` et on sort.
- **Aucune tâche** n'est créée sous le seuil. Pas besoin de clause, et ça marche avec n'importe quel support d'exécution.

### Résumé

**Au-dessus du seuil, les trois méthodes créent exactement les mêmes vraies tâches** (≈ 4 000 pour n = 2²⁴ et seuil = 10⁴), réparties entre les threads. La différence est **uniquement sous le seuil** :

| méthode | condition | sous le seuil… | tâches en plus sous le seuil (exécutées tout de suite) |
|---|---|---|---|
| `if` | `hi - lo > seuil` | la récursion continue jusqu'à 1 élément | une par appel : **≈ 33 millions** |
| `final` | `hi - lo <= seuil` | `omp_in_final()` → `tri_seq` | 2 par morceau, à la frontière : ≈ 4 000 |
| bascule explicite | `hi - lo <= seuil` | `tri_seq` directement | **0** |

### Q3.9 : classement

n = 2²⁴, seuil = 10 000, min de 5 exécutions :

| méthode | 12 threads | 1 thread |
|---|---|---|
| seq | 1,04 s | 1,04 s |
| v1 sans seuil | ≈ 33 s | |
| `if` | 0,24 s | **1,23 s** (+18 % par rapport à seq) |
| `final` | 0,21 s | 1,04 s |
| bascule explicite | 0,21 s | 1,05 s |

**Classement : bascule explicite ≈ `final` > `if`.**

**Pourquoi `if` est la moins efficace.** Sous le seuil, `if` évite seulement de *mettre la tâche en réserve* : elle est quand même **créée** (structure de tâche, copie des variables `firstprivate`, `taskwait`). Et comme la récursion descend jusqu'à 1 élément, ça fait encore ≈ 2n = 33 millions de tâches. Sur 1 thread, ce surcoût se voit seul : +18 % par rapport à `seq`, alors que `final` et la bascule explicite font jeu égal avec `seq`.

On garde la **bascule explicite** : aussi rapide que `final`, et plus simple.

**Variation du seuil** (bascule explicite, n = 2²⁴, 12 threads) :

| seuil | morceaux séquentiels | temps |
|---|---|---|
| 10 | ≈ 2 millions | 4,0 s |
| 10² | ≈ 260 000 | 0,52 s |
| 10³ | ≈ 33 000 | 0,23 s |
| 10⁴ | ≈ 2 000 | **0,22 s** |
| 10⁵ | ≈ 260 | 0,22 s |
| 10⁶ | 32 | 0,22 s |
| 10⁷ | 2 | 0,56 s |

- **Seuil trop petit** : trop de tâches minuscules, leur coût de gestion domine (avec 10, c'est 4× plus lent que `seq`).
- **Seuil trop grand** : trop peu de tâches pour occuper les threads. Avec 10⁷, il n'y a que 2 morceaux : 2 threads travaillent, les 10 autres attendent.
- **Entre les deux** (10³ à 10⁶), un large plateau : il suffit d'avoir **quelques tâches par thread**, chacune avec assez de travail.

> **À retenir.** Une tâche a un coût fixe. Il en faut assez pour occuper tous les threads, mais chacune doit contenir beaucoup plus de travail que ce qu'elle coûte.

## Q3.11 : analyse de la V1, le chemin critique

**Travail** (temps sur 1 processeur) : à chaque niveau de la récursion, les fusions traitent n éléments au total, et il y a log₂ n niveaux : **T₁ ≈ n log₂ n**.

**Chemin critique** (temps avec une infinité de cœurs) : les deux moitiés se trient **en même temps**, donc à chaque niveau on n'attend qu'**une** des deux. Mais la fusion qui suit est **séquentielle** et ne peut commencer qu'après. Le chemin critique est donc une branche de la racine à une feuille, avec **une fusion par niveau** :

```
fusion de n  ←  fusion de n/2  ←  fusion de n/4  ←  …  ←  tri_seq d'un bloc
```

**T∞ ≈ n + n/2 + n/4 + … ≈ 2n = Θ(n)** (série géométrique). La fusion finale coûte à elle seule la moitié du chemin critique.

**Borne sur l'accélération** : aucune exécution ne va plus vite que T∞, donc

**S ≤ T₁ / T∞ ≈ (n log₂ n) / (2n) = log₂(n) / 2 = Θ(log n)**

Pour n = 2²⁴ : **S ≤ 24 / 2 = 12**, quel que soit le nombre de cœurs.

**Vérification avec `omp_get_wtime`** (fusions de la branche de gauche, `lo == 0`) :

```c
double debut = omp_get_wtime();
fusion(t, tmp, lo, mid, hi);
if (lo == 0)
  printf("fusion de %9zu éléments : %.4f s\n", hi, omp_get_wtime() - debut);
```

| fusion de | 2²⁴ | 2²³ | 2²² | 2²¹ | 2²⁰ | … |
|---|---|---|---|---|---|---|
| temps | **0,043 s** | 0,022 s | 0,012 s | 0,006 s | 0,003 s | … |

Chaque fusion coûte la moitié de la précédente, ce qui confirme Θ(n). Total ≈ 0,09 s ≈ 2 × la fusion finale.

Donc T∞ ≈ 0,09 s, et S ≤ 1,04 / 0,09 ≈ **11,6** : on retrouve bien ≈ 12. La V1 mesurée fait 0,22 s avec 12 threads (S ≈ 4,8), dont **0,09 s de chemin critique purement séquentiel**.

> **À retenir.** Ajouter des cœurs ne réduit que le travail parallèle (T₁ / p), jamais le chemin critique. Ici, les fusions séquentielles bloquent la V1 à S ≤ 12. Pour aller plus loin, il faut **paralléliser la fusion** : c'est la V2.

## Q3.12 : `fusion_dicho` en tâches

```c
  dst[ma + mb] = a[ma];
#pragma omp task
  fusion_dicho(a, ma, b, mb, dst, seuil);
#pragma omp task
  fusion_dicho(a + ma + 1, na - ma - 1, b + mb, nb - mb, dst + ma + mb + 1,
               seuil);
}
```

- Les deux tâches écrivent dans des **parties différentes** de `dst` (à gauche et à droite de x) : elles ne se gênent pas.
- **Pas de `taskwait`** : après les deux appels, la fonction n'a plus rien à faire, elle n'a pas besoin de leur résultat. C'est l'**appelant** qui devra attendre que toute la fusion soit finie.
- Pas de `parallel` ici : l'équipe de threads est créée une seule fois, dans `tri_v2`.
- Le seuil est déjà géré par la fonction (`fusion_lineaire` sous le seuil) : c'est une bascule explicite.

## Q3.13 : V2, attendre toute la fusion (`taskgroup`)

**Essai avec `taskwait`** après `fusion_dicho` : le tri est **faux**, à un endroit différent à chaque exécution.

```
ERREUR : t[3] = 5760 > t[4] = 3350
ERREUR : t[16031] = 20146446 > t[16032] = 10348119
```

**Pourquoi.** `taskwait` n'attend que les tâches **filles**, pas leurs descendantes. Or `fusion_dicho` crée 2 tâches, qui en créent 2 chacune, etc. :

```
tâche courante
├── fille 1 : fusion_dicho(gauche)      ← taskwait attend celle-ci
│   ├── petite-fille                    ← mais PAS celle-ci
│   └── petite-fille                    ← ni celle-ci
└── fille 2 : fusion_dicho(droite)      ← taskwait attend celle-ci
    └── …
```

Le `memcpy` démarre donc alors que des morceaux de `tmp` ne sont pas encore écrits : on recopie un résultat incomplet.

**Solution : `taskgroup`**, qui attend les tâches créées dans le bloc **et toutes leurs descendantes**.

```c
static void tri_v2_rec(int *t, int *tmp, size_t lo, size_t hi, size_t seuil) {
  if (hi - lo <= seuil) {
    tri_seq(t, tmp, lo, hi);
    return;
  }
  size_t mid = lo + (hi - lo) / 2;
#pragma omp task
  tri_v2_rec(t, tmp, lo, mid, seuil);
#pragma omp task
  tri_v2_rec(t, tmp, mid, hi, seuil);
#pragma omp taskwait                   // attend les 2 tris (filles directes : ça suffit)
#pragma omp taskgroup                  // attend TOUTE la fusion, descendantes comprises
  fusion_dicho(t + lo, mid - lo, t + mid, hi - mid, tmp + lo, seuil);
  memcpy(t + lo, tmp + lo, (hi - lo) * sizeof *t);   // recopie tmp → t
}

static void tri_v2(int *t, int *tmp, size_t n, size_t seuil) {
#pragma omp parallel
#pragma omp single
  tri_v2_rec(t, tmp, 0, n, seuil);
}
```

Résultat : tri correct, **0,18 s** (12 threads, n = 2²⁴), contre 0,21 s pour la V1.

> **À retenir.** `taskwait` : attend les **filles**. `taskgroup` : attend **toute la descendance**. Pour une fonction récursive qui crée des tâches sans les attendre (comme `fusion_dicho`), il faut `taskgroup`.
>
> Pour les 2 tris, `taskwait` suffit : chaque `tri_v2_rec` attend lui-même ses propres filles avant de finir.

**Faux positif rencontré** : `tri_v2` qui appelle encore `tri_seq` donne un tri juste… en temps séquentiel (1,05 s).

## Q3.14 : paralléliser la recopie

**Avec `memcpy` (séquentiel), le chemin critique** : à chaque niveau, la fusion est maintenant parallèle, mais la recopie de `tmp` vers `t` ne l'est pas. Le long d'une branche, on enchaîne les recopies de taille n, n/2, n/4, … : **n + n/2 + n/4 + … ≈ 2n = Θ(n)**. On retombe sur le même chemin critique que la V1 : paralléliser la fusion ne servirait à rien si la recopie reste séquentielle.

**Solution** : la recopie est une boucle simple, on la découpe en tâches avec `taskloop` (partie 2) :

```c
#pragma omp taskgroup
  fusion_dicho(t + lo, mid - lo, t + mid, hi - mid, tmp + lo, seuil);
#pragma omp taskloop
  for (size_t i = lo; i < hi; i++) t[i] = tmp[i];
```

- Pas besoin de `single` : on est déjà dans **une** tâche, un seul thread rencontre ce `taskloop`.
- `taskloop` attend la fin de ses tâches (taskgroup implicite) : la recopie est finie avant de remonter.
- Prendre `size_t i`, comme `lo` et `hi`.

| n = 2²⁴, 12 threads, min de 7 | temps |
|---|---|
| V1 | 0,22 s |
| V2 avec `memcpy` | 0,18 s |
| V2 avec `taskloop` | 0,17 s |

Avec 12 cœurs, la différence `memcpy` / `taskloop` est dans le bruit : le chemin critique n'est pas encore ce qui limite (voir Q3.15).

## Q3.15 : accélération de la V2 contre la V1

n = 2²⁴, seuil = 10⁴, min de 5, T_seq = 1,054 s (même session). S = T_seq / T_p.

| threads | V1 temps | V1 S | V2 temps | V2 S |
|---|---|---|---|---|
| 1 | 1,054 s | 1,0 | 1,088 s | 0,97 |
| 2 | 0,559 s | 1,9 | 0,569 s | 1,9 |
| 4 | 0,465 s | 2,3 | 0,375 s | 2,8 |
| 8 | 0,312 s | 3,4 | 0,241 s | 4,4 |
| 12 | 0,220 s | **4,8** | 0,167 s | **6,3** |

**Ce qu'on en déduit :**
1. **Avec peu de threads, la V2 n'apporte rien**, et elle est même un peu plus lente sur 1 thread : la fusion par dichotomie fait **plus de travail** (recherches dichotomiques, tâches en plus).
2. **À partir de 4 threads, la V2 passe devant**, et l'écart grandit avec p : à 12 threads, elle est ≈ 25 % plus rapide.
3. **Le gain n'est pas à la hauteur de l'analyse.** En théorie, la V1 est bloquée à S ≤ 12, alors que la V2 pourrait aller beaucoup plus loin. Mais avec 12 cœurs (dont 4 lents), on reste de toute façon sous 12 : la limite de la V1 commence à peine à gêner.
Les mesures sont un peu irrégulières (3 threads pas mieux que 2, par exemple) : Docker et les cœurs lents rendent cette machine peu régulière. C'est la tendance qui compte.

### Combien de cœurs pour un écart net ?

Modèle de Graham (cours) : **T_p ≈ T₁/p + T∞**.
- V1 : T₁ ≈ 1,05 s, T∞ ≈ 0,09 s (la dernière fusion, séquentielle, plus les précédentes, Q3.11).
- V2 : T₁ ≈ 1,09 s, T∞ très petit (les fusions sont parallèles) : on le néglige.

| cœurs p | V1 ≈ 1,05/p + 0,09 | V2 ≈ 1,09/p | V2 plus rapide de |
|---|---|---|---|
| 8 | 0,22 s (S ≈ 4,8) | 0,14 s (S ≈ 7,7) | ×1,6 |
| 12 | 0,18 s (S ≈ 5,9) | 0,09 s (S ≈ 11,6) | ×2 |
| 32 | 0,12 s (S ≈ 8,6) | 0,034 s (S ≈ 31) | ×3,6 |
| 64 | 0,11 s (S ≈ 9,9) | 0,017 s (S ≈ 62) | ×6 |

**Règle.** La V1 cale quand T₁/p devient petit devant T∞, donc pour **p ≫ T₁/T∞ ≈ 12** (= log₂(n)/2 pour n = 2²⁴). L'écart devient net à partir de **≈ 32 cœurs** : la V1 plafonne vers S ≈ 10, alors que la V2 continue.

Ce modèle est un idéal : à 12 threads, il prédit ×2 et on mesure ×1,3, à cause des 4 cœurs lents, de la mémoire et de Docker. Les vrais écarts sont donc plus petits.

**Sur les machines de la fac.** La machine du cours (`numactl --hardware`, cours NUMA) a 8 CPU. Avec p = 8 < 12, la V1 n'est pas encore bloquée, et l'écart reste faible (≈ ×1,3). Si ces 8 CPU sont 4 cœurs hyperthreadés, c'est encore moins. Pour voir l'écart, il faut un serveur de calcul à 2 processeurs ou plus (32 à 64 cœurs). Mais un tel serveur est NUMA, et le tri, gourmand en mémoire, peut y être freiné (cours NUMA).

> **À retenir.** Raccourcir le chemin critique ne sert que lorsqu'il devient le facteur limitant, c'est-à-dire avec beaucoup de cœurs. Avec peu de cœurs, c'est le travail total T₁/p qui compte, et la V2 en fait un peu plus.

## `tri_ascendant` sur un exemple

n = 8, seuil = 2. Un **bloc** est une suite de cases voisines. On le **nomme par le numéro de sa première case** : le bloc 2, ce sont les cases 2 et 3.

```
cases        0 1   2 3   4 5   6 7
départ      [5 2 | 7 1 | 8 3 | 6 4]   4 blocs de 2 cases : blocs 0, 2, 4, 6
tris        [2 5 | 1 7 | 3 8 | 4 6]   chaque bloc est trié seul
w = 2       [1 2 5 7 | 3 4 6 8]       fusions : bloc 0 + bloc 2, bloc 4 + bloc 6
w = 4       [1 2 3 4 5 6 7 8]         fusion : bloc 0 + bloc 4
```

- **w** est la taille des blocs au niveau courant : seuil, puis 2 seuil, puis 4 seuil…
- **i** est le début du bloc de gauche. Ce bloc fait w cases, donc le bloc de droite commence juste après, en **i + w**.
- `i += 2*w` saute la paire qu'on vient de fusionner.

| tâche | cases | `depend` | attend |
|---|---|---|---|
| tri du bloc 0 | 0-1 | `out: t[0]` | rien |
| tri du bloc 2 | 2-3 | `out: t[2]` | rien |
| (tris des blocs 4 et 6 : pareil) | | | |
| fusion w=2, i=0 | 0-1 avec 2-3 | `inout: t[0]` `in: t[2]` | les tris 0 et 2 |
| fusion w=2, i=4 | 4-5 avec 6-7 | `inout: t[4]` `in: t[6]` | les tris 4 et 6 |
| fusion w=4, i=0 | 0-3 avec 4-7 | `inout: t[0]` `in: t[4]` | les deux fusions w=2 |

**`t[i]` dans un `depend`.** OpenMP ne lit pas la valeur rangée dans la case : il compare seulement les **adresses**. `t[2]` veut dire « la case n° 2 », qui sert de **nom** au bloc qui y commence. Deux tâches qui citent la même case sont reliées, rien de plus.

## Q3.16 : le graphe de tâches (8 blocs)

```
 T0   T1   T2   T3   T4   T5   T6   T7     tris de blocs
  \   /     \   /     \   /     \   /
  F0-1      F2-3      F4-5      F6-7       fusions, w = seuil
      \      /            \      /
       F0-3                F4-7            w = 2 seuil
            \             /
                F0-7                       w = 4 seuil
```

La fusion des blocs 0 et 1 peut-elle commencer avant la fin du tri du bloc 7 ?
- **V1 : oui.** Son `taskwait` n'attend que ses deux filles, les tris 0 et 1.
- **Graphe : oui aussi.** F0-1 ne dépend que de T0 et T1.

Seul le code séquentiel de `tri_ascendant` (tous les tris, puis toutes les fusions) l'interdit. Le graphe n'impose que les attentes nécessaires, sans attendre la fin d'un niveau entier.

## Q3.17 : `tri_v3` avec `depend`

```c
static void tri_ascendant(int *t, int *tmp, size_t n, size_t seuil) {
  for (size_t i = 0; i < n; i += seuil)
#pragma omp task depend(out: t[i])
    tri_seq(t, tmp, i, min(i + seuil, n));
  for (size_t w = seuil; w < n; w *= 2)
    for (size_t i = 0; i + w < n; i += 2 * w)
#pragma omp task depend(inout: t[i]) depend(in: t[i+w])
      fusion(t, tmp, i, i + w, min(i + 2 * w, n));
}

static void tri_v3(int *t, int *tmp, size_t n, size_t seuil) {
#pragma omp parallel
#pragma omp single
  tri_ascendant(t, tmp, n, seuil);
}
```

**La règle** (entre tâches sœurs, dans l'ordre de création) :
- `in: x` : je lis x, donc j'attends la dernière tâche qui a écrit x.
- `out: x` ou `inout: x` : j'écris x, donc j'attends toutes les tâches précédentes qui lisent ou écrivent x. Pour l'ordre, `out` et `inout` sont identiques. `inout` dit seulement en plus « je lis l'ancienne valeur ».

`t[i]` sert d'**étiquette** au bloc qui commence en i. OpenMP ne regarde que cette adresse, pas tout le bloc.

| tâche | clause | pourquoi | si on se trompe (testé) |
|---|---|---|---|
| tri du bloc i | `out: t[i]` | elle crée le bloc i : les fusions qui le lisent l'attendront | sans `depend`, les fusions partent avant les tris : ERREUR |
| fusion [i, i+2w) | `inout: t[i]` | elle lit le bloc i, et produit le nouveau bloc i (taille 2w) que la fusion suivante lira | avec `in`, la fusion suivante ne l'attend pas : ERREUR |
| fusion [i, i+2w) | `in: t[i+w]` | elle lit le bloc i+w. Ensuite, ce bloc n'existe plus (il fait partie du bloc i), et aucune tâche ne nomme plus t[i+w] | sans elle, la fusion peut partir avant que la moitié droite soit triée : ERREUR. `inout` marche aussi, mais il ne sert à rien |

**Pourquoi `in` suffit alors que la fusion écrit dans [i+w, i+2w).** Les tâches suivantes qui touchent cette zone passent toutes par l'étiquette t[i], déjà en `inout`. En effet, i+w est un multiple impair de w : ce n'est plus jamais un début de bloc.

**Cas limites.**
- Un dernier bloc sans partenaire (n n'est pas une puissance de 2) n'a pas de fusion à ce niveau. Il garde son étiquette t[i], et la fusion d'après attend son dernier écrivain.
- `tmp` n'est pas dans les `depend`, et ce n'est pas grave : deux tâches qui peuvent tourner en même temps travaillent sur des zones disjointes.

**Pas de `taskwait` : qu'est-ce qui garantit la fin ?** La barrière implicite à la fin du `single` (et du `parallel`) attend toutes les tâches de l'équipe.

Vérifié : n = 10³, 10⁶ + 3 et 2²⁴, seuils de 7 à 10⁵, 12 threads, aucune erreur.
