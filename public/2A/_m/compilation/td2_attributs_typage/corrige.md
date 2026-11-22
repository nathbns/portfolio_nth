# TD2 : Attributs dirigés par la syntaxe, typage — corrigé détaillé

Numérotation : « Exercice 2.k » = « Exercise #k » du sujet (les sections 2.1 et 2.2 du sujet regroupent les
exercices 1 à 3 et 4 à 8). Pages des CM = numéro imprimé en bas à droite de la diapositive.

## Rappels utiles

### Arbre de dérivation (CM2 p. 30, 37 ; TD1 ex. 8)

Les diapositives montrent des arbres de dérivation (arbres d'ANTLR, CM2 p. 30) sans en donner de définition ; les deux premiers points ci-dessous sont la définition usuelle.

- La racine est l'axiome de la grammaire. Chaque nœud interne est un non-terminal : ses fils sont, dans l'ordre, les
  symboles du membre droit de la règle appliquée. Les feuilles sont des terminaux (tokens) ou ε.
- Un nœud interne = une application de règle. Les feuilles, lues de gauche à droite, redonnent le mot analysé.
- « An AST is not! a derivation tree » (CM2 p. 37) : l'arbre de dérivation garde tout (parenthèses, `;`, chaînes
  E → T → F, ε) ; l'AST ne garde que les constructions du langage.
- Analyse lexicale, résolution des ambiguïtés (CM2 p. 14) : (1) plus long préfixe (*longest match*) ; (2) à égalité,
  première règle du fichier.

### Attributs et actions sémantiques (CM2 p. 39-45, CM3 p. 8-9)

- **Action sémantique** : code exécuté chaque fois qu'une règle de grammaire est reconnue (CM2 p. 40).
- **Attribut** : information attachée aux terminaux / non-terminaux de la grammaire (CM2 p. 41). Deux sortes :
  - **synthétisé** : des fils vers le père (↑) ; appliquer une règle *produit* une valeur (le cas le plus courant) ;
  - **hérité** : l'inverse (↓) ; appliquer une règle *consomme* une valeur (« not used in this course »).
- Notation (CM2 p. 42) :

```text
S↑r → S1↑r1 S2↑r2 ; {r := f(r1, r2)}
```

  S reconnaît une chaîne si le début est reconnu par S1 et la suite par S2 ; reconnaître S (resp. S1, S2) produit r
  (resp. r1, r2) ; r est calculé par l'instruction r := f(r1, r2). Toutes les règles qui produisent un S ont des
  attributs du **même type**.
- Exemple du cours (CM2 p. 43), attributs de type int :

```text
E↑v → E1↑v1 + E2↑v2 ; {v := v1 + v2}
E↑v → c↑vc          ; {v := vc}          (en pratique, la valeur de c est donnée par le lexer)
```

- Implémentation (CM2 p. 44) : les attributs synthétisés existent dans la plupart des générateurs (reconnaître une
  règle « produit » une valeur) ; les attributs hérités sont souvent implémentés par des **variables globales / de
  classe**, mais ANTLR les gère nativement.
- En ANTLR, backend Java (CM2 p. 45, repris CM3 p. 9) :

```antlr
expr returns [ int val ] // expr a un attribut synthétisé entier, nommé val
    : LPAR e=expr RPAR     { $val = $e.val; }
    | INT                  { $val = Integer.valueOf($INT.text); } // .text = chaîne reconnue par le lexer
    | e1=expr PLUS e2=expr { $val = $e1.val + $e2.val; }
    ;
```

- Un interprète « par actions sémantiques » utilise ces attributs pour évaluer le programme par induction sur la
  syntaxe : (string)"37 + 5" → … → (int)42 (CM3 p. 8).

### Typage (CM4 ; CM5 p. 31)

- **Quand ?** Typage **dynamique** (pendant l'exécution : Lisp, PHP, Python, JavaScript) ou **statique** (à la
  compilation, après lexing + parsing : C, Java, OCaml). Le cours fait du statique (CM4 p. 7).
- **Objectifs** (CM4 p. 10) : décidable ; **sûreté** (rejeter `1.0+"toto"` *avant* une erreur à l'évaluation) ;
  **expressivité** (ne pas rejeter trop de programmes). Slogan : *well typed programs do not go wrong* (p. 8).
- **Jugement** (CM4 p. 12 et 18) : `Γ ⊢ e : τ`, τ ∈ Basetype = {int, bool}, se lit « sous l'environnement Γ,
  l'expression e a le type τ » ; Γ associe un type Γ(x) à chaque variable déclarée x. Pour les instructions :
  `Γ ⊢ S : void` = « S est bien typée ». Exemples : `∅ ⊢ 3 : int`, `∅ ⊢ skip : void`.
- Une règle `P1 … Pn / B` (prémisses au-dessus de la barre, conclusion en dessous) signifie P1 ∧ … ∧ Pn ⇒ B
  (CM4 p. 18). Un jugement est prouvé par un **arbre** de règles. Dans ce corrigé, on appelle « axiomes » les conditions qui ferment les feuilles (`c ∈ ℤ`, `Γ(x) = t`, `t ∈ {int, bool}`) : le cours n'emploie pas ce mot.
- Règles de Mini-While (CM4 p. 21, recopiées dans le sujet ; le sujet écrit `while( b ){ S }` là où CM4 p. 21
  écrit `while b do S done`, et les deux écrivent l'affectation `x = e`) :

```text
   c ∈ ℤ                 Γ(x) = t    t ∈ {int, bool}              Γ ⊢ e1 : int    Γ ⊢ e2 : int
----------- (int)        --------------------------- (var)        ---------------------------- (+)
Γ ⊢ c : int                       Γ ⊢ x : t                            Γ ⊢ e1 + e2 : int

Γ ⊢ e1 : int    Γ ⊢ e2 : int            Γ ⊢ S1 : void    Γ ⊢ S2 : void
---------------------------- (<)        ------------------------------ (seq)
     Γ ⊢ e1 < e2 : bool                       Γ ⊢ S1 ; S2 : void

Γ ⊢ e : t    Γ ⊢ x : t    t ∈ {int, bool}
----------------------------------------- (=)
            Γ ⊢ x = e : void

Γ ⊢ b : bool    Γ ⊢ S : void                Γ ⊢ b : bool    Γ ⊢ S1 : void    Γ ⊢ S2 : void
---------------------------- (while)        ---------------------------------------------- (if)
 Γ ⊢ while (b) { S } : void                        Γ ⊢ if b then S1 else S2 : void
```

- CM4 p. 19 donne aussi (var) sous forme d'axiome : `Γ ⊢ x : Γ(x)`. Dans l'exemple du cours (CM4 p. 22), les
  conditions annexes `t ∈ {int, bool}` ne sont pas écrites dans l'arbre (elles sont toujours vraies).
- Règles « similaires » que le sujet autorise à ajouter (« If necessary, other "similar" rules should be added »).
  Elles ne sont pas sur les diapositives, sauf skip (`∅ ⊢ skip : void`, CM4 p. 18 ; `Γ ⊢ skip`, CM5 p. 31) :

```text
Γ ⊢ e1 : int    Γ ⊢ e2 : int            Γ ⊢ e : int              Γ ⊢ e1 : bool    Γ ⊢ e2 : bool
---------------------------- (−)        ------------ (−u)        ------------------------------ (&&)
     Γ ⊢ e1 − e2 : int                  Γ ⊢ −e : int                  Γ ⊢ e1 && e2 : bool

--------------- (skip)
Γ ⊢ skip : void
```

  (× et / comme + ; les autres comparateurs comme < ; || comme &&.)
- **Coercion** (CM4 p. 23) : pour `1.2 + 42`, OCaml (et MiniC) rejettent ; C, Python, Java calculent un flottant.
  Proprement, on rend la conversion explicite dans l'AST (nœud `ConvFloat`).
- **Construction de Γ** (CM4 p. 26) : Γ est construit en parcourant la partie déclarations de l'AST (ce qui peut lever
  des erreurs, par exemple en cas de double déclaration), puis sert à typer le programme. CM5 p. 31 :
  `∅ ⊢ D ; S` si `ΓD ⊢ S`, avec ΓD ≜ {x ↦ τ tel que x : τ ∈ D} (indéfini en cas de définitions multiples).
  Règles du sujet (ex. 6) :

```text
------------------------------------- (decl)
t vlist; →d [v ↦ t pour v dans vlist]

D1 →d Γ1    D2 →d Γ2    Dom(Γ1) ∩ Dom(Γ2) = ∅
--------------------------------------------- (seqD)
             D1 ; D2 →d Γ1 ∪ Γ2
```

### Méthode générale pour un arbre de typage

1. Lire le programme comme un terme de syntaxe abstraite (repérer le `;` de séquence, les sous-expressions).
2. Écrire le but `Γ ⊢ programme : void` **en bas**.
3. La forme syntaxique du terme désigne **la seule** règle applicable (`;` → (seq), `x = e` → (=), `while` → (while),
   `<` → (<), `+` → (+), variable → (var), constante → (int)).
4. Écrire au-dessus les prémisses de cette règle, qui deviennent de nouveaux buts ; recommencer jusqu'aux axiomes
   (`c ∈ ℤ`, `Γ(x) = t`, `t ∈ {int, bool}`). Nommer la règle à chaque barre.

---

## Exercice 2.1 : Cohérence de fichiers XML (Exercise #1)

Grammaire (axiome L ; terminaux `<`, `</`, `>`, `ident`) :

```text
L → E L | ε
E → A L B | ident
A → < ident >
B → </ ident >
```

### Question 1

**Énoncé.** Donner l'arbre de dérivation de la chaîne `<html><head>toto</head>titi</foo>`.

**Méthode.** D'abord découper la chaîne en tokens. Ensuite, partir de l'axiome L et développer toujours le
non-terminal le plus à gauche ; le prochain token suffit à choisir la règle :

| Non-terminal à développer | Prochain token | Règle choisie |
|---|---|---|
| L | `<` ou `ident` | L → E L |
| L | `</` ou fin du texte | L → ε |
| E | `<` | E → A L B |
| E | `ident` | E → ident |

Enfin, dessiner l'arbre : un nœud interne par règle appliquée, et vérifier que les feuilles relues de gauche à droite
redonnent la chaîne.

**Réponse.**

*Étape 1 : tokens.* `</` est un seul token (règle du plus long préfixe, CM2 p. 14), distinct de `<` :

```text
<  html  >  <  head  >  toto  </  head  >  titi  </  foo  >
<  ident >  <  ident >  ident </  ident >  ident </  ident >        (14 tokens)
```

*Étape 2 : dérivation gauche* (à chaque ligne, le non-terminal le plus à gauche est remplacé) :

```text
 0   L
 1 ⇒ E L                                       L → E L
 2 ⇒ A L B L                                   E → A L B
 3 ⇒ <html> L B L                              A → < ident >
 4 ⇒ <html> E L B L                            L → E L
 5 ⇒ <html> A L B L B L                        E → A L B
 6 ⇒ <html><head> L B L B L                    A → < ident >
 7 ⇒ <html><head> E L B L B L                  L → E L
 8 ⇒ <html><head>toto L B L B L                E → ident
 9 ⇒ <html><head>toto B L B L                  L → ε
10 ⇒ <html><head>toto</head> L B L             B → </ ident >
11 ⇒ <html><head>toto</head> E L B L           L → E L
12 ⇒ <html><head>toto</head>titi L B L         E → ident
13 ⇒ <html><head>toto</head>titi B L           L → ε
14 ⇒ <html><head>toto</head>titi</foo> L       B → </ ident >
15 ⇒ <html><head>toto</head>titi</foo>         L → ε
```

*Étape 3 : arbre de dérivation* (15 applications de règles = 15 nœuds internes) :

```text
L
├── E
│   ├── A
│   │   ├── <
│   │   ├── ident (html)
│   │   └── >
│   ├── L
│   │   ├── E
│   │   │   ├── A
│   │   │   │   ├── <
│   │   │   │   ├── ident (head)
│   │   │   │   └── >
│   │   │   ├── L
│   │   │   │   ├── E
│   │   │   │   │   └── ident (toto)
│   │   │   │   └── L
│   │   │   │       └── ε
│   │   │   └── B
│   │   │       ├── </
│   │   │       ├── ident (head)
│   │   │       └── >
│   │   └── L
│   │       ├── E
│   │       │   └── ident (titi)
│   │       └── L
│   │           └── ε
│   └── B
│       ├── </
│       ├── ident (foo)
│       └── >
└── L
    └── ε
```

Vérification : les feuilles lues de gauche à droite (en ignorant les ε) donnent
`< html > < head > toto </ head > titi </ foo >`, c'est-à-dire la chaîne de départ. L'arbre est unique : à chaque
étape, le prochain token détermine la règle (tableau ci-dessus), donc la grammaire n'est pas ambiguë.

Conclusion importante : la chaîne est **syntaxiquement correcte**, alors que `<html>` est fermée par `</foo>`. Une
grammaire hors contexte vérifie l'imbrication (comme des parenthèses), pas l'égalité des noms. C'est l'objet de la
question 2.

**Piège.**
- Oublier les trois nœuds `L → ε` : tout L doit être développé, y compris en ε.
- Accrocher `toto` directement sous le E de `head` : `toto` est un E (règle E → ident) à l'intérieur du L
  intermédiaire.
- Dessiner un AST (un nœud `html` contenant `head`) au lieu de l'arbre de dérivation.
- Croire que la grammaire rejette la chaîne parce que html ≠ foo.

### Question 2

**Énoncé.** Écrire une définition dirigée par la syntaxe qui lève une exception si les balises ouvrante et fermante
ne portent pas le même identificateur.

**Méthode.** Se demander où se trouve l'information et où elle sert. Les noms sont dans A et dans B (fournis par le
lexer, comme vc pour c en CM2 p. 43). Ils ne peuvent être comparés que dans un nœud qui voit les deux : le père E de
la règle E → A L B. On donne donc à A et B un attribut **synthétisé** n (le nom de la balise), et on place le test dans
l'action de E → A L B. Les autres règles n'ont rien à calculer.

**Réponse.** Notation du cours ; ident↑v désigne le texte de l'identificateur, fourni par le lexer :

```text
L → E L               ; { }
L → ε                 ; { }
E → A↑n1 L B↑n2       ; { si n1 ≠ n2 alors lever Exception("balise <n1> fermée par </n2>") }
E → ident             ; { }
A↑n → < ident↑v >     ; { n := v }
B↑n → </ ident↑v >    ; { n := v }
```

Déroulement sur la chaîne de la question 1. Un attribut synthétisé est calculé quand son nœud est complet, donc les
fils avant le père :

1. premier A : n = "html" ;
2. deuxième A : n = "head" ;
3. E → ident (toto) : rien ;
4. premier B : n = "head" ;
5. E de `head` : n1 = "head", n2 = "head", égaux, pas d'exception ;
6. E → ident (titi) : rien ;
7. deuxième B : n = "foo" ;
8. E de `html` : n1 = "html", n2 = "foo", différents : **exception** « balise <html> fermée par </foo> ».

Arbre décoré (seuls les nœuds utiles sont détaillés) :

```text
L
├── E                     test : n1 = "html", n2 = "foo"  →  différents : exception
│   ├── A↑"html"
│   ├── L
│   │   ├── E             test : n1 = "head", n2 = "head" →  OK
│   │   │   ├── A↑"head"
│   │   │   ├── L         (toto)
│   │   │   └── B↑"head"
│   │   └── L             (titi)
│   └── B↑"foo"
└── L → ε
```

Implémentation ANTLR, backend Java, dans le style de CM2 p. 45 (testée avec ANTLR 4.13.2 : exception sur la chaîne
du sujet, « OK » sur `<html><head>toto</head>titi</html>`) :

```antlr
lexer grammar XmlLexer;

LTS   : '</' ;            // '</' l'emporte sur '<' par la règle du plus long préfixe
LT    : '<' ;
GT    : '>' ;
IDENT : [a-zA-Z] [a-zA-Z0-9]* ;
WS    : [ \t\r\n]+ -> skip ;
```

```antlr
parser grammar XmlParser;
options {tokenVocab=XmlLexer;}

prog : l EOF { System.out.println("OK"); } ;

l : e l
  |
  ;

e : a l b { if (!$a.name.equals($b.name))
              throw new RuntimeException("<" + $a.name + "> fermée par </" + $b.name + ">"); }
  | IDENT
  ;

a returns [ String name ] : LT IDENT GT  { $name = $IDENT.text; } ;
b returns [ String name ] : LTS IDENT GT { $name = $IDENT.text; } ;
```

Autre solution correcte, sans exception : faire remonter un booléen ok jusqu'à la racine.

```text
L↑ok → E↑ok1 L↑ok2             ; { ok := ok1 ∧ ok2 }
L↑ok → ε                       ; { ok := vrai }
E↑ok → A↑n1 L↑ok1 B↑n2         ; { ok := ok1 ∧ (n1 = n2) }
E↑ok → ident                   ; { ok := vrai }
(A et B comme ci-dessus)
```

Le document est cohérent si et seulement si l'attribut ok de la racine vaut vrai. Il existe d'autres variantes, par
exemple transmettre le nom ouvrant à B par un attribut hérité et faire le test dans B.

**Piège.**
- Mettre le test dans A ou dans B : avec des attributs synthétisés, A ne connaît pas le nom porté par B (et
  inversement). Seul leur père commun E voit les deux.
- En Java, comparer les chaînes avec `.equals`, pas avec `==` (qui compare des références).
- Oublier que le nom vient du lexer (`$IDENT.text`), comme la valeur d'une constante.
- Lexer : `</` doit être un token à part entière. Si on ne définit que `<` et `/` séparément, on ne reconnaît plus
  la grammaire donnée.

---

## Exercice 2.2 : Expressions (Exercise #2)

### Question unique

**Énoncé.** Attribuer la grammaire suivante pour évaluer les expressions arithmétiques (une expression se termine
par un point-virgule) :

```text
Z → E ;      E → E + T      E → T      T → T * F      T → F      F → ( E )      F → i
```

**Méthode.** On prend un seul attribut **synthétisé** v, de type int, sur Z, E, T, F : la valeur de la
sous-expression reconnue. On écrit **une action par production** (7 productions, donc 7 actions) :
- les opérateurs calculent ;
- les règles unitaires (E → T, T → F) et les parenthèses recopient la valeur ;
- la feuille i reçoit sa valeur du lexer.

La priorité et l'associativité viennent de la forme de l'arbre (donc de la grammaire), pas des actions.

**Réponse.** Notation du cours. E1 et T1 désignent l'occurrence de E (de T) dans le membre droit, comme E1 en
CM2 p. 43. Dans la première ligne, `';'` est le point-virgule terminal ; le `;` suivant sépare la règle de son action.

```text
Z↑v → E↑v1 ';'         ; { v := v1 ; afficher v }
E↑v → E1↑v1 + T↑v2     ; { v := v1 + v2 }
E↑v → T↑v1             ; { v := v1 }
T↑v → T1↑v1 * F↑v2     ; { v := v1 × v2 }
T↑v → F↑v1             ; { v := v1 }
F↑v → ( E↑v1 )         ; { v := v1 }
F↑v → i↑vi             ; { v := vi }      (vi : valeur de l'entier, donnée par le lexer)
```

Exemple 1 : `(1 + 2) * 3 ;`, qui utilise les 7 productions. Arbre de dérivation décoré :

```text
Z↑9
├── E↑9
│   └── T↑9
│       ├── T↑3
│       │   └── F↑3
│       │       ├── (
│       │       ├── E↑3
│       │       │   ├── E↑1
│       │       │   │   └── T↑1
│       │       │   │       └── F↑1
│       │       │   │           └── i↑1
│       │       │   ├── +
│       │       │   └── T↑2
│       │       │       └── F↑2
│       │       │           └── i↑2
│       │       └── )
│       ├── *
│       └── F↑3
│           └── i↑3
└── ;
```

Ordre de calcul (des feuilles vers la racine, les fils avant le père) :

```text
i↑1 ; F↑1 (F → i) ; T↑1 (T → F) ; E↑1 (E → T) ;
i↑2 ; F↑2 (F → i) ; T↑2 (T → F) ;
E↑3 (E → E + T : 1 + 2) ; F↑3 (F → ( E ) : recopie) ; T↑3 (T → F) ;
i↑3 ; F↑3 (F → i) ;
T↑9 (T → T * F : 3 × 3) ; E↑9 (E → T) ; Z↑9 (Z → E ;)        → résultat 9
```

Exemple 2 : `1 + 2 * 3 ;` (la priorité vient de l'arbre : `*` est sous `+`) :

```text
Z↑7
├── E↑7                    E → E + T : 1 + 6
│   ├── E↑1
│   │   └── T↑1
│   │       └── F↑1
│   │           └── i↑1
│   ├── +
│   └── T↑6                T → T * F : 2 × 3
│       ├── T↑2
│       │   └── F↑2
│       │       └── i↑2
│       ├── *
│       └── F↑3
│           └── i↑3
└── ;
```

Implémentation ANTLR, backend Java, comme CM2 p. 45. ANTLR accepte la récursivité gauche directe (CM2 p. 32).
Testée avec ANTLR 4.13.2 : `1 + 2 + 3;` → 6, `1 + 2 * 3;` → 7, `(1 + 2) * 3;` → 9, `2*(3+4)*5+6;` → 76.

```antlr
z returns [ int val ]
  : e SEMI { $val = $e.val; System.out.println("Result: " + $val); }
  ;

e returns [ int val ]
  : e1=e PLUS t  { $val = $e1.val + $t.val; }
  | t            { $val = $t.val; }
  ;

t returns [ int val ]
  : t1=t TIMES f { $val = $t1.val * $f.val; }
  | f            { $val = $f.val; }
  ;

f returns [ int val ]
  : LPAR e RPAR  { $val = $e.val; }
  | INT          { $val = Integer.valueOf($INT.text); }
  ;
```

C'est exactement un « interprète par actions sémantiques » (CM3 p. 8-9) : la chaîne est évaluée pendant l'analyse,
par induction sur la syntaxe.

Remarque : si `i` désignait une **variable** et non une constante, sa valeur ne serait pas dans le token. Il faudrait
une mémoire (un état σ, ou une table globale) : `F↑v → i↑x ; { v := σ(x) }`.

**Piège.**
- Oublier les règles de recopie (E → T, T → F, F → ( E )). Sans action, l'attribut du père n'est pas défini.
- Croire que les actions gèrent la priorité : `1 + 2 * 3` vaut 7 parce que l'arbre place `*` sous `+`.
- La récursivité gauche (E → E + T) donne l'associativité à gauche. C'est sans effet pour + et ×, mais décisif si on
  ajoute `−` : `5 − 2 − 1` doit valoir (5 − 2) − 1 = 2, et non 5 − (2 − 1) = 4.
- Confondre le `;` terminal de Z → E ; avec le `;` qui sépare la règle de l'action.

---

## Exercice 2.3 : Vérification contextuelle (Exercise #3)

Fragment de grammaire :

```text
P → program id B
B → begin L end
L → I L | ε
I → id = E
I → while E do B
I → break
```

### Question 1 : attributs pour `break`

**Énoncé.** Étendre la grammaire avec des attributs et des règles sémantiques pour que chaque nœud `I` d'un
`break` porte un attribut type valant `void` (break dans le corps d'une boucle) ou `error` (break hors boucle).

**Méthode.** Se demander d'où vient l'information. Le fait qu'un `break` soit dans une boucle dépend de ses
**ancêtres** (y a-t-il un `while` au-dessus ?), pas de ses fils : sous I → break, il n'y a que le mot-clé.
L'information descend donc du père vers les fils : c'est un attribut **hérité** (↓, CM2 p. 41). On prend :
- un booléen hérité `in` (pour *inside a loop*) sur B, L et I, qui vaut faux à la racine, devient vrai quand on entre
  dans le corps d'un `while`, et est recopié partout ailleurs ;
- sur I, un attribut type t, calculé pour `break` à partir de `in`.

**Réponse.** Par analogie avec ↑, on note X↓h un attribut hérité h de X. Dans l'action d'une règle, le père calcule
les attributs hérités de ses fils.

```text
P → program id B↓in1           ; { in1 := faux }
B↓in → begin L↓in1 end         ; { in1 := in }
L↓in → I↓in1 L↓in2             ; { in1 := in ; in2 := in }
L↓in → ε                       ; { }
I↓in↑t → id = E                ; { t := void }
I↓in↑t → while E do B↓in1      ; { in1 := vrai ; t := void }
I↓in↑t → break                 ; { t := si in alors void sinon error }
```

Inutile de passer `in` à E : une expression ne contient pas de `break`.

Exemple. Le programme suivant contient un `break` dans une boucle, puis un `break` hors boucle :

```text
program p begin
  x = 1
  while x do begin
    break
  end
  break
end
```

Arbre de dérivation décoré (E n'est pas détaillé, la grammaire des expressions n'est pas donnée) :

```text
P
├── program
├── id (p)
└── B↓faux                                  in1 := faux (règle de P)
    ├── begin
    ├── L↓faux
    │   ├── I↓faux↑void                     x = 1
    │   │   ├── id (x)
    │   │   ├── =
    │   │   └── E (1)
    │   └── L↓faux
    │       ├── I↓faux↑void                 while
    │       │   ├── while
    │       │   ├── E (x)
    │       │   ├── do
    │       │   └── B↓vrai                  in1 := vrai (règle du while)
    │       │       ├── begin
    │       │       ├── L↓vrai
    │       │       │   ├── I↓vrai↑void     break dans la boucle : type = void
    │       │       │   │   └── break
    │       │       │   └── L↓vrai
    │       │       │       └── ε
    │       │       └── end
    │       └── L↓faux
    │           ├── I↓faux↑error            break hors boucle : type = error
    │           │   └── break
    │           └── L↓faux
    │               └── ε
    └── end
```

Avec des boucles imbriquées, tout `break` situé sous au moins un `while` reçoit `in = vrai`, donc `void`.

Pour que le compilateur *rejette* le programme, il suffit ensuite de signaler une erreur dès qu'un nœud reçoit
t = error (ou de faire remonter à P un booléen « aucun error »).

Implémentation ANTLR, backend Java. Les attributs hérités sont gérés nativement par ANTLR (CM2 p. 44), sous forme
d'**arguments de règle**. Testée avec ANTLR 4.13.2 : sur l'exemple, `break ligne 4 : void` puis
`break ligne 6 : error`.

```antlr
parser grammar BrkParser;
options {tokenVocab=BrkLexer;}

p : PROGRAM ID b[false] EOF ;                     // B.in := faux

b [ boolean inloop ] : BEGIN l[$inloop] END ;      // L.in := B.in

l [ boolean inloop ]
  : i[$inloop] l[$inloop]                          // I.in := L.in ; L1.in := L.in
  |
  ;

i [ boolean inloop ] returns [ String type ]
  : ID ASSIGN expr          { $type = "void"; }
  | WHILE expr DO b[true]   { $type = "void"; }   // B.in := vrai
  | BREAK                   { $type = $inloop ? "void" : "error";
                              System.out.println("break ligne " + $BREAK.line + " : " + $type); }
  ;

expr : ID | INT ;
```

(Dans le lexer, `PROGRAM`, `BEGIN`, `END`, `WHILE`, `DO`, `BREAK` sont déclarés **avant** `ID`, sinon les mots-clés
seraient reconnus comme identificateurs : CM2 p. 14.)

Variante « variable globale » (l'autre implémentation citée en CM2 p. 44), testée elle aussi : un compteur de
profondeur de boucle remplace l'attribut hérité.

```antlr
@members { int loopDepth = 0; }

i returns [ String type ]
  : ID ASSIGN expr                                    { $type = "void"; }
  | WHILE expr DO { loopDepth++; } b { loopDepth--; } { $type = "void"; }
  | BREAK { $type = (loopDepth > 0) ? "void" : "error"; }
  ;
```

Autre réponse correcte, avec des attributs **synthétisés uniquement** (puisque le cours n'utilise pas d'attributs
hérités). Chaque nœud fait remonter l'ensemble s des nœuds `break` qui ne sont pas encore entourés d'une boucle :
`while` les déclare `void`, et ceux qui arrivent à la racine sont `error`.

```text
P → program id B↑s             ; { pour tout nœud n ∈ s : n.type := error }
B↑s → begin L↑s1 end           ; { s := s1 }
L↑s → I↑s1 L↑s2                ; { s := s1 ∪ s2 }
L↑s → ε                        ; { s := ∅ }
I↑s → id = E                   ; { s := ∅ }
I↑s → while E do B↑s1          ; { pour tout nœud n ∈ s1 : n.type := void ; s := ∅ }
I↑s → break                    ; { s := {ce nœud} }
```

Cette version donne les mêmes types que la version héritée (vérifié sur tous les programmes de taille ≤ 8, avec
E réduite à un token), mais elle est plus lourde : l'attribut est un ensemble de nœuds, modifiés à distance. D'où le
choix naturel de l'attribut hérité.

**Piège.**
- Vouloir calculer le type du `break` à partir de ses fils : un `break` n'a aucune information sous lui.
- Oublier d'initialiser `in := faux` dans la règle de P, ou de mettre `in1 := vrai` dans la règle du `while`.
- Remettre `in := faux` dans chaque B : B est le corps d'un `while` (ou du programme) ; il doit recopier la valeur
  reçue, pas l'écraser.
- Version globale : oublier le `loopDepth--` après le corps. Un `break` placé après la boucle serait alors accepté à
  tort.

### Bonus : garantir la propriété syntaxiquement

**Énoncé.** Définir une grammaire qui n'accepte `break` qu'à l'intérieur d'une boucle.

**Méthode.** L'attribut hérité `in` ne prend que deux valeurs. On peut donc le « compiler » dans le nom des
non-terminaux : on duplique B, L, I en une version hors boucle (B, L, I) et une version dans une boucle
(Bw, Lw, Iw). Seul Iw a la production `break`, et le corps d'un `while` est toujours un Bw.

**Réponse.**

```text
P  → program id B
B  → begin L end
L  → I L | ε
I  → id = E | while E do Bw
Bw → begin Lw end
Lw → Iw Lw | ε
Iw → id = E | while E do Bw | break
```

Justification :
- Seul Iw produit `break`, et Iw n'apparaît que sous un Bw, qui n'apparaît que derrière `while E do`. Donc tout
  `break` engendré est dans le corps d'une boucle.
- Réciproquement, un programme dont tous les `break` sont dans des boucles se dérive en utilisant B, L, I jusqu'au
  premier `while`, puis Bw, Lw, Iw à l'intérieur.
- Vérifié par un script sur tous les programmes de taille ≤ 8 : cette grammaire accepte exactement les programmes
  où la version attribuée ne produit aucun `error`.

Sur l'exemple précédent, l'analyse échoue au second `break`. Après le `end` de la boucle, on est revenu dans L
(et non Lw) : L → I L exige un I, qui ne peut pas être `break`, et L → ε attend `end`. C'est une erreur de
**syntaxe**.

Inconvénients : le message devient « erreur de syntaxe » au lieu de « break hors d'une boucle », et le nombre de
non-terminaux double à chaque nouveau contexte (`continue`, `return` dans une fonction…). En pratique, les
compilateurs font donc cette vérification dans l'analyse sémantique, avec des attributs. Il existe d'autres
grammaires correctes.

**Piège.** Ne dupliquer que I : le corps d'un `while` est un B, il faut donc aussi Bw et Lw, sinon on ne peut pas
écrire « une liste d'instructions dont certaines sont des break ». À l'inverse, ne pas laisser `while E do B` (sans
w) dans I ou Iw : le corps d'une boucle doit être un Bw.

---

## Exercice 2.4 : Langages différents, comportements de typage différents (Exercise #4)

Programmes de la figure 2.1 :

```c
#include <stdio.h>

float plusone(float i){
  return(i+1);
}
void test1(){
  printf("%f", plusone(3.2));
}
void test2(){
  printf("%f", plusone("three"));
}
```

```python
def plusone(i):
    return i+1

def test1():
    print(plusone(3.2))

def test2():
    print(plusone('three'))

test1()
test2()
```

### Question 1 : le programme C

**Énoncé.** Le programme C est-il correct ? Le compilateur l'accepte-t-il ? Pourquoi, comment ?

**Méthode.** C est typé **statiquement** (CM4 p. 7) : le typage a lieu à la compilation, après l'analyse
syntaxique, sur **tout** le programme, qu'il soit exécuté ou non. Pour chaque appel, on calcule le type de
l'argument et on le compare au type déclaré du paramètre, en tenant compte des conversions implicites autorisées
(coercions, CM4 p. 23).

**Réponse.**
- **Environnement.** Le compilateur construit l'environnement à partir des déclarations : `plusone : float → float`,
  `test1, test2 : void → void`, et `printf` (déclarée dans `stdio.h`).
- **test1 est bien typée.**
  - `3.2` est une constante de type `double`. Le paramètre attend un `float` ; la conversion `double → float` est une
    conversion implicite autorisée entre types arithmétiques (le compilateur insère un nœud de conversion, comme
    `ConvFloat` en CM4 p. 23 ; `clang -Wconversion` signale seulement une perte de précision, en avertissement).
  - Dans `plusone`, `i+1` est `float + int` : `1` est converti en `float`, le résultat est `float`, comme le type de
    retour.
  - Dans `printf("%f", …)`, le `float` est promu en `double` (argument variadique), ce qu'attend `%f`.
- **test2 est mal typée.** `"three"` est un tableau de 6 `char` (5 lettres et `'\0'`), converti en pointeur
  `char *`. Le paramètre attend un `float`, et C n'a **aucune** conversion implicite d'un pointeur vers un flottant.
  C'est une erreur de type.
- **Le compilateur refuse le fichier.** Aucun fichier objet n'est produit. Message obtenu avec clang 17 :

```text
plus.c:10:24: error: passing 'char[6]' to parameter of incompatible type 'float'
   10 |   printf("%f", plusone("three"));
      |                        ^~~~~~~
plus.c:3:21: note: passing argument to parameter 'i' here
```

  gcc refuse aussi ce passage d'argument, par une erreur et non un simple avertissement (⚠ à vérifier : non testé
  ici, le `gcc` de la machine de test étant un alias de clang).
- **Pourquoi c'est rejeté alors que rien n'appelle test2.** Il n'y a même pas de `main`. Le typage statique vérifie
  tout le code, exécuté ou non : c'est la **sûreté** (rejeter avant toute erreur à l'exécution, CM4 p. 10).
- **Comment.** L'appel est typé comme une règle de typage « à la Mini-While ». La règle ci-dessous est écrite par
  analogie, elle n'est pas dans le cours :

```text
Γ(plusone) = float → float    Γ ⊢ e : τ    τ convertible en float
----------------------------------------------------------------- (appel)
                     Γ ⊢ plusone(e) : float
```

  Avec τ = double, la condition est vraie. Avec τ = char *, elle est fausse ; aucune règle ne s'applique, donc le
  programme est mal typé.
- **Réponse : le programme C n'est pas correct, et le compilateur le rejette à la compilation.** Sans `test2`, le
  fichier se compile ; avec un `main` qui appelle `test1`, il affiche `4.200000`.

### Question 2 : le programme Python

**Énoncé.** Le programme Python est-il correct ? Quel est son comportement à l'exécution, avec et sans la dernière
ligne ?

**Méthode.** Python est typé **dynamiquement** (CM4 p. 7) : rien n'est vérifié avant l'exécution. Chaque opération
vérifie le type des valeurs au moment où elle s'exécute. Il suffit donc de suivre l'exécution ligne à ligne.

**Réponse.**
- **Chargement.** Les trois `def` s'exécutent sans aucune vérification de type : pas d'erreur. Le programme est
  syntaxiquement correct et accepté par l'interpréteur.
- **`test1()`.** `plusone(3.2)` calcule `3.2 + 1` (float + int → float) et affiche `4.2`.
- **`test2()`.** `plusone('three')` calcule `'three' + 1`. Le `+` d'une chaîne exige une autre chaîne (pas de
  conversion implicite int → str en Python), donc une exception est levée **à l'exécution** :

```text
4.2
Traceback (most recent call last):
  ...
    return i+1
           ~^~
TypeError: can only concatenate str (not "int") to str
```

  `4.2` est affiché **avant** l'erreur : c'est la question posée en CM4 p. 6 (« Will the user see "Hello" or only the
  error? », sans réponse sur la diapositive) : en Python, « Hello » s'affiche bien avant l'erreur de type. Le programme s'arrête avec un code de retour non nul.
- **Sans la dernière ligne (`test2()`).** `test2` est définie mais jamais appelée, donc `'three' + 1` n'est jamais
  exécuté. Le programme affiche `4.2` et se termine **normalement**. L'erreur reste latente : elle n'apparaîtrait
  que si quelqu'un appelait `test2`.
- **Est-il correct ?** Il est accepté et peut s'exécuter, mais il contient une erreur de type sur un chemin
  d'exécution. Avec un typage dynamique, l'erreur n'est découverte que si ce chemin est exécuté.

Comparaison :

| | C (statique) | Python (dynamique) |
|---|---|---|
| Moment de la vérification | à la compilation | à l'exécution, opération par opération |
| Code vérifié | tout le fichier | seulement ce qui est exécuté |
| `plusone(3.2)` | conversion implicite double → float ; affiche 4.200000 | affiche 4.2 |
| `plusone("three")` | erreur de compilation, aucun exécutable | `TypeError` à l'exécution, après l'affichage de 4.2 |
| Si `test2` n'est jamais appelée | toujours rejeté | s'exécute sans erreur |

Le typage statique est **sûr** (l'erreur ne peut pas arriver à l'exécution) mais peut rejeter un code qui n'aurait
jamais posé problème (moins **expressif**, CM4 p. 10).

**Piège.**
- Penser que C convertit `"three"` en nombre, ou qu'il ne donne qu'un avertissement : pointeur → float est une
  erreur.
- Croire que `plusone(3.2)` est refusé en C : double → float est une conversion implicite (coercion).
- Croire que Python refuse le programme au chargement : l'erreur n'arrive qu'à l'exécution de `'three' + 1`, et
  `4.2` est déjà affiché.
- Croire que `'three' + 1` donne `"three1"` en Python : c'est le comportement de Java ou JavaScript (CM4 p. 4), pas
  celui de Python.

---

## Exercice 2.5 : Typage sous un environnement donné (Exercise #5)

### Question unique

**Énoncé.** Avec Γ = {x1 ↦ int}, prouver que le programme suivant est bien typé :

```text
x1 = 3 ;
while (x1 < 15) { x1 = x1 + 1 }
```

**Méthode.** C'est la méthode générale des rappels :
1. Découper le programme en syntaxe abstraite.
2. Écrire le but en bas.
3. Appliquer la seule règle permise par la forme du terme.
4. Remonter jusqu'aux axiomes `c ∈ ℤ` et `Γ(x1) = int`.

Pour (=), on choisit t = Γ(x1) = int. L'arbre complet étant large, on le construit par morceaux (D1 à D5). C'est un
choix de présentation : le cours garde un seul arbre et relie seulement un sous-arbre déplacé par « ⋮ » (CM4 p. 22).

**Réponse.**

*Étape 0 : syntaxe abstraite.* Le `;` est l'opérateur de séquence :

```text
S  = S1 ; S2
S1 = x1 = 3
S2 = while (x1 < 15) { S3 }
S3 = x1 = x1 + 1
```

*Étape 1 : forme de l'arbre* (règle appliquée, jugement obtenu, et axiomes utilisés aux feuilles) :

```text
(seq)    Γ ⊢ x1 = 3 ; while (x1 < 15) { x1 = x1 + 1 } : void
├── (=)      Γ ⊢ x1 = 3 : void                                       [D1]
│   ├── (int)    Γ ⊢ 3 : int          ← 3 ∈ ℤ
│   ├── (var)    Γ ⊢ x1 : int         ← Γ(x1) = int, int ∈ {int, bool}
│   └── int ∈ {int, bool}
└── (while)  Γ ⊢ while (x1 < 15) { x1 = x1 + 1 } : void              [D5]
    ├── (<)      Γ ⊢ x1 < 15 : bool                                  [D2]
    │   ├── (var)    Γ ⊢ x1 : int     ← Γ(x1) = int, int ∈ {int, bool}
    │   └── (int)    Γ ⊢ 15 : int     ← 15 ∈ ℤ
    └── (=)      Γ ⊢ x1 = x1 + 1 : void                              [D4]
        ├── (+)      Γ ⊢ x1 + 1 : int                                [D3]
        │   ├── (var)    Γ ⊢ x1 : int     ← Γ(x1) = int, int ∈ {int, bool}
        │   └── (int)    Γ ⊢ 1 : int      ← 1 ∈ ℤ
        ├── (var)    Γ ⊢ x1 : int         ← Γ(x1) = int, int ∈ {int, bool}
        └── int ∈ {int, bool}
```

*Étape 2 : les sous-arbres*, avec toutes les conditions annexes écrites.

Le sous-arbre de la variable, utilisé quatre fois :

```text
Γ(x1) = int    int ∈ {int, bool}
-------------------------------- (var)
          Γ ⊢ x1 : int
```

D1 : l'affectation `x1 = 3` (règle (=), prémisses `Γ ⊢ e : t`, `Γ ⊢ x : t`, `t ∈ {int, bool}` avec t = int) :

```text
   3 ∈ ℤ             Γ(x1) = int    int ∈ {int, bool}
----------- (int)    -------------------------------- (var)
Γ ⊢ 3 : int                    Γ ⊢ x1 : int                    int ∈ {int, bool}
-------------------------------------------------------------------------------- (=)
                               Γ ⊢ x1 = 3 : void
```

D2 : la condition de la boucle (< prend deux int et rend un bool) :

```text
Γ(x1) = int    int ∈ {int, bool}             15 ∈ ℤ
-------------------------------- (var)    ------------ (int)
          Γ ⊢ x1 : int                    Γ ⊢ 15 : int
------------------------------------------------------------ (<)
                     Γ ⊢ x1 < 15 : bool
```

D3 : l'expression `x1 + 1` :

```text
Γ(x1) = int    int ∈ {int, bool}             1 ∈ ℤ
-------------------------------- (var)    ----------- (int)
          Γ ⊢ x1 : int                    Γ ⊢ 1 : int
----------------------------------------------------------- (+)
                     Γ ⊢ x1 + 1 : int
```

D4 : le corps de la boucle `x1 = x1 + 1` (règle (=) avec e = x1 + 1, t = int) :

```text
                         Γ(x1) = int    int ∈ {int, bool}
                         -------------------------------- (var)
(D3) Γ ⊢ x1 + 1 : int              Γ ⊢ x1 : int                    int ∈ {int, bool}
------------------------------------------------------------------------------------ (=)
                               Γ ⊢ x1 = x1 + 1 : void
```

D5 : la boucle (condition bool, corps void) :

```text
(D2) Γ ⊢ x1 < 15 : bool    (D4) Γ ⊢ x1 = x1 + 1 : void
------------------------------------------------------ (while)
      Γ ⊢ while (x1 < 15) { x1 = x1 + 1 } : void
```

*Étape 3 : la racine*, séquence de D1 et D5 :

```text
(D1) Γ ⊢ x1 = 3 : void    (D5) Γ ⊢ while (x1 < 15) { x1 = x1 + 1 } : void
------------------------------------------------------------------------- (seq)
           Γ ⊢ x1 = 3 ; while (x1 < 15) { x1 = x1 + 1 } : void
```

Toutes les feuilles sont des axiomes vrais (3, 15, 1 ∈ ℤ ; Γ(x1) = int ; int ∈ {int, bool}). Donc
**Γ ⊢ x1 = 3 ; while (x1 < 15) { x1 = x1 + 1 } : void : le programme est bien typé.**

Bilan : 13 applications de règles, soit (seq) ×1, (while) ×1, (=) ×2, (<) ×1, (+) ×1, (var) ×4, (int) ×3.

Arbre complet d'un seul tenant, à recopier sur papier. Il est large ; les conditions `int ∈ {int, bool}` y sont
omises, comme dans l'exemple du cours (CM4 p. 22) :

```text
                                                                                               Γ(x1) = int              1 ∈ ℤ
                                                                                               ------------ (var)    ----------- (int)
                                               Γ(x1) = int              15 ∈ ℤ                 Γ ⊢ x1 : int          Γ ⊢ 1 : int              Γ(x1) = int
                                               ------------ (var)    ------------ (int)        --------------------------------------- (+)    ------------ (var)
   3 ∈ ℤ             Γ(x1) = int               Γ ⊢ x1 : int          Γ ⊢ 15 : int                         Γ ⊢ x1 + 1 : int                    Γ ⊢ x1 : int
----------- (int)    ------------ (var)        ---------------------------------------- (<)    ----------------------------------------------------------------- (=)
Γ ⊢ 3 : int          Γ ⊢ x1 : int                         Γ ⊢ x1 < 15 : bool                                        Γ ⊢ x1 = x1 + 1 : void
--------------------------------------- (=)    --------------------------------------------------------------------------------------------------------------------- (while)
           Γ ⊢ x1 = 3 : void                                                        Γ ⊢ while (x1 < 15) { x1 = x1 + 1 } : void
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- (seq)
                                                            Γ ⊢ x1 = 3 ; while (x1 < 15) { x1 = x1 + 1 } : void
```

**Piège.**
- La règle (=) a **deux** jugements en prémisse : il faut aussi typer la variable (`Γ ⊢ x1 : int`), pas seulement
  l'expression.
- `<` rend `bool`, pas `int`, à partir de deux `int`. La condition d'un `while` doit être `bool`.
- S'arrêter à `Γ ⊢ 3 : int` ou à `Γ ⊢ x1 : int` : il faut monter jusqu'aux axiomes `3 ∈ ℤ` et `Γ(x1) = int`.
- Le `;` de `x1 = 3 ;` est l'opérateur de séquence (règle (seq)), pas un terminateur.
- Γ ne change pas en traversant les instructions : le corps de la boucle est typé avec le même Γ.

---

## Exercice 2.6 : Construction de Γ à partir des déclarations (Exercise #6)

### Question unique

**Énoncé.** Avec les règles (decl) et (seqD), calculer l'environnement de typage Γ pour :

```text
int x;
bool b1, b2;
```

**Méthode.**
1. La liste de déclarations est une séquence D1 ; D2, donc (seqD) à la racine.
2. Chaque déclaration simple `t vlist ;` est un axiome (decl), qui associe le type t à chaque variable de vlist.
3. Ne pas oublier la troisième prémisse de (seqD) : les domaines doivent être disjoints.

**Réponse.**
- D1 = `int x;` : t = int, vlist = x. Par (decl), `int x; →d [x ↦ int]`. Donc Γ1 = {x ↦ int} et Dom(Γ1) = {x}.
- D2 = `bool b1, b2;` : t = bool, vlist = b1, b2. Par (decl), `bool b1, b2; →d [b1 ↦ bool, b2 ↦ bool]`. Donc
  Γ2 = {b1 ↦ bool, b2 ↦ bool} et Dom(Γ2) = {b1, b2}.
- Condition de (seqD) : Dom(Γ1) ∩ Dom(Γ2) = {x} ∩ {b1, b2} = ∅. Elle est vérifiée.
- Par (seqD) : `D1 ; D2 →d Γ1 ∪ Γ2`.

Arbre :

```text
------------------- (decl)    -------------------------------------- (decl)
int x; →d [x ↦ int]           bool b1, b2; →d [b1 ↦ bool, b2 ↦ bool]           {x} ∩ {b1, b2} = ∅
------------------------------------------------------------------------------------------------- (seqD)
                     int x; bool b1, b2; →d {x ↦ int, b1 ↦ bool, b2 ↦ bool}
```

**Γ = {x ↦ int, b1 ↦ bool, b2 ↦ bool}** : Γ(x) = int, Γ(b1) = Γ(b2) = bool. Cet environnement sert ensuite à
typer les instructions : `∅ ⊢ D ; S` si `ΓD ⊢ S` (CM5 p. 31).

Remarques :
- Dans (seqD), le `;` de `D1 ; D2` sépare deux déclarations ; c'est le `;` qui termine `int x;`.
- Contre-exemple : pour `int x; bool x;`, on a Dom(Γ1) ∩ Dom(Γ2) = {x} ≠ ∅. (seqD) ne s'applique pas et aucune autre
  règle non plus : aucun Γ n'est calculé. C'est l'erreur de double déclaration (CM4 p. 26 ; dans le TP2 :
  « Variable x already declared »).
- Subtilité : (decl) seule n'interdit pas `int x, x;`, car [x ↦ int, x ↦ int] = [x ↦ int]. Pour la rejeter, comme
  le demande « undefined if multiple defs » (CM5 p. 31), on ajouterait à (decl) la condition « les variables de
  vlist sont deux à deux distinctes ».
- Avec trois déclarations, on lit D1 ; (D2 ; D3) et on applique (seqD) deux fois.

**Piège.**
- Oublier une variable de vlist (b2), ou lui donner le type de la déclaration précédente.
- Oublier la prémisse Dom(Γ1) ∩ Dom(Γ2) = ∅ : c'est une prémisse de la règle, elle doit apparaître dans l'arbre.
- Confondre `→d`, qui construit un environnement à partir de déclarations, et `⊢`, qui type une expression ou une
  instruction sous un environnement.

---

## Exercice 2.7 : Étendre les expressions : `e1 ? e2 : e3` (Exercise #7)

### Question unique

**Énoncé.** Compléter la syntaxe abstraite et la sémantique statique (typage) des expressions avec la construction
`e1 ? e2 : e3`, qui vaut e2 si e1 est vrai, e3 sinon.

**Méthode.**
1. Ajouter une alternative à la grammaire abstraite `e ::= …`.
2. Écrire une règle : les prémisses imposent un type à chaque sous-expression, la conclusion donne le type de
   l'ensemble.
3. La condition est un booléen, comme pour `if` et `while`.
4. Pour le résultat : à la compilation, on ne sait pas quelle branche sera prise. Les deux branches doivent donc avoir
   le même type t, qui est le type de l'expression entière.

**Réponse.**

Syntaxe abstraite :

```text
e ::= c | x | e + e | … | e && e
   |  e ? e : e                    expression conditionnelle
```

Règle de typage. On met des parenthèses dans la conclusion pour ne pas confondre le `:` de la conditionnelle avec
celui du jugement :

```text
Γ ⊢ e1 : bool    Γ ⊢ e2 : t    Γ ⊢ e3 : t    t ∈ {int, bool}
------------------------------------------------------------ (?:)
                   Γ ⊢ (e1 ? e2 : e3) : t
```

Pourquoi le même t : un typage statique doit donner à chaque expression **un** type, indépendant de l'exécution. Si
e2 était `int` et e3 `bool`, le type de l'expression dépendrait de la valeur de e1 à l'exécution. On rejette, pour
la sûreté. La condition `t ∈ {int, bool}` reprend celle de (=) ; elle est automatiquement vraie ici, puisque t est
déjà le type d'une expression.

Exemple : avec Γ = {x ↦ int}, `Γ ⊢ (x < 10 ? x + 1 : 0) : int`. Les conditions `int ∈ {int, bool}` sont omises,
comme au CM4 p. 22 :

```text
Γ(x) = int              10 ∈ ℤ                 Γ(x) = int              1 ∈ ℤ
----------- (var)    ------------ (int)        ----------- (var)    ----------- (int)
Γ ⊢ x : int          Γ ⊢ 10 : int              Γ ⊢ x : int          Γ ⊢ 1 : int                 0 ∈ ℤ
--------------------------------------- (<)    -------------------------------------- (+)    ----------- (int)
           Γ ⊢ x < 10 : bool                              Γ ⊢ x + 1 : int                    Γ ⊢ 0 : int
-------------------------------------------------------------------------------------------------------------- (?:)
                                        Γ ⊢ (x < 10 ? x + 1 : 0) : int
```

Contre-exemples (aucune règle ne s'applique, donc ils sont rejetés) :
- `x ? 1 : 2` avec Γ(x) = int : la condition doit être `bool` (comme dans MiniC, où int et bool sont incompatibles) ;
- `x < 10 ? 1 : x < 5` : les branches sont de types `int` et `bool`, différents.

Le résultat peut être `bool` : `Γ ⊢ (x < 0 ? x < 5 : x < 10) : bool` est valide.

Réponse ouverte : on pourrait restreindre la règle à t = int (conditionnelle uniquement numérique) ; ce serait un
autre choix de conception, aussi cohérent.

**Piège.**
- Donner à l'expression le type de la condition (`bool`), ou imposer `int` aux branches alors que des branches
  `bool` sont légitimes.
- Oublier de typer l'une des branches. À l'exécution, une seule est évaluée, mais le typage statique vérifie les
  deux.
- Oublier les parenthèses dans `Γ ⊢ (e1 ? e2 : e3) : t`, ce qui rend le jugement illisible.

---

## Exercice 2.8 : Étendre les instructions : boucle `for` (Exercise #8)

### Question unique (deux cas)

**Énoncé.** Compléter la syntaxe abstraite et la sémantique statique des instructions avec
`for i in e1 .. e2 S`, dans deux cas : (1) i doit avoir été déclarée avant ; (2) l'instruction déclare elle-même
la variable i (comme en Ada).

**Méthode.** On ajoute une alternative à `S ::= …`. Dans les deux cas, i est un compteur entier, les bornes e1 et e2
sont des `int`, et le corps S doit être bien typé (`void`). La seule différence est l'**environnement** :
- cas 1 : i doit déjà figurer dans Γ avec le type `int` ;
- cas 2 : la boucle introduit i, et le corps est typé dans Γ étendu par i ↦ int.

**Réponse.**

Syntaxe abstraite (même forme dans les deux cas) :

```text
S ::= x = e | skip | S1 ; S2 | if b then S1 else S2 | while (b) { S }
   |  for i in e1 .. e2 S          boucle for (i : variable de boucle, e1, e2 : bornes, S : corps)
```

**Cas 1 : i déclarée avant.** La prémisse `Γ ⊢ i : int` s'obtient par (var) depuis Γ(i) = int : i est déclarée, et
de type int.

```text
Γ ⊢ i : int    Γ ⊢ e1 : int    Γ ⊢ e2 : int    Γ ⊢ S : void
----------------------------------------------------------- (for)
              Γ ⊢ for i in e1 .. e2 S : void
```

**Cas 2 : la boucle déclare i (Ada).**

```text
Γ ⊢ e1 : int    Γ ⊢ e2 : int    Γ[i ↦ int] ⊢ S : void
----------------------------------------------------- (forDecl)
           Γ ⊢ for i in e1 .. e2 S : void
```

Explication de (forDecl) :
- Γ[i ↦ int] est Γ où i est ajoutée (ou redéfinie) avec le type int. C'est la même notation que la mise à jour d'un
  état σ[x ↦ n] (CM5).
- Les bornes sont typées dans Γ : elles sont calculées avant d'entrer dans la boucle, quand i n'existe pas encore.
- Seul le corps voit i. La conclusion est sous Γ : après la boucle, i n'existe plus.

Variante sans masquage d'une variable existante, dans l'esprit de (seqD) :

```text
i ∉ Dom(Γ)    Γ ⊢ e1 : int    Γ ⊢ e2 : int    Γ ∪ {i ↦ int} ⊢ S : void
---------------------------------------------------------------------- (forDecl′)
                    Γ ⊢ for i in e1 .. e2 S : void
```

Pour aller plus loin : en Ada, la variable de boucle est en lecture seule dans le corps. Pour l'imposer, il faudrait
marquer i comme constante dans Γ et interdire `i = e` dans la règle (=). Notre système de types, qui ne connaît que
int et bool, ne le permet pas tel quel.

Exemples avec le corps `s = s + i` (on omet les conditions `int ∈ {int, bool}`).

*Cas 2*, Γ = {s ↦ int}, Γ' = Γ[i ↦ int] = {s ↦ int, i ↦ int}. Le corps est typé sous Γ' :

```text
Γ'(s) = int           Γ'(i) = int
------------ (var)    ------------ (var)
Γ' ⊢ s : int          Γ' ⊢ i : int              Γ'(s) = int
---------------------------------------- (+)    ------------ (var)
            Γ' ⊢ s + i : int                    Γ' ⊢ s : int
------------------------------------------------------------------ (=)
                      Γ' ⊢ s = s + i : void
```

Puis la boucle :

```text
   1 ∈ ℤ                10 ∈ ℤ
----------- (int)    ------------ (int)
Γ ⊢ 1 : int          Γ ⊢ 10 : int          (Dcorps) Γ' ⊢ s = s + i : void
------------------------------------------------------------------------- (forDecl)
                  Γ ⊢ for i in 1 .. 10 s = s + i : void
```

*Cas 1*, même programme, même Γ = {s ↦ int} : **rejeté**. Γ(i) n'est pas défini, donc (var) ne s'applique pas à i,
et la prémisse `Γ ⊢ i : int` de (for) est impossible (« i non déclarée »). Avec Γ = {s ↦ int, i ↦ int}, en revanche,
le programme est bien typé. Le corps est le même arbre que ci-dessus, avec Γ à la place de Γ' :

```text
Γ(i) = int              1 ∈ ℤ                10 ∈ ℤ
----------- (var)    ----------- (int)    ------------ (int)
Γ ⊢ i : int          Γ ⊢ 1 : int          Γ ⊢ 10 : int          (Dcorps) Γ ⊢ s = s + i : void
--------------------------------------------------------------------------------------------- (for)
                            Γ ⊢ for i in 1 .. 10 s = s + i : void
```

Réponse ouverte : on peut aussi typer les bornes dans Γ[i ↦ int], ou interdire le masquage comme dans (forDecl′). Il
existe d'autres formulations correctes ; l'essentiel est que le corps soit typé dans un environnement qui contient
i ↦ int.

**Piège.**
- Cas 2 : typer le corps sous Γ au lieu de Γ[i ↦ int]. Tout corps qui utilise i serait alors rejeté.
- Cas 2 : écrire `Γ[i ↦ int]` dans la **conclusion**. L'extension est locale au corps.
- Cas 1 : oublier la prémisse sur i. On accepterait alors un i non déclaré, ou déclaré `bool`.
- Bornes `int` (pas `bool`), corps `void` : c'est une instruction, pas une expression.

---

## Ce qu'il faut retenir

1. **Arbre de dérivation** : un nœud interne par règle appliquée, des feuilles qui sont des tokens (ou ε), et la
   lecture des feuilles redonne le mot. Une grammaire hors contexte vérifie l'imbrication (XML), pas l'égalité de
   deux noms : il faut des attributs.
2. **Attributs** : synthétisé ↑ (des fils vers le père) ou hérité ↓ (du père vers les fils). Notation du cours :
   `S↑r → S1↑r1 S2↑r2 ; {r := f(r1, r2)}`. Une action par production, y compris les recopies (E → T, F → ( E )).
3. **Choisir le sens d'après la provenance de l'information** : une valeur d'expression ou un nom de balise vient du
   dessous (↑) ; « suis-je dans une boucle ? » vient du dessus (↓). En ANTLR, ↑ s'écrit `returns [...]`, ↓ s'écrit
   avec des arguments de règle `r[...]` ou une variable globale (`@members`).
4. **Priorité et associativité** viennent de la forme de la grammaire (E/T/F, récursivité gauche), pas des actions :
   `1 + 2 * 3` vaut 7.
5. Un attribut hérité à **valeurs finies** peut être remplacé par une duplication des non-terminaux (bonus `break`),
   au prix de messages d'erreur moins clairs.
6. **Statique ou dynamique** : C rejette `plusone("three")` à la compilation, même dans du code jamais exécuté ;
   Python n'échoue qu'en exécutant `'three' + 1`, après avoir affiché 4.2, et pas du tout si `test2()` n'est jamais
   appelé.
7. **Arbre de typage** : on part de la conclusion, la forme du terme choisit la règle, et on finit sur `c ∈ ℤ` et
   `Γ(x) = t`. (=) a deux prémisses de typage (e **et** x) ; `<` va de int × int vers bool ; la condition d'un
   `while` ou d'un `if` est bool.
8. **Construction de Γ** : (decl) associe un type à chaque variable de la liste ; (seqD) réunit les environnements si
   leurs domaines sont disjoints. Sinon, c'est une double déclaration et aucun Γ n'est calculé.
9. **Nouvelle construction** : les prémisses contraignent les sous-termes, la conclusion donne le type de
   l'ensemble. `?:` : condition bool, deux branches du même type t. Une construction qui **déclare** une variable
   (le `for` d'Ada) type son corps dans Γ[i ↦ int].
