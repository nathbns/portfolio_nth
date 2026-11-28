# TP1 MPI : le passage de messages

Sujet : `tp1-MPI.pdf` (Ensimag, Algorithmique et Programmation Parallèle, 2026-2027). Cours : [CM MPI](../cm_mpi/) (vidéo de 5 min).

Fait sur le Mac (Open MPI 5, 12 cœurs) : un seul ordinateur, donc on saute le §1 (fichier de machines et `ssh -K`, propres aux PC de l'Ensimag). Les questions sur plusieurs machines se traitent par le raisonnement.

| § | Notion | Fichier |
|---|---|---|
| 2 | Hello world : rang, taille, nom de la machine | [hello.c](hello.c) |
| 3 | Anneau à jeton : `MPI_Send`, `MPI_Recv`, `MPI_Wtime` | [anneau.c](anneau.c) |
| 4.1 | Distribution statique | [statique.c](statique.c) |
| 4.2 | Tourniquet | à venir |
| 4.3 | Contre-maître et travailleurs : tags, `MPI_ANY_SOURCE`, `MPI_Status` | à venir |
| 5 | Anneau optimisé : `MPI_Rsend`, `MPI_Irecv` | à venir |
| 6 | Contre-maître optimisé : envoyer du travail d'avance | à venir |

## MPI en bref
- `mpirun -np 4 ./prog` lance **4 copies du même programme** (des processus), éventuellement sur des machines différentes.
- Chaque copie a **sa propre mémoire** : elle ne voit pas les variables des autres (en OpenMP, les threads partagent tout).
- Pour donner une valeur à une autre copie : **un message**. L'une fait `MPI_Send`, l'autre doit faire le `MPI_Recv` qui va avec.
- Chaque copie a un numéro, son **rang** (de 0 à N-1). On teste le rang pour qu'elles fassent des choses différentes : `if (rang == 0) { chef } else { travailleur }`.

Image : 4 personnes dans 4 bureaux, chacune avec son propre cahier, qui ne se parlent que par courrier. Le rang, c'est le numéro du bureau.

Squelette de tout programme MPI :
```c
#include <mpi.h>
int main(int argc, char **argv) {
    MPI_Init(&argc, &argv);
    int rang, taille;
    MPI_Comm_rank(MPI_COMM_WORLD, &rang);   // qui suis-je ?
    MPI_Comm_size(MPI_COMM_WORLD, &taille); // combien sommes-nous ?
    /* travail + messages */
    MPI_Finalize();
    return 0;
}
```
`MPI_COMM_WORLD` : le groupe de toutes les copies lancées. Compiler : `mpicc prog.c -o prog`. Lancer : `mpirun -np 4 ./prog`.

---

## §2. Hello world

Chaque copie affiche son rang, le nombre de copies et sa machine ([hello.c](hello.c)) :

```c
char nom[MPI_MAX_PROCESSOR_NAME];
int lg;
MPI_Get_processor_name(nom, &lg);
printf("rang %d sur %d, machine %s\n", rang, taille, nom);
```

- `&` quand MPI **écrit** dans la variable (`MPI_Comm_rank(..., &rang)`), pas de `&` quand printf **lit** sa valeur.
- Avec `mpirun -np 4` : 4 lignes, dans un ordre qui change à chaque exécution, comme les threads OpenMP.
- Sur le Mac, toutes les copies sont sur `MacBook-Pro-de-Nathan.local`. Au-delà de 12 copies (le nombre de cœurs), Open MPI refuse : ajouter `--oversubscribe`.

### §2.1 Placement par défaut
Open MPI **remplit une machine avant de passer à la suivante** (autant de copies que de cœurs). Avec 4 machines de 4 cœurs et `-np 16` :

```
machine 1 : rangs 0  1  2  3
machine 2 : rangs 4  5  6  7
machine 3 : rangs 8  9  10 11
machine 4 : rangs 12 13 14 15
```

Des rangs qui se suivent sont donc presque toujours sur la même machine. L'autre placement possible, le tourniquet (`--map-by node`), met 0 sur la machine 1, 1 sur la 2, 2 sur la 3, etc.

**En salle de TP**, pour le voir soi-même :
1. Créer `listemachines.txt` (sa machine en premier, puis 3 voisines) et faire `ssh -K` vers chacune (§1).
2. `lscpu` : lire le nombre de cœurs d'une machine, disons C.
3. `mpirun --hostfile listemachines.txt -np $((4*C)) ./hello | sort -n -k2` (le `printf` doit commencer par `rang %d` pour que `sort` range par rang).
4. Lire quelle machine a quels rangs : des blocs de C rangs consécutifs.

---

## §3. Anneau à jeton

Le jeton (un `int`) fait le tour 0 → 1 → … → size-1 → 0 ([anneau.c](anneau.c)).

```c
int suivant   = (rank + 1) % size;         // le dernier envoie à 0
int precedent = (rank - 1 + size) % size;  // + size : en C, -1 % 4 vaut -1

if (rank == 0) {
    jeton = 0;
    MPI_Send(&jeton, 1, MPI_INT, suivant,   0, MPI_COMM_WORLD);
    MPI_Recv(&jeton, 1, MPI_INT, precedent, 0, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
} else {
    MPI_Recv(&jeton, 1, MPI_INT, precedent, 0, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
    jeton++;
    MPI_Send(&jeton, 1, MPI_INT, suivant,   0, MPI_COMM_WORLD);
}
```
Vérification : le rang 0 reçoit `size - 1` (3 avec `-np 4`, 6 avec `-np 7`).

`MPI_Send(quoi, combien, type, à qui, tag, groupe)` et `MPI_Recv(quoi, combien, type, de qui, tag, groupe, status)`. `MPI_Recv` attend que le message arrive.

Pièges rencontrés :
- les voisins dépendent du **rang** (qui je suis), pas du jeton (ce qui circule) ;
- `combien` = nombre d'éléments : 1, pas 0 ;
- un message n'est reçu que si le **tag** est le même des deux côtés, sinon tout le monde attend ;
- le rang 0 doit **envoyer en premier** : si tous commencent par `MPI_Recv`, interblocage.

### §3.1 Le placement par défaut convient-il ?
**Oui.** Avec 4 machines de 4 cœurs et `-np 16`, placement par bloc : seuls 4 passages sur 16 traversent le réseau (3→4, 7→8, 11→12, 15→0), les 12 autres restent dans une machine (rapides). Avec le tourniquet (`--map-by node`), les 16 passages traverseraient le réseau.

### §3.2 Temps d'un tour
Chrono dans le rang 0 seulement : `double debut = MPI_Wtime();` avant le `Send`, `fin` après le `Recv`, un tour = `fin - debut` (en secondes).

Pour un jeton de `n` entiers : `int *jeton = malloc(n * sizeof(int));`, puis `MPI_Send(jeton, n, MPI_INT, ...)` **sans `&`** (`jeton` est déjà une adresse), `n` lu avec `atoi(argv[1])`.

Mesuré sur le Mac, `-np 4`, un tour :

| jeton | taille | un tour |
|---|---|---|
| 1 entier | 4 octets | ~60 µs (dont presque tout = mise en route) |
| 1 million d'entiers | 4 Mo | ~1 ms |
| 256 millions d'entiers | 1 Go | ~0,3 à 0,5 s |

- **Petit message : le coût fixe domine** (la latence). Le premier tour prend ~60 µs car MPI établit les connexions ; les tours suivants prennent ~1 µs.
- **Gros message : le temps suit la taille** (le débit) : 256 fois plus de données, environ 300 fois plus de temps. Ici ~15 Go/s, car tout reste dans la mémoire du Mac ; entre deux PC, le réseau est bien plus lent.
- L'horloge de `MPI_Wtime` avance par pas de 1 µs : un tour d'un seul entier est à la limite de ce qu'elle peut mesurer.

---

## §4. Distribuer 1 million de tâches

Tâche i (de 1 à 1 000 000) : résultat attendu `i + 1` (« le numéro de la tâche incrémenté de 1 »). Le rang 0 (contre-maître) reçoit tous les résultats, dans l'ordre, et vérifie `res == i + 1`. Les rangs 1 à size-1 calculent : `W = size - 1` travailleurs.

### §4.1 Allocation statique
Chaque travailleur **sait d'avance** ses tâches, sans message : à tour de rôle, la tâche i va au travailleur `1 + i % W` ([statique.c](statique.c)).

```
-np 4, W = 3
tâche i      :  1  2  3  4  5  6  7
1 + i % 3    :  2  3  1  2  3  1  2
```
- `i % W` tourne en rond (0, 1, 2, 0…) ; le `1 +` saute le rang 0, qui ne calcule pas.
- Le sujet dit « les tâches rang % taille » : c'est la même idée, mais `i % size` donnerait des tâches au rang 0 (personne ne les fait → blocage).

```c
// contre-maître                              // travailleurs
for (i = 1; i <= NB_TACHES; i++) {            for (i = 1; i <= NB_TACHES; i++)
    qui = 1 + i % W;                              if (1 + i % W == rank) {
    MPI_Recv(&res, ..., qui, ...);                    res = i + 1;
    if (res != i + 1) erreur;                         MPI_Send(&res, ..., 0, ...);
}                                                 }
```

**Les deux côtés doivent faire exactement le même calcul.** Erreurs rencontrées, qui donnent toutes des « erreur tache » puis un blocage : `i` (un numéro de tâche) à la place d'un rang dans `Send`/`Recv`, `i % size` ou `1 + i % size` d'un côté et `1 + i % W` de l'autre, `<` au lieu de `<=`.

**§4.1.1 Temps** pour que le contre-maître reçoive tout (Mac) : ~0,04 à 0,05 s avec 2 ou 4 copies, ~0,07 à 0,08 s avec 12. Plus de travailleurs n'aide pas : **tous les messages passent par le rang 0**, qui les reçoit un par un.
