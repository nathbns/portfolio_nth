# TD1 : Analyses lexicale et syntaxique (Lexical and Syntaxic Analyses) — corrigé détaillé

Sujet : `ensimag_compil_td1.pdf` (4 pages, 9 exercices). Cours utilisés : CM1 (introduction), CM2 (lexing, parsing,
AST), CM3 (visiteurs, pour la notation `#label`), CM7-CM8 (seulement pour situer le code 3 adresses de l'exercice 3).
« p. n » = numéro de diapo imprimé en bas à droite (↞ n / N ↠).

Toutes les réponses ont été vérifiées sur machine : les huit programmes Java avec `javac` 25, les fichiers C avec
`gcc` 16, toutes les grammaires et tous les lexers ANTLR avec ANTLR 4.13.2 (backend Java), les expressions régulières
et les arbres avec de petits scripts Python. Les sorties citées plus bas sont celles de ces exécutions.

---

## Rappels utiles

### R1. Les phases d'un compilateur (CM1 p. 13-14)

Un compilateur se découpe en deux parties (CM1 p. 13) :

- **l'analyse** (*front-end*) : reconnaît le programme à traduire et son sens ; **lève les erreurs** (syntaxe, portée,
  types…) ;
- **la synthèse** (*back-end*) : produit le fichier cible ; optimise parfois.

Le pipeline « standard » (CM1 p. 14) :

```text
code source
  --analyse lexicale-------> suite de lexèmes (tokens)
  --analyse syntaxique-----> arbre de syntaxe abstraite (AST)
  --analyse sémantique-----> représentation intermédiaire 1 --> ... --> représentation intermédiaire N
  --génération de code-----> langage d'assemblage
  --assembleur-------------> langage machine
  --éditeur de liens-------> exécutable
```

CM2 p. 4 : **analyse syntaxique (au sens large) = analyse lexicale + parsing** ; vient ensuite la **sémantique** (le
sens des mots, leur rôle). CM2 p. 3 : « *syntax ≠ semantics* ».

Conséquence pratique (utilisée à l'exercice 1) — quelle phase voit quelle erreur :

| Phase | Ce qu'elle vérifie | Exemple d'erreur |
|---|---|---|
| analyse lexicale | chaque morceau du texte est un token valide | chaîne non fermée, caractère interdit |
| analyse syntaxique | la suite de tokens respecte la grammaire | `;` manquant, token mal placé |
| analyse sémantique | portée (identificateurs déclarés), types, règles statiques du langage | variable non déclarée, mauvais type ou nombre d'arguments |
| (exécution) | ce que le compilateur ne vérifie pas statiquement | indice de tableau hors bornes |

### R2. Analyse lexicale avec ANTLR (CM2 p. 6, 8, 11-16)

- But (p. 6) : regrouper les caractères en tokens. `int y = 12 + 4*x ;` donne
  `[TINT, ID("y"), EQ, INT(12), PLUS, INT(4), TIMES, ID("x"), SCOL]`.
- Un générateur de lexer construit un **automate** à partir d'une définition de langage régulier (p. 8).
- Règles lexicales ANTLR (p. 11) : leur nom **commence par une majuscule** ; elles suivent la syntaxe des expressions
  régulières étendues ; `-> skip` jette le token (blancs).
- Aide-mémoire des constructions (CM2 p. 13 et figure 1.1 du TD, réunis ; la ligne des intervalles `[a-z]` ne figure
  que dans le TD, les lignes `NAME : … ;` et `{…}` que sur la diapositive, où `?` se lit « optionnel (ou prédicat
  sémantique) ») :

| Construction | Sens |
|---|---|
| `NOM : ... ;` | définition d'une règle (majuscule pour le lexer) |
| `( ... )` | groupement |
| `a \| b` | alternative |
| `'s'` | caractère ou chaîne littérale ; `'\n'` = fin de ligne |
| `.` | n'importe quel caractère |
| `'0'..'9'` | intervalle |
| `{ ... }` | action (code du langage hôte) |
| `+` | 1 fois ou plus |
| `*` | 0 fois ou plus |
| `?` | optionnel |
| `[abc]`, `[a-z]`, `[0-9a-z]` | choix d'un caractère dans un ensemble, dans un intervalle |
| `~[abc]` | tout caractère **sauf** ceux listés |
| `// ...`, `/* ... */` | commentaires |

- `fragment` (énoncé de l'exercice 4) : nom donné à une sous-expression, réutilisable dans d'autres règles, mais qui ne
  produit jamais de token à elle seule.
- **Ambiguïtés du lexer** (p. 14) — deux règles, dans cet ordre :
  1. **plus long préfixe** (*longest match*) ;
  2. **à égalité de longueur, la première règle du fichier** gagne.

  Exemple du cours (`FLOAT: [0-9]+ '.' [0-9]+; INT: [0-9]+; DOT: '.'; IF: 'if'; ID: [a-zA-Z]+; THEN: 'then';`) :
  `4.2` → FLOAT (3 caractères contre 1) ; `if` → IF (égalité, IF est avant ID) ; `then` → **ID** (égalité, ID est
  avant THEN), comme sur la diapositive ; on ajoute `ifx` → ID (plus long).
- **Actions** (p. 15-16) : du code entre `{ ... }` est exécuté quand la règle est reconnue ; `@members { ... }` déclare
  des variables globales accessibles dans toutes les actions. Exemple `CountLines2.g4` : `@members {int nbLines=0;}`
  puis `NEWLINE : [\r\n] { nbLines++; System.out.println("Current lines:"+nbLines); } ;`.
- Exécution (p. 12) : `antlr4 Toto.g4`, `javac *.java`, puis
  `java org.antlr.v4.gui.TestRig Tokens tokens -tokens` qui affiche les tokens reconnus.

### R3. Définition formelle des expressions régulières (cours de théorie des langages ; pas sur les diapos du CM2)

Sur un alphabet fini Σ :

- cas de base : `∅`, `ε` (le mot vide) et chaque lettre `a ∈ Σ` sont des expressions régulières ;
- **trois opérations** : si r et s sont des expressions régulières, alors
  - **l'union** `r | s` : L(r | s) = L(r) ∪ L(s) ;
  - **la concaténation** `r s` : L(r s) = { uv | u ∈ L(r), v ∈ L(s) } ;
  - **l'étoile de Kleene** `r*` : L(r*) = { ε } ∪ L(r) ∪ L(r)L(r) ∪ … (0, 1, 2… répétitions) ;
- parenthèses pour grouper ; priorité : `*` > concaténation > `|`.

Traductions des raccourcis ANTLR (à savoir refaire) :

| ANTLR | Avec les trois opérations |
|---|---|
| `r+` | `r r*` |
| `r?` | `(r \| ε)` |
| `[abc]`, `[a-c]` | `(a \| b \| c)` |
| `'abc'` | `a b c` (concaténation des lettres) |
| `~[abc]` | union de toutes les lettres de Σ **sauf** a, b, c |
| `.` | union de toutes les lettres de Σ |

### R4. Grammaires, dérivations, arbres de dérivation (CM2 p. 25-33)

Les définitions générales (axiome, dérivation, dérivation gauche, arbre de dérivation, ambiguïté) sont celles de la théorie des langages : les diapositives les utilisent sans les écrire. Ce qui vient des diapositives est cité avec sa page.

- Une grammaire (algébrique) : des terminaux (les tokens), des non-terminaux, un axiome, des productions `A → α`.
  Exemple du cours (p. 25) : `S → aSb`, `S → ε` engendre { aⁿbⁿ | n ∈ ℕ }.
- **Pas de dérivation** : `u A v ⇒ u α v` si `A → α` est une production ; `⇒*` = suite de pas. **Dérivation gauche** :
  on réécrit toujours le non-terminal le plus à gauche.
- **Arbre de dérivation** : racine = axiome ; un nœud interne A dont les fils sont X1 … Xk correspond à l'application de
  la production `A → X1 … Xk` ; les feuilles lues de gauche à droite redonnent le mot (ε pour une production vide).
- **Ambiguïté** : un mot qui a deux arbres de dérivation différents. Exemple du cours (p. 30) :
  `expr: expr '*' expr | expr '+' expr | INT;` — `1+2*3` (problème de **priorité**) et `1+2+3` (problème
  d'**associativité**) ont chacun deux arbres. ANTLR tranche : **la première alternative est la plus prioritaire** et
  les opérateurs sont **associatifs à gauche** par défaut (`<assoc=right>` sinon).
- Règles syntaxiques ANTLR (p. 27-28) : nom **en minuscules** ; `EOF` = token prédéfini de fin de fichier ;
  alternative vide permise (`s : A s B | ;`) ; les règles peuvent s'appeler récursivement. Deux fichiers (`lexer grammar XLexer;` et
  `parser grammar XParser;` avec `options {tokenVocab=XLexer;}`, p. 26-27), ou une grammaire combinée (`grammar X;`,
  comme `grammar MiniC;` dans l'exercice 9 du TD). Récursivité gauche directe acceptée, pas indirecte (p. 32) ; listes
  `statement+`, `statement*` (p. 33).
- Exécution (p. 28) : `antlr4 …g4`, `javac *.java`, `java org.antlr.v4.gui.TestRig X prog -gui` (la diapositive
  montre `-gui` ; `-tree`, qui affiche l'arbre en texte parenthésé, vient du README de la démo du cours).

### R5. Arbre de syntaxe abstraite (CM2 p. 35-37)

- `2*(x+1)`, `(2 * ((x) + 1))` et `2 * /* comment */ ( x + 1 )` ont la même sémantique, donc **la même
  représentation interne** : l'arbre de la p. 35 (noté ici en ligne `*(2, +(x, 1))` : opérateur, puis ses fils ; le cours dessine les
  arbres).
- Grammaire abstraite des expressions (p. 36) : `e ::= c | x | e + e | e × e | …`.
- Dans un AST, les parenthèses de groupement sont implicites dans la structure de l'arbre (p. 37) ; de même, la ponctuation
  n'y a pas de nœud. **Un AST n'est pas un arbre de dérivation** (p. 37).

### R6. Pour l'exercice 3 : temporaires et code 3 adresses (CM7 p. 6 et 9, CM8 p. 4)

- **Temporaire** (« registre virtuel ») : case où ranger une donnée ; contrairement aux registres physiques, les
  temporaires n'existent pas dans le processeur et sont en nombre illimité (CM7 p. 6).
- **Code 3 adresses** : chaque instruction fait au plus une opération, sur au plus trois « adresses » (une destination,
  deux opérandes) : le cours l'écrit directement en RISC-V sur des temporaires, par exemple `add temp3, temp1, temp2`
  ou `li temp2, 4` (CM7 p. 8-9 : *three-address code generation*). C'est une représentation
  intermédiaire ; le graphe de flot de contrôle (CFG) l'englobe (CM8 p. 4).

---

## Exercice 1.1 : Correction de programmes Java (*Program correctness*)

**Énoncé général.** Huit programmes Java. Pour chacun : est-il correct ? Sinon, quelle phase de compilation détecte
l'erreur ?

**Méthode générale.** On fait « passer » le programme dans le pipeline, **dans l'ordre**, et on s'arrête à la première
phase qui échoue :

1. **Lexicale** : peut-on découper tout le texte en tokens Java valides (mots-clés, identificateurs, littéraux,
   opérateurs, ponctuation) ?
2. **Syntaxique** : la suite de tokens respecte-t-elle la grammaire de Java ?
3. **Sémantique** : chaque identificateur est-il déclaré (portée) ? Les types sont-ils cohérents (opérandes, nombre et
   types des arguments, valeur de retour) ? Les autres règles statiques (par exemple `final`) sont-elles respectées ?
4. Si tout passe, le programme **compile** ; il peut encore échouer **à l'exécution** (vérifications dynamiques).

Remarque valable pour les programmes 1 à 7 : `public static void main()` **sans paramètre** n'est pas une erreur de
compilation (c'est une méthode comme une autre). Avec Java 25 (vérifié), le lanceur `java A` l'accepte même comme point
d'entrée ; les versions plus anciennes refusaient de le lancer, mais c'est alors une erreur **au lancement**, pas à la
compilation. Ce n'est pas le sujet de l'exercice.

### Question 1 : programme 1

**Énoncé.** Dans `class A`, le champ est déclaré par la ligne `int x?;` ; `main` est vide.

**Méthode.** Le caractère `?` est-il un token Java ? Si oui, la suite de tokens est-elle grammaticale ?

**Réponse.** **Incorrect — erreur syntaxique.**

- Lexicalement, tout va bien : `?` est un token Java valide (c'est l'opérateur conditionnel `b ? e1 : e2`, utilisé
  d'ailleurs correctement dans le programme 5). Le lexer produit `[TINT, ID("x"), QUESTION, SCOL]` (notation de
  CM2 p. 6).
- Syntaxiquement, une déclaration de champ `int x` doit être suivie de `;`, `=`, `,` ou `[`. Le token `?` n'est pas
  attendu ici : la suite de tokens n'est pas dans la grammaire.
- `javac` : `error: ';' expected` (le curseur est sous le `?`).

**Piège.** Croire que l'erreur est lexicale parce que `?` « n'a rien à faire là » : un caractère mal placé n'est une
erreur lexicale que s'il ne forme **aucun** token du langage. Ici le token existe, c'est sa **position** qui est
fausse, donc c'est la grammaire qui le rejette.

### Question 2 : programme 2

**Énoncé.** Dans `main`, la ligne `String s = "hello;` (le guillemet fermant manque), puis
`System.out.println(s);`.

**Méthode.** Qui découpe les littéraux chaînes ? Le lexer : une chaîne `"…"` est **un seul token**.

**Réponse.** **Incorrect — erreur lexicale.**

- Un littéral chaîne Java commence par `"`, contient des caractères qui ne sont ni `"` ni une fin de ligne (ou des
  séquences d'échappement comme `\"`), et se termine par `"`. Ici le lexer lit `"hello;` et rencontre la fin de ligne avant le guillemet fermant : aucune règle de
  token ne reconnaît ce texte.
- C'est donc le **lexer** qui échoue : le parser, qui lui demande les tokens un par un, ne reçoit aucun token à cet
  endroit, il n'a rien à analyser.
- `javac` : `error: unclosed string literal`.

**Piège.** Répondre « erreur de syntaxe » parce qu'« il manque un guillemet ». Les guillemets ne sont pas des tokens à
part : ils délimitent le token chaîne, et c'est le lexer qui doit trouver la fin de ce token.

### Question 3 : programme 3

**Énoncé.** `main` déclare `int y=3;` puis exécute `System.out.println(x+y);`. Aucun `x` n'est déclaré (ni variable
locale, ni champ de `A`).

**Méthode.** Les tokens et la grammaire sont-ils corrects ? Si oui, chaque identificateur utilisé est-il déclaré ?

**Réponse.** **Incorrect — erreur sémantique (portée / résolution des noms).**

- Lexicalement et syntaxiquement, `x+y` est une expression parfaitement valide : la grammaire ne sait pas quels noms
  sont déclarés.
- L'analyse sémantique cherche `x` dans la table des symboles (variables locales de `main`, champs de `A`) et ne le
  trouve pas.
- `javac` : `error: cannot find symbol … symbol: variable x`.

**Piège.** Penser que la grammaire interdit d'utiliser une variable non déclarée. « Être déclaré » dépend du contexte
(ce qui a été écrit ailleurs dans le programme) : une grammaire algébrique ne le vérifie pas, c'est le travail de
l'analyse sémantique.

### Question 4 : programme 4

**Énoncé.** `static void m(int x)` affiche `x+1`. Dans `main` : `int y=3;`, puis `m(y=y+4);`, puis `m(y==y+4);`.

**Méthode.** Typer chaque argument et le comparer au type du paramètre (`int`).

**Réponse.** **Incorrect — erreur sémantique (typage).**

- `m(y=y+4)` est **correct** : en Java, une affectation est une expression ; sa valeur est la valeur affectée et son
  type est celui de la variable, ici `int`. (Si on supprime la ligne suivante, le programme compile et affiche `8` :
  y vaut 7, et `m` affiche 7 + 1.)
- `m(y==y+4)` : `+` est plus prioritaire que `==`, donc l'argument est `y == (y+4)`, de type **`boolean`**. On passe un
  `boolean` à un paramètre `int` : Java n'a aucune conversion de `boolean` vers `int`.
- `javac` : `error: incompatible types: boolean cannot be converted to int`.

**Piège.** Croire que la ligne `m(y=y+4);` est fautive (affectation « à l'intérieur » d'un appel) : elle est légale.
Seule la seconde ligne est refusée, et c'est le **type** qui est en cause, pas la syntaxe (`y==y+4` est une expression
syntaxiquement correcte).

### Question 5 : programme 5

**Énoncé.** `static int m(int x, boolean b, double f)` renvoie `b?x+(int)f:3`. Dans `main` : `m(4,3.14);`.

**Méthode.** Vérifier le corps de `m`, puis comparer l'appel à la signature (nombre, puis types des arguments).

**Réponse.** **Incorrect — erreur sémantique (typage : nombre d'arguments).**

- Le corps est correct : `b ? (x + (int)f) : 3` ; le transtypage `(int)f` lie plus fort que `+`, et l'opérateur
  conditionnel `?:` est moins prioritaire que `+`. Les deux branches sont `int`, le résultat est `int` comme annoncé.
- L'appel `m(4,3.14)` fournit **2** arguments alors que `m` en attend **3** : aucune méthode `m` ne s'applique.
- `javac` : `error: method m in class A cannot be applied to given types; required: int,boolean,double; found:
  int,double; reason: actual and formal argument lists differ in length`.
- Ignorer la valeur de retour de `m` est autorisé en Java : ce n'est pas une erreur.

**Piège.** Chercher l'erreur dans l'expression `b?x+(int)f:3` (elle est correcte) ou parler d'erreur syntaxique : la
grammaire de Java accepte un appel avec n'importe quel nombre d'arguments ; c'est la comparaison avec la **déclaration**
de `m`, faite en analyse sémantique, qui échoue.

### Question 6 : programme 6

**Énoncé.** Même `m` qu'au programme 5 ; dans `main` : `m(4.0,true,3.14);`.

**Méthode.** Typer chaque argument et vérifier s'il existe une conversion implicite vers le type du paramètre.

**Réponse.** **Incorrect — erreur sémantique (typage).**

- Le nombre d'arguments est bon (3). `true` est un `boolean` (OK) ; `3.14` est un `double` (OK).
- `4.0` est un littéral `double`, le paramètre `x` est un `int`. Java accepte implicitement les conversions
  **élargissantes** (`int` → `double`) mais pas les conversions **rétrécissantes** (`double` → `int`), qui peuvent
  perdre de l'information : il faut un transtypage explicite `(int)4.0`.
- `javac` : `error: incompatible types: possible lossy conversion from double to int`.
- `m(4,true,3.14)` aurait été correct.

**Piège.** Croire que `4.0` « vaut 4 » et passe donc : le typage est **statique**, il regarde le type `double` du
littéral, pas sa valeur.

### Question 7 : programme 7

**Énoncé.** `static int m(int x)` contient `final int y=x+1;`, puis `y++;`, puis `return y;`. `main` appelle `m(4)`.

**Méthode.** Tout est bien formé et bien typé ; reste à vérifier les règles statiques propres à Java, ici `final`.

**Réponse.** **Incorrect — erreur sémantique (vérification statique de `final`).**

- `final` signifie : la variable ne peut plus être modifiée après son initialisation.
- `y++` équivaut à `y = y + 1` : c'est une nouvelle affectation de `y`, interdite.
- `javac` : `error: cannot assign a value to final variable y`.

**Piège.** Répondre « erreur à l'exécution » : la règle se vérifie entièrement à la compilation, sans exécuter le
programme. Ou « erreur de syntaxe » : `y++;` est syntaxiquement une instruction valide ; c'est l'information « `y` est
`final` », venue de la déclaration, qui rend l'instruction illégale.

### Question 8 : programme 8

**Énoncé.** `main(String args[])` crée `int t[]=new int[2];`, écrit `t[2]=42;` et affiche `t[2]`.

**Méthode.** Vérifier lexique, syntaxe, typage ; puis se demander si l'erreur éventuelle est visible statiquement.

**Réponse.** **Le programme compile (correct pour le compilateur) ; il échoue à l'exécution.**

- `String args[]` et `int t[]` sont des déclarations de tableaux « à la C », légales en Java (équivalentes à
  `String[] args` et `int[] t`).
- Tout est bien typé : `t[2]` est un `int`, `42` aussi.
- Mais `new int[2]` crée un tableau d'indices **0 et 1** : l'indice 2 est hors bornes. Java vérifie les bornes **à
  l'exécution** (vérification dynamique) : `Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 2
  out of bounds for length 2`.
- Aucune phase de compilation ne détecte l'erreur : `javac` ne fait pas cette analyse (en général l'indice et la
  taille ne sont pas connus à la compilation ; ici ce sont des constantes, et un outil d'analyse statique pourrait le
  signaler, mais `javac` ne le fait pas).

**Piège.** Répondre « erreur sémantique ». Le typage vérifie que l'indice est un `int`, pas qu'il est dans les bornes.
Autre piège : croire que `int t[]` est une erreur de syntaxe.

### Récapitulatif

| Programme | Verdict | Phase | Message de `javac` / de la JVM |
|---|---|---|---|
| 1 | incorrect | syntaxique | `';' expected` |
| 2 | incorrect | lexicale | `unclosed string literal` |
| 3 | incorrect | sémantique (portée) | `cannot find symbol` |
| 4 | incorrect | sémantique (typage) | `boolean cannot be converted to int` |
| 5 | incorrect | sémantique (typage, nombre d'arguments) | `method m … cannot be applied to given types` |
| 6 | incorrect | sémantique (typage, `double` → `int`) | `possible lossy conversion from double to int` |
| 7 | incorrect | sémantique (modification d'un `final`) | `cannot assign a value to final variable y` |
| 8 | compile | aucune : erreur à l'exécution | `ArrayIndexOutOfBoundsException` |

---

## Exercice 1.2 : C — propageons l'information ! (*let us propagate information!*)

**Énoncé général.** On considère `foo.c` :

```c
int foo (unsigned int x)
{
  if (x < 0)
    return 0;
  else
    return 1;
}
```

### Question 1 : qu'a ce programme de remarquable ?

**Énoncé.** Quelque chose est remarquable dans ce programme : quoi ?

**Méthode.** Regarder les **types** : de quel type est `x`, quelles valeurs peut-il prendre, que vaut alors `x < 0` ?

**Réponse.**

- `x` est de type `unsigned int` : ses valeurs sont des entiers **positifs ou nuls** (de 0 à 2³² − 1 sur une machine
  où `unsigned int` fait 32 bits).
- Dans `x < 0`, la constante `0` (de type `int`) est convertie en `unsigned int` (conversions arithmétiques usuelles du
  C) : la comparaison est une comparaison non signée.
- Aucun entier non signé n'est strictement négatif : **`x < 0` est toujours faux**.
- Donc la branche `return 0;` n'est **jamais exécutée** (code mort) et `foo` renvoie **toujours 1**. Très probablement
  une erreur du programmeur (il voulait un `int x`, ou un autre test).

**Piège.** Dire que le programme est incorrect : il est parfaitement légal en C, il est juste inutilement compliqué
(ou bogué du point de vue de l'intention du programmeur).

### Question 2 : le compilateur peut-il le détecter ? Dans quelle phase ?

**Énoncé.** Le compilateur peut-il le détecter ? Si oui, dans quelle phase ?

**Méthode.** Chercher la **première** phase qui dispose de l'information nécessaire : ici, le type de `x` au moment où
on regarde `x < 0`.

**Réponse.** **Oui, pendant l'analyse sémantique (typage).**

- Pas en analyse lexicale : les tokens `if ( x < 0 )` sont tous valides.
- Pas en analyse syntaxique : `x < 0` est une expression correcte quel que soit le type de `x` ; la grammaire ne
  connaît pas les types.
- En **analyse sémantique** : le typeur associe à `x` le type déclaré dans la signature (`unsigned int`) — c'est la
  « propagation d'information » du titre : l'information de la **déclaration** est propagée jusqu'à **l'utilisation**
  de `x`. Connaissant ce type, le compilateur sait que la comparaison vaut toujours faux.
- Vérification avec `gcc` 16 :
  - `gcc -Wextra -c foo.c` (l'option `-Wtype-limits`, incluse dans `-Wextra`) affiche :
    `warning: comparison of unsigned expression in '< 0' is always false [-Wtype-limits]` (sans option, ou avec
    `-Wall` seul, rien n'est affiché) ;
  - l'arbre produit par le front-end (`-fdump-tree-original`) contient déjà `if (0)` à la place de `if (x < 0)`, et la
    représentation intermédiaire GIMPLE (voir exercice 3) contient `if (0 != 0) goto …` : le test a été remplacé par la
    constante « faux » **dès le front-end**, avant toute optimisation.
- Un compilateur qui ne le ferait pas dans le front-end pourrait aussi le découvrir plus tard, sur la représentation
  intermédiaire (propagation de constantes, analyse des intervalles de valeurs) ; dans tous les cas il lui faut
  l'information de type, donc on est **après** l'analyse syntaxique, à partir de l'analyse sémantique.

**Piège.** Répondre « analyse syntaxique » : la grammaire ne voit pas les types. Ou « à l'exécution » : rien à exécuter
ici, tout se déduit des types.

### Question 3 : que peut-il en faire ?

**Énoncé.** Que peut faire le compilateur de cette information ?

**Méthode.** Deux usages possibles : informer le programmeur, et produire un meilleur code.

**Réponse.**

1. **Avertir** (*warning*) le programmeur, car c'est probablement une erreur de sa part. Il ne doit **pas** rejeter le
   programme, qui est du C valide.
2. **Optimiser** : remplacer la condition par la constante « faux » (évaluation des constantes à la compilation), puis
   **supprimer le code mort** (la branche `return 0`). La fonction se compile comme `return 1;`. Vérifié : même avec
   `gcc -O0`, le corps produit sur ARM64 se réduit à `mov w0, 1` puis `ret` (plus une sauvegarde inutile de `x` sur la
   pile).

**Piège.** Croire qu'un avertissement bloque la compilation : un *warning* n'empêche pas de produire le `.o`.

---

## Exercice 1.3 : Compilation avec `gcc`

### Question 1 : que sont les fichiers `file.c.006t.gimple` ?

**Énoncé.** Pour `expr.c` (`return(a+b*c+b);`) et `fact.c` (boucle `for` qui fait `f *= n`), la commande
`gcc -fdump-tree-gimple -c file.c` produit, en plus du `.o`, un fichier `file.c.006t.gimple` (reproduit dans le sujet).
Que sont ces fichiers ?

**Méthode.** Comparer ligne à ligne le source et le fichier produit : qu'est-ce qui a disparu (sucre syntaxique,
priorités, structures de contrôle) ? qu'est-ce qui est apparu (variables `D.xxxx`, étiquettes, `goto`) ? Puis situer ce
format dans le pipeline de CM1 p. 14.

**Réponse.** Ce sont des **dumps (affichages textuels) de la représentation intermédiaire de GCC, appelée GIMPLE**,
produite juste après le front-end (analyses lexicale, syntaxique et sémantique). Dans le pipeline du cours, c'est la
« représentation intermédiaire 1 » : ce n'est ni de l'assembleur ni du code machine. Le nom du fichier indique le numéro
de la passe de GCC qui l'a écrit (`006`, la valeur dépend de la version : `007` avec gcc 16), `t` pour une passe sur les
*trees* (la famille de représentations de GCC à laquelle appartient GIMPLE), et `gimple` pour son nom.

Lecture de `expr` :

```text
source :   return(a+b*c+b);

GIMPLE :   D.1762 = b * c;          // la multiplication d'abord (priorité de * sur +)
           D.1763 = D.1762 + a;     // puis a + (b*c)
           D.1761 = D.1763 + b;     // puis (a + b*c) + b  (associativité à gauche)
           return D.1761;
```

1. **Code 3 adresses** : chaque instruction fait **une seule** opération, avec au plus trois opérandes (une destination,
   deux sources). L'expression `a+b*c+b` (deux `+` et un `*`) devient trois instructions.
2. **Temporaires** : `D.1761`, `D.1762`, `D.1763` sont des variables inventées par le compilateur (les « temporaires »
   de CM7 p. 6), déclarées en tête de fonction. Leur nom contient un point, qui est interdit dans un identificateur C :
   elles ne peuvent pas entrer en conflit avec une variable du programmeur.
3. **Priorité et associativité déjà résolues** : l'ordre des instructions est celui de l'AST
   `+(+(a, *(b, c)), b)`. Le parsing est donc terminé ; plus aucune parenthèse n'est nécessaire.
4. L'ordre des opérandes du premier `+` est échangé (`D.1762 + a` au lieu de `a + D.1762`) : `+` est commutatif et
   GCC met les opérandes dans une forme canonique (le front-end produit déjà `(b * c + a) + b`).
5. Un seul `return`, d'une variable : la valeur de retour passe par un temporaire.

Lecture de `fact` (source : `int i,f=1; for (i=2; i<=n; i++) f *= n; return f;`) :

| Source | GIMPLE |
|---|---|
| `int i,f=1;` | déclarations `int i; int f;` en tête, puis l'instruction `f = 1;` |
| initialisation du `for` : `i=2` | `i = 2;` |
| entrée dans la boucle : on teste d'abord | `goto <D.2746>;` (saut vers le test) |
| corps : `f *= n;` | `<D.2745>:` puis `f = f * n;` |
| incrément : `i++` | `i = i + 1;` |
| test : `i<=n` | `<D.2746>:` puis `if (i <= n) goto <D.2745>; else goto <D.2743>;` |
| sortie de boucle | `<D.2743>:` |
| `return f;` | `D.2748 = f;` puis `return D.2748;` |

1. **Plus de structures de contrôle** : la boucle `for` est remplacée par des **étiquettes** (`<D.2745>:`) et des
   **sauts** (`goto`, et le saut conditionnel `if (cond) goto L1; else goto L2;`). Le test est placé en bas de la
   boucle, et on y saute une première fois avant d'entrer dans le corps.
2. **Plus de sucre syntaxique** : `f *= n` devient `f = f * n`, `i++` devient `i = i + 1`, la déclaration avec
   initialisation `f=1` devient une déclaration plus une affectation.
3. Toujours du code 3 adresses avec temporaires (`D.2748`).

En résumé : ces fichiers montrent que le front-end a **tout analysé** (priorités, types, portée) et a traduit le
programme dans une représentation **plus simple et plus uniforme** (instructions 3 adresses, sauts), encore
indépendante du processeur (pas de registres), sur laquelle travaillent ensuite les optimisations puis la génération de
code. Le langage d'assemblage n'arrive que plus tard.

Vérification : avec gcc 16 on obtient exactement la même structure (seuls les noms changent : `_1`, `_2` au lieu de
`D.1762`, `D.1763`, et d'autres numéros d'étiquettes).

Remarque (hors question) : `fact` ne calcule pas n! mais **nⁿ⁻¹** pour n ≥ 2 (le source multiplie par `n` au lieu de
`i`) ; GIMPLE reproduit fidèlement ce bug (`f = f * n`). Un compilateur traduit le programme écrit, pas celui qu'on
voulait écrire.

**Piège.** Prendre ces fichiers pour de l'assembleur : il n'y a ni registres ni instructions machine. Ou croire que les
`D.xxxx` sont des variables du programme : ce sont des temporaires du compilateur.

---

## Exercice 1.4 : Syntaxe des expressions régulières ANTLR (*ANTLR regex syntax*)

**Énoncé général.** Réécrire chaque expression ANTLR en n'utilisant que les trois opérations de la définition formelle
(union `|`, concaténation, étoile `*`), plus les cas de base (lettres, ε).

**Méthode générale.** Remplacer chaque raccourci par sa définition (table de R3) : `[…]` → union de caractères ;
`r+` → `r r*` ; `r?` → `(r | ε)` ; littéral `'ab'` → concaténation `a b` ; `~[…]` → union de tous les **autres**
caractères. Puis décrire le langage obtenu et tester quelques mots qui doivent passer et d'autres non.

### Question 1 : `[abc]+`

**Énoncé.** Réécrire `[abc]+`.

**Méthode.** Deux raccourcis : l'ensemble `[abc]`, puis `+`.

**Réponse.**

1. `[abc]` = `(a | b | c)` (un caractère parmi a, b, c).
2. `r+` = `r r*`, avec r = `(a | b | c)`.

```text
[abc]+   =   (a | b | c) (a | b | c)*
```

Langage : les mots **non vides** sur l'alphabet {a, b, c}. Contrôle : `a`, `cab`, `bbbb` passent ; le mot vide et `abd`
non (vérifié sur tous les mots de longueur ≤ 5 sur {a, b, c, d}).

**Piège.** Écrire `a a* | b b* | c c*` ou `(a|b|c)*` : le premier n'accepte que des répétitions d'**une même** lettre
(pas `ab`), le second accepte le mot vide. Avec `(a | b | c)*`, le choix de la lettre est refait à chaque tour.

### Question 2 : `a+a?`

**Énoncé.** Réécrire `a+a?`.

**Méthode.** Traduire `a+` et `a?` séparément, concaténer, puis simplifier en calculant le langage.

**Réponse.**

1. `a+` = `a a*`.
2. `a?` = `(a | ε)`.
3. Traduction directe :

```text
a+a?   =   a a* (a | ε)
```

4. Simplification : L(a+) = { aⁿ | n ≥ 1 }. En concaténant avec { ε, a } on obtient { aⁿ | n ≥ 1 } ∪ { aⁿ | n ≥ 2 } =
   { aⁿ | n ≥ 1 }. Donc :

```text
a+a?   =   a a*
```

Les deux réponses sont correctes ; la seconde est la plus simple. Contrôle : `a`, `aa`, `aaa` passent, le mot vide et
`b` non (vérifié jusqu'à la longueur 7).

Remarque : si l'on veut se passer aussi de ε comme cas de base, on peut écrire ε = `∅*` (zéro répétition).

**Piège.** Lire `a+a?` comme « au moins deux a » et écrire `a a* a` : le `a?` final est **optionnel**, `a` tout seul
est accepté.

### Question 3 : `'//' ~[\n]+`

**Énoncé.** Réécrire `'//' ~[\n]+`.

**Méthode.** Trois morceaux : le littéral `'//'` (deux caractères), l'ensemble complémentaire `~[\n]`, puis le `+`. Le
complémentaire n'est pas une opération de base : il faut **énumérer** les caractères restants, ce qui est possible
parce que l'alphabet Σ est fini.

**Réponse.**

1. `'//'` = `/ /` (concaténation de deux barres obliques).
2. `~[\n]` = tout caractère sauf la fin de ligne. Si Σ = {c₁, …, cₖ, \n} (par exemple les 128 caractères ASCII, donc
   k = 127), on pose : `N = (c₁ | c₂ | … | cₖ)`, l'union de tous les caractères de Σ sauf `\n`.
3. `r+` = `r r*`, avec r = N.

```text
'//' ~[\n]+   =   / / N N*      avec  N = (c₁ | c₂ | … | cₖ),  {c₁, …, cₖ} = Σ \ {\n}
```

Langage : un commentaire sur une ligne : `//` suivi d'**au moins un** caractère, aucun n'étant une fin de ligne.
Contrôle (sur l'alphabet réduit {/, a, \n}, donc N = `(/ | a)`) : `//a`, `///`, `//a/a` passent ; `//`, `//\n`, `/a`
non (vérifié jusqu'à la longueur 7). N est seulement une abréviation (comme un `fragment` ANTLR), pas une nouvelle
opération.

**Piège.** Oublier que `+` impose au moins un caractère : le commentaire vide `//` (suivi directement d'une fin de
ligne) n'est **pas** reconnu par cette expression. En pratique on écrit plutôt `'//' ~[\n]*`. Autre piège : écrire
« ¬\n » ou « Σ − \n » dans la réponse : le complémentaire ne fait pas partie des trois opérations, il faut l'union
explicite.

---

## Exercice 1.5 : Expressions régulières pour le lexing (*Regular expressions for lexing*)

**Énoncé général.** Écrire en syntaxe ANTLR des expressions régulières pour : (1) les identificateurs, (2) les
flottants comme −3.96, (3) les nombres en notation scientifique comme −1.6E−12, (4) les mots-clés `begin`, `end` et
`while`.

**Méthode générale.** Décrire le mot **de gauche à droite**, morceau par morceau (premier caractère, suite, partie
optionnelle…), traduire chaque morceau (`[…]`, `?`, `+`, `*`), puis tester des mots qui doivent passer et d'autres qui
ne doivent pas passer. Penser aux deux règles d'ambiguïté du lexer (CM2 p. 14) quand plusieurs règles cohabitent.

### Question 1 : identificateurs

**Énoncé.** Toute suite de lettres, de chiffres et de `_` qui ne commence ni par un chiffre ni par `_`.

**Méthode.** Traiter à part le **premier** caractère (forcément une lettre), puis le reste (n'importe quelle suite,
éventuellement vide, de lettres, chiffres et `_`).

**Réponse.**

```antlr
ID : [a-zA-Z] [a-zA-Z0-9_]* ;
```

- `[a-zA-Z]` : exactement une lettre, minuscule ou majuscule ;
- `[a-zA-Z0-9_]*` : zéro ou plusieurs lettres, chiffres ou `_`.

Contrôle : `x`, `abc_12`, `A_`, `toto42` passent ; `_x`, `1a`, le mot vide, `a-b` ne passent pas. Version avec
fragments, équivalente : `fragment LETTER : [a-zA-Z] ;`, `fragment DIGIT : [0-9] ;`,
`ID : LETTER (LETTER | DIGIT | '_')* ;`.

**Piège.** Recopier l'`ID` de MiniC (`[a-zA-Z_] [a-zA-Z_0-9]*`), qui autorise un `_` initial, interdit ici. Écrire
`[a-zA-z]` (z minuscule) : en ASCII l'intervalle `A-z` contient aussi `[`, `\`, `]`, `^`, `_` et `` ` ``. Écrire
`[a-zA-Z]+ [0-9_]*` : interdit `a1b`.

### Question 2 : flottants comme −3.96

**Énoncé.** Le signe est optionnel, le point est obligatoire.

**Méthode.** Découper −3.96 : signe optionnel, puis au moins un chiffre, puis un point, puis au moins un chiffre.

**Réponse.**

```antlr
FLOAT : '-'? [0-9]+ '.' [0-9]+ ;
```

- `'-'?` : le signe moins, optionnel ;
- `[0-9]+` : la partie entière, au moins un chiffre ;
- `'.'` : le point, **entre apostrophes** ;
- `[0-9]+` : la partie décimale, au moins un chiffre.

Contrôle : `-3.96`, `3.96`, `0.5` passent ; `3`, `-3`, `3.`, `.5`, `--3.9`, `3.9.1` non. Question ouverte, d'autres
réponses sont correctes : accepter aussi un `+` (`('+' | '-')? [0-9]+ '.' [0-9]+`), ou accepter `3.` et `.5`
(`'-'? ([0-9]+ '.' [0-9]* | '.' [0-9]+)`).

**Piège.**

- Écrire `.` sans apostrophes : en ANTLR, `.` veut dire « n'importe quel caractère » ; `[0-9]+ . [0-9]+` accepterait
  `3x96`.
- Dans un vrai langage, mettre le signe dans le token est une mauvaise idée : avec une règle `MINUS : '-' ;`, le texte
  `x-3.5` est découpé en `ID(x) FLOAT(-3.5)` (plus long préfixe : `-3.5` fait 4 caractères contre 1 pour `-`), et le
  parser voit deux opérandes sans opérateur : erreur de syntaxe. C'est pourquoi les compilateurs traitent le moins comme
  un opérateur unaire, dans la grammaire. (Vérifié avec ANTLR.)

### Question 3 : notation scientifique comme −1.6E−12

**Énoncé.** Nombres comme −1.6E−12.

**Méthode.** Une mantisse (le flottant de la question 2), puis la lettre `E`, puis un exposant entier signé.

**Réponse.**

```antlr
SCI : '-'? [0-9]+ '.' [0-9]+ ('E' | 'e') ('+' | '-')? [0-9]+ ;
```

- `'-'? [0-9]+ '.' [0-9]+` : la mantisse −1.6 ;
- `('E' | 'e')` : la lettre E (on accepte aussi e) ;
- `('+' | '-')?` : le signe de l'exposant, optionnel ;
- `[0-9]+` : l'exposant, un entier (au moins un chiffre, pas de point).

Contrôle : `-1.6E-12`, `1.6E12`, `6.02e+23` passent ; `-1.6`, `1.6E`, `E12`, `1.6E-`, `-1.6E--12` non. Variantes
correctes : mantisse sans point (`[0-9]+ ('.' [0-9]+)?`), exposant sans `+`. Avec des fragments, on évite de recopier la
mantisse :

```antlr
fragment DIGIT    : [0-9] ;
fragment MANTISSA : '-'? DIGIT+ '.' DIGIT+ ;
FLOAT : MANTISSA ;
SCI   : MANTISSA ('E' | 'e') ('+' | '-')? DIGIT+ ;
```

Si FLOAT et SCI sont dans le même lexer, il n'y a pas de conflit : sur `-1.6E-12`, FLOAT reconnaît 4 caractères
(`-1.6`) et SCI en reconnaît 8, donc SCI gagne (plus long préfixe).

Remarque d'écriture : `[+-]` marche aussi (un `-` placé en dernier dans `[…]` est pris littéralement, vérifié avec
ANTLR 4.13), mais entre deux caractères il note un intervalle ; `('+' | '-')` ne laisse aucun doute.

**Piège.** Oublier que l'exposant peut être négatif (ou positif avec un `+`) ; autoriser un point dans l'exposant
(`1.6E-1.2` n'est pas un nombre valide) ; écrire `.` au lieu de `'.'` dans la mantisse (voir question 2).

### Question 4 : les mots-clés `begin`, `end` et `while`

**Énoncé.** Reconnaître les mots-clés `begin`, `end` et `while`.

**Méthode.** Un token par mot-clé (le parser doit pouvoir les distinguer) ; puis régler l'ambiguïté avec `ID`, qui
reconnaît aussi ces mots.

**Réponse.**

```antlr
BEGIN : 'begin' ;
END   : 'end' ;
WHILE : 'while' ;
// ... et seulement ensuite :
ID    : [a-zA-Z] [a-zA-Z0-9_]* ;
```

Pourquoi l'ordre compte (CM2 p. 14) :

- sur `begin`, BEGIN et ID reconnaissent tous deux 5 caractères : **égalité**, donc la **première règle du fichier**
  gagne. Il faut que BEGIN soit écrit **avant** ID ;
- sur `beginning`, ID reconnaît 9 caractères et BEGIN seulement 5 : le **plus long préfixe** gagne, c'est un ID (de même
  `endwhile` est un ID). C'est le comportement voulu.

Une seule règle `KEYWORD : 'begin' | 'end' | 'while' ;` (comme dans l'exemple de CM2 p. 11) est aussi une expression
correcte, mais le parser ne pourrait plus distinguer `begin` de `end` : on préfère un token par mot-clé.

Lexer complet des questions 1 à 4 (testé avec ANTLR) :

```antlr
lexer grammar Lex5;

fragment DIGIT  : [0-9] ;
fragment LETTER : [a-zA-Z] ;

// 4. mots-clés : AVANT ID
BEGIN : 'begin' ;
END   : 'end' ;
WHILE : 'while' ;

// 1. identificateurs
ID : LETTER (LETTER | DIGIT | '_')* ;

// 2. flottants
FLOAT : '-'? DIGIT+ '.' DIGIT+ ;

// 3. notation scientifique
SCI : '-'? DIGIT+ '.' DIGIT+ ('E' | 'e') ('+' | '-')? DIGIT+ ;

MINUS : '-' ;              // seulement pour montrer le piège de x-3.5
WS : [ \t\r\n]+ -> skip ;
```

Sur l'entrée `begin beginning end endwhile while x abc_12 A_ -3.96 3.96 -1.6E-12 6.02e+23 x-3.5`, `TestRig … -tokens`
donne, dans l'ordre : `'begin'`, `ID`, `'end'`, `ID`, `'while'`, `ID`, `ID`, `ID`, `FLOAT`, `FLOAT`, `SCI`, `SCI`, `ID`,
`FLOAT(-3.5)`. Sur `_x 1a`, ANTLR signale `token recognition error` sur `_` et sur `1a`.

**Piège.** Placer les mots-clés **après** `ID` : ANTLR ne dit rien, mais `begin`, `end`, `while` sortent tous comme des
`ID` (vérifié) — exactement le cas de `then` dans l'exemple de CM2 p. 14.

---

## Exercice 1.6 : Nombres shadoks (bonus)

### Question 1 : un lexer ANTLR qui interprète les nombres shadoks

**Énoncé.** Écrire un fichier lexical ANTLR qui lit et **interprète** (calcule la valeur de) des nombres shadoks : base
4, chiffres `ga` = 0, `bu` = 1, `zo` = 2, `meu` = 3. Exemples : `zozo` = 10, `bubuga` = 20, `zozozo` = 42,
`bugagagagaga` = 1024.

**Méthode.** Un token par chiffre, et une **action** par token qui met à jour une variable déclarée dans `@members`
(comme `CountLines2.g4`, CM2 p. 16). Pour calculer la valeur en lisant les chiffres de gauche à droite (poids fort
d'abord), on utilise le **schéma de Horner** : valeur ← 4 × valeur + chiffre. Il faut aussi décider où un nombre se
termine : ici, **un nombre par ligne**, la fin de ligne déclenche l'affichage.

**Réponse.**

Vérification des exemples de l'énoncé :

- `zozo` = 2 × 4¹ + 2 × 4⁰ = 8 + 2 = 10 ;
- `bubuga` = 1 × 4² + 1 × 4¹ + 0 = 16 + 4 = 20 ;
- `zozozo` = 2 × 4² + 2 × 4 + 2 = 32 + 8 + 2 = 42 ;
- `bugagagagaga` = `bu` suivi de cinq `ga` = 1 × 4⁵ = 1024.

Schéma de Horner (on n'a pas besoin de connaître à l'avance le nombre de chiffres) :

```text
bubuga :   v = 0
           bu : v = 4 × 0  + 1 = 1
           bu : v = 4 × 1  + 1 = 5
           ga : v = 4 × 5  + 0 = 20

zozozo :   zo : 2      zo : 4 × 2 + 2 = 10      zo : 4 × 10 + 2 = 42

bugagagagaga : bu : 1   ga : 4   ga : 16   ga : 64   ga : 256   ga : 1024
```

Fichier `Shadok.g4` (backend Java, comme dans le cours) :

```antlr
lexer grammar Shadok;

@members {
  int value = 0;   // valeur du nombre en cours de lecture
}

GA  : 'ga'  { value = 4 * value + 0; } ;
BU  : 'bu'  { value = 4 * value + 1; } ;
ZO  : 'zo'  { value = 4 * value + 2; } ;
MEU : 'meu' { value = 4 * value + 3; } ;

// fin de ligne = fin du nombre : on affiche sa valeur et on remet l'accumulateur à 0
NEWLINE : '\r'? '\n' { System.out.println(value); value = 0; } ;
WS      : [ \t]+ -> skip ;
```

Exécution (vérifiée) :

```text
$ antlr4 Shadok.g4
$ javac Shadok*.java
$ printf 'zozo\nbubuga\nzozozo\nbugagagagaga\n' | java org.antlr.v4.gui.TestRig Shadok tokens
10
20
42
1024
```

Les actions sont exécutées dans l'ordre où les tokens sont reconnus, donc de gauche à droite : c'est exactement ce
qu'il faut pour Horner. Le découpage n'est jamais ambigu : les quatre chiffres commencent par quatre lettres
différentes (g, b, z, m), aucun n'est préfixe d'un autre.

Variante (autre réponse correcte) : un seul token par nombre, dont l'action décode le texte reconnu (`getText()`). Les
nombres peuvent alors être séparés par des blancs quelconques :

```antlr
lexer grammar Shadok2;

NUMBER : ('ga' | 'bu' | 'zo' | 'meu')+
  {
    String s = getText();
    int v = 0;
    for (int i = 0; i < s.length(); ) {
      char c = s.charAt(i);
      int d = (c == 'g') ? 0 : (c == 'b') ? 1 : (c == 'z') ? 2 : 3;
      v = 4 * v + d;
      i += (c == 'm') ? 3 : 2;       // "meu" a 3 lettres, les autres 2
    }
    System.out.println(s + " = " + v);
  } ;

WS : [ \t\r\n]+ -> skip ;
```

Sur `zozo bubuga zozozo bugagagagaga`, elle affiche `zozo = 10`, `bubuga = 20`, `zozozo = 42`,
`bugagagagaga = 1024` (vérifié).

**Piège.** Prendre les chiffres dans le mauvais sens (le premier chiffre lu est celui de **poids fort**) ; oublier de
remettre l'accumulateur à 0 entre deux nombres ; avec la première version, écrire deux nombres sur la même ligne
(`zozo bubuga`) : les blancs étant ignorés, les chiffres s'enchaînent en un seul nombre.

---

## Exercice 1.7 : Parenthèses bien formées (*Well-founded parenthesis*)

### Question 1 : grammaire et fichiers ANTLR

**Énoncé.** Écrire une grammaire et les fichiers ANTLR qui acceptent n'importe quel texte dont les parenthèses `(` `)`
et les crochets `[` `]` sont bien formés (l'énoncé écrit « ')' and '[' », il faut lire : les parenthèses et les
crochets).

**Méthode.** Un mot bien parenthésé non vide **commence** par un symbole ouvrant ; ce symbole a un **unique**
symbole fermant associé ; entre les deux il y a un mot bien parenthésé, et après il y a encore un mot bien parenthésé.
On traduit directement cette décomposition en règles. Le lexer, lui, ne garde que les quatre symboles et jette tout le
reste.

**Réponse.**

Grammaire (P = mot bien parenthésé, axiome `prog`) :

```text
prog → P EOF
P    → ( P ) P          (r1)
P    → [ P ] P          (r2)
P    → ε                (r3)
```

Fichier ANTLR (c'est la démo `Parent.g4` du cours, testée) :

```antlr
grammar Parent;

prog: parentexpr EOF;

parentexpr
    : '(' parentexpr ')' parentexpr
    | '[' parentexpr ']' parentexpr
    | /* epsilon */
    ;

CHARS: ~[()[\]] -> skip ;
```

- `CHARS : ~[()[\]] -> skip` : tout caractère qui n'est pas `(`, `)`, `[`, `]` est reconnu puis jeté (le `]` est
  échappé en `\]` dans l'ensemble). C'est ce qui permet d'accepter « n'importe quel texte ».
- Dans une grammaire combinée, les littéraux `'('`, `')'`, `'['`, `']'` des règles du parser deviennent des tokens
  implicites.
- Version en deux fichiers, sur le modèle de `AnBnLexer.g4` / `AnBnParser.g4` (CM2 p. 26-27), testée aussi :

```antlr
lexer grammar ParentLexer;

LPAR : '(' ;
RPAR : ')' ;
LBRA : '[' ;
RBRA : ']' ;
OTHER : ~[()[\]] -> skip ;   // tout autre caractère est ignoré
```

```antlr
parser grammar ParentParser;
options { tokenVocab = ParentLexer; }

prog : p EOF ;

p : LPAR p RPAR p
  | LBRA p RBRA p
  |                  // epsilon
  ;
```

Commandes : `antlr4 Parent.g4` (ou `antlr4 ParentLexer.g4 ParentParser.g4`), `javac *.java`, puis
`echo '[()]()' | java org.antlr.v4.gui.TestRig Parent prog -gui` (ou `-tree`).

Pourquoi la grammaire est juste :

- **Tout mot engendré est bien formé** : ε l'est ; si u et v le sont, `( u ) v` et `[ u ] v` le sont aussi.
- **Tout mot bien formé w est engendré** (récurrence sur la longueur) : si w = ε, règle r3. Sinon w commence par un
  ouvrant, disons `(` ; soit `)` son fermant associé : w = `( u ) v` avec u et v bien formés et plus courts. Par
  hypothèse de récurrence P ⇒* u et P ⇒* v, donc P ⇒ `( P ) P` ⇒* `( u ) v` (règle r1). Idem avec `[`.
- **La grammaire n'est pas ambiguë** : le fermant associé au premier ouvrant est unique, donc la décomposition aussi.
  (Vérifié : grammaire et vérification par pile sont d'accord sur tous les mots de longueur ≤ 8, et chaque mot bien
  formé de longueur ≤ 10 a exactement un arbre.)

Exemple : dérivation gauche de `[()]()` (on réécrit toujours le P le plus à gauche) :

```text
P ⇒ [ P ] P              (r2)
  ⇒ [ ( P ) P ] P        (r1)
  ⇒ [ ( ) P ] P          (r3)
  ⇒ [ ( ) ] P            (r3)
  ⇒ [ ( ) ] ( P ) P      (r1)
  ⇒ [ ( ) ] ( ) P        (r3)
  ⇒ [ ( ) ] ( )          (r3)
```

Arbre de dérivation :

```text
                   prog
           ┌─────────┴──────────┐
           P                  <EOF>
┌──────┬───┴───┬──────┐
[      P       ]      P
   ┌──┬┴─┬──┐     ┌──┬┴─┬──┐
   (  P  )  P     (  P  )  P
      │     │        │     │
      ε     ε        ε     ε
```

Sortie de `TestRig … -tree` (identique) :
`(prog (parentexpr [ (parentexpr ( parentexpr ) parentexpr) ] (parentexpr ( parentexpr ) parentexpr)) <EOF>)`.

Texte quelconque : `f(a[i]) + (b)` est accepté (les lettres, blancs et `+` sont jetés, il reste `([])()`).

Mots rejetés :

- `([)]` : r1 lit `(`, puis le P intérieur lit `[` (r2) ; le P à l'intérieur des crochets voit `)`, ne peut que faire
  ε, et la règle r2 attend alors `]` mais trouve `)`. ANTLR (4.13) affiche deux erreurs : `extraneous input ')' expecting ']'`, puis
  `missing ')' at '<EOF>'`.
- `(()` : il manque le `)` final ; ANTLR : `missing ')' at '<EOF>'`.

(ANTLR affiche quand même un arbre après ces messages : il tente de **récupérer** de l'erreur pour continuer, mais le
mot est bien rejeté.)

**Piège.**

- Écrire `P → P P | ( P ) | [ P ] | ε` : le langage est le bon, mais la grammaire est **ambiguë** (`()()()` a plusieurs
  arbres, et même ε en a une infinité via P → P P).
- Oublier le P **après** le fermant (`P → ( P ) | [ P ] | ε`) : on n'accepte plus que des imbrications comme `(())`,
  pas `()()`.
- Écrire `prog : parentexpr+ EOF` : ANTLR refuse de générer le parser (`error(153): rule prog contains a closure with
  at least one alternative that can match an empty string`, vérifié), car une boucle `+` ou `*` ne doit pas porter sur
  une règle qui peut reconnaître le mot vide (commentaire de la démo) — et c'est inutile, le P final gère déjà les
  suites.
- Oublier la règle qui jette les autres caractères : le moindre `f` produit une erreur lexicale
  (`token recognition error`). Garder la règle mais oublier `-> skip` envoie ces caractères au parser comme tokens, et
  c'est lui qui les refuse.

---

## Exercice 1.8 : Expressions arithmétiques

**Énoncé général.** Grammaire (une expression se termine par un point-virgule) ; on numérote les productions :

```text
(r1)  Z → E ;
(r2)  E → E + T
(r3)  E → T
(r4)  T → T ∗ F
(r5)  T → F
(r6)  F → ( E )
(r7)  F → i
```

`i` est le token des entiers. **Convention** : dans les dérivations et les arbres, on écrit directement `1`, `2`, `3`
pour « le token i dont le texte est 1, 2, 3 » (la valeur est fournie par le lexer, CM2 p. 43).

Idée de la grammaire : **un non-terminal par niveau de priorité** — E (expression) est une somme de termes, T (terme) un
produit de facteurs, F (facteur) un entier ou une expression entre parenthèses. Comme `*` est « plus bas » dans la
grammaire, il est plus prioritaire que `+`. La **récursivité à gauche** (`E → E + T`, `T → T ∗ F`) rend `+` et `*`
**associatifs à gauche**. Cette grammaire n'est pas ambiguë.

### Question 1 : arbres de dérivation de `1 + 2 + 3;`, `1 + 2 ∗ 3;`, `(1 + 2) ∗ 3;`

**Énoncé.** Donner l'arbre de dérivation de chacun des trois mots.

**Méthode.** On construit l'arbre **de haut en bas**. À chaque nœud E, on cherche un `+` **hors parenthèses** : s'il y
en a, on applique r2 en coupant au **dernier** `+` (le T de droite ne peut pas contenir de `+` hors parenthèses) ;
sinon r3. Même raisonnement pour T avec `*` (r4 au dernier `*`, sinon r5). Pour F : parenthèses → r6, entier → r7. On
écrit en parallèle la dérivation gauche en nommant la règle de chaque pas, et on vérifie que les feuilles, lues de
gauche à droite, redonnent le mot **avec** ses parenthèses et son `;`.

**Réponse.**

**a) `1 + 2 + 3;`**

Raisonnement : Z → E ; (r1). Dans `1 + 2 + 3`, deux `+` hors parenthèses : on coupe au dernier, E → E + T avec E =
`1 + 2` et T = `3`. Puis E = `1 + 2` : on coupe au `+`, E → E + T avec E = `1` et T = `2`. Enfin les chaînes
E → T → F → 1, T → F → 2, T → F → 3.

Dérivation gauche :

```text
Z ⇒ E ;                (r1)
  ⇒ E + T ;            (r2)
  ⇒ E + T + T ;        (r2)
  ⇒ T + T + T ;        (r3)
  ⇒ F + T + T ;        (r5)
  ⇒ 1 + T + T ;        (r7)
  ⇒ 1 + F + T ;        (r5)
  ⇒ 1 + 2 + T ;        (r7)
  ⇒ 1 + 2 + F ;        (r5)
  ⇒ 1 + 2 + 3 ;        (r7)
```

Arbre de dérivation :

```text
            Z
         ┌──┴──┐
         E     ;
   ┌─────┼──┐
   E     +  T
┌──┼──┐     │
E  +  T     F
│     │     │
T     F     3
│     │
F     2
│
1
```

Forme parenthésée (aux noms de règles près, c'est ce qu'affiche `TestRig -tree` sur cette grammaire écrite en ANTLR) :
`(Z (E (E (E (T (F 1))) + (T (F 2))) + (T (F 3))) ;)`.

L'arbre penche **à gauche** : `1 + 2` est calculé d'abord, c'est l'associativité à gauche. L'arbre « penché à droite »
(1 + (2 + 3)) est impossible : il faudrait que le T de droite de r2 dérive `2 + 3`, or un T ne contient jamais de `+`
hors parenthèses.

**b) `1 + 2 ∗ 3;`**

Raisonnement : Z → E ; (r1). Un seul `+` hors parenthèses : E → E + T avec E = `1`, T = `2 ∗ 3`. Puis T = `2 ∗ 3` :
T → T ∗ F avec T = `2`, F = `3`.

Dérivation gauche :

```text
Z ⇒ E ;                (r1)
  ⇒ E + T ;            (r2)
  ⇒ T + T ;            (r3)
  ⇒ F + T ;            (r5)
  ⇒ 1 + T ;            (r7)
  ⇒ 1 + T ∗ F ;        (r4)
  ⇒ 1 + F ∗ F ;        (r5)
  ⇒ 1 + 2 ∗ F ;        (r7)
  ⇒ 1 + 2 ∗ 3 ;        (r7)
```

Arbre de dérivation :

```text
         Z
   ┌─────┴─────┐
   E           ;
┌──┼─────┐
E  +     T
│     ┌──┼──┐
T     T  ∗  F
│     │     │
F     F     3
│     │
1     2
```

Forme parenthésée : `(Z (E (E (T (F 1))) + (T (T (F 2)) ∗ (F 3))) ;)`.

Le `∗` est **sous** le `+` : il est calculé d'abord, c'est la priorité. Mettre `∗` à la racine est impossible : il
faudrait que E → T, puis T → T ∗ F avec T = `1 + 2`, or un T ne dérive pas de `+` hors parenthèses.

**c) `(1 + 2) ∗ 3;`**

Raisonnement : Z → E ; (r1). Aucun `+` hors parenthèses : E → T (r3). Un `∗` hors parenthèses : T → T ∗ F avec
T = `(1 + 2)`, F = `3`. Puis T → F (r5) et F → ( E ) (r6) avec E = `1 + 2`, qui se dérive comme en b).

Dérivation gauche :

```text
Z ⇒ E ;                      (r1)
  ⇒ T ;                      (r3)
  ⇒ T ∗ F ;                  (r4)
  ⇒ F ∗ F ;                  (r5)
  ⇒ ( E ) ∗ F ;              (r6)
  ⇒ ( E + T ) ∗ F ;          (r2)
  ⇒ ( T + T ) ∗ F ;          (r3)
  ⇒ ( F + T ) ∗ F ;          (r5)
  ⇒ ( 1 + T ) ∗ F ;          (r7)
  ⇒ ( 1 + F ) ∗ F ;          (r5)
  ⇒ ( 1 + 2 ) ∗ F ;          (r7)
  ⇒ ( 1 + 2 ) ∗ 3 ;          (r7)
```

Arbre de dérivation :

```text
                  Z
               ┌──┴──┐
               E     ;
               │
               T
      ┌────────┼──┐
      T        ∗  F
      │           │
      F           3
┌─────┼─────┐
(     E     )
   ┌──┼──┐
   E  +  T
   │     │
   T     F
   │     │
   F     2
   │
   1
```

Forme parenthésée : `(Z (E (T (T (F ( (E (E (T (F 1))) + (T (F 2))) ))) ∗ (F 3))) ;)`.

Les parenthèses **apparaissent** dans l'arbre de dérivation (ce sont des feuilles, produites par r6) : c'est grâce à r6
qu'un `+` peut se retrouver sous un `∗`.

Contrôle : chacun des trois mots a **exactement un** arbre (comptage exhaustif par programme), et ANTLR produit les
mêmes trois arbres.

**Piège.** Dessiner un AST quand on demande un arbre de dérivation : il faut **tous** les non-terminaux (Z, E, T, F, y
compris les chaînes E → T → F), **tous** les terminaux (`(`, `)`, `;`), et chaque nœud interne doit correspondre à une
production de la grammaire. Autre piège : dessiner `1 + 2 + 3` associatif à droite.

### Question 2 : les AST correspondants

**Énoncé.** Donner les arbres de syntaxe abstraite des trois expressions.

**Méthode.** Partir de l'arbre de dérivation et ne garder que la **structure du calcul** (CM2 p. 35-37) : supprimer Z et
le `;` ; écraser les chaînes unaires (E → T → F → 1 devient la feuille `1`) ; supprimer les parenthèses (F → ( E )
devient l'AST de E) ; chaque nœud E → E + T devient un nœud `+` dont les fils sont les AST des deux opérandes (idem pour
`∗`). On utilise la grammaire abstraite `e ::= c | e + e | e × e`.

**Réponse.**

```text
1 + 2 + 3;            1 + 2 ∗ 3;            (1 + 2) ∗ 3;

     +                    +                      ∗
   ┌─┴──┐               ┌─┴─┐                  ┌─┴──┐
   +    3               1   ∗                  +    3
  ┌┴─┐                     ┌┴─┐               ┌┴─┐
  1  2                     2  3               1  2
```

En notation linéaire : `+(+(1, 2), 3)`, `+(1, ∗(2, 3))`, `∗(+(1, 2), 3)`.

- Les feuilles sont les constantes, les nœuds internes les opérateurs.
- La priorité et l'associativité se lisent dans la **forme** de l'arbre : le nœud le plus bas est calculé en premier.
- Les parenthèses de `(1 + 2) ∗ 3` ont disparu : elles sont **encodées** par le fait que `+` est sous `∗`.
- Contrôle par évaluation de bas en haut : 6, 7 et 9.

Remarque : avec la grammaire ambiguë du cours (`expr: expr '*' expr | expr '+' expr | INT`, CM2 p. 30), `1+2*3` et
`1+2+3` ont chacun **deux** arbres, qui correspondent à deux AST différents ; la grammaire stratifiée E/T/F n'en laisse
qu'un.

**Piège.** Garder des nœuds E, T, F ou des parenthèses dans l'AST ; ou placer l'opérateur comme une feuille entre ses
deux opérandes (c'est la forme de l'arbre de dérivation, pas celle de l'AST).

---

## Exercice 1.9 : Grammaire de MiniC (*MiniC-grammar*)

### Question 1 : écrire un programme valide

**Énoncé.** Le sujet donne la grammaire ANTLR simplifiée de MiniC (sans la sous-grammaire des expressions, ni la
définition de la plupart des tokens). Écrire un programme valide pour cette grammaire.

**Méthode.** Partir de l'axiome `prog` et lire les règles dans l'ordre, en notant **quels tokens** doivent apparaître
**dans quel ordre** ; remplir chaque partie (déclarations, instructions) en utilisant si possible chaque alternative de
`stat` ; puis vérifier en esquissant l'arbre de dérivation. Rappels de notation : `#progRule`, `#funcDef`… nomment les
alternatives (ANTLR en tire les méthodes du visiteur, par exemple `visitFuncDef`, CM3 p. 21-22) ; `then_block=stat_block`
donne un nom au sous-arbre (comme `e=expr`, CM2 p. 45). Ces annotations ne changent pas le langage reconnu.

Hypothèse sur les tokens coupés dans le sujet : l'orthographe qu'annoncent leurs noms (`println_int` est celle de
l'énoncé du TP1) : `INTTYPE` =
`int`, `OPAR` = `(`, `CPAR` = `)`, `OBRACE` = `{`, `CBRACE` = `}`, `SCOL` = `;`, `COM` = `,`, `ASSIGN` = `=`, `IF` =
`if`, `ELSE` = `else`, `WHILE` = `while`, `RETURN` = `return`, `PRINTLN_INT` = `println_int`. Pour les expressions, on se
limite à des entiers, des variables, `+` et `<` (présents dans MiniC, cf. TP1 figure 1.3).

**Réponse.**

Ce que les règles imposent :

- `prog : function* EOF` : zéro, une ou plusieurs fonctions, puis la fin du fichier.
- `function : INTTYPE ID OPAR CPAR OBRACE vardecl_l block RETURN INT SCOL CBRACE` : donc exactement
  `int nom ( ) {` **déclarations** **instructions** `return` *entier* `; }`.
- `vardecl_l : vardecl*` et `vardecl : typee id_l SCOL` : des déclarations `int a, b, c;` (liste d'identificateurs
  séparés par des virgules, **sans** initialisation), **toutes avant** les instructions.
- `block : stat*` ; une instruction est une affectation suivie de `;`, un `if`, un `while` ou un `println_int(…);`.
- `stat_block` : un bloc entre accolades, **ou** une seule instruction (sans accolades).

Un programme valide (il calcule et affiche 1 + 2 + 3 + 4 + 5) :

```c
int main() {
  int x, n;
  int s;
  n = 5;
  x = 1;
  s = 0;
  while (x < n + 1) {
    s = s + x;
    x = x + 1;
  }
  if (s < 100) println_int(s);
  else {
    println_int(0);
  }
  return 0;
}
```

Vérification : esquisse de l'arbre de dérivation (le nom entre parenthèses est l'étiquette `#…` de l'alternative
utilisée) :

```text
prog                                         (#progRule : function* EOF, ici une seule function)
├─ function                                  (#funcDef)
│  ├─ INTTYPE 'int'  ID 'main'  OPAR '('  CPAR ')'  OBRACE '{'
│  ├─ vardecl_l                              (#varDeclList : vardecl*, ici deux vardecl)
│  │  ├─ vardecl = typee 'int'  id_l  SCOL ';'                 (#varDecl)
│  │  │            id_l = ID 'x'  COM ','  id_l                (#idList)
│  │  │                                    id_l = ID 'n'       (#idListBase)
│  │  └─ vardecl = typee 'int'  id_l = ID 's'  SCOL ';'        (#varDecl, #idListBase)
│  ├─ block                                  (#statList : stat*, ici cinq stat)
│  │  ├─ stat → assignment SCOL      n = 5 ;                   (#assignStat)
│  │  ├─ stat → assignment SCOL      x = 1 ;
│  │  ├─ stat → assignment SCOL      s = 0 ;
│  │  ├─ stat → while_stat           while ( x < n + 1 ) stat_block          (#whileStat)
│  │  │          body = stat_block → OBRACE block CBRACE
│  │  │                 block → stat stat :   s = s + x ;   x = x + 1 ;
│  │  └─ stat → if_stat              if ( s < 100 ) stat_block else stat_block   (#ifStat)
│  │             then_block = stat_block → stat → print_stat :  println_int ( s ) ;   (#printlnintStat)
│  │             else_block = stat_block → OBRACE block CBRACE
│  │                                       block → stat → print_stat :  println_int ( 0 ) ;
│  ├─ RETURN 'return'  INT '0'  SCOL ';'
│  └─ CBRACE '}'
└─ EOF
```

Deux sous-arbres détaillés, la déclaration `int x, n;` (récursivité de `id_l`) et la boucle `while` (les sous-arbres
`expr` ne sont pas détaillés, leur grammaire est coupée dans le sujet) :

```text
       vardecl
  ┌───────┼────────┐
typee   id_l       ;
  │    ┌──┼────┐
 int   x  ,  id_l
               │
               n

          stat
            │
       while_stat
  ┌────┬────┼────┬──────────────────────┐
while  (  expr   )                 stat_block
            │       ┌───────────────────┼────────────────┐
         x<n+1      {                 block              }
                                ┌───────┴────────┐
                              stat             stat
                            ┌───┴────┐       ┌───┴────┐
                       assignment    ;  assignment    ;
                         ┌──┼────┐        ┌──┼────┐
                         s  =  expr       x  =  expr
                                 │                │
                                s+x              x+1
```

Côté lexer, la ligne `x = x + 1;` devient `[ID("x"), ASSIGN, ID("x"), PLUS, INT(1), SCOL]` (notation de CM2 p. 6).

Ce programme a été accepté par ANTLR avec les règles du sujet complétées par les tokens ci-dessus et une
sous-grammaire `expr` minimale (`+`, `<`, ID, INT, parenthèses). (Hors question : à l'exécution il affiche `15`.)

Autres programmes valides (question ouverte, il y en a une infinité) :

- le plus petit avec une fonction : `int main() { return 0; }` (`vardecl_l` et `block` sont vides) ;
- le **fichier vide** est lui aussi un programme valide pour cette grammaire, puisque `prog : function* EOF` autorise
  zéro fonction (vérifié avec ANTLR : arbre `(prog <EOF>)`).

**Piège.** Erreurs classiques, toutes rejetées par la grammaire (vérifié) :

- `int x = 0;` : pas d'initialisation dans une déclaration (`vardecl : typee id_l SCOL`) ;
- une déclaration **après** une instruction (`x = 1; int y;`) : toutes les déclarations viennent avant `block` ;
- `return x;` : après `RETURN`, la grammaire exige un token `INT`, un **entier littéral** ;
- oublier `return 0;` à la fin, ou le `;` après `println_int(…)` (il fait partie de `print_stat`) ;
- à l'inverse, mettre un `;` après l'accolade fermante d'un `while` ou d'un `if` n'est pas prévu (`;` n'est pas une
  instruction en MiniC).

Et dans l'autre sens : `int main() { x = 1; return 0; }` (x non déclaré) est **accepté par la grammaire**. Il sera
rejeté plus tard, par l'analyse sémantique (le typeur). « *Syntax ≠ semantics* » (CM2 p. 3) : valide pour la grammaire
ne veut pas dire correct.

---

## Ce qu'il faut retenir

1. **Phase ↔ type d'erreur.** Lexicale : un morceau de texte ne forme aucun token (chaîne non fermée). Syntaxique : les
   tokens existent mais leur suite n'est pas dans la grammaire (`int x?;`). Sémantique : portée (non déclaré) et types
   (argument du mauvais type, mauvais nombre d'arguments, `double` → `int`, modification d'un `final`). Exécution : ce
   qui n'est pas vérifié statiquement (indice hors bornes).
2. **L'information des types se propage** de la déclaration vers les utilisations ; le compilateur s'en sert pour
   **avertir** (`unsigned < 0` toujours faux) et **optimiser** (code mort supprimé), sans rejeter un programme légal.
3. **Une représentation intermédiaire** comme GIMPLE : code 3 adresses, temporaires inventés par le compilateur,
   structures de contrôle remplacées par des étiquettes et des `goto`, sucre syntaxique supprimé ; priorités et
   associativité déjà résolues par le front-end.
4. **Trois opérations de base des regex** : union, concaténation, étoile. `r+ = r r*`, `r? = (r | ε)`,
   `[abc] = (a | b | c)`, `~[…]` = union explicite de tous les autres caractères (alphabet fini).
5. **Lexer ANTLR** : plus long préfixe, puis première règle du fichier. Donc **mots-clés avant `ID`** ; `'.'` entre
   apostrophes (sinon « n'importe quel caractère ») ; le signe d'un nombre est plutôt un opérateur du parser.
6. **Un lexer peut calculer** grâce aux actions `{…}` et aux variables de `@members` : nombre en base b lu de gauche à
   droite → Horner, v ← b × v + chiffre.
7. **Parenthèses bien formées** : `P → ( P ) P | [ P ] P | ε`, non ambiguë ; jeter les autres caractères avec
   `-> skip`.
8. **Grammaire stratifiée** E / T / F : un non-terminal par niveau de priorité, récursivité à gauche = associativité à
   gauche ; chaque mot a un seul arbre. Construire l'arbre de haut en bas en coupant au **dernier** opérateur le moins
   prioritaire hors parenthèses.
9. **Arbre de dérivation ≠ AST** : le premier contient tous les non-terminaux, les chaînes E → T → F, les parenthèses
   et le `;` ; l'AST ne garde que les opérateurs et les opérandes, les parenthèses étant encodées par la forme de
   l'arbre.
10. **Programme MiniC** : `int main() { <déclarations sans initialisation> <instructions> return <entier>; }`, toutes
    les déclarations avant les instructions. Valide pour la grammaire ne veut pas dire bien typé.
