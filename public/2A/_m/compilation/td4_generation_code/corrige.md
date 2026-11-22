# TD4 : Génération de code 3 adresses et allocation simple — corrigé détaillé

Sujet : `ensimag_compil_td4.pdf` (5 pages). Cours utiles : CM6 (machine cible RISC-V), CM7 (génération de code
dirigée par la syntaxe, allocations naïve et « all in mem »). Conventions de pile : énoncé du TP4.

Tous les codes générés de ce corrigé ont été simulés instruction par instruction (à la main, puis avec un petit
script) : les résultats annoncés dans les tableaux « Vérification » sont ceux de ces simulations.

---

## Rappels utiles

### R1. Le principe : deux étapes (CM7 diapos 3, 6 et 9)

- On génère du **code 3 adresses** pour Mini-While / MiniC : variables `int`/`bool`, pas de fonctions (juste
  `main()`), traduction **dirigée par la syntaxe** : une règle de grammaire → une suite d'instructions (code
  redondant, aucune réutilisation de registre, CM7 diapo 3).
- Étape 1 : on écrit de **vraies instructions RISC-V** (`add`, `li`, `bge`…) mais sur des **temporaires**
  (`temp_0`, `temp_1`, …), sans décider où les données sont rangées. Un temporaire (« registre virtuel ») n'existe
  pas dans le processeur, et il y en a une infinité (CM7 diapo 6).
- Étape 2 : l'**allocation** décide où vit chaque temporaire (registre ? pile ?). Le code 3 adresses n'est pas du
  RISC-V valide tant que cette étape n'est pas faite (CM7 diapo 19).

### R2. Les fonctions de génération (TD4 §4.1, CM7 diapo 11)

```text
GenCodeExpr : Expression → Code* × Temporary     (le code, et le temporaire qui contient le résultat)
GenCodeSmt  : Statement  → Code*
fresh_tmp() : → Temporary      (un temporaire neuf : temp_0, temp_1, … dans l'ordre des appels)
new_label() : → Label          (appelée fresh_label() dans les règles et dans CM7 diapo 11)
symbol_table : Var → temporaire où se trouve la valeur courante de la variable
               (rempli au traitement des déclarations : un temporaire neuf par variable déclarée)
```

`code.add("…")` ajoute une instruction **à la fin** du code produit ; `code.addLabel(l)` y pose le label `l:`.
Les temporaires et les labels ont deux compteurs séparés.

### R3. Les règles du cours, recopiées telles quelles

Expressions (TD4 figure 4.1 = TP4 figure 4.2 ; les règles `c` et `e1 < e2` sont aussi CM7 diapos 13 et 14) :

```text
c            dest <- fresh_tmp()
             code.add("li dest, c")
             return dest

x            # get the temporary associated to x.
             tmp <- symbol_table[x]
             return tmp

e1+e2        t1 <- GenCodeExpr(e_1)
             t2 <- GenCodeExpr(e_2)
             dest <- fresh_tmp()
             code.add("add dest, t1, t2")
             return dest

e1-e2        t1 <- GenCodeExpr(e_1)
             t2 <- GenCodeExpr(e_2)
             dest <- fresh_tmp()
             code.add("sub dest, t1, t2")
             return dest

true         dest <-fresh_tmp()
             code.add("li dest, 1")
             return dest

e1 < e2      dest <- fresh_tmp()
             t1 <- GenCodeExpr(e1)
             t2 <- GenCodeExpr(e2)
             endrel <- fresh_label()
             code.add("li dest, 0")
             # if t1>=t2 jump to endrel
             code.add("bge endrel, t1, t2")
             code.add("li dest, 1")
             code.addLabel(endrel)
             return dest
```

Instructions (TD4 figure 4.2 = TP4 figure 4.3 ; la règle du `if` est aussi CM7 diapo 16) :

```text
x = e        tmp <- GenCodeExpr(e)
             loc <- symbol_table[x]
             code.add("mv loc, tmp")

S1; S2       # Just concatenate codes
             GenCodeSmt(S1)
             GenCodeSmt(S2)

if b then S1 else S2
             lelse <- fresh_label()
             lendif <- fresh_label()
             t1 <- GenCodeExpr(b)
             #if the condition is false, jump to else
             code.add("beq lelse, t1, 0")
             GenCodeSmt(S1) # then
             code.add("j lendif")
             code.addLabel(lelse)
             GenCodeSmt(S2) # else
             code.addLabel(lendif)

while( b ){ S }
             ltest <- fresh_label()
             lendwhile <- fresh_label()
             code.addLabel(ltest)
             t1 <- GenCodeExpr(b)
             code.add("beq lendwhile, t1, 0")
             GenCodeSmt(S) # execute S
             code.add("j ltest") # and jump to the test
             code.addLabel(lendwhile) # else it is done.
```

Règle de l'affichage, **déduite** du code fourni dans l'énoncé de l'exercice 2 (TD4 p. 2) et de la sortie attendue
du TP4 (p. 4, lignes 31 à 33) ; elle n'est pas dans les figures :

```text
println_int(e)
             t <- GenCodeExpr(e)
             code.add("mv a0, t")          # l'argument passe dans a0
             code.add("call println_int")
```

À retenir sur ces règles :

- **Un booléen est l'entier 0 (faux) ou 1 (vrai)** (CM7 diapo 14).
- Une variable ne produit **aucun code** : `GenCodeExpr(x)` renvoie directement son temporaire.
- La numérotation suit l'**ordre des appels** à `fresh_tmp()` / `fresh_label()`, pas l'ordre des instructions
  émises. Exemple du cours (CM7 diapo 15) pour `x < 4` avec x ↦ temp0 : `dest` est pris en premier (temp2),
  puis la constante 4 obtient temp3, mais `li temp3, 4` est émis **avant** `li temp2, 0`.

### R4. Deux écritures des branchements

- Dans les règles (et dans le code à compléter de l'exercice 2), le label est écrit **en premier** :
  `bge endrel, t1, t2` signifie « si t1 ≥ t2, sauter à endrel » ; dans `beq lelse, t1, 0`, le `0` désigne le
  registre `zero`.
- En assembleur RISC-V réel (CM6 diapo 8 : `blt rs1, rs2, label` ; exemples de CM7 diapos 15 et 17 ; sortie du
  compilateur du TP4), le label est **en dernier** : `bge t1, t2, endrel`, `beq t1, zero, lelse`.
- Dans ce corrigé : les **règles** sont écrites comme dans le cours (label en premier), le **code généré** est écrit
  en RISC-V réel (label en dernier), sauf le code à trous de l'exercice 2, complété dans sa propre écriture.

### R5. Instructions RISC-V utiles (CM6 diapos 5 à 9, fiche `riscv_isa.pdf`)

| Instruction | Effet |
|---|---|
| `li rd, imm` | rd ← imm (pseudo-instruction) |
| `mv rd, rs` | rd ← rs (= `addi rd, rs, 0`) |
| `add rd, rs1, rs2` ; `sub` ; `xor` ; `and` ; `or` | rd ← rs1 op rs2 |
| `addi rd, rs1, imm` | rd ← rs1 + imm |
| `slt rd, rs1, rs2` | rd ← (rs1 < rs2) ? 1 : 0 |
| `snez rd, rs` / `seqz rd, rs` | rd ← (rs ≠ 0) ? 1 : 0 / rd ← (rs = 0) ? 1 : 0 (pseudo-instructions) |
| `beq`, `bne`, `blt`, `bge rs1, rs2, label` | saut à label si rs1 = rs2, ≠, <, ≥ |
| `j label` | saut inconditionnel (= `jal x0, label`) |
| `call f` | appel de f (adresse de retour dans `ra`) |
| `ld rd, off(rs)` | rd ← Mem[rs + off] (64 bits) |
| `sd rs, off(rd)` | Mem[rd + off] ← rs (64 bits) |

Registres (CM6 diapo 5, `riscv_isa.pdf` §3.2.1) : `zero` (toujours 0), `ra` (adresse de retour), `sp` (pile),
`fp` = `s0` (cadre), `a0`–`a7` (arguments, `a0` = argument de `println_int`), `t0`–`t6`, `s1`–`s11`.

### R6. Conventions du TP4 (§4.1.1)

- Toute donnée occupe 64 bits (8 octets).
- `s1`, `s2`, `s3` sont **réservés** aux calculs intermédiaires (autour d'un `ld` / `sd`) ; `s0` = `fp` est réservé.
- `s4`, …, `s11`, `t0`, …, `t6` sont les **registres généralistes** utilisables par l'allocateur (15 registres,
  `Operands.GP_REGS` dans le code du TP).
- La pile croît vers les adresses basses : les données sont à `-8(fp)`, `-16(fp)`, … (décalages négatifs, multiples
  de 8) ; `sp` reste aligné sur 16 octets.

### R7. Allocation (CM7 diapos 19 à 22 et 28 ; TP4 §4.4 et §4.5)

- **Naïve, « tout en registres »** : temp_i → registre (CM7 diapo 19, « very, very naive »). Un registre
  généraliste différent par temporaire ; échec (`AllocationError`) s'il y a plus de temporaires que de registres.
- **« All in mem »** : temp_i → mémoire (« very naive »). Chaque temporaire a sa case de pile. Pour écrire
  (CM7 diapo 22) : `sd s3, -offset*8(fp)` (« write the value of s3 at address fp - offset*8 »), avec un `offset`
  neuf par temporaire (1, 2, 3, … : TP4 §4.5, exercice 4, étape 1). L'énoncé du TP4 ne donne pas de formule, seulement
  des exemples (Listing 4.1 : temp_1 en `-16(fp)`, temp_2 en `-24(fp)` ; le texte au-dessus : temp_3 en `-32(fp)`, temp_4
  en `-40(fp)`). La formule ci-dessous est celle qui colle à ces exemples :

  ```text
  temp_k  ↦  -8*(k+1)(fp)        temp_0 ↦ -8(fp), temp_1 ↦ -16(fp), temp_2 ↦ -24(fp), …
  ```

  Chaque instruction est encadrée : `ld` de chaque temporaire **lu** dans un registre réservé, l'instruction sur
  ces registres, `sd` du temporaire **écrit**. Pas de `ld` ni de `sd` inutile (TP4 §4.5).
- Défauts du tout-en-mémoire (CM7 diapo 28) : un accès mémoire à chaque opération, aucune case réutilisée.

### R8. Sémantique MiniC utile (TP1 §1.3.1)

Les variables MiniC sont **initialisées automatiquement** (0 pour `int`, `false` pour `bool`). Le compilateur du TP
traduit donc une déclaration `int n;` par `li temp_k, 0` sur le temporaire de n (TP4 p. 3, lignes 10 et 11).

---

## Exercice 4.1 : « By hand! » — code 3 adresses d'un `while`

### Question 1

**Énoncé.** Avec les règles de génération pour RISC-V, produire le code 3 adresses du corps de :

```c
int main(){
   int a,n;

   n = 1;
   a = 7;
   while (n < a) {
     n = n+1;
   }
   return 0;
}
```

**Méthode.** (1) Fixer `symbol_table` à partir des déclarations. (2) Découper le corps en instructions et repérer la
règle de chacune (ici `S1; S2` deux fois, puis `x = e`, `x = e`, `while`). (3) Dérouler les règles **ligne par
ligne, dans l'ordre**, en tenant deux compteurs (prochain temporaire, prochain label) : chaque `fresh_tmp()` prend le
numéro suivant, chaque `code.add` écrit à la fin du code. (4) Recopier le code émis dans l'ordre d'émission, puis le
simuler pour vérifier.

**Réponse.**

*Étape 1 : déclarations.* `int a,n;` ne produit aucune instruction dans les règles du TD ; chaque variable reçoit un
temporaire neuf. Le compilateur du TP associe **n ↦ temp_0** et **a ↦ temp_1** (c'est ce que montrent la sortie
attendue du TP4, p. 3, et le code de TD5 ex. 1) ; on garde ce choix pour pouvoir comparer. Le choix inverse
(a ↦ temp_0, n ↦ temp_1) est tout aussi juste et donne le même code à renommage près.

```text
symbol_table = { n ↦ temp_0, a ↦ temp_1 }        prochain temporaire : temp_2      prochain label : n° 1
```

*Étape 2 : structure.* Le corps est `n = 1 ; a = 7 ; while (n < a) { n = n+1; }`. La règle `S1; S2` dit de
concaténer : on génère les trois instructions l'une après l'autre. (`return 0;` ne relève pas de ces règles : en
MiniC il fait partie de la règle `function` de la grammaire, et le compilateur produit lui-même le code de fin.)

*Étape 3 : déroulé des règles.* Les labels portent les noms donnés par le compilateur du TP
(`lbl_<rôle>_<numéro>_main`) ; à la main, on peut les appeler l1, l2, l3.

```text
GenCodeSmt( n = 1 )                                          règle x = e
├─ tmp ← GenCodeExpr(1)                                      règle c
│    dest ← fresh_tmp() = temp_2
│    émet   li temp_2, 1
│    renvoie temp_2
├─ loc ← symbol_table[n] = temp_0
└─ émet   mv temp_0, temp_2

GenCodeSmt( a = 7 )                                          règle x = e
├─ tmp ← GenCodeExpr(7)                                      règle c
│    dest ← fresh_tmp() = temp_3
│    émet   li temp_3, 7
│    renvoie temp_3
├─ loc ← symbol_table[a] = temp_1
└─ émet   mv temp_1, temp_3

GenCodeSmt( while (n < a) { n = n+1; } )                     règle while
├─ ltest     ← fresh_label() = lbl_begin_while_1_main
├─ lendwhile ← fresh_label() = lbl_end_while_2_main
├─ pose le label   lbl_begin_while_1_main:
├─ t1 ← GenCodeExpr(n < a)                                   règle e1 < e2
│    dest ← fresh_tmp() = temp_4
│    t1 ← GenCodeExpr(n) = temp_0                            règle x : aucun code
│    t2 ← GenCodeExpr(a) = temp_1                            règle x : aucun code
│    endrel ← fresh_label() = lbl_end_relational_3_main
│    émet   li temp_4, 0
│    émet   bge endrel, temp_0, temp_1                       si n ≥ a, sauter à endrel
│    émet   li temp_4, 1
│    pose le label   lbl_end_relational_3_main:
│    renvoie temp_4
├─ émet   beq lendwhile, temp_4, 0                           condition fausse : sortir
├─ GenCodeSmt( n = n+1 )                                     règle x = e
│  ├─ tmp ← GenCodeExpr(n + 1)                               règle e1 + e2
│  │    t1 ← GenCodeExpr(n) = temp_0                         règle x : aucun code
│  │    t2 ← GenCodeExpr(1)                                  règle c
│  │         dest ← fresh_tmp() = temp_5 ; émet   li temp_5, 1
│  │    dest ← fresh_tmp() = temp_6
│  │    émet   add temp_6, temp_0, temp_5
│  │    renvoie temp_6
│  ├─ loc ← symbol_table[n] = temp_0
│  └─ émet   mv temp_0, temp_6
├─ émet   j lbl_begin_while_1_main                           retour au test
└─ pose le label   lbl_end_while_2_main:
```

*Étape 4 : le code obtenu* (écriture RISC-V réelle, label en dernier) :

```asm
        # int a,n;   (n ↦ temp_0, a ↦ temp_1)
        li temp_0, 0                  # initialisation MiniC, ajoutée par le compilateur du TP (R8)
        li temp_1, 0                  # idem ; ces 2 lignes ne viennent pas des règles du TD
        # n = 1;
        li temp_2, 1
        mv temp_0, temp_2
        # a = 7;
        li temp_3, 7
        mv temp_1, temp_3
        # while (n < a) { n = n+1; }
lbl_begin_while_1_main:
        li temp_4, 0
        bge temp_0, temp_1, lbl_end_relational_3_main
        li temp_4, 1
lbl_end_relational_3_main:
        beq temp_4, zero, lbl_end_while_2_main
        # n = n+1;
        li temp_5, 1
        add temp_6, temp_0, temp_5
        mv temp_0, temp_6
        j lbl_begin_while_1_main
lbl_end_while_2_main:
```

Dans l'écriture des règles (label en premier), les deux branchements s'écrivent
`bge lbl_end_relational_3_main, temp_0, temp_1` et `beq lbl_end_while_2_main, temp_4, zero`.

Contrôle : ce sont exactement les instructions des lignes 10 à 30 de la sortie attendue du TP4 (p. 3-4 ; seuls les
commentaires, qui y recopient l'arbre d'analyse, diffèrent), et, sans les deux lignes d'initialisation, exactement
les lignes 3 à 17 du code de TD5 ex. 1.

*Vérification par simulation.* On exécute le code ligne à ligne ; n = temp_0, a = temp_1.

| Passage au test | n (temp_0) | a (temp_1) | `bge` saute ? | temp_4 | `beq` saute ? | Corps : n devient |
|---|---|---|---|---|---|---|
| 1 | 1 | 7 | non (1 < 7) | 1 | non | 2 |
| 2 | 2 | 7 | non | 1 | non | 3 |
| 3 | 3 | 7 | non | 1 | non | 4 |
| 4 | 4 | 7 | non | 1 | non | 5 |
| 5 | 5 | 7 | non | 1 | non | 6 |
| 6 | 6 | 7 | non | 1 | non | 7 |
| 7 | 7 | 7 | oui (7 ≥ 7) | 0 | oui → fin | — |

État final : n = 7, a = 7, le corps a été exécuté 6 fois. C'est bien le comportement du programme MiniC (n passe de 1
à 7, on s'arrête dès que n < a est faux). Le code utilise 7 temporaires (temp_0 à temp_6) et 3 labels.

**Piège.**
- Créer du code pour une variable (par exemple `mv temp_7, temp_0` avant de comparer) : la règle `x` renvoie
  directement le temporaire de la variable, sans rien émettre.
- Écrire `add temp_0, temp_0, temp_5` : les règles calculent toujours dans un temporaire **neuf** (temp_6), puis
  `x = e` le recopie par `mv` dans le temporaire de la variable.
- Se tromper de sens dans le test : on saute **par-dessus** `li dest, 1` quand la condition est **fausse**
  (`bge` : t1 ≥ t2), puis `beq …, zero` sort de la boucle quand le booléen vaut 0.
- Oublier `j lbl_begin_while_1_main` (on ne bouclerait jamais), ou placer le label `ltest` après le calcul de la
  condition (la condition ne serait plus recalculée à chaque tour).

---

## Exercice 4.2 : « Another one » — compléter un code produit par le compilateur

### Question 1

**Énoncé.** Pour le programme ci-dessous, sachant que n ↦ temp_0, compléter le code produit par le compilateur
(deux trous : « TODO 3 lines, condition + branch » et « TODO 3 lines (body of the loop) »).

```c
int main(){
  int n;
  while (n < 10)
  {
    println_int(n);
    n = n + 1;
  }
  return 0;
}
```

**Méthode.** Repérer dans le code donné les temporaires et labels déjà fixés, puis dérouler les règles `while`,
`e1 < e2` et `x = e` en respectant l'ordre des appels `fresh_tmp()` : c'est lui qui explique les numéros visibles
dans le code donné. Écrire le résultat dans la même écriture que le code à trous (label en premier).

**Réponse.**

*Ce que le code donné nous apprend.*
- Le label `lbl_begin_while_1_main` est `ltest` (label n° 1), `lbl_end_while_2_main` est `lendwhile` (n° 2),
  `lbl_end_relational_3_main` est `endrel` de la comparaison (n° 3) : c'est l'ordre des `fresh_label()` des règles
  `while` puis `<`.
- Seul temp_0 (la variable n, déclarée et mise à 0 par `li temp_0, 0` avant la boucle, R8) existe avant la boucle.

*Déroulé de la condition `n < 10`* (règle `e1 < e2`) :

```text
dest ← fresh_tmp() = temp_1                       (pris AVANT les opérandes)
t1 ← GenCodeExpr(n)  = temp_0                     règle x : aucun code
t2 ← GenCodeExpr(10)                              règle c
     dest' ← fresh_tmp() = temp_2 ; émet  li temp_2, 10      ← la ligne déjà donnée
endrel ← fresh_label() = lbl_end_relational_3_main
émet  li temp_1, 0
émet  bge endrel, temp_0, temp_2                  si n ≥ 10, sauter à endrel
émet  li temp_1, 1
pose  lbl_end_relational_3_main:
renvoie temp_1                                    ← d'où « beq lbl_end_while_2_main, temp_1, zero »
```

On comprend ainsi pourquoi `li temp_2, 10` apparaît **avant** les lignes sur temp_1 : temp_1 a été réservé en
premier (`dest <- fresh_tmp()` est la première ligne de la règle), mais `li dest, 0` n'est émis qu'après le code des
opérandes. C'est exactement la situation de l'exemple du cours `x < 4` (CM7 diapo 15).

*Déroulé du corps `n = n + 1`* (règles `x = e` puis `e1 + e2`) : t1 = temp_0 (aucun code) ; la constante 1 prend
temp_3 (`li temp_3, 1`) ; la somme prend temp_4 (`add temp_4, temp_0, temp_3`) ; puis `mv temp_0, temp_4`.

*Code complété* (lignes ajoutées marquées `<-`, écriture de l'énoncé : label en premier) :

```asm
        # (stat (while_stat while ( (expr (expr (atom n)) < (expr (atom 10))) ) ..<cut>
lbl_begin_while_1_main:
        li temp_2, 10
        li temp_1, 0                                      # <-
        bge lbl_end_relational_3_main, temp_0, temp_2     # <-  si n >= 10, temp_1 reste à 0
        li temp_1, 1                                      # <-
lbl_end_relational_3_main:
        beq lbl_end_while_2_main, temp_1, zero
        # (stat (print_stat println_int ( (expr (atom n)) ) ;))
        mv a0, temp_0
        call println_int
        # (stat (assignment n = (expr (expr (atom n)) + (expr (atom 1)))) ;)
        li temp_3, 1                                      # <-
        add temp_4, temp_0, temp_3                        # <-
        mv temp_0, temp_4                                 # <-
        j lbl_begin_while_1_main
lbl_end_while_2_main:
```

En RISC-V réel, les deux branchements s'écrivent `bge temp_0, temp_2, lbl_end_relational_3_main` et
`beq temp_1, zero, lbl_end_while_2_main`.

*Vérification par simulation* (avec `li temp_0, 0` avant la boucle, puisque n vaut 0 au départ en MiniC) :

| Passage au test | n (temp_0) | `bge` saute ? | temp_1 | Affiché | n devient |
|---|---|---|---|---|---|
| 1 | 0 | non (0 < 10) | 1 | 0 | 1 |
| 2 | 1 | non | 1 | 1 | 2 |
| … | … | … | … | … | … |
| 10 | 9 | non | 1 | 9 | 10 |
| 11 | 10 | oui (10 ≥ 10) | 0 | — (sortie) | — |

Le programme affiche 0, 1, …, 9 (une valeur par ligne) et s'arrête avec n = 10.

**Piège.**
- Écrire `li temp_2, 0` / `li temp_2, 1` : le booléen est dans temp_1, comme l'indique le `beq` donné ; temp_2
  contient la constante 10.
- Croire que l'ordre des numéros est l'ordre des lignes : `dest` est numéroté avant les opérandes mais initialisé
  après leur code.
- Remarquer (sans s'en inquiéter) que `li temp_2, 10` est refait à chaque tour, parce que la condition est générée
  après le label `ltest` : c'est la redondance assumée du code dirigé par la syntaxe (CM7 diapo 3).

---

## Exercice 4.3 : « Xor » — règle pour un nouvel opérateur booléen

### Question 1

**Énoncé.** Écrire une règle de génération de code pour l'opérateur booléen `e1 xor e2` sans utiliser
l'instruction RISC-V `xor`.

**Méthode.** Un booléen vaut 0 ou 1 (CM7 diapo 14). `e1 xor e2` est vrai si et seulement si exactement un des deux
est vrai, c'est-à-dire si et seulement si t1 ≠ t2. On recopie le schéma de la règle `e1 < e2` : `dest` mis à 0, saut
conditionnel par-dessus `li dest, 1`. Seule change la condition du saut : on saute (résultat faux) quand t1 = t2.

**Réponse.** Une règle possible (il en existe d'autres) :

```text
e1 xor e2    dest <- fresh_tmp()
             t1 <- GenCodeExpr(e1)
             t2 <- GenCodeExpr(e2)
             endxor <- fresh_label()
             code.add("li dest, 0")
             # si t1 = t2 (deux vrais ou deux faux), le xor est faux : sauter à endxor
             code.add("beq endxor, t1, t2")
             code.add("li dest, 1")
             code.addLabel(endxor)
             return dest
```

*Vérification sur la table de vérité :*

| t1 | t2 | `beq` saute ? | dest | t1 xor t2 attendu |
|---|---|---|---|---|
| 0 | 0 | oui | 0 | 0 |
| 0 | 1 | non | 1 | 1 |
| 1 | 0 | non | 1 | 1 |
| 1 | 1 | oui | 0 | 0 |

*Exemple.* Avec b1 ↦ temp_0 et b2 ↦ temp_1, `GenCodeExpr(b1 xor b2)` prend dest = temp_2, ne produit aucun code
pour les deux variables, prend le label n° 1, et émet :

```asm
        li temp_2, 0
        beq temp_0, temp_1, lbl_end_xor_1_main
        li temp_2, 1
lbl_end_xor_1_main:
        # temp_2 contient b1 xor b2
```

Simulé sur les quatre cas (b1, b2) ∈ {0, 1}² : temp_2 vaut 0, 1, 1, 0, comme la table.

*Variante sans saut* (également correcte) : sur des booléens 0/1, t1 − t2 vaut −1, 0 ou 1, et il est non nul
exactement quand t1 ≠ t2.

```text
e1 xor e2    t1 <- GenCodeExpr(e1)
             t2 <- GenCodeExpr(e2)
             diff <- fresh_tmp()
             dest <- fresh_tmp()
             code.add("sub diff, t1, t2")     # diff ∈ {-1, 0, 1}
             code.add("snez dest, diff")      # dest = 1 si diff ≠ 0, 0 sinon
             return dest
```

`snez rd, rs` est une pseudo-instruction de la fiche `riscv_isa.pdf` (`sltu rd, x0, rs`). Vérification :
(0,0) → diff = 0 → 0 ; (0,1) → −1 → 1 ; (1,0) → 1 → 1 ; (1,1) → 0 → 0.

Autres réponses acceptables : traduire `e1 xor e2` par `(e1 or e2) and not(e1 and e2)`, ou par `e1 != e2`, si les
règles de ces opérateurs sont disponibles.

**Piège.**
- Ces règles reposent sur l'invariant « tout booléen vaut exactement 0 ou 1 », garanti parce que toutes les règles
  booléennes produisent 0 ou 1. Si un booléen pouvait valoir 2 (« non nul = vrai »), `beq` donnerait 2 xor 1 = vrai,
  ce qui est faux.
- Contrairement à `and` / `or`, `xor` ne peut pas être paresseux : il faut toujours évaluer les deux opérandes.
- Oublier `li dest, 0` : sur le chemin où l'on saute, dest n'aurait aucune valeur.

---

## Exercice 4.4 : « If zero construct » — expression conditionnelle `ifz(e, e, e)`

### Question 1

**Énoncé.** On ajoute à la syntaxe abstraite des expressions `e ::= … | ifz(e, e, e)` : `ifz(e1, e2, e3)` vaut e2 si
e1 vaut zéro, e3 sinon. L'exemple `x == 0 ? y + 3 : 70` s'écrit `ifz(x, y + 3, 70)`. Donner une règle de génération
de code.

**Méthode.** C'est une **expression** : la règle doit renvoyer **un seul** temporaire `dest`. C'est un **choix** :
on reprend la forme de la règle du `if` (deux labels, un saut conditionnel, un `j` à la fin de la première
branche). Chaque branche calcule sa valeur dans son propre temporaire et la recopie dans `dest`, pour qu'après la
jonction le résultat soit dans `dest` quel que soit le chemin suivi.

**Réponse.** Une règle possible :

```text
ifz(e1, e2, e3)
             dest <- fresh_tmp()
             lelse <- fresh_label()
             lendifz <- fresh_label()
             t1 <- GenCodeExpr(e1)
             # si e1 ≠ 0, la valeur est celle de e3 : sauter à lelse
             code.add("bne lelse, t1, 0")
             t2 <- GenCodeExpr(e2)        # cas e1 = 0 : code de e2 placé ici
             code.add("mv dest, t2")
             code.add("j lendifz")
             code.addLabel(lelse)
             t3 <- GenCodeExpr(e3)        # cas e1 ≠ 0 : code de e3 placé ici
             code.add("mv dest, t3")
             code.addLabel(lendifz)
             return dest
```

Point essentiel : `GenCodeExpr(e2)` est appelé **après** l'émission du `bne`, et `GenCodeExpr(e3)` **après** le
label `lelse` : le code de chaque branche est ainsi rangé à l'endroit où il doit s'exécuter, et une seule des deux
branches est évaluée.

*Exemple : `ifz(x, y + 3, 70)` avec x ↦ temp_0, y ↦ temp_1.*

```text
dest ← temp_2 ; lelse ← label n° 1 ; lendifz ← label n° 2
t1 ← GenCodeExpr(x) = temp_0 (aucun code) ; émet  bne lelse, temp_0, 0
t2 ← GenCodeExpr(y + 3) : temp_1 (aucun code), li temp_3, 3, add temp_4, temp_1, temp_3 → temp_4
émet  mv temp_2, temp_4 ; émet  j lendifz ; pose lelse
t3 ← GenCodeExpr(70) : li temp_5, 70 → temp_5
émet  mv temp_2, temp_5 ; pose lendifz ; renvoie temp_2
```

```asm
        bne temp_0, zero, lbl_else_ifz_1_main
        li temp_3, 3
        add temp_4, temp_1, temp_3
        mv temp_2, temp_4
        j lbl_end_ifz_2_main
lbl_else_ifz_1_main:
        li temp_5, 70
        mv temp_2, temp_5
lbl_end_ifz_2_main:
        # temp_2 contient la valeur de ifz(x, y + 3, 70)
```

*Vérification par simulation :*

| x (temp_0) | y (temp_1) | `bne` saute ? | Instructions exécutées | temp_2 | Attendu |
|---|---|---|---|---|---|
| 0 | 5 | non | li temp_3 ; add temp_4 = 8 ; mv ; j | 8 | y + 3 = 8 |
| 4 | 5 | oui | li temp_5 = 70 ; mv | 70 | 70 |
| −1 | 5 | oui | li temp_5 = 70 ; mv | 70 | 70 |

Typage associé, dans le style de TD2 ex. 7 : Γ ⊢ e1 : int, Γ ⊢ e2 : t et Γ ⊢ e3 : t ⟹ Γ ⊢ ifz(e1, e2, e3) : t.

**Piège.**
- Générer le code de e2 **et** de e3 avant le test : les deux branches seraient toujours calculées. C'est plus
  coûteux, et faux si une branche échoue : en MiniC, `ifz(x, 0, 100 / x)` avec x = 0 doit valoir 0, alors que le
  calcul de `100 / x` arrêterait le programme sur « Division by 0 ».
- Oublier le `mv dest, …` d'une branche : sur ce chemin, dest n'est pas défini. On ne peut pas « renvoyer t2 ou
  t3 » : la règle renvoie un seul temporaire, fixé à la compilation.
- Oublier `j lendifz` : après le calcul de e2, on tomberait dans le code de e3, qui écraserait dest.
- Inverser le test : ifz = « si zéro » ; on va vers e2 quand t1 = 0, donc on saute au else quand t1 ≠ 0 (`bne`).

---

## Exercice 4.5 : « A new language construct » — `repeat S until e`

### Question 1

**Énoncé.** Écrire une règle de génération de code pour l'instruction `repeat S until e`.

**Méthode.** Partir de la sémantique (TD3 ex. 3) : on exécute S, puis on évalue e **dans l'état obtenu après S** ;
si e est vrai on s'arrête, sinon on recommence. Donc S est exécuté au moins une fois et le test est à la fin. Il
suffit d'un label en tête de boucle ; quand la condition est vraie, on continue simplement en séquence.

**Réponse.** Une règle possible :

```text
repeat S until e
             lrepeat <- fresh_label()
             code.addLabel(lrepeat)
             GenCodeSmt(S)              # le corps, exécuté au moins une fois
             t1 <- GenCodeExpr(e)       # la condition, évaluée après S
             # si la condition est fausse, recommencer
             code.add("beq lrepeat, t1, 0")
```

Il n'y a pas de label de fin : si t1 = 1, le `beq` ne saute pas et l'exécution passe à l'instruction suivante. On
compte un seul label et un seul saut, contre deux labels, un saut conditionnel et un `j` pour le `while`.

*Exemple : `repeat x = x + 1 until 3 < x` avec x ↦ temp_0.*

```text
lrepeat ← label n° 1 ; pose lrepeat
GenCodeSmt(x = x + 1) : li temp_1, 1 ; add temp_2, temp_0, temp_1 ; mv temp_0, temp_2
GenCodeExpr(3 < x) : dest ← temp_3 ; t1 ← GenCodeExpr(3) = temp_4 (li temp_4, 3) ; t2 = temp_0 ;
                     endrel ← label n° 2 ; li temp_3, 0 ; bge endrel, temp_4, temp_0 ; li temp_3, 1 ; pose endrel
émet  beq lrepeat, temp_3, 0
```

```asm
lbl_begin_repeat_1_main:
        li temp_1, 1
        add temp_2, temp_0, temp_1
        mv temp_0, temp_2
        li temp_4, 3
        li temp_3, 0
        bge temp_4, temp_0, lbl_end_relational_2_main
        li temp_3, 1
lbl_end_relational_2_main:
        beq temp_3, zero, lbl_begin_repeat_1_main
```

*Vérification par simulation, en partant de x = 0 :*

| Tour | x après le corps | 3 < x ? (`bge 3, x` saute si 3 ≥ x) | temp_3 | `beq` |
|---|---|---|---|---|
| 1 | 1 | non (saut) | 0 | reboucle |
| 2 | 2 | non | 0 | reboucle |
| 3 | 3 | non (3 ≥ 3) | 0 | reboucle |
| 4 | 4 | oui | 1 | sort |

On sort avec x = 4. En partant de x = 10, le corps est exécuté une fois (x = 11), puis 3 < 11 est vrai et on sort :
le corps est bien exécuté au moins une fois, même si la condition est vraie dès le départ.

Autre solution correcte mais moins bonne : générer le code de la transformation `S ; while (not e) { S }` (celle que notre
corrigé du TD3 propose en exercice 3 ; le sujet ne la donne pas, et Mini-While n'a pas de `not`),
qui recopie deux fois le code de S et demande une négation.

**Piège.**
- Inverser le sens : `until e` reboucle tant que e est **faux**, d'où `beq …, t1, 0` (sauter en arrière si 0).
  Le `do S while (e)` de C est l'inverse (il reboucle si e est vrai, `bne`).
- Placer le test avant S : on obtiendrait un `while`, où S peut ne jamais s'exécuter.
- Appeler `GenCodeExpr(e)` avant `GenCodeSmt(S)` : le code de la condition serait placé avant celui du corps.

---

## Exercice 4.6 : « A weird extension of loops » — `while (e) first S1 S`

Programme de l'énoncé :

```c
 1  #include "printlib.h"
 2
 3  int main() {
 4     int x;
 5     x = 0;
 6     while (x < 4)
 7     first {
 8         println_int(x);
 9         x = x + 1;
10     }
11     {
12         println_string("and");
13         println_int(x);
14         x = x + 1;
15     }
16     return 0;
17  }
```

Spécification : la partie « `first` + bloc » est facultative (sans elle, c'est le `while` habituel). Avec `first`,
on a `while (e) do (first S1) S done` : la condition est évaluée, puis, quand elle est vraie, **à la première
itération** on exécute S1 **au lieu de** S ; aux itérations suivantes, S1 est ignoré et S s'exécute normalement.

### Question 1

**Énoncé.** Quelle est l'exécution attendue du programme ?

**Méthode.** Simuler la spécification à la main : à chaque passage, évaluer la condition, puis exécuter S1 si c'est
le premier passage où elle est vraie, S sinon. Noter l'affichage et la valeur de x.

**Réponse.**

| Passage au test | x | x < 4 | Bloc exécuté | Affichage | x à la fin du bloc |
|---|---|---|---|---|---|
| 1 | 0 | vrai | S1 (première itération) | `0` | 1 |
| 2 | 1 | vrai | S | `and`, `1` | 2 |
| 3 | 2 | vrai | S | `and`, `2` | 3 |
| 4 | 3 | vrai | S | `and`, `3` | 4 |
| 5 | 4 | faux | — (fin de la boucle) | — | — |

Sortie attendue (chaque `println_…` affiche puis passe à la ligne) :

```text
0
and
1
and
2
and
3
```

Puis `return 0` : le programme termine avec le code 0.

**Piège.** S1 remplace S à la première itération : on n'exécute pas S1 puis S. Et si la condition est fausse dès
le premier test, ni S1 ni S ne sont exécutés.

### Question 2

**Énoncé.** Donner une règle de génération de code pour la nouvelle construction.

**Méthode.** Chercher un programme équivalent écrit avec les constructions connues, puis s'en inspirer pour placer
les labels. Ici : `while (b) first S1 S` se comporte exactement comme `if b then (S1 ; while (b) { S }) else skip`
(tester b ; s'il est faux, rien ; s'il est vrai, S1, puis la boucle ordinaire sur S, qui reteste b avant chaque S).
Le nombre d'évaluations de b est le même dans les deux versions.

**Réponse.**

*Côté grammaire* (pour que le compilateur MiniC accepte la construction ; style de `MiniC.g4`, TP1) :

```antlr
while_stat: WHILE OPAR expr CPAR (FIRST first_block=stat_block)? body=stat_block #whileStat;

FIRST : 'first';      // nouveau mot-clé, à déclarer avant la règle ID
```

Si `first_block` est absent, on applique la règle habituelle du `while` ; sinon la règle suivante.

*Règle de génération* (une solution, d'autres existent) :

```text
while (b) first S1 S
             ltest <- fresh_label()
             lendwhile <- fresh_label()
             # premier test
             t1 <- GenCodeExpr(b)
             code.add("beq lendwhile, t1, 0")    # faux dès le départ : ni S1 ni S
             GenCodeSmt(S1)                      # première itération : S1 au lieu de S
             # itérations suivantes : un while ordinaire sur S
             code.addLabel(ltest)
             t2 <- GenCodeExpr(b)                # second exemplaire du code de b
             code.add("beq lendwhile, t2, 0")
             GenCodeSmt(S)
             code.add("j ltest")
             code.addLabel(lendwhile)
```

C'est le code de `if b then (S1 ; while (b) { S }) else skip` débarrassé de son `else` vide : le premier test saute
directement à la fin de la boucle. Le code de b est produit deux fois (deux appels à `GenCodeExpr`, donc des
temporaires et des labels différents), mais aucune instruction n'est ajoutée à l'exécution.

*Application au programme de l'énoncé* (x ↦ temp_0 ; ltest = label n° 1, lendwhile = n° 2, puis n° 3 et n° 4 pour
les deux comparaisons). ⚠ Le générateur du TP4 ne gère pas les chaînes (TP4 §4.1, `MiniCUnsupportedError`) : pour
`println_string("and")`, on suppose ici que la chaîne est rangée en `.rodata` sous un label `str_and` et qu'on appelle
une fonction `println_string` de la bibliothèque ; ces deux lignes sont une hypothèse, pas une règle du cours.

```asm
        # int x;
        li temp_0, 0                  # initialisation MiniC (R8)
        # x = 0;
        li temp_1, 0
        mv temp_0, temp_1
        # while (x < 4) first {...} {...} : premier test
        li temp_3, 4
        li temp_2, 0
        bge temp_0, temp_3, lbl_end_relational_3_main
        li temp_2, 1
lbl_end_relational_3_main:
        beq temp_2, zero, lbl_end_while_2_main
        # S1 : println_int(x); x = x + 1;
        mv a0, temp_0
        call println_int
        li temp_4, 1
        add temp_5, temp_0, temp_4
        mv temp_0, temp_5
lbl_test_while_1_main:
        # tests suivants
        li temp_7, 4
        li temp_6, 0
        bge temp_0, temp_7, lbl_end_relational_4_main
        li temp_6, 1
lbl_end_relational_4_main:
        beq temp_6, zero, lbl_end_while_2_main
        # S : println_string("and"); println_int(x); x = x + 1;
        la a0, str_and                # ⚠ hypothèse (chaînes non gérées au TP4)
        call println_string
        mv a0, temp_0
        call println_int
        li temp_8, 1
        add temp_9, temp_0, temp_8
        mv temp_0, temp_9
        j lbl_test_while_1_main
lbl_end_while_2_main:

        .section .rodata
str_and:
        .string "and"
```

Le nom `lbl_test_while_1_main` est choisi ici pour le test de cette nouvelle construction (le compilateur du TP nomme
`lbl_begin_while_<n>_main` le test d'un `while` ordinaire).

*Vérification par simulation :*

| Étape | x (temp_0) | Test exécuté | Résultat | Suite | Affichage |
|---|---|---|---|---|---|
| premier test | 0 | temp_2 = (0 < 4) = 1 | vrai | S1 | `0` ; x = 1 |
| `lbl_test_while_1` | 1 | temp_6 = 1 | vrai | S | `and`, `1` ; x = 2 |
| `lbl_test_while_1` | 2 | temp_6 = 1 | vrai | S | `and`, `2` ; x = 3 |
| `lbl_test_while_1` | 3 | temp_6 = 1 | vrai | S | `and`, `3` ; x = 4 |
| `lbl_test_while_1` | 4 | temp_6 = 0 (`bge` 4 ≥ 4 saute) | faux | fin | — |

La sortie est `0, and, 1, and, 2, and, 3`, celle de la question 1.

*Variante avec un drapeau* (le code de b n'apparaît qu'une fois, au prix d'un temporaire et d'un test de plus à
chaque tour) :

```text
while (b) first S1 S     (variante)
             ltest <- fresh_label()
             lnotfirst <- fresh_label()
             lendwhile <- fresh_label()
             tfirst <- fresh_tmp()
             code.add("li tfirst, 1")             # réarmé à chaque entrée dans la boucle
             code.addLabel(ltest)
             t1 <- GenCodeExpr(b)
             code.add("beq lendwhile, t1, 0")
             # pas la première itération : aller à S
             code.add("beq lnotfirst, tfirst, 0")
             code.add("li tfirst, 0")
             GenCodeSmt(S1)
             code.add("j ltest")
             code.addLabel(lnotfirst)
             GenCodeSmt(S)
             code.add("j ltest")
             code.addLabel(lendwhile)
```

Simulée sur le même programme, elle donne la même sortie.

**Piège.**
- La « première itération » est relative à **chaque exécution** de l'instruction `while`, pas au programme : dans
  des boucles imbriquées, le S1 de la boucle interne doit s'exécuter à chaque nouvelle entrée dans celle-ci. Dans la
  variante, `li tfirst, 1` doit donc être placé avant `ltest` (exécuté à chaque entrée), pas dans une
  initialisation globale.
- Exécuter S1 puis S à la première itération, ou exécuter S1 même quand la condition est fausse au départ.

### Question 3

**Énoncé.** Comment testeriez-vous cette nouvelle construction ?

**Méthode.** Écrire des programmes MiniC de test avec leur sortie attendue (directives du TP4 §4.1.2), en couvrant
les cas limites du nombre d'itérations, la non-régression du `while` ordinaire, l'imbrication, le typage, et tous
les allocateurs.

**Réponse.** Une liste possible :

1. **L'exemple de l'énoncé**, sortie attendue `0, and, 1, and, 2, and, 3`. Comme le générateur du TP4 ne gère pas
   les chaînes, on remplace `println_string("and")` par un marqueur entier, par exemple `println_int(100)`.
2. **Condition fausse dès le départ** (x = 5, `x < 4`) : ni S1 ni S, rien n'est affiché.
3. **Condition vraie une seule fois** (x = 3) : seul S1 s'exécute (affiche `3`), puis on sort.
4. **Plusieurs itérations** (cas 1) : S1 une fois, puis S à chaque tour, jamais S1 de nouveau.
5. **Boucles imbriquées** : un `while … first` dans un `while` ; le S1 interne doit être rejoué à chaque entrée dans
   la boucle interne.
6. **Sans `first`** : tous les tests existants du `while` doivent toujours passer (non-régression). Vérifier aussi
   que `first` est devenu un mot réservé (un ancien programme qui l'utilisait comme nom de variable ne se compile
   plus).
7. **Typage** : un test `bad_…` dont la condition n'est pas un booléen doit être rejeté par le vérificateur de types
   (règle attendue : Γ ⊢ b : bool, Γ ⊢ S1 : void, Γ ⊢ S : void ⟹ Γ ⊢ while (b) first S1 S : void).
8. **Tous les allocateurs** : lancer les tests avec `make test-naive`, `make test-mem` (ou `make test-lab4`).

Comme GCC ne connaît pas `first`, chaque test porte la directive `// SKIP TEST EXPECTED` (sinon `test_expect`, qui
compile le fichier avec `riscv64-unknown-elf-gcc`, échoue). Exemple pour le cas 5 (sortie vérifiée par simulation
des deux règles) :

```c
#include "printlib.h"

int main() {
  int i, j;
  i = 0;
  while (i < 2) {
    j = 0;
    while (j < 2)
    first { println_int(100); j = j + 1; }
    { println_int(200); j = j + 1; }
    i = i + 1;
  }
  return 0;
}
// SKIP TEST EXPECTED
// EXPECTED
// 100
// 200
// 100
// 200
```

**Piège.** Se contenter de l'exemple de l'énoncé : il ne teste ni la boucle vide, ni l'itération unique, ni
l'imbrication, où une erreur sur le « premier passage » se voit justement.

---

## Exercice 4.7 : « For loops » — grammaire et règle pour une boucle `for` simple

### Question 1

**Énoncé.** Inventer une règle de grammaire pour une boucle `for` « basique ».

**Méthode.** Rester dans le style de `MiniC.g4` (TP1) : une nouvelle alternative de `stat`, des sous-éléments
étiquetés pour les retrouver dans le visiteur, un nouveau mot-clé. MiniC n'a que des affectations comme
instructions simples : l'initialisation et le pas sont des `assignment`.

**Réponse.** Une boucle à la C (d'autres choix sont possibles, voir la variante plus bas) :

```antlr
stat
   : assignment SCOL
   | if_stat
   | while_stat
   | for_stat              // NOUVEAU
   | print_stat
   ;

for_stat: FOR OPAR init=assignment SCOL cond=expr SCOL step=assignment CPAR
          body=stat_block #forStat;

FOR : 'for';               // mot-clé, déclaré avant la règle ID
```

Syntaxe abstraite correspondante : `S ::= … | for (S_init ; b ; S_step) S`, où S_init et S_step sont des
affectations. Typage : Γ ⊢ S_init : void, Γ ⊢ b : bool, Γ ⊢ S_step : void, Γ ⊢ S : void ⟹ Γ ⊢ for (…) S : void.

Exemple accepté : `for (i = 0; i < 3; i = i + 1) println_int(i);`

**Piège.** Déclarer `FOR` après `ID` dans le lexer : `for` serait reconnu comme un identificateur (à longueur égale,
ANTLR choisit la première règle écrite).

### Question 2

**Énoncé.** Donner la règle de génération de code de cette boucle.

**Méthode.** Sémantique : S_init une seule fois, puis, tant que b est vrai, le corps S suivi du pas S_step. C'est
`S_init ; while (b) { S ; S_step }` : on reprend la règle du `while` avec S_init devant et S_step à la fin du corps.

**Réponse.**

```text
for (S_init; b; S_step) S
             ltest <- fresh_label()
             lendfor <- fresh_label()
             GenCodeSmt(S_init)              # une seule fois, avant la boucle
             code.addLabel(ltest)
             t1 <- GenCodeExpr(b)            # condition recalculée à chaque tour
             # si la condition est fausse, sortir
             code.add("beq lendfor, t1, 0")
             GenCodeSmt(S)                   # le corps
             GenCodeSmt(S_step)              # puis le pas
             code.add("j ltest")             # et retour au test
             code.addLabel(lendfor)
```

*Exemple : `for (i = 0; i < 3; i = i + 1) println_int(i);` avec i ↦ temp_0.*

```text
ltest ← label n° 1 ; lendfor ← label n° 2
GenCodeSmt(i = 0)        : li temp_1, 0 ; mv temp_0, temp_1
pose ltest
GenCodeExpr(i < 3)       : dest ← temp_2 ; t1 = temp_0 ; li temp_3, 3 ; endrel ← label n° 3 ;
                           li temp_2, 0 ; bge endrel, temp_0, temp_3 ; li temp_2, 1 ; pose endrel
émet beq lendfor, temp_2, 0
GenCodeSmt(println_int(i)) : mv a0, temp_0 ; call println_int
GenCodeSmt(i = i + 1)    : li temp_4, 1 ; add temp_5, temp_0, temp_4 ; mv temp_0, temp_5
émet j ltest ; pose lendfor
```

```asm
        # i = 0
        li temp_1, 0
        mv temp_0, temp_1
lbl_begin_for_1_main:
        # i < 3
        li temp_3, 3
        li temp_2, 0
        bge temp_0, temp_3, lbl_end_relational_3_main
        li temp_2, 1
lbl_end_relational_3_main:
        beq temp_2, zero, lbl_end_for_2_main
        # corps : println_int(i)
        mv a0, temp_0
        call println_int
        # pas : i = i + 1
        li temp_4, 1
        add temp_5, temp_0, temp_4
        mv temp_0, temp_5
        j lbl_begin_for_1_main
lbl_end_for_2_main:
```

*Vérification par simulation :*

| Passage au test | i (temp_0) | i < 3 (temp_2) | Affiché | i après le pas |
|---|---|---|---|---|
| 1 | 0 | 1 | 0 | 1 |
| 2 | 1 | 1 | 1 | 2 |
| 3 | 2 | 1 | 2 | 3 |
| 4 | 3 | 0 → sortie | — | — |

Sortie `0, 1, 2`, et i = 3 à la sortie, comme en C.

*Variante* : la boucle `for i in e1 .. e2 S` de TD2 ex. 8, avec nos choix (le sujet ne donne que la syntaxe) : bornes
incluses, i déjà déclarée, borne haute évaluée une seule fois avant la boucle :

```text
for x in e1 .. e2 S
             ltest <- fresh_label()
             lendfor <- fresh_label()
             t1 <- GenCodeExpr(e1)
             loc <- symbol_table[x]
             code.add("mv loc, t1")              # x = e1
             t2 <- GenCodeExpr(e2)
             tmax <- fresh_tmp()
             code.add("mv tmax, t2")             # copie de la borne : figée même si e2 est une variable modifiée par S
             code.addLabel(ltest)
             # si tmax < x (x a dépassé la borne), sortir
             code.add("blt lendfor, tmax, loc")
             GenCodeSmt(S)
             GenCodeSmt(x = x + 1)               # incrément, par les règles habituelles
             code.add("j ltest")
             code.addLabel(lendfor)
```

Simulée sur `for i in 1 .. 3 println_int(i)`, elle affiche `1, 2, 3`.

**Piège.**
- Placer S_init après `ltest` : i serait remis à 0 à chaque tour, d'où une boucle infinie.
- Mettre le pas avant le corps : `for (i = 0; i < 3; i = i + 1) println_int(i)` afficherait 1, 2, 3 au lieu de
  0, 1, 2.
- Placer le code de la condition avant `ltest` : elle ne serait évaluée qu'une fois.

---

## Exercice 4.8 : « Prepare the lab: allocations » — allocations naïve et « all in mem »

Code 3 adresses de départ (c'est aussi l'exercice de CM7 diapos 25 et 26) :

```asm
        li temp_0, 42
        li temp_1, 1
        add temp_2, temp_1, temp_0
```

Avant de commencer, on classe les temporaires de chaque instruction en **lus** et **écrits** (c'est ce que fait la
méthode `is_read_only` du TP4) :

| Instruction | Temporaires lus | Temporaire écrit |
|---|---|---|
| `li temp_0, 42` | — | temp_0 |
| `li temp_1, 1` | — | temp_1 |
| `add temp_2, temp_1, temp_0` | temp_1, temp_0 | temp_2 |

Valeurs attendues après exécution : temp_0 = 42, temp_1 = 1, temp_2 = 43.

### Question 1

**Énoncé.** Calculer l'allocation naïve et réécrire le code en conséquence.

**Méthode.** Allocation naïve = « tout en registres » (CM7 diapo 19) : on donne à chaque temporaire un registre
physique **différent**, pris parmi les registres généralistes `s4`–`s11`, `t0`–`t6` (TP4 §4.1.1), puis on remplace
chaque temporaire par son registre dans chaque instruction. Aucune analyse : deux temporaires ne partagent jamais un
registre.

**Réponse.** Choix (un parmi d'autres) : on prend les registres généralistes dans l'ordre où le TP4 les énumère.

```text
temp_0 ↦ s4        temp_1 ↦ s5        temp_2 ↦ s6
```

```asm
        li s4, 42
        li s5, 1
        add s6, s5, s4
```

Vérification : s4 = 42, s5 = 1, s6 = 1 + 42 = 43. Trois instructions, aucun accès mémoire, trois registres.

⚠ À vérifier : l'allocateur `NaiveAllocator` fourni au TP (`Lib/Allocator.py`) prend les registres de
`Operands.GP_REGS` dans un ordre qui lui est propre, qui n'est pas donné dans les supports ; il peut donc produire
d'autres registres. Toute association injective vers des registres généralistes est correcte.

Limite : il n'y a que 15 registres généralistes. Au-delà de 15 temporaires, l'allocation naïve échoue
(`AllocationError`, TP4 §4.4) ; le code de l'exercice 4.1 (7 temporaires) passe encore.

**Piège.** Utiliser un registre interdit : `s1`–`s3` (réservés aux calculs temporaires autour des `ld`/`sd`, TP4 §4.1.1), `s0` = `fp`, `zero`,
`sp`, `ra`, ou `a0` (utilisé pour passer l'argument de `println_int`).

### Question 2

**Énoncé.** Calculer l'allocation « all in mem » et réécrire le code en conséquence.

**Méthode.** Chaque temporaire reçoit sa case de pile : temp_k ↦ `-8*(k+1)(fp)` (convention du TP4, R7). Chaque
instruction est réécrite en trois temps : (1) `ld` de chaque temporaire **lu** dans un registre réservé (ici `s1`
puis `s2`) ; (2) l'instruction elle-même, sur ces registres, avec le résultat dans un registre réservé (ici `s3`) ;
(3) `sd` du résultat dans la case du temporaire **écrit**. Un temporaire seulement écrit n'est pas chargé.

**Réponse.**

*Allocation :*

```text
temp_0 ↦ -8(fp)        temp_1 ↦ -16(fp)        temp_2 ↦ -24(fp)
```

*Code réécrit :*

```asm
        # li temp_0, 42
        li s3, 42
        sd s3, -8(fp)
        # end li temp_0, 42
        # li temp_1, 1
        li s3, 1
        sd s3, -16(fp)
        # end li temp_1, 1
        # add temp_2, temp_1, temp_0
        ld s1, -16(fp)
        ld s2, -8(fp)
        add s3, s1, s2
        sd s3, -24(fp)
        # end add temp_2, temp_1, temp_0
```

*Vérification par simulation :*

| Instruction | s1 | s2 | s3 | -8(fp) | -16(fp) | -24(fp) |
|---|---|---|---|---|---|---|
| `li s3, 42` | | | 42 | | | |
| `sd s3, -8(fp)` | | | 42 | 42 | | |
| `li s3, 1` | | | 1 | 42 | | |
| `sd s3, -16(fp)` | | | 1 | 42 | 1 | |
| `ld s1, -16(fp)` | 1 | | 1 | 42 | 1 | |
| `ld s2, -8(fp)` | 1 | 42 | 1 | 42 | 1 | |
| `add s3, s1, s2` | 1 | 42 | 43 | 42 | 1 | |
| `sd s3, -24(fp)` | 1 | 42 | 43 | 42 | 1 | 43 |

À la fin, la case de temp_2 (`-24(fp)`) contient 43 : même résultat que le code 3 adresses.

Le choix de `s1`, `s2`, `s3` est libre parmi les registres réservés, à condition que les deux opérandes lus par une
même instruction soient chargés dans deux registres différents. Le Listing 4.1 du TP4 fait un autre choix (il
traduit `li temp_2, 4` par `li s2, 4` / `sd s2, -24(fp)`, et `mv temp_1, temp_2` par `ld s1, -24(fp)` /
`mv s2, s1` / `sd s2, -16(fp)`).

*Bilan* (CM7 diapo 28) :

| | Naïve | All in mem |
|---|---|---|
| Instructions | 3 | 8 |
| Accès mémoire | 0 | 5 (3 `sd`, 2 `ld`) |
| Place utilisée | 3 registres | 3 cases de 8 octets = 24 octets de pile |
| Limite | 15 temporaires au plus | aucune (hors taille de la pile) |

Pour aller plus loin, le même principe s'applique aux autres instructions : un branchement ne fait que lire, par
exemple `bge temp_0, temp_1, lbl` devient `ld s1, -8(fp)` / `ld s2, -16(fp)` / `bge s1, s2, lbl` (pas de `sd`), et
`mv temp_0, temp_2` devient `ld s1, -24(fp)` / `mv s3, s1` / `sd s3, -8(fp)`.

**Piège.**
- Ajouter un `ld` inutile pour la destination d'un `li` ou d'un `add` (elle n'est qu'écrite), ou oublier le `sd`
  (le résultat serait perdu, car s1–s3 sont réutilisés dès l'instruction suivante). TP4 §4.5 : « Be careful to not
  add useless ld or sd instructions! »
- Mettre des décalages positifs, ou utiliser `-8*k(fp)` : temp_0 serait en `0(fp)`, qui n'est pas une case du cadre
  (hachurée sur la figure de CM7 diapo 21). La bonne formule est temp_k ↦ `-8*(k+1)(fp)`.
- Charger les deux opérandes lus dans le même registre (`ld s1, -16(fp)` puis `ld s1, -8(fp)` écrase le premier).
- Utiliser `lw` / `sw` (32 bits) au lieu de `ld` / `sd` (64 bits) : toutes les données font 8 octets.

---

## Ce qu'il faut retenir

1. **Deux étapes** : d'abord du code 3 adresses avec une infinité de temporaires (instructions RISC-V réelles), puis
   une allocation qui place chaque temporaire en registre ou en pile (CM7 diapos 6 et 19).
2. `GenCodeExpr` renvoie **le temporaire du résultat** : une constante donne `li` dans un temporaire neuf, une
   variable ne donne **aucun code** (son temporaire est dans `symbol_table`), une affectation se termine par
   `mv loc, tmp`.
3. **La numérotation suit l'ordre des appels** à `fresh_tmp()` / `fresh_label()` dans la règle, pas l'ordre des
   lignes émises : dans `e1 < e2`, `dest` est numéroté avant les opérandes, mais `li dest, 0` est émis après leur
   code (CM7 diapo 15, exercice 4.2).
4. **Booléens = 0 ou 1.** Une comparaison : `li dest, 0`, saut conditionnel inversé par-dessus `li dest, 1`, label.
5. **Instructions de contrôle** : on saute quand la condition est **fausse** (`beq …, t1, 0`), on revient au test par
   `j`, et le code de chaque sous-terme est généré à l'endroit précis où il doit s'exécuter.
6. **Nouvelle construction** : écrire d'abord sa sémantique (ordre des évaluations, nombre d'exécutions de chaque
   partie, cas « 0 itération »), chercher un programme équivalent avec les constructions connues, puis placer
   labels et sauts ; vérifier en simulant, y compris les cas limites.
7. **Expression à choix** (`ifz`) : un seul `dest`, un `mv dest, …` dans chaque branche, et seule la branche choisie
   est évaluée. `repeat … until e` : un seul label, test à la fin, retour en arrière si e est faux.
8. **Allocation naïve** : un registre généraliste distinct par temporaire (`s4`–`s11`, `t0`–`t6`) ; échec au-delà de
   15 temporaires.
9. **All in mem** : temp_k ↦ `-8*(k+1)(fp)` ; `ld` des temporaires lus dans `s1`/`s2`, calcul, `sd` du temporaire
   écrit ; ni `ld` ni `sd` inutile.
10. **Écriture des branchements** : les règles mettent le label en premier (`bge endrel, t1, t2`), l'assembleur
    RISC-V le met en dernier (`bge t1, t2, endrel`) ; le sens du test est le même.
