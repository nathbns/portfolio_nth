# TP Ensishell : écrire un shell (partie 1, semaine 2 : les processus)

Sujet : [page du cours](https://systemes.pages.ensimag.fr/sec/TP/Ensishell/Ensishell/), énoncé `ensishell.1` (`man -l ensishell.1`), indications `ensishell.info` (`info -f ./ensishell.info`), notes de cours [pres_forkexec_io.pdf](pres_forkexec_io.pdf). Cours lié : [CM Processus](../../cm/cm02_processus/).

Code : [ensishell/src/ensishell.c](ensishell/src/ensishell.c) (squelette cloné depuis Codeberg, pas GitHub qui est une vieille version).

## Compiler et tester (dans Docker)

Le squelette a besoin de Linux, GCC récent, Guile, readline et ruby-minitest : tout est dans le conteneur.

```sh
./tp.sh                  # shell Linux, dans ensishell/
cmake -B build           # une seule fois (il faut le fichier AUTHORS)
cd build && make         # compiler
./ensishell              # lancer le shell
make check               # tests détaillés (make test = résumé)
```

`-Wall -Werror -fanalyzer` : le moindre avertissement bloque la compilation.

## Les étapes de la semaine 2

| Étape | Ce qu'il faut faire | Test |
|---|---|---|
| 1 | remplacer la boucle `for` d'affichage par `fork` + `execvp` + `waitpid` | `Test1ForkExec` |
| 2 | `commande &` : ne pas attendre le fils | à la main (`sleep 5 &`) |
| 3 | `(executer "mkdir Toto")` depuis Scheme | à la main |

Semaine 8 : `jobs`, `cd`, pipe, redirections (`Test2InOut`, `Test3Jobs`).

État : **partie 1 (semaine 2) terminée.** Vérifié : `(executer "mkdir Toto")` et l'exemple `fibo` créent `Toto`, `55`, `6765`, `832040` ; `sleep 2 &` rend la main tout de suite ; `make check` : 5 tests sur 10, les 5 restants sont ceux de la semaine 8.

## Où coder

Le sujet dit **quoi** faire (comportement et appels système), les commentaires du code disent **où**. En semaine 2, seulement deux endroits de `src/ensishell.c` :

| Endroit | Étapes |
|---|---|
| la boucle `for` à la fin du `while` de `main` (« c'est cette boucle for qu'il faut éditer », dit le man) | 1 et 2 |
| la fonction `scheme_implem_executer` (commentaire « Question 3 ») | 3 |

Le reste (readline, Guile, `parsecmd`, `terminate`) est de la plomberie : on n'y touche pas.

**« Modifier la boucle `for` » = la remplacer.** Elle ne fait qu'afficher `seq[0]`, `seq[1]`… (toutes les commandes d'un pipe). En semaine 2 il n'y a qu'une commande, `seq[0]` : plus besoin de boucle. Elle reviendra en semaine 8 pour le pipe, avec un `fork` par commande.

## Étape 1 : fork, execvp, waitpid

Fait. `make check` : `Test0Prompt` et `Test1ForkExec` passent. Les 5 échecs restants sont ceux de la semaine 8 (pipe, redirections, `jobs`).

```c
char **cmd = l->seq[0];     // 1re commande : tableau de mots fini par NULL
if (cmd == NULL) continue;  // ligne vide : rien à lancer

pid_t pid = fork();         // 2 processus identiques à partir d'ici
if (pid == -1) {            // échec : aucun fils créé
  perror("fork");
} else if (pid == 0) {      // le fils
  execvp(cmd[0], cmd);      // devient le programme ; ne revient pas si ça marche
  perror(cmd[0]);           // il a échoué : "toto: No such file or directory"
  exit(1);                  // le fils meurt, sinon 2 shells
} else {                    // le père (pid = numéro du fils)
  int status;
  waitpid(pid, &status, 0); // bloqué jusqu'à la fin du fils
}
```

- **`cmd`** : pour `ls -l /tmp`, `cmd = {"ls", "-l", "/tmp", NULL}`. Sur une ligne vide, `cmd[0]` ferait planter.
- **`fork`** copie le shell : même code, même mémoire, même endroit. Seul le retour diffère : `0` dans le fils, le numéro du fils dans le père.
- **`execvp`** remplace le code et la mémoire du fils par le programme. `v` : les arguments dans un tableau ; `p` : cherche le programme dans le `PATH` (`ls` → `/bin/ls`). Le fils garde son pid et ses fichiers ouverts : il écrit sur le même terminal.
- **`exit(1)` après `execvp`** : sans lui, le fils continue le code du shell, remonte dans le `while` et lit les commandes lui aussi. Deux shells sur le même terminal.
- **`waitpid`** : le père attend, puis récupère le fils (sinon il reste zombie). `status` dit comment il a fini (`WEXITSTATUS(status)` = code de sortie). `0` = attente bloquante.

```
père (shell)           fils
fork() → 42            fork() → 0
waitpid(42) bloqué     execvp("ls") → devient ls, affiche, se termine
waitpid revient
nouveau prompt
```

## Étape 2 : `commande &`

```c
} else {                      // le père
  if (!l->bg) {               // pas de & : on attend
    int status;
    waitpid(pid, &status, 0);
  }                           // avec & : on n'attend pas, le prompt revient
}
```

`l->bg` est vrai si la ligne finit par ` &` (avec une espace : `sleep 5&` ne marche pas).

**Le zombie.** Après `sleep 1 &`, attendre 2 s puis `ps -o pid,ppid,stat,cmd` : `Z  [sleep] <defunct>`, de père ensishell. Un processus fini ne disparaît pas tout de suite : le noyau garde son pid et son code de sortie jusqu'à ce que le père les lise avec `waitpid`. Avec `&`, personne n'appelle `waitpid` : il reste zombie jusqu'à la fin du shell. Un seul ne gêne pas, des milliers épuisent les pid et `fork` échoue.

`ps` tout court ne l'affiche pas comme zombie (juste `sleep`) : il faut la colonne `STAT`.

**Le ramasser** (pas demandé en semaine 2 ; utile pour `jobs` en semaine 8), au début du `while`, avant `readline` :

```c
while (waitpid(-1, NULL, WNOHANG) > 0)
  ;   // -1 : n'importe quel fils ; WNOHANG : ne pas bloquer
```

`waitpid` renvoie le pid d'un fils fini (on recommence), `0` si les fils tournent encore, `-1` s'il n'y a plus de fils. Le zombie vit donc jusqu'au prompt suivant. Le ramasser à l'instant même demande le signal `SIGCHLD` (variante « terminaison asynchrone »).

## Étape 3 : `executer` depuis Scheme

Le shell comprend deux langages : les commandes (`ls -l`) et Scheme (lignes qui commencent par `(`), envoyé à Guile, un interpréteur intégré au programme (une bibliothèque, pas un autre processus). Le squelette ajoute à Scheme une fonction `executer` reliée à notre fonction C `scheme_implem_executer`. On la remplit : découper la chaîne, puis la lancer comme le shell.

```
ls -l              → main  → parsecmd → lancer_commande → fork, execvp, waitpid
(executer "ls")    → Guile → scheme_implem_executer → parsecmd → lancer_commande
```

Le trajet de `(executer "ls")` dans `ensishell.c` (seule la dernière étape est à nous) :

| Ligne du squelette | Rôle |
|---|---|
| `if (line[0] == '(')` puis `scm_eval_string(...)` | la ligne commence par `(` : elle part à Guile |
| `scm_c_define_gsubr("executer", 1, 0, 0, executer_wrapper)` | crée la fonction Scheme `executer` (1 argument), reliée à la fonction C `executer_wrapper` |
| `executer_wrapper` (DO NOT EDIT) | convertit la chaîne Scheme en `char *` C, appelle `scheme_implem_executer` |
| `scheme_implem_executer` | **notre code** |

```c
int scheme_implem_executer(char *line) {
  struct cmdline *l = parsecmd(&line);  // découpe et libère line
  if (l == NULL || l->err)
    return -1;
  lancer_commande(l);
  return 0;
}
```

- **Découper d'abord** : le code de lancement passe de `main` à une fonction `lancer_commande(l)`, appelée par les deux chemins. Pas de copier-coller.
- **Plus de `free(line)`** : `parsecmd` libère déjà `line`. La libérer deux fois plante (*double free*).
- **`continue` devient `return`** dans la fonction : `continue` n'existe que dans une boucle.
- **L'intérêt** : le shell n'a ni boucle ni fonction, Scheme si. Dans l'exemple `fibo`, Scheme calcule 55, 6765, 832040, fabrique `"mkdir 55"`… et le shell les lance.

Piège du clavier Mac : `Option+Espace` tape une espace insécable, invisible, et GCC répond `stray '\302'`. Retaper l'espace.
