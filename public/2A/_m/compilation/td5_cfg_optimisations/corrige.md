# Corrigé du TD5 : graphe de flot de contrôle, ordonnancement et allocation de registres

Deux parties : 5.1 (exercices 1 et 2, CFG et blocs de base), puis 5.2 et 5.3 (exercices 3 à 6, Sethi-Ullman et
allocation de registres locale). Sujet : `ensimag_compil_td5.pdf`. Le « PDF groupé CM6-CM8 » désigne les diapositives
des CM6, CM7 et CM8 mises bout à bout ; la page N du CM8 seul y est la page N + 43. Les scripts qui ont servi à
vérifier chaque résultat sont dans [verification/](verification/).

# Partie 1. Graphe de flot de contrôle et blocs de base (5.1, exercices 1 et 2) — corrigé détaillé

Sujet : `ensimag_compil_td5.pdf` (3 pages), partie 5.1 « Control flow graph, basic blocks ». Cours utiles : CM7
(génération de code 3 adresses dirigée par la syntaxe) et CM8 (représentations intermédiaires : CFG, optimisations
locales), tous deux dans le PDF « PDF groupé CM6-CM8 ».

Références : « diapo N » = page N du PDF « PDF groupé CM6-CM8 » ; entre parenthèses, le numéro imprimé sur la diapo
(par exemple CM8 6/32 pour la diapo 49).

Tous les résultats annoncés (leaders, blocs, arcs, exécutions, vivacité) ont été calculés par le script `verification/cfg.py`
(sortie complète dans `verification/out-ex12.txt`) : il découpe un listing avec les trois règles du cours, interprète le code à
temporaires, et régénère le code des deux programmes MiniC avec les règles du CM7 pour comparer.

---

## Rappels utiles

### R1. D'où vient ce code : la génération 3 adresses (CM7, diapos 17 à 31)

- Le compilateur traduit le programme en **vraies instructions RISC-V** (`li`, `mv`, `add`, `bge`…) mais sur des
  **temporaires** `temp_0`, `temp_1`, … en nombre illimité (diapo 17, CM7 6/29). L'allocation en registres vient
  après.
- `fresh_tmp()` donne le temporaire suivant, `fresh_label()` le label suivant (diapo 22, CM7 11/29) : deux
  compteurs séparés, numérotés dans **l'ordre des appels**. Dans le code de l'énoncé, le premier label visible porte
  le n° 1 et les labels s'appellent `lbl_<rôle>_<n°>_main`.
- Les règles utiles ici, recopiées du corrigé du TD4 (`c` et `e1 < e2` sont aussi les diapos 24 et 25 ; `while`
  est la figure 4.2 du TD4 ; `println_int` est déduite du code produit par le compilateur du TP) :

```text
c            dest <- fresh_tmp() ; code.add("li dest, c") ; return dest
x            return symbol_table[x]                      # aucun code !
e1+e2        t1 <- GenCodeExpr(e1) ; t2 <- GenCodeExpr(e2) ; dest <- fresh_tmp()
             code.add("add dest, t1, t2") ; return dest
e1 < e2      dest <- fresh_tmp()                          # pris AVANT les opérandes
             t1 <- GenCodeExpr(e1) ; t2 <- GenCodeExpr(e2)
             endrel <- fresh_label()
             code.add("li dest, 0")
             code.add("bge endrel, t1, t2")               # si t1 >= t2, dest reste à 0
             code.add("li dest, 1")
             code.addLabel(endrel) ; return dest
x = e        tmp <- GenCodeExpr(e) ; code.add("mv symbol_table[x], tmp")
while (b) S  ltest <- fresh_label() ; lendwhile <- fresh_label()
             code.addLabel(ltest)
             t1 <- GenCodeExpr(b)
             code.add("beq lendwhile, t1, 0")             # condition fausse : sortir
             GenCodeSmt(S) ; code.add("j ltest") ; code.addLabel(lendwhile)
println_int(e)   t <- GenCodeExpr(e) ; code.add("mv a0, t") ; code.add("call println_int")
```

- Un booléen est l'entier 0 (faux) ou 1 (vrai) (diapo 25, CM7 14/29). Les règles écrivent le label en premier
  (`bge endrel, t1, t2`) ; le listing de l'énoncé est en RISC-V réel, label en dernier
  (`bge temp_0, temp_1, lbl_end_relational_3_main`). Même sens : « si temp_0 ≥ temp_1, sauter ».

### R2. Bloc de base (diapo 49, CM8 6/32)

> Basic block: largest (3-address RISCV) instruction sequence without label (except at the first instruction) and
> without jumps and calls.

Autrement dit : la plus longue suite d'instructions où l'on **n'entre que par le haut** (un label ne peut être qu'en
tête) et d'où l'on **ne sort que par le bas** (un saut ne peut être que la dernière instruction). Conséquence : si la
première instruction d'un bloc s'exécute, **toutes** s'exécutent, une fois chacune, dans l'ordre.

### R3. Les leaders (diapo 53, CM8 9/32)

La première instruction d'un bloc s'appelle un **leader**. On les trouve avec trois règles :

1. la première instruction du code est un leader ;
2. toute instruction **cible** d'un saut, conditionnel ou non, est un leader (ici : la ligne du label visé) ;
3. toute instruction qui **suit immédiatement** un saut, conditionnel ou non, est un leader.

Ensuite, chaque bloc = son leader + toutes les instructions jusqu'au leader suivant (exclu).

Sauts de ce TD : `bge`, `blt`, `beq`, `bne` (conditionnels) et `j` (inconditionnel). Un label est compté comme la
première ligne de son bloc, comme sur le dessin de la diapo 52 (`lbl0`, `lelse1`, `lendif1` en tête de boîte).

### R4. Le graphe de flot de contrôle (diapo 49)

Graphe orienté : sommets = blocs de base ; arc B → B' si B' peut s'exécuter **immédiatement après** B. Il suffit de
regarder la **dernière instruction** de chaque bloc :

| Dernière instruction de B | Successeurs de B |
|---|---|
| instruction ordinaire (`li`, `mv`, `add`, `call`…) | le bloc suivant dans le listing (« en séquence ») ; la sortie si B est le dernier |
| saut conditionnel `bge a, b, L` | **deux** : le bloc de L (saut pris, a ≥ b) **et** le bloc suivant (saut non pris, a < b) |
| saut inconditionnel `j L` | **un seul** : le bloc de L (jamais le bloc suivant) |

C'est la méthode de l'exercice « CFG by hand » du cours (diapo 54, CM8 10/32) : (1) leaders, (2) blocs,
(3) transitions.

### R5. Pourquoi un CFG ? (diapos 42, 46, 47, 49, 56)

- Le code 3 adresses gaspille des temporaires : « temp3 and temp4 could be mapped to the same physical location »,
  mais « straight-line code is difficult to reason on » (diapo 46, CM8 3/32). Pour savoir si deux temporaires sont en
  conflit (vivants en même temps), il faut une structure qui décrit les exécutions possibles : le CFG (diapos 42 et
  47).
- Deux niveaux d'optimisation (diapo 49) : **locale**, à l'intérieur d'un bloc (l'ordre d'exécution y est connu :
  DAG, sous-expressions communes, sélection et ordonnancement d'instructions, diapos 55 et 56) ; **globale**, sur
  tout le CFG (par exemple : un temporaire relu au tour suivant d'une boucle, visible seulement grâce à l'arc
  retour).
- **Vivacité** : un temporaire est vivant entre une écriture et la dernière lecture de cette valeur. Message du TD5
  (p. 3) : « liveness (range) information is the key of basic block (local) and global optimisations (including
  register allocation) ».

---

## Exercice 1 : « CFG from 3-addresses code »

Listing de l'énoncé, avec ses numéros de ligne (lignes 1-2 : commentaires) :

```asm
 1  ##Automatically generated RISCXX code
 2  ##non executable 3-Address instructions version
 3          li temp_2, 1
 4          mv temp_0, temp_2
 5          li temp_3, 7
 6          mv temp_1, temp_3
 7  lbl_begin_while_1_main:
 8          li temp_4, 0
 9          bge temp_0, temp_1, lbl_end_relational_3_main
10          li temp_4, 1
11  lbl_end_relational_3_main:
12          beq temp_4, zero, lbl_end_while_2_main
13          li temp_5, 1
14          add temp_6, temp_0, temp_5
15          mv temp_0, temp_6
16          j lbl_begin_while_1_main
17  lbl_end_while_2_main:
18          mv a0, temp_0
19          call println_int
```

### Question 1

**Énoncé.** Trouver les leaders des blocs, puis dessiner le CFG de ce programme.

**Méthode.** (1) Repérer tous les sauts et leur cible. (2) Appliquer les trois règles des leaders (R3).
(3) Découper en blocs. (4) Pour chaque bloc, regarder sa dernière instruction et tracer ses arcs (R4).

**Réponse.**

*Étape 1 : les sauts et leurs cibles.*

| Ligne | Saut | Cible |
|---|---|---|
| 9 | `bge temp_0, temp_1, lbl_end_relational_3_main` (conditionnel) | ligne 11 |
| 12 | `beq temp_4, zero, lbl_end_while_2_main` (conditionnel) | ligne 17 |
| 16 | `j lbl_begin_while_1_main` (inconditionnel) | ligne 7 |

Les trois labels du listing sont tous la cible d'un saut. Le `call println_int` de la ligne 19 n'est pas un saut
pour les règles de la diapo 53 ; et même si on le considérait comme une fin de bloc (définition de la diapo 49,
« without jumps and calls »), rien ne changerait : c'est la dernière instruction.

*Étape 2 : les leaders.*

| Ligne | Instruction | Pourquoi |
|---|---|---|
| 3 | `li temp_2, 1` | règle 1 : première instruction |
| 7 | `lbl_begin_while_1_main:` | règle 2 : cible du `j` de la ligne 16 |
| 10 | `li temp_4, 1` | règle 3 : suit le `bge` de la ligne 9 |
| 11 | `lbl_end_relational_3_main:` | règle 2 : cible du `bge` de la ligne 9 |
| 13 | `li temp_5, 1` | règle 3 : suit le `beq` de la ligne 12 |
| 17 | `lbl_end_while_2_main:` | règle 2 : cible du `beq` de la ligne 12, et règle 3 : suit le `j` de la ligne 16 |

**Leaders : lignes 3, 7, 10, 11, 13, 17.**

*Étape 3 : les blocs* (chaque leader jusqu'au leader suivant exclu) : **6 blocs**.

| Bloc | Lignes | Instructions | Ce que ça fait | Se termine par |
|---|---|---|---|---|
| B1 | 3-6 | `li temp_2, 1` ; `mv temp_0, temp_2` ; `li temp_3, 7` ; `mv temp_1, temp_3` | x = 1 ; y = 7 | instruction ordinaire |
| B2 | 7-9 | `lbl_begin_while_1_main:` ; `li temp_4, 0` ; `bge temp_0, temp_1, lbl_end_relational_3_main` | début du test x < y | `bge` |
| B3 | 10 | `li temp_4, 1` | « x < y est vrai » | instruction ordinaire |
| B4 | 11-12 | `lbl_end_relational_3_main:` ; `beq temp_4, zero, lbl_end_while_2_main` | sortir de la boucle si le test vaut 0 | `beq` |
| B5 | 13-16 | `li temp_5, 1` ; `add temp_6, temp_0, temp_5` ; `mv temp_0, temp_6` ; `j lbl_begin_while_1_main` | x = x + 1, retour au test | `j` |
| B6 | 17-19 | `lbl_end_while_2_main:` ; `mv a0, temp_0` ; `call println_int` | println_int(x) | fin du code |

*Étape 4 : les arcs* : **7 arcs entre blocs**, plus la sortie après B6.

| Arc | Pourquoi |
|---|---|
| B1 → B2 | en séquence (B1 finit par un `mv`) |
| B2 → B3 | `bge` non pris : temp_0 < temp_1 (x < y) |
| B2 → B4 | `bge` pris : temp_0 ≥ temp_1 (x ≥ y), on saute par-dessus B3 |
| B3 → B4 | en séquence |
| B4 → B5 | `beq` non pris : temp_4 ≠ 0 (condition vraie, on entre dans le corps) |
| B4 → B6 | `beq` pris : temp_4 = 0 (condition fausse, on sort) |
| B5 → B2 | `j` : **arc retour**, c'est la boucle |
| B6 → sortie | fin du programme |

Prédécesseurs : B2 en a deux (B1 et B5), B4 en a deux (B2 et B3) ; B1 n'en a aucun (c'est l'entrée) ; B3, B5 et B6
en ont un seul.

*Le CFG* (dans chaque boîte, les instructions du tableau de l'étape 3 ; à droite, leur effet) :

```text
                  début
                    │
                 ┌──▼──┐
                 │ B1  │               lignes 3-6   : x = 1 ; y = 7
                 └──┬──┘
                    │
                 ┌──▼──┐
      ┌─────────►│ B2  │               lignes 7-9   : temp_4 = 0 ; x ≥ y ?
      │          └──┬──┘
      │             ├──────────┐
      │       x < y │          │ x ≥ y (saut pris)
      │          ┌──▼──┐       │
      │          │ B3  │       │       ligne 10     : temp_4 = 1
      │          └──┬──┘       │
      │             │          │
      │          ┌──▼──┐       │
      │          │ B4  │◄──────┘       lignes 11-12 : temp_4 = 0 ?
      │          └──┬──┘
      │             ├──────────┐
      │  temp_4 ≠ 0 │          │ temp_4 = 0 (saut pris)
      │          ┌──▼──┐    ┌──▼──┐
      └──────────┤ B5  │    │ B6  │    lignes 17-19 : println_int(x)
                 └─────┘    └──┬──┘
  lignes 13-16 : x = x + 1 ; j ▼
                              fin
```

Lecture : B2-B3-B4 calculent le booléen x < y (motif `li 0` / `bge` / `li 1` de la règle `e1 < e2`), B4 décide si
l'on entre dans le corps B5 ou si l'on sort vers B6 ; B5 → B2 est la boucle.

*Vérification par exécution* (interprète de `verification/cfg.py`) : x = temp_0 part de 1, y = temp_1 vaut 7.

| Passage au test (B2) | x | `bge` (x ≥ 7 ?) | temp_4 | `beq` | Suite |
|---|---|---|---|---|---|
| 1 à 6 | 1, 2, 3, 4, 5, 6 | non pris | 1 | non pris | B3, B4, B5 (x augmente de 1) |
| 7 | 7 | pris | 0 | pris | B4, B6 |

Passages par bloc : B1 = 1, B2 = 7, B3 = 6, B4 = 7, B5 = 6, B6 = 1 ; 57 instructions exécutées (labels non
comptés) ; **le programme affiche 7**.

*Pour aller plus loin : la vivacité sur ce CFG* (calculée par `verification/cfg.py`, analyse arrière sur le graphe) :

| Bloc | Vivants en entrée | Vivants en sortie |
|---|---|---|
| B1 | — | temp_0, temp_1 |
| B2 | temp_0, temp_1 | temp_0, temp_1, temp_4 |
| B3 | temp_0, temp_1 | temp_0, temp_1, temp_4 |
| B4 | temp_0, temp_1, temp_4 | temp_0, temp_1 |
| B5 | temp_0, temp_1 | temp_0, temp_1 |
| B6 | temp_0 | — |

- temp_2 n'est vivant qu'entre les lignes 3 et 4, temp_3 entre 5 et 6 : jamais en même temps, ils peuvent partager
  un registre (c'est exactement la remarque de la diapo 46).
- temp_0 et temp_1 sont vivants en sortie de B5 parce qu'ils sont relus en B2 au tour suivant : seul l'arc retour
  B5 → B2 permet de le voir (information **globale**).
- Au plus 3 temporaires sont vivants en même temps ; le graphe d'interférence des 7 temporaires se colorie avec 3
  couleurs, par exemple {temp_0, temp_2, temp_6}, {temp_1, temp_3}, {temp_4, temp_5} : **3 emplacements suffisent
  pour 7 temporaires**.
- Optimisation **locale** dans B5 : temp_5 et temp_6 ne sont pas vivants en sortie de B5, donc les trois lignes
  `li temp_5, 1` / `add temp_6, temp_0, temp_5` / `mv temp_0, temp_6` peuvent devenir `addi temp_0, temp_0, 1`
  (sélection d'instructions : « add with constants is addi », diapo 66). Version simulée : même CFG, affiche
  toujours 7, 45 instructions exécutées au lieu de 57.

**Piège classique.**
- Oublier la règle 3 : la ligne 10 (`li temp_4, 1`) forme **à elle seule** un bloc (elle suit un saut, et la ligne
  11 est une cible). De même, la ligne 13 commence un bloc alors qu'elle n'a pas de label.
- Oublier l'arc B2 → B4 (le `bge` pris saute par-dessus B3), ou l'arc B3 → B4 (une instruction ordinaire continue
  en séquence).
- Ajouter un arc B5 → B6 : un `j` n'a **qu'un** successeur, sa cible ; on n'arrive en B6 que depuis B4.
- Couper le listing à chaque label seulement : on obtiendrait B2 = lignes 7-10, qui contient un saut au milieu
  (ligne 9). Un saut est toujours la **dernière** instruction de son bloc.
- Compter les lignes de commentaire 1-2 comme des instructions : la première instruction est la ligne 3.

### Question 2

**Énoncé.** Donner un programme MiniC qui aurait pu être le fichier source.

**Méthode.** Relire le code « à l'envers » en reconnaissant les motifs produits par les règles (R1), bloc par bloc.

| Motif dans le code | Règle qui le produit | Instruction source |
|---|---|---|
| `li temp_2, 1` ; `mv temp_0, temp_2` | `x = e` avec e = constante | x = 1 |
| `li temp_3, 7` ; `mv temp_1, temp_3` | idem | y = 7 |
| temp_0 et temp_1 ne sont écrits que par des `mv` et portent les plus petits numéros | déclarations (un temporaire par variable, pris en premier) | `int x, y;` |
| label `lbl_begin_while_1` … `beq …, lbl_end_while_2` … `j lbl_begin_while_1` ; `lbl_end_while_2:` | `while` | while (…) { … } |
| `li temp_4, 0` ; `bge temp_0, temp_1, …` ; `li temp_4, 1` ; label | `e1 < e2` | x < y |
| `li temp_5, 1` ; `add temp_6, temp_0, temp_5` ; `mv temp_0, temp_6` | `x = e1 + e2` | x = x + 1 |
| `mv a0, temp_0` ; `call println_int` | `println_int(e)` | println_int(x) |

**Réponse.**

```c
#include "printlib.h"

int main() {
  int x, y;
  x = 1;
  y = 7;
  while (x < y) {
    x = x + 1;
  }
  println_int(x);
  return 0;
}
```

(avec x ↦ temp_0, y ↦ temp_1). Les noms des variables sont libres : c'est le programme de l'exercice 4.1 du TD4
(n ↦ temp_0, a ↦ temp_1), plus l'affichage final. `return 0;` et l'en-tête ne produisent pas de ligne dans ce
listing (« non executable 3-Address instructions version » : seul le corps est montré).

*Vérification.* `verification/cfg.py` régénère le code de ce programme avec les règles de R1 : on retrouve **exactement** les
17 lignes (labels et instructions) du listing de l'énoncé. Exécuté, il affiche 7.

**Piège classique.**
- Écrire `while (x < 7)` : la constante serait chargée **dans la boucle**, juste après le label
  (`li temp_3, 7` en tête du test, régénéré à chaque tour), et il n'y aurait plus de `mv temp_1, …` avant la boucle.
  Vérifié : ce source donne un autre code. Ici temp_1 est écrit une seule fois avant la boucle, donc c'est une
  variable.
- Inverser la condition (`while (x >= y)`) en lisant `bge` : le `bge` saute quand la condition du `<` est
  **fausse** (il met temp_4 à 0).
- Écrire `x++` : n'existe pas en MiniC, et le code montre bien une constante 1, une addition puis une copie.

---

## Exercice 2 : « CFG By hand »

### Question 1

**Énoncé.** Quel est le résultat attendu de la génération de code 3 adresses, puis de la construction du CFG, sur
le programme MiniC suivant ?

```c
int x;
x=0;
while (x < 4){
   x=x+1;
}
```

**Méthode.** Appliquer les règles de R1 **exactement comme le compilateur de l'exercice 1** (mêmes compteurs, mêmes
noms de labels), en déroulant les règles ligne par ligne ; puis refaire les 4 étapes de l'exercice 1 sur le code
obtenu.

**Réponse.**

*Étape 1 : déroulé des règles.*

```text
symbol_table = { x ↦ temp_0 }      prochain temporaire : temp_1      prochain label : n° 1

GenCodeSmt( x = 0 )                                          règle x = e
├─ tmp ← GenCodeExpr(0)                                      règle c
│    dest ← fresh_tmp() = temp_1 ; émet  li temp_1, 0
└─ émet  mv temp_0, temp_1                                   (symbol_table[x] = temp_0)

GenCodeSmt( while (x < 4) { x = x+1; } )                     règle while
├─ ltest     ← fresh_label() = lbl_begin_while_1_main
├─ lendwhile ← fresh_label() = lbl_end_while_2_main
├─ pose le label  lbl_begin_while_1_main:
├─ t1 ← GenCodeExpr(x < 4)                                   règle e1 < e2
│    dest ← fresh_tmp() = temp_2                             (pris AVANT les opérandes)
│    t1 ← GenCodeExpr(x) = temp_0                            règle x : aucun code
│    t2 ← GenCodeExpr(4)                                     règle c
│         dest' ← fresh_tmp() = temp_3 ; émet  li temp_3, 4
│    endrel ← fresh_label() = lbl_end_relational_3_main
│    émet  li temp_2, 0
│    émet  bge temp_0, temp_3, lbl_end_relational_3_main     si x ≥ 4, temp_2 reste à 0
│    émet  li temp_2, 1
│    pose le label  lbl_end_relational_3_main:
│    renvoie temp_2
├─ émet  beq temp_2, zero, lbl_end_while_2_main              condition fausse : sortir
├─ GenCodeSmt( x = x+1 )                                     règle x = e
│  ├─ tmp ← GenCodeExpr(x + 1)                               règle e1 + e2
│  │    t1 = temp_0 (aucun code)
│  │    t2 : dest' ← temp_4 ; émet  li temp_4, 1
│  │    dest ← fresh_tmp() = temp_5 ; émet  add temp_5, temp_0, temp_4
│  └─ émet  mv temp_0, temp_5
├─ émet  j lbl_begin_while_1_main
└─ pose le label  lbl_end_while_2_main:
```

*Étape 2 : le code 3 adresses obtenu* (numéroté pour la suite) :

```asm
 1          li temp_1, 0
 2          mv temp_0, temp_1
 3  lbl_begin_while_1_main:
 4          li temp_3, 4
 5          li temp_2, 0
 6          bge temp_0, temp_3, lbl_end_relational_3_main
 7          li temp_2, 1
 8  lbl_end_relational_3_main:
 9          beq temp_2, zero, lbl_end_while_2_main
10          li temp_4, 1
11          add temp_5, temp_0, temp_4
12          mv temp_0, temp_5
13          j lbl_begin_while_1_main
14  lbl_end_while_2_main:
```

Les lignes 4 à 8 sont exactement l'exemple « x < 4 » du cours (diapo 27, CM7 15/29) : `li temp3, 4` /
`li temp2, 0` / `bge temp0, temp3, lbl0` / `li temp2, 1` / `lbl0:`. `verification/cfg.py` régénère ce code à partir du
programme : identique.

*Étape 3 : leaders et blocs.*

| Ligne | Leader parce que |
|---|---|
| 1 | règle 1 : première instruction |
| 3 | règle 2 : cible du `j` de la ligne 13 |
| 7 | règle 3 : suit le `bge` de la ligne 6 |
| 8 | règle 2 : cible du `bge` de la ligne 6 |
| 10 | règle 3 : suit le `beq` de la ligne 9 |
| 14 | règle 2 : cible du `beq` de la ligne 9, et règle 3 : suit le `j` de la ligne 13 |

| Bloc | Lignes | Instructions | Se termine par |
|---|---|---|---|
| B1 | 1-2 | `li temp_1, 0` ; `mv temp_0, temp_1` | instruction ordinaire |
| B2 | 3-6 | `lbl_begin_while_1_main:` ; `li temp_3, 4` ; `li temp_2, 0` ; `bge temp_0, temp_3, lbl_end_relational_3_main` | `bge` |
| B3 | 7 | `li temp_2, 1` | instruction ordinaire |
| B4 | 8-9 | `lbl_end_relational_3_main:` ; `beq temp_2, zero, lbl_end_while_2_main` | `beq` |
| B5 | 10-13 | `li temp_4, 1` ; `add temp_5, temp_0, temp_4` ; `mv temp_0, temp_5` ; `j lbl_begin_while_1_main` | `j` |
| B6 | 14 | `lbl_end_while_2_main:` (aucune instruction : fin du programme) | fin du code |

*Étape 4 : arcs et CFG.* Mêmes 7 arcs qu'à l'exercice 1 : B1 → B2 ; B2 → B3 (x < 4) ; B2 → B4 (x ≥ 4, saut pris) ;
B3 → B4 ; B4 → B5 (temp_2 ≠ 0) ; B4 → B6 (temp_2 = 0, saut pris) ; B5 → B2 (arc retour) ; puis B6 → sortie.

```text
                  début
                    │
                 ┌──▼──┐
                 │ B1  │               lignes 1-2   : x = 0
                 └──┬──┘
                    │
                 ┌──▼──┐
      ┌─────────►│ B2  │               lignes 3-6   : temp_3 = 4 ; temp_2 = 0 ; x ≥ 4 ?
      │          └──┬──┘
      │             ├──────────┐
      │       x < 4 │          │ x ≥ 4 (saut pris)
      │          ┌──▼──┐       │
      │          │ B3  │       │       ligne 7      : temp_2 = 1
      │          └──┬──┘       │
      │             │          │
      │          ┌──▼──┐       │
      │          │ B4  │◄──────┘       lignes 8-9   : temp_2 = 0 ?
      │          └──┬──┘
      │             ├──────────┐
      │  temp_2 ≠ 0 │          │ temp_2 = 0 (saut pris)
      │          ┌──▼──┐    ┌──▼──┐
      └──────────┤ B5  │    │ B6  │    ligne 14     : label seul (fin)
                 └─────┘    └──┬──┘
  lignes 10-13 : x = x + 1 ; j ▼
                              fin
```

Même forme qu'à l'exercice 1 : c'est la forme que donne la règle du `while` quand la condition est un `<` et le corps
une suite d'affectations, avec du code avant la boucle. Les
différences : B1 n'a que 2 instructions (une seule variable), B2 en a 3 parce que la constante 4 est rechargée à
chaque test, et B6 est vide.

*Vérification par exécution* : 5 passages au test (x = 0, 1, 2, 3, 4), le dernier `bge` (4 ≥ 4) est pris ;
passages par bloc B1 = 1, B2 = 5, B3 = 4, B4 = 5, B5 = 4, B6 = 1 ; 42 instructions exécutées ; **x = 4 à la fin**.

*Remarques.*
- Déclaration `int x;` : comme dans le listing de l'exercice 1 (aucun `li temp_0, 0` / `li temp_1, 0` au début),
  on n'écrit pas d'initialisation. Le compilateur du TP ajoute `li temp_0, 0` (variables MiniC initialisées à 0,
  corrigé du TD4, R8) : cette ligne irait dans B1 et ne change pas le CFG.
- Ordre des numéros dans `x < 4` : on suit la règle du cours (`dest` pris avant les opérandes, diapo 25), qui donne
  temp_2 pour le booléen et temp_3 pour la constante, comme sur la diapo 27. Le code de l'exercice 1 ne permet pas
  de le confirmer (ses deux opérandes sont des variables, sans nouveau temporaire). Si un générateur prenait `dest`
  après les opérandes, temp_2 et temp_3 seraient échangés ; `verification/cfg.py` vérifie que les blocs et les arcs sont alors
  identiques.
- B6 ne contient qu'un label : c'est un bloc vide qui sert de point de sortie (dans un vrai `main`, le compilateur y
  placerait le code de fin de la fonction). Le dessiner quand même : c'est la cible du `beq`.

**Piège classique.**
- Croire que les numéros suivent l'ordre des lignes : `li temp_3, 4` est émis **avant** `li temp_2, 0`, mais temp_2
  a été réservé en premier (première ligne de la règle `e1 < e2`).
- Sortir `li temp_3, 4` de la boucle (avant le label) : la règle du `while` pose le label **avant** de générer la
  condition, donc tout le code de la condition est refait à chaque tour. Le déplacer serait une optimisation
  (globale), pas la génération demandée.
- Écrire directement `bge temp_0, temp_3, lbl_end_while_2_main` pour sortir de la boucle : c'est la version
  « plus efficace » évoquée diapo 31, mais ce n'est pas ce que produisent les règles du cours.
- Fusionner B3 avec B2 ou B4, ou oublier B6 parce qu'il est vide.

---

## Ce qu'il faut retenir

1. **Bloc de base** : la plus longue suite d'instructions où l'on n'entre que par le haut et d'où l'on ne sort que
   par le bas ; un label ne peut être qu'en tête, un saut qu'en fin (diapo 49).
2. **Leaders** (diapo 53) : la première instruction ; toute cible d'un saut ; toute instruction qui suit un saut.
   Un bloc = un leader + tout jusqu'au leader suivant.
3. **Arcs du CFG** : on regarde la dernière instruction. Ordinaire → bloc suivant ; `bge`/`beq` → deux arcs (cible
   et bloc suivant) ; `j` → un seul arc (la cible).
4. Dans les deux exercices, le `while` (condition `<`, corps sans test ni boucle) donne **6 blocs et 7 arcs** :
   bloc d'avant, test (`li 0` + `bge`), `li 1` seul, `beq`, corps + `j` (arc retour), bloc d'après.
5. Pour retrouver le source : `li` + `mv` = affectation d'une constante ; `li 0` / `bge` / `li 1` = comparaison
   `<` ; label … `beq` … `j` label = `while` ; `mv a0` + `call println_int` = affichage.
6. **Pourquoi** : dans un bloc l'ordre est connu, on optimise localement ; le CFG donne la **vivacité** des
   temporaires, clé des optimisations et de l'allocation de registres (ex. 1 : 7 temporaires, 3 emplacements
   suffisent).


---

# Partie 2. Ordonnancement, Sethi-Ullman et allocation de registres locale — corrigé détaillé

Sujet : `ensimag_compil_td5.pdf`, sections 5.2 et 5.3 (p. 1 à 3), exercices 3 à 6. Les exercices 1 et 2 (CFG) sont corrigés
plus haut. Cours utiles : CM8 « Intermediate Representations: CFG, Local optimisations » et CM7
(génération de code 3 adresses).

Numéros de diapo : ce sont les **pages du PDF**. CM8 = `ensimag2A_compil_cm_08_irs.pdf` (le pied de page de la diapo affiche un de
moins à partir de la page 9, car la diapo 8 occupe deux pages ; dans le PDF groupé CM6-CM8, ajouter
43). CM7 = pages du PDF groupé CM6-CM8.

Tous les nombres de ce corrigé (ρ, intervalles, maxima, allocations, nombres de load et de store) sortent de deux
scripts Python, `verification/ex34_sethi_ullman.py` et `verification/ex56_regalloc.py` ; leur sortie complète est dans `verification/out-ex36.txt`. Tous
les codes ont été simulés, avec des valeurs numériques et symboliques.

---

## Rappels utiles

### R1. Ordonnancer = donner une date à chaque instruction (TD5 §5.2 ; CM8 p. 26 à 28)

Dans un bloc de base, l'ordre des instructions n'est imposé que par les **dépendances de données** : une instruction
qui lit un temporaire doit venir après celle qui l'écrit. Un **ordonnancement** θ associe à chaque instruction une
date logique t telle que :

- tous les opérandes lus par l'instruction ont été calculés avant (à une date strictement inférieure à t) ;
- toutes les lectures de l'opérande écrit (s'il y en a un) ont lieu après (à une date t′ > t).

Exemple de CM8 p. 27 : `u1 := c - d` puis `u2 := b + u1` impose θ(S1) < θ(S2). Il existe en général **beaucoup**
d'ordonnancements corrects ; on choisit selon la machine (CM8 p. 28 : parallélisme, latence des load, pipeline,
**registres**). Dans ce TD, le critère est le nombre de registres.

### R2. Vivacité, intervalle de vie, pression sur les registres (CM8 p. 29 et 32)

Convention de ce corrigé :

- un temporaire est **vivant** du point juste après sa définition jusqu'à sa **dernière lecture** (incluse) ;
- p_i désigne le point situé juste après la ligne i ; v est vivant en p_i si et seulement si
  def(v) ≤ i < dernière_lecture(v) ;
- l'instruction qui lit v pour la dernière fois peut écrire son résultat **dans le registre de v**
  (`add t0, t0, t1` est valide en RISC-V) : sur cette ligne, v et le nouveau résultat ne se gênent pas ;
- le résultat d'une expression reste vivant à la sortie (il sera lu ensuite : affectation, affichage…).

La **pression sur les registres** en un point est le nombre de temporaires vivants en ce point. Son **maximum** sur
le bloc est le nombre de registres nécessaire, et suffisant, pour exécuter ce code sans rien ranger en mémoire.
La diapo p. 32 noircit, pour chaque instruction, les temporaires vivants **à son entrée** (c'est-à-dire en p_(i−1)) :
on obtient le même maximum.

On dessine chaque intervalle comme une **barre verticale** à droite du listing (comme les figures du sujet et de la
diapo p. 29), de la ligne de définition (┬) à la ligne de dernière lecture (┴), puis on compte les barres qui
passent entre deux lignes.

Exemple de CM8 p. 29, recalculé : les mêmes 9 instructions ont jusqu'à **4** temporaires vivants dans l'ordre de
gauche (après (d) et après (e)), mais **3** au plus dans l'ordre de droite. Mêmes calculs, autre ordre, un registre
de moins : c'est tout l'enjeu.

### R3. L'algorithme de Sethi-Ullman (TD5 p. 2 ; CM8 p. 30 à 32)

ρ(nœud) = nombre de registres nécessaires pour calculer le sous-arbre :

```text
ρ(feuille)       = 1
ρ(op(e1, e2))    = max(ρ(e1), ρ(e2))    si ρ(e1) ≠ ρ(e2)
                 = ρ(e1) + 1            si ρ(e1) = ρ(e2)
```

Pourquoi : on calcule d'abord le sous-arbre le plus gourmand, avec ρ(e1) registres. Son résultat occupe ensuite
**un** registre pendant qu'on calcule l'autre, qui en demande au plus ρ(e1) − 1 : total ρ(e1). Si les deux valent
k, le second demande k registres alors que le résultat du premier en occupe déjà un : k + 1.

Génération du code : parcours **postfixe** (les deux fils avant le nœud), le fils de **plus grand ρ d'abord** ; en
cas d'égalité, le fils gauche d'abord (c'est ce que fait l'exemple p. 32 : `b*b` avant `4*(a*c)`). Une feuille donne
`ld temp, [x]` (variable en pile) ou `li temp, c` (constante) ; un nœud donne `op dest, t_gauche, t_droit`, avec les
opérandes **dans l'ordre de l'expression**, quel que soit l'ordre d'évaluation.

- ρ(feuille) = 1 car notre machine doit mettre toute feuille dans un registre (« our machine does not have any direct
  access to constant values », CM8 p. 30). La variante de Wikipédia met 0 à certaines feuilles : pas dans ce cours.
- Sethi-Ullman donne le **minimum** de registres pour un **arbre**, sans `mv` et sans découper un intervalle de vie
  (TD5 p. 2). Sur un **DAG** (sous-expressions partagées), le problème est NP-complet (Sethi 1975, CM8 p. 30) : on
  utilise des heuristiques.

Exemple de CM8 p. 32, recalculé : b² + 4ac, ρ = 3 ; le code calcule `b*b`, puis `a*c`, puis `4`, puis les deux
produits, et n'a jamais plus de 3 temporaires vivants.

### R4. Notations du code 3 adresses (TD4 ; CM7 p. 17, 22, 24 et 25)

- Instructions RISC-V sur des **temporaires** (registres virtuels, en nombre illimité) ; l'allocation vient après
  (CM7 p. 17).
- `ld temp_k, [x]` charge la variable x depuis sa case de pile (notation de l'énoncé) ; `li temp_k, c` met une
  constante (CM7 p. 24) ; `add`, `sub`, `mul dest, src1, src2`.
- Numérotation : on part ici de temp_1 et on numérote dans l'ordre d'émission, donc **temp_k est défini à la
  ligne k** (pratique pour les intervalles). Partir de temp_0 comme au TD4 est tout aussi juste.

### R5. Allocation de registres locale (TD5 §5.3 ; CM7 p. 33 et 42)

- Allouer = donner à chaque variable une place physique : un **registre** ou une **case mémoire**.
- Deux variables **interfèrent** si elles sont vivantes en un même point : elles ne peuvent pas partager un registre.
  Sinon, elles le peuvent (CM7 p. 42 : « Are two temporaries in conflict (i.e. used at the same time)? »).
- S'il y a plus de variables vivantes que de registres, il faut **spiller** : ranger une variable en mémoire
  (`store`), puis la recharger (`load`) avant sa prochaine lecture. Chaque spill coûte des accès mémoire, lents
  (CM7 p. 42).

---

## Section 5.2 : l'ordonnancement sur l'exemple de l'exercice 3

Il n'y a pas de question, mais la définition est à savoir. Dans le code de l'exercice 3 (question 2 ci-dessous), la
seule contrainte est « écrit avant lu ». Par exemple `ld temp_4, [a]` (ligne 4) ne dépend de rien : on pourrait le
placer tout au début du bloc. Le script compte **640** ordonnancements corrects de ces 9 instructions : les
meilleurs demandent 3 registres, les pires **5** (par exemple `li temp_8, 1` puis les quatre `ld` en premier : 5
temporaires vivants en même temps). Sethi-Ullman choisit directement un ordre qui atteint le minimum.

---

## Exercice 3 : Sethi-Ullman

E = ((a + b) ∗ (a − b)) + 1, avec a et b dans des cases de pile notées [a] et [b].

### Question 1 : nombre minimal de registres

**Méthode.** Dessiner l'AST, puis calculer ρ **des feuilles vers la racine**. ρ(racine) est la réponse.

**Réponse.**

```text
                      +   ρ=3
                    /     \
               *  ρ=3       1  ρ=1
              /     \
         +  ρ=2      -  ρ=2
         /   \       /   \
       a 1   b 1   a 1   b 1
```

- Feuilles a, b, a, b, 1 : ρ = 1.
- a + b : ρ(a) = ρ(b) = 1, égaux → 1 + 1 = **2**. De même a − b : **2**.
- (a + b) ∗ (a − b) : 2 et 2, égaux → **3**.
- Racine : 3 et 1, différents → max = **3**.

**Il faut 3 registres**, et 3 suffisent. Le script le confirme : aucun des 640 ordres possibles ne fait mieux que 3.

**Piège.** Ajouter 1 à la racine (« 3 et 1 donnent 4 ») : on n'ajoute 1 qu'en cas d'**égalité**. Mettre ρ = 0 à
la feuille 1 (variante de Wikipédia) : dans ce cours, toute feuille coûte 1. Remarque : charger a et b une seule
fois (un DAG au lieu d'un arbre) ne fait pas gagner de registre ici (3 aussi, vérifié).

### Question 2 : le code RISC-V avec temporaires

**Méthode.** Parcours postfixe ; à chaque nœud, le fils de plus grand ρ d'abord (le gauche en cas d'égalité) ; un
temporaire neuf par instruction.

**Réponse.** Décisions : à la racine, 3 > 1 → le produit d'abord, la constante 1 ensuite ; au produit, 2 = 2 →
a + b d'abord ; dans a + b et a − b, 1 = 1 → gauche d'abord.

```asm
 1   ld  temp_1, [a]
 2   ld  temp_2, [b]
 3   add temp_3, temp_1, temp_2      # a + b
 4   ld  temp_4, [a]
 5   ld  temp_5, [b]
 6   sub temp_6, temp_4, temp_5      # a - b
 7   mul temp_7, temp_3, temp_6      # (a+b)*(a-b)
 8   li  temp_8, 1
 9   add temp_9, temp_7, temp_8      # E
```

Vérification par simulation : a = 5, b = 3 → temp_9 = 8 × 2 + 1 = 17. Ici, le code de Sethi-Ullman est **identique**
au code dirigé par la syntaxe de CM7 (toujours gauche puis droite) : les sous-arbres lourds sont déjà à gauche.

Avec 3 registres physiques (allocation par intervalles, voir l'exercice 5 : temp_1, temp_3, temp_7, temp_9 → t0 ;
temp_2, temp_4, temp_6, temp_8 → t1 ; temp_5 → t2), simulé : t0 = 17.

```asm
ld  t0, [a]
ld  t1, [b]
add t0, t0, t1
ld  t1, [a]
ld  t2, [b]
sub t1, t1, t2
mul t0, t0, t1
li  t1, 1
add t0, t0, t1
```

**Piège.** Écrire des registres physiques (la question demande des temporaires) ; oublier les `ld` (a et b sont en
pile, pas en registre) ; inverser les opérandes d'un `sub` quand on évalue le fils droit d'abord : l'ordre
d'**évaluation** change, jamais l'ordre des **opérandes**.

### Question 3 : intervalles de vie et point de pression maximale

**Méthode.** Pour chaque temporaire : sa ligne de définition et sa ligne de dernière lecture ; une barre de l'une à
l'autre ; compter les barres entre chaque paire de lignes.

**Réponse.**

```text
 n°  instruction                  t1 t2 t3 t4 t5 t6 t7 t8 t9   vivants après la ligne
  1  ld  temp_1, [a]              ┬                            1  {temp_1}
  2  ld  temp_2, [b]              │  ┬                         2  {temp_1, temp_2}
  3  add temp_3, temp_1, temp_2   ┴  ┴  ┬                      1  {temp_3}
  4  ld  temp_4, [a]                    │  ┬                   2  {temp_3, temp_4}
  5  ld  temp_5, [b]                    │  │  ┬                3  {temp_3, temp_4, temp_5}   ◄ max
  6  sub temp_6, temp_4, temp_5         │  ┴  ┴  ┬             2  {temp_3, temp_6}
  7  mul temp_7, temp_3, temp_6         ┴        ┴  ┬          1  {temp_7}
  8  li  temp_8, 1                                  │  ┬       2  {temp_7, temp_8}
  9  add temp_9, temp_7, temp_8                     ┴  ┴  ┬    1  {temp_9}   (résultat)
```

| Temporaire | t1 | t2 | t3 | t4 | t5 | t6 | t7 | t8 | t9 |
|---|---|---|---|---|---|---|---|---|---|
| défini ligne | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| dernière lecture | 3 | 3 | 7 | 6 | 6 | 7 | 9 | 9 | sortie |

Point de pression maximale : **entre la ligne 5 et la ligne 6** (juste avant le `sub`). Trois temporaires sont
vivants : temp_3 (a + b, qui attend la multiplication), temp_4 (a) et temp_5 (b). C'est le seul point à 3, et
3 = ρ(E). Avec la convention de la diapo p. 32 (vivants à l'entrée), c'est l'entrée de la ligne 6.

**Piège.** Compter 3 vivants à la ligne 3 (temp_1, temp_2 et temp_3) : temp_1 et temp_2 y sont lus pour la
dernière fois, et temp_3 peut prendre le registre de temp_1. Après la ligne 3, un seul temporaire est vivant.

---

## Exercice 4 : Sethi-Ullman (2)

E = (n ∗ (n + 1)) + (2 ∗ n), avec n dans la case de pile [n].

### Question 1 : le code de Sethi-Ullman

**Méthode.** Même recette : AST, ρ, parcours postfixe, le plus gourmand d'abord.

**Réponse.**

```text
                     +   ρ=3
                  /       \
             *  ρ=2         *  ρ=2
            /    \         /   \
          n 1    +  ρ=2   2 1   n 1
                /  \
              n 1   1 1
```

- n + 1 : 1 = 1 → **2**. n ∗ (n + 1) : 1 ≠ 2 → max = **2**. 2 ∗ n : 1 = 1 → **2**. Racine : 2 = 2 → **3**.
- Décisions : à la racine, égalité → n ∗ (n + 1) d'abord ; dans n ∗ (n + 1), ρ(n + 1) = 2 > ρ(n) = 1 →
  **n + 1 d'abord**, puis n ; dans 2 ∗ n, égalité → 2 d'abord.

```asm
 1   ld  temp_1, [n]
 2   li  temp_2, 1
 3   add temp_3, temp_1, temp_2      # n + 1
 4   ld  temp_4, [n]                 # le n de gauche, chargé APRÈS n + 1
 5   mul temp_5, temp_4, temp_3      # n * (n+1) : opérandes dans l'ordre (gauche, droite)
 6   li  temp_6, 2
 7   ld  temp_7, [n]
 8   mul temp_8, temp_6, temp_7      # 2 * n
 9   add temp_9, temp_5, temp_8      # E
```

Simulation : n = 7 → 7 × 8 + 2 × 7 = 70.

**Piège.** Écrire `mul temp_5, temp_3, temp_4` « parce que temp_3 a été calculé en premier » : ici `mul` est
commutatif, mais avec `sub` ou `div` le résultat serait faux.

### Question 2 : différence avec le code 3 adresses ; aucune dépendance introduite

**Méthode.** Générer le code avec les règles de CM7 : pour e1 op e2, `t1 ← GenCodeExpr(e1)`, puis
`t2 ← GenCodeExpr(e2)`, puis `dest ← fresh_tmp()` (ordre e1 puis e2 : CM7 p. 25 ; règle de `+` : TD4 figure 4.1 ;
`*` est identique avec `mul`). Ici une feuille n donne un `ld` (n est en pile), une constante un `li` (CM7 p. 24).
Comparer les deux codes, puis vérifier les dépendances.

**Réponse.** Code dirigé par la syntaxe :

```asm
 1   ld  temp_1, [n]                 # le n de gauche, chargé EN PREMIER
 2   ld  temp_2, [n]
 3   li  temp_3, 1
 4   add temp_4, temp_2, temp_3      # n + 1
 5   mul temp_5, temp_1, temp_4      # n * (n+1)
 6   li  temp_6, 2
 7   ld  temp_7, [n]
 8   mul temp_8, temp_6, temp_7      # 2 * n
 9   add temp_9, temp_5, temp_8
```

*Différence.* Le code dirigé par la syntaxe évalue toujours l'opérande gauche d'abord : il charge n (temp_1) et le
laisse **attendre** pendant tout le calcul de n + 1. Sethi-Ullman calcule n + 1 d'abord et ne charge n que juste
avant la multiplication. Effet : dans le sous-arbre n ∗ (n + 1), le code dirigé par la syntaxe a 3 temporaires
vivants après sa ligne 3 (temp_1, temp_2, temp_3), Sethi-Ullman jamais plus de 2. Pour n ∗ (n + 1) seule, cela fait
2 registres au lieu de 3 (vérifié). Les lignes 6 à 9 sont identiques.

*Aucune dépendance introduite.*

1. Les deux codes ont **le même graphe de dépendances** : les 8 arcs « fils → père » de l'AST (vérifié). Seules les
   dates θ de 4 instructions changent : le `ld [n]` de gauche passe de la ligne 1 à la ligne 4, et le calcul de
   n + 1 remonte des lignes 2–4 aux lignes 1–3.
2. Dans les deux codes, chaque temporaire est écrit **avant** d'être lu : θ(définition) < θ(lecture). Ce sont deux
   ordonnancements corrects au sens de §5.2.
3. Le `ld` déplacé ne lit que la case [n], que **personne n'écrit** dans ce bloc, et il écrit un temporaire **neuf**
   que personne d'autre n'écrit : il ne dépend pas du calcul de n + 1, et ce calcul ne dépend pas de lui. Comme
   chaque temporaire n'est écrit qu'une seule fois, il n'y a pas non plus de « fausse » dépendance (écraser un
   temporaire qu'une autre instruction doit encore lire).
4. Même résultat : 70 pour n = 7 dans les deux codes.

**Piège.** Croire qu'on peut toujours réordonner. C'est permis ici parce que l'expression n'a pas d'effet de bord :
elle ne fait que lire n. Si une sous-expression écrivait dans [n] (un appel de fonction, une affectation), déplacer
le `ld` changerait la valeur lue.

### Question 3 : intervalles de vie ; combien de registres suffisent

**Réponse.** Pour le code de Sethi-Ullman :

```text
 n°  instruction                  t1 t2 t3 t4 t5 t6 t7 t8 t9   vivants après la ligne
  1  ld  temp_1, [n]              ┬                            1  {temp_1}
  2  li  temp_2, 1                │  ┬                         2  {temp_1, temp_2}
  3  add temp_3, temp_1, temp_2   ┴  ┴  ┬                      1  {temp_3}
  4  ld  temp_4, [n]                    │  ┬                   2  {temp_3, temp_4}
  5  mul temp_5, temp_4, temp_3         ┴  ┴  ┬                1  {temp_5}
  6  li  temp_6, 2                            │  ┬             2  {temp_5, temp_6}
  7  ld  temp_7, [n]                          │  │  ┬          3  {temp_5, temp_6, temp_7}   ◄ max
  8  mul temp_8, temp_6, temp_7               │  ┴  ┴  ┬       2  {temp_5, temp_8}
  9  add temp_9, temp_5, temp_8               ┴        ┴  ┬    1  {temp_9}   (résultat)
```

Intervalles : temp_1 1→3, temp_2 2→3, temp_3 3→5, temp_4 4→5, temp_5 5→9, temp_6 6→8, temp_7 7→8, temp_8 8→9,
temp_9 9→sortie.

Maximum : **3**, entre la ligne 7 et la ligne 8 : temp_5 (n(n + 1), qui attend l'addition finale), temp_6 (2) et
temp_7 (n). **3 registres suffisent**, et ils sont nécessaires : ρ = 3, et aucun des 896 ordres valides ne fait
mieux. Allocation vérifiée par simulation : temp_1, temp_3, temp_5, temp_9 → t0 ; temp_2, temp_4, temp_6, temp_8 →
t1 ; temp_7 → t2.

Le code dirigé par la syntaxe demande aussi 3 registres (maximum atteint deux fois : après sa ligne 3 et après sa
ligne 7). Le total ne change pas parce que la racine est **équilibrée** (2 et 2) : quel que soit le côté calculé en
premier, son résultat attend dans un registre pendant que l'autre côté en demande 2. Le gain de Sethi-Ullman est ici
local (le sous-arbre gauche).

**Piège.** Répondre 2 « parce que les deux fils de la racine ont ρ = 2 » : égalité → + 1. Ou répondre 9 (le nombre
de temporaires) : un registre sert à plusieurs temporaires successifs.

---

## Exercice 5 : allocation à la main sur du code en ligne droite, 6 registres

```text
1  a = load m0
2  b = load m1
3  c = a + b
4  d = 4 * c
5  e = b + 1
6  f = e + a
7  g = d / e
8  h = f - g
9  ret h
```

### Question 1 : allocation avec R0 à R5

**Méthode.** (1) Intervalle de vie de chaque variable : de sa définition à sa dernière lecture. (2) Compter les
vivants en chaque point : si le maximum est ≤ 6, pas de spill. (3) Ranger les intervalles dans les registres : deux
intervalles qui se chevauchent vont dans deux registres différents ; un registre libéré par une dernière lecture à
la ligne i peut recevoir la variable définie à cette même ligne i.

**Réponse.** Intervalles :

```text
 n°  instruction     a  b  c  d  e  f  g  h   vivants après la ligne
  1  a = load m0     ┬                        1  {a}
  2  b = load m1     │  ┬                     2  {a, b}
  3  c = a + b       │  │  ┬                  3  {a, b, c}   ◄ max
  4  d = 4 * c       │  │  ┴  ┬               3  {a, b, d}   ◄ max
  5  e = b + 1       │  ┴     │  ┬            3  {a, d, e}   ◄ max
  6  f = e + a       ┴        │  │  ┬         3  {d, e, f}   ◄ max
  7  g = d / e                ┴  ┴  │  ┬      2  {f, g}
  8  h = f - g                      ┴  ┴  ┬   1  {h}
  9  ret h                                ┴   0
```

a 1→6, b 2→5, c 3→4, d 4→7, e 5→7, f 6→8, g 7→8, h 8→9. Jamais plus de **3** variables vivantes ensemble (après les
lignes 3, 4, 5 et 6). Il y a 8 variables pour 6 registres : on ne peut pas donner un registre à chacune (l'allocation
« tout en registres » de CM7 p. 33 échouerait), mais 3 registres suffisent.

Interférences (10 paires) : a–b, a–c, a–d, a–e, b–c, b–d, d–e, d–f, e–f, f–g. Par exemple c et d n'interfèrent pas
(c meurt à la ligne 4, où d naît), ni b et e, ni a et f.

Allocation (les barres de la figure) :

```text
 ligne  instruction      R0    R1    R2    R3  R4  R5
   1    a = load m0      a┬    .     .     .   .   .
   2    b = load m1      a│    b┬    .     .   .   .
   3    c = a + b        a│    b│    c┬    .   .   .
   4    d = 4 * c        a│    b│    c>d   .   .   .
   5    e = b + 1        a│    b>e   d│    .   .   .
   6    f = e + a        a>f   e│    d│    .   .   .
   7    g = d / e        f│    e>g   d┴    .   .   .
   8    h = f - g        f>h   g┴    .     .   .   .
   9    ret h            h┴    .     .     .   .   .
```

(x┬ : x défini ; x│ : x vivant ; x┴ : dernière lecture de x ; x>y : x lu pour la dernière fois et y écrit dans le
même registre.)

- R0 : a [1, 6], puis f [6, 8], puis h [8, 9] ;
- R1 : b [2, 5], puis e [5, 7], puis g [7, 8] ;
- R2 : c [3, 4], puis d [4, 7] ;
- R3, R4, R5 : vides.

Code obtenu : `R0 = load m0 ; R1 = load m1 ; R2 = R0 + R1 ; R2 = 4 * R2 ; R1 = R1 + 1 ; R0 = R1 + R0 ;
R1 = R2 / R1 ; R0 = R0 - R1 ; ret R0`. Vérifié : aucun registre ne porte deux intervalles qui se chevauchent, et la
simulation avec m0 = 6, m1 = 2 donne h = −1 (c = 8, d = 32, e = 3, f = 9, g = 10 en division entière), comme le
programme d'origine. Toute autre allocation sans chevauchement dans un même registre est juste aussi.

**Piège.** Arrêter une barre à la définition de la variable suivante au lieu de sa dernière lecture (a vit jusqu'à
la ligne 6, pas seulement jusqu'à la ligne 3) ; croire que a et f se gênent : a est lu pour la dernière fois à la
ligne 6, f peut prendre son registre.

### Question 2 : un algorithme de type bin packing

**Réponse.** Le bin packing, c'est ranger des objets dans le moins de boîtes possible. Ici :

- les **objets** sont les intervalles de vie ;
- les **boîtes** sont les registres ;
- la **règle** : dans une même boîte, les intervalles ne se chevauchent pas (une boîte est un axe du temps qu'on
  remplit de segments disjoints).

Algorithme glouton (c'est le « linear scan » de Poletto et Sarkar, 1999) :

1. trier les intervalles par **début croissant** ;
2. pour chaque intervalle : libérer les registres dont l'intervalle est terminé (dernière lecture ≤ début du nouvel
   intervalle), puis mettre l'intervalle dans le premier registre libre ;
3. si aucun registre n'est libre : spill (on envoie en mémoire l'intervalle qui finit le plus tard ; c'est le sujet de
   l'exercice 6).

Déroulé sur le programme (script) :

```text
ligne 1 : a [1,6] → R0
ligne 2 : b [2,5] → R1
ligne 3 : c [3,4] → R2
ligne 4 : c est fini       → d [4,7] → R2
ligne 5 : b est fini       → e [5,7] → R1
ligne 6 : a est fini       → f [6,8] → R0
ligne 7 : d et e sont finis → g [7,8] → R1
ligne 8 : f et g sont finis → h [8,9] → R0
```

Résultat : 3 boîtes, exactement le maximum de vivants. Sur un bloc de base, ce glouton par début croissant n'utilise
jamais plus de registres que le maximum de vivants : quand un intervalle reçoit le k-ième registre, les k − 1 autres
registres portent des intervalles tous vivants à son début, donc k variables sont vivantes ensemble.

**Piège.** Oublier de libérer les registres à la fin des intervalles (on croirait qu'il en faut 8).

---

## Exercice 6 : allocation avec spill, 2 registres

**Méthode.**

1. Les vivants (exercice 5) montent à 3 (après les lignes 3, 4, 5 et 6) pour 2 registres : des spills sont
   obligatoires. Même en réordonnant les instructions, le minimum sur les 22 ordres valides reste 3 (vérifié).
2. Parcourir le programme. Quand il faut un registre et que les deux sont occupés par des variables vivantes, en
   évincer une : de préférence une variable **déjà en mémoire** (a est dans m0, b dans m1 : aucun store à faire),
   sinon celle dont la **prochaine lecture est la plus lointaine**. Faire `store` si elle n'est pas déjà en mémoire,
   puis `load` juste avant sa prochaine lecture.
3. Vérifier en suivant le contenu de R0, R1 et des cases après chaque instruction.

**Réponse.**

```text
     a = load m0        R0 ← a
     b = load m1        R1 ← b
     c = a + b          R0 ← c     a quitte R0 ; il est encore dans m0 : pas de store
     d = 4 * c          R0 ← d
     e = b + 1          R1 ← e
     store d m2         m2 ← d     (+1 store) il faut une place pour a ; d n'est relu qu'à g
     a = load m0        R0 ← a     (+1 load)
     f = e + a          R0 ← f
     store f m3         m3 ← f     (+1 store) il faut une place pour d ; f n'est relu qu'à h
     d = load m2        R0 ← d     (+1 load)
     g = d / e          R0 ← g     d et e sont lus pour la dernière fois
     f = load m3        R1 ← f     (+1 load)
     h = f - g          R0 ← h
     ret h              R0
```

Les barres (colonnes de la figure de l'énoncé ; une barre va de l'écriture dans l'emplacement à la dernière lecture
dans cet emplacement) :

```text
 pas  instruction        R0    R1    m0    m1    m2    m3
   0  état initial       .     .     a┬    b┬    .     .
   1  a = load m0        a┬    .     a│    b│    .     .
   2  b = load m1        a│    b┬    a│    b┴    .     .
   3  c = a + b          a>c   b│    a│    .     .     .
   4  d = 4 * c          c>d   b│    a│    .     .     .
   5  e = b + 1          d│    b>e   a│    .     .     .
   6  store d m2         d┴    e│    a│    .     d┬    .
   7  a = load m0        a┬    e│    a┴    .     d│    .
   8  f = e + a          a>f   e│    .     .     d│    .
   9  store f m3         f┴    e│    .     .     d│    f┬
  10  d = load m2        d┬    e│    .     .     d┴    f│
  11  g = d / e          d>g   e┴    .     .     .     f│
  12  f = load m3        g│    f┬    .     .     .     f┴
  13  h = f - g          g>h   f┴    .     .     .     .
  14  ret h              h┴    .     .     .     .     .
```

m4, m5 et m6 restent inutilisées.

**Coût** : 5 instructions ajoutées, **3 load** (a, d, f) et **2 store** (d, f) ; 7 accès mémoire en tout avec les
deux load d'origine. Simulation symbolique (chaque lecture trouve la bonne variable dans le registre ou la case, et
il n'y a jamais que R0 et R1) et numérique (m0 = 6, m1 = 2 → h = −1 ; m0 = 10, m1 = 3 → h = 1) : correcte.

**C'est le minimum.** Preuve :

- Ligne 6 (f = e + a) : a, d et e sont vivants ; a et e doivent être en registre, donc d n'y est pas et doit être
  en mémoire : un **store d**, puis un **load d** avant la ligne 7. (2 instructions)
- Ligne 7 (g = d / e) : d, e et f sont vivants ; d et e en registre, donc f n'y est pas : **store f**, puis
  **load f** avant la ligne 8. (2 instructions)
- Juste après la ligne 3 : a, b et c sont vivants, c vient d'être écrit dans un registre, donc a ou b a quitté les
  registres : il faudra le **recharger** avant sa prochaine lecture (ligne 5 ou 6). (1 instruction)

Total ≥ 5, et la solution en a 5. La recherche exhaustive du script le confirme (ordre des instructions fixé,
constantes en immédiat) : aucune solution à 4 ; 40 solutions à 5 (choix des registres compris), toutes avec 3 load
et 2 store.

Pour comparer, la solution « tout en mémoire » de CM7 (a…g dans m0…m6 : les 7 cases de la figure suffisent tout
juste ; un load avant chaque lecture, un store après chaque écriture, h rendu directement) coûte 10 load + 5 store =
15 accès mémoire, contre 7.

**Piège.**

- Faire `store a` ou `store b` : inutile, ils sont déjà dans m0 et m1, il suffit de les recharger.
- Écraser un registre qui contient une variable vivante non sauvegardée (charger a dans R0 sans avoir rangé d) :
  d est perdu.
- Ranger un spill dans m0 ou m1 alors que a ou b doit encore y être relu.
- Oublier qu'une instruction peut écrire dans le registre d'un opérande qui meurt (g = d / e va dans R0, où était d).

---

## Ce qu'il faut retenir

1. **Ordonnancer** = donner une date à chaque instruction en respectant « écrit avant lu ». Il y a beaucoup d'ordres
   corrects ; ici on cherche celui qui demande le moins de registres.
2. **Vivacité** : de juste après la définition jusqu'à la dernière lecture. Le maximum de vivants simultanés = le
   nombre de registres nécessaire sans spill. On trace des barres et on compte entre les lignes.
3. **Sethi-Ullman** : ρ(feuille) = 1 ; fils différents → max ; fils égaux → + 1. Code : postfixe, plus gros ρ
   d'abord, gauche en cas d'égalité, opérandes toujours dans l'ordre de l'expression.
4. Sethi-Ullman est optimal sur les **arbres** ; sur les **DAG**, le problème est NP-complet.
5. **Réordonner est légal** tant qu'aucune dépendance n'est cassée : temporaires neufs, cases mémoire seulement lues.
6. **Allocation locale** : intervalles → registres ; deux intervalles qui se chevauchent interfèrent ; le glouton par
   début croissant (linear scan, bin packing) utilise exactement le maximum de vivants.
7. **Spill** = store + load. Évincer d'abord ce qui est déjà en mémoire, sinon ce qui sera relu le plus tard.
8. Message du TD : l'information de **vivacité** (les intervalles) est la clé des optimisations locales et globales,
   allocation de registres comprise.
