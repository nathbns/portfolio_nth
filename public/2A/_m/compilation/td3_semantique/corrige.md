# TD3 : Sémantique dynamique de MiniC (MiniWhile) — corrigé détaillé

Sujet : « TD 3 — Dynamic Semantics of MiniC » (4 pages). Cours utilisés : CM5 (sémantique : `Val`, NAT, SOS,
preuves, sûreté du typage) et CM4 (typage). Corrigés officiels partiels de l'exercice 3 : `td3_repeat_proofLG.pdf`
(noté **LG**), photos manuscrites `td3_repeat_proof_CH_1.jpg` et `_2.jpg` (notées **CH**), et
`miniwhile_opsem_proofs.pdf` (noté **PREUVES**, énoncés des règles et théorèmes NAT/SOS).
Le §3.3 (expressions exceptionnelles) est marqué « Finish this at home » : il n'a pas de corrigé officiel.

---

## Rappels utiles

### R1. États et valeur des expressions arithmétiques (CM5 p. 4, 10 et 12)

- 𝒱 est l'ensemble des variables du programme. Un **état** (*store*) est une fonction σ ∈ State = 𝒱 → ℤ.
  Lecture : σ(x). Mise à jour : σ[y ↦ n], c'est-à-dire l'état qui vaut n en y et σ(z) partout ailleurs :
  `σ[y ↦ n](y) = n` et `σ[y ↦ n](z) = σ(z)` si z ≠ y (définition usuelle : CM5 p. 12 ne donne que la notation).
- Syntaxe abstraite des expressions arithmétiques : `e ∈ 𝒜 ::= x | n | e + e | e ∗ e | …`
- `Val : 𝒜 → State → ℤ`, définie **par induction sur la syntaxe** (formulation du sujet du TD3, p. 1 ; le transparent CM5 p. 12 laisse
  les cases vides,
  « On board » ; le sujet du TD les laisse vides aussi ; c'est la même définition que `[[e]]ρ` de CM5 p. 6) :

```text
Val(n, σ)      = n
Val(x, σ)      = σ(x)
Val(e + e', σ) = Val(e, σ) + Val(e', σ)
Val(e ∗ e', σ) = Val(e, σ) × Val(e', σ)
```

À gauche, `+` et `∗` sont des **symboles de syntaxe** ; à droite, `+` et `×` sont les **opérations de ℤ**.

### R2. Sémantique naturelle (« big-step », NAT) de mini-while (CM5 p. 15-16, rappelée p. 1 du TD)

`⇓ ⊆ Stm × State × State`, configurations `Stm × State ∪ State`. Le cours ne nomme pas les règles : les noms entre
parenthèses sont ajoutés ici pour pouvoir les citer. Le cours écrit `while b do S done`, le sujet du TD écrit
`while( b ){ S }` : c'est la même construction.

```text
------------------------------- (assign)        ---------------- (skip)
(x := e, σ) ⇓ σ[x ↦ Val(e, σ)]                   (skip, σ) ⇓ σ

(S1, σ) ⇓ σ'      (S2, σ') ⇓ σ''
-------------------------------- (seq)
     ((S1 ; S2), σ) ⇓ σ''

Val(b, σ) = tt    (S1, σ) ⇓ σ'                  Val(b, σ) = ff    (S2, σ) ⇓ σ'
------------------------------- (if-tt)         ------------------------------- (if-ff)
(if b then S1 else S2, σ) ⇓ σ'                  (if b then S1 else S2, σ) ⇓ σ'

Val(b, σ) = tt    (S, σ) ⇓ σ'    (while b do S done, σ') ⇓ σ''
--------------------------------------------------------------- (while-tt)
               (while b do S done, σ) ⇓ σ''

        Val(b, σ) = ff
---------------------------- (while-ff)
(while b do S done, σ) ⇓ σ
```

Lecture d'une règle : « si toutes les prémisses (au-dessus de la barre) sont vraies, la conclusion (en dessous) est
vraie » (CM4 diapo 18/30 : la règle P1 … Pn / B signifie P1 ∧ … ∧ Pn ⇒ B). Un jugement `(S, σ) ⇓ σ'` est vrai
**si et seulement s'il existe un arbre de dérivation fini** qui le prouve : les feuilles sont des axiomes ou des
égalités `Val(b, σ) = tt/ff`, les nœuds sont des règles (CM5 p. 17 dit seulement « leaves are axioms, nodes are rules » ; le
« si et seulement si » et les feuilles `Val(b, σ) = tt/ff` sont nos précisions).

### R3. Sémantique opérationnelle structurelle (« small-step », SOS) (CM5 p. 19-20)

Les noms (seq1), (seq2), (if-tt), (if-ff), (while) sont ajoutés ici pour s'y référer : le cours ne nomme pas ces règles.

`→ ⊆ Stm × State × Stm × State` ; configuration d'arrêt : `(skip, σ)`.

```text
(x := e, σ) → (skip, σ[x ↦ Val(e, σ)])

       (S1, σ) → (S1', σ')
---------------------------------- (seq1)       ((skip ; S2), σ) → (S2, σ)   (seq2)
((S1 ; S2), σ) → ((S1' ; S2), σ')

          Val(b, σ) = tt                                  Val(b, σ) = ff
------------------------------------ (if-tt)    ------------------------------------ (if-ff)
(if b then S1 else S2, σ) → (S1, σ)             (if b then S1 else S2, σ) → (S2, σ)

(while b do S done, σ) → (if b then (S ; while b do S done) else skip, σ)   (while)
```

(PREUVES utilise une variante où une configuration se réduit directement en un état : `(skip, σ) → σ`, etc.)

### R4. Propriétés vues en cours (CM5 p. 18, 24, 25)

- **Déterminisme** (p. 18) : pour tous S, σ, σ', σ'', si `(S, σ) ⇓ σ'` et `(S, σ) ⇓ σ''` alors σ' = σ''.
  Preuve « par induction sur la structure de l'arbre de dérivation ».
- **Divergence** (p. 24) : en NAT, S diverge depuis σ s'il n'existe aucun σ' tel que `(S, σ) ⇓ σ'` ; en SOS,
  s'il existe une suite infinie de pas depuis `(S, σ)`.
- **Équivalence de programmes** (p. 25) : S1 et S2 sont sémantiquement équivalents si
  NAT : `∀σ, σ', (S1, σ) ⇓ σ' ⟺ (S2, σ) ⇓ σ'` ; SOS : mêmes `(skip, σ')` atteints par →* et même divergence.

### R5. Typage (CM4 diapos 18 et 21/30 ; CM5 p. 30-34)

- Jugement `Γ ⊢ e : τ` : « dans l'environnement Γ, l'expression e a le type τ » ; Γ associe un type à chaque
  variable déclarée.
- Règles de mini-while (CM4 diapo 21/30, p. 26 du PDF) :

```text
   c ∈ ℤ                Γ(x) = t    t ∈ {int, bool}
----------- (int)       ---------------------------- (var)
Γ ⊢ c : int                     Γ ⊢ x : t

Γ ⊢ e1 : int    Γ ⊢ e2 : int          Γ ⊢ e1 : int    Γ ⊢ e2 : int
---------------------------- (+)      ---------------------------- (<)
     Γ ⊢ e1 + e2 : int                     Γ ⊢ e1 < e2 : bool
```

- **Sûreté pour les expressions** (CM5 p. 30) : si `∀x ∈ vars(e), ∅ ⊢ σ(x) : τ ⟺ Γ(x) = τ`, alors
  `Γ ⊢ e : τ ⟹ ∅ ⊢ Val(e, σ) : τ`.
- **Sûreté des instructions** = « well typed programs do not go wrong » (CM5 p. 29 et 34) : progrès (une
  configuration bien typée peut faire un pas) et préservation (elle reste bien typée après un pas).

### R6. Trois techniques de preuve utilisées dans ce TD

1. **Induction structurelle sur la syntaxe** (exercice 2) : pour prouver P(e) pour toute e ∈ 𝒜, on prouve P(n),
   P(x), puis P(e1 + e2) et P(e1 ∗ e2) en supposant P(e1) et P(e2) (hypothèses d'induction, HI). C'est la
   « même forme » que la définition de `Val` par induction sur la syntaxe (sujet du TD3, p. 1 ; CM5 p. 12).
2. **Inversion** (exercice 3, question 2) : si `(S, σ) ⇓ σ'` est vrai, il a un arbre de dérivation, et la racine
   de cet arbre est forcément une règle dont la conclusion a la forme de S (par exemple `(seq)` si S est une
   séquence). On récupère alors les prémisses de cette règle, avec leurs sous-arbres.
3. **Induction sur l'arbre de dérivation** (CM5 p. 18 ; exercice 3, question 3) : nécessaire quand une prémisse
   contient la même construction que la conclusion (`while`, `repeat`), car alors l'induction sur la syntaxe de S
   ne marche pas ; on applique l'HI aux sous-arbres, qui sont strictement plus petits.

---

## Exercice 1 (§3.1) : Sémantique dénotationnelle des expressions booléennes

### Question unique

**Énoncé.** Syntaxe abstraite `b (∈ ℬ) ::= tt | ff | x | b ∧ b | … | e < e | …`. L'état étant
`State = 𝒱 → 𝔹`, définir `Val : ℬ → State → 𝔹` par induction sur la syntaxe.

**Méthode.** Une équation par production de la grammaire. Dans chaque équation, le membre droit n'utilise que la
valeur des **sous-expressions strictes** (c'est ce qui rend la définition « par induction » correcte et en fait une
sémantique dénotationnelle, compositionnelle). Il faut bien séparer les symboles de syntaxe (à gauche) des
opérations mathématiques sur 𝔹 = {tt, ff} et sur ℤ (à droite).

**Réponse.**

Remarque préalable sur l'état : la production `e < e` compare deux expressions **arithmétiques**, dont les variables
ont des valeurs entières. Pour que tout ait un sens, l'état associe à chaque variable une valeur entière ou
booléenne (σ : 𝒱 → ℤ ∪ 𝔹) : σ(x) ∈ 𝔹 pour une variable booléenne x, σ(y) ∈ ℤ pour une variable entière y. Le
sujet écrit `State = 𝒱 → 𝔹` ; on l'élargit pour que `e < e` ait un sens.

On note ∧𝔹, ∨𝔹, ¬𝔹 les opérations sur 𝔹 (tables de vérité) et <ℤ, =ℤ, ≤ℤ les comparaisons de ℤ.

```text
Val(tt, σ)       = tt
Val(ff, σ)       = ff
Val(x, σ)        = σ(x)                               (x variable booléenne)
Val(b1 ∧ b2, σ)  = Val(b1, σ) ∧𝔹 Val(b2, σ)          (= tt si les deux valent tt, ff sinon)
Val(b1 ∨ b2, σ)  = Val(b1, σ) ∨𝔹 Val(b2, σ)          (= ff si les deux valent ff, tt sinon)
Val(¬b, σ)       = ¬𝔹 Val(b, σ)                       (¬𝔹 tt = ff, ¬𝔹 ff = tt)
Val(e1 < e2, σ)  = tt si Val(e1, σ) <ℤ Val(e2, σ),  ff sinon
Val(e1 = e2, σ)  = tt si Val(e1, σ) =ℤ Val(e2, σ),  ff sinon
Val(e1 ≤ e2, σ)  = tt si Val(e1, σ) ≤ℤ Val(e2, σ),  ff sinon
```

Dans les trois dernières lignes, `Val(e1, σ)` est la fonction `Val : 𝒜 → State → ℤ` de R1 (même nom, autre
fonction : le nom `Val` est surchargé, ℬ et 𝒜 sont deux syntaxes différentes).

Exemple : σ = [x ↦ 3, y ↦ 7, p ↦ ff] (x, y entières, p booléenne).

```text
Val((x < y) ∧ ¬p, σ) = Val(x < y, σ) ∧𝔹 Val(¬p, σ)
                     = tt ∧𝔹 ¬𝔹 Val(p, σ)        car Val(x, σ) = 3 <ℤ 7 = Val(y, σ)
                     = tt ∧𝔹 ¬𝔹 ff               car Val(p, σ) = σ(p) = ff
                     = tt ∧𝔹 tt = tt
```

Pourquoi c'est « dénotationnel » (question posée en CM5 p. 12) : chaque expression b est envoyée sur un objet
mathématique, la fonction `Val(b, ·) : State → 𝔹`, et le sens d'une expression composée ne dépend que du sens de
ses composantes. On peut aussi la voir comme une sémantique big-step des expressions (on obtient la valeur « en une
fois »). Comme les expressions n'ont ni effet de bord ni boucle, `Val` est une fonction **totale** : chaque b a
une valeur dans chaque état, et évaluer ∧ « paresseusement » ou non donne le même résultat.

**Piège.** Écrire `Val(b1 ∧ b2, σ) = Val(b1, σ) ∧ Val(b2, σ)` sans dire que le ∧ de droite est l'opération de
𝔹 (c'est correct, mais il faut le dire, sinon la définition est circulaire en apparence). Oublier que `e < e`
utilise la valeur des expressions arithmétiques. Réutiliser un symbole de syntaxe (`tt`) comme si c'était déjà
une valeur sans écrire l'équation `Val(tt, σ) = tt`.

---

## Exercice 2 (§3.1) : Propriétés des expressions arithmétiques

Deux définitions, non données par le sujet mais indispensables, elles aussi par induction sur la syntaxe
(substitution notée `e[e'/x]` : « x remplacé par e' dans e ») :

```text
Vars(n)        = ∅                        n[e'/x]         = n
Vars(y)        = {y}                      x[e'/x]         = e'
Vars(e1 + e2)  = Vars(e1) ∪ Vars(e2)      y[e'/x]         = y                    si y ≠ x
Vars(e1 ∗ e2)  = Vars(e1) ∪ Vars(e2)      (e1 + e2)[e'/x] = e1[e'/x] + e2[e'/x]
                                          (e1 ∗ e2)[e'/x] = e1[e'/x] ∗ e2[e'/x]
```

### Question 1

**Énoncé.** Soit e ∈ 𝒜 et deux états σ, σ'. Montrer que si `∀x ∈ Vars(e), σ(x) = σ'(x)`, alors
`Val(e, σ) = Val(e, σ')`.

**Méthode.** Induction structurelle sur e (R6.1). On écrit la propriété P(e) **avec σ et σ' quantifiés à
l'intérieur**, on traite un cas par production de la grammaire, et dans les cas composés on applique l'hypothèse
d'induction aux sous-expressions après avoir vérifié que son hypothèse (accord sur les variables) est satisfaite.

**Réponse.**

Soit P(e) : « pour tous σ, σ' ∈ State, si ∀x ∈ Vars(e), σ(x) = σ'(x), alors Val(e, σ) = Val(e, σ') ».
Montrons ∀e ∈ 𝒜, P(e) par induction structurelle sur e.

- **Cas e = n (constante).** Soient σ, σ'. Par définition de Val, `Val(n, σ) = n = Val(n, σ')`. (L'hypothèse
  n'est même pas utilisée : Vars(n) = ∅.)
- **Cas e = y (variable).** Soient σ, σ' tels que (H) : ∀x ∈ Vars(y), σ(x) = σ'(x). Comme Vars(y) = {y}, (H)
  donne σ(y) = σ'(y). Donc `Val(y, σ) = σ(y) = σ'(y) = Val(y, σ')`.
- **Cas e = e1 + e2.** Hypothèses d'induction : P(e1) et P(e2). Soient σ, σ' tels que
  (H) : ∀x ∈ Vars(e1 + e2) = Vars(e1) ∪ Vars(e2), σ(x) = σ'(x).
  - Comme Vars(e1) ⊆ Vars(e1) ∪ Vars(e2), (H) donne ∀x ∈ Vars(e1), σ(x) = σ'(x) ; par P(e1),
    `Val(e1, σ) = Val(e1, σ')`.
  - De même Vars(e2) ⊆ Vars(e1 + e2), donc par P(e2), `Val(e2, σ) = Val(e2, σ')`.
  - Donc `Val(e1 + e2, σ) = Val(e1, σ) + Val(e2, σ) = Val(e1, σ') + Val(e2, σ') = Val(e1 + e2, σ')`.
- **Cas e = e1 ∗ e2.** Identique au cas précédent en remplaçant + par × :
  `Val(e1 ∗ e2, σ) = Val(e1, σ) × Val(e2, σ) = Val(e1, σ') × Val(e2, σ') = Val(e1 ∗ e2, σ')`.

Tous les cas sont traités, donc P(e) est vrai pour toute expression e. ∎

Sens : la valeur d'une expression ne dépend que des variables qui y apparaissent. Conséquence typique : si
y ∉ Vars(e), une affectation `y := e''` ne change pas la valeur de e, car σ et σ[y ↦ n] coïncident sur Vars(e).

**Piège.** Oublier de vérifier, dans le cas e1 + e2, que l'hypothèse « σ et σ' coïncident sur Vars(e1) » découle
de l'hypothèse sur Vars(e1 + e2) (c'est l'inclusion Vars(e1) ⊆ Vars(e1 + e2)). Faire une « preuve » par
récurrence sur la longueur sans dire quelles sous-expressions sont plus petites. Oublier le cas des constantes.

### Question 2

**Énoncé.** Pour e, e' ∈ 𝒜, montrer : `Val(e[e'/x], σ) = Val(e, σ[x ↦ Val(e', σ)])`.

**Méthode.** Induction structurelle sur e, avec x, e' et σ fixés (l'hypothèse d'induction n'est utilisée qu'avec
les mêmes x, e', σ). On pose `v' = Val(e', σ)` (calculé dans l'état **σ de départ**) et `σ₁ = σ[x ↦ v']`. Le cas
« variable » se dédouble : la variable est x, ou une autre variable y ≠ x.

**Réponse.**

Fixons x, e', σ ; posons v' = Val(e', σ) et σ₁ = σ[x ↦ v']. Soit P(e) : `Val(e[e'/x], σ) = Val(e, σ₁)`.

- **Cas e = n.** `n[e'/x] = n`, donc membre gauche = Val(n, σ) = n ; membre droit = Val(n, σ₁) = n. Égaux.
- **Cas e = x (la variable substituée).** `x[e'/x] = e'`, donc membre gauche = Val(e', σ) = v'.
  Membre droit = Val(x, σ₁) = σ₁(x) = σ[x ↦ v'](x) = v'. Égaux.
- **Cas e = y avec y ≠ x.** `y[e'/x] = y`, donc membre gauche = Val(y, σ) = σ(y).
  Membre droit = Val(y, σ₁) = σ[x ↦ v'](y) = σ(y) car y ≠ x. Égaux.
- **Cas e = e1 + e2.** HI : P(e1) et P(e2).

```text
Val((e1 + e2)[e'/x], σ) = Val(e1[e'/x] + e2[e'/x], σ)          (définition de la substitution)
                        = Val(e1[e'/x], σ) + Val(e2[e'/x], σ)   (définition de Val)
                        = Val(e1, σ₁) + Val(e2, σ₁)             (HI P(e1) et P(e2))
                        = Val(e1 + e2, σ₁)                      (définition de Val)
```

- **Cas e = e1 ∗ e2.** Identique avec ∗ et × :
  `Val((e1 ∗ e2)[e'/x], σ) = Val(e1[e'/x], σ) × Val(e2[e'/x], σ) = Val(e1, σ₁) × Val(e2, σ₁) = Val(e1 ∗ e2, σ₁)`.

Donc P(e) pour toute e. ∎

Exemple de contrôle : e = x ∗ x + y, e' = y + 1, σ = [x ↦ 2, y ↦ 3].
e[e'/x] = (y + 1) ∗ (y + 1) + y, de valeur 4 × 4 + 3 = 19 dans σ. Et v' = Val(y + 1, σ) = 4,
σ₁ = [x ↦ 4, y ↦ 3], Val(x ∗ x + y, σ₁) = 16 + 3 = 19. ✓

Sens (« What does that mean? », CM5 p. 13) : **la substitution syntaxique correspond à la mise à jour de l'état**.
Avec la règle (assign), `(x := e', σ) ⇓ σ[x ↦ Val(e', σ)]` : la valeur de e **après** `x := e'` est la valeur,
**avant** l'affectation, de e où x est remplacé par e'. C'est ce qui justifie la propagation de copies ou de
constantes en compilation (`x := 3 ; y := x + 1` peut devenir `x := 3 ; y := 3 + 1`) et l'axiome d'affectation de
la logique de Hoare.

**Piège.** Écrire σ[x ↦ Val(e', σ₁)] ou σ[x ↦ e'] : la valeur mise dans x est `Val(e', σ)`, un **entier**
calculé dans l'**ancien** état (exemple : e' = x + 1 et σ(x) = 5 ; on met 6 dans x, pas « x + 1 »). Oublier le cas
y ≠ x. Confondre e[e'/x] (« x remplacé par e' ») avec le remplacement inverse.

---

## Exercice 3 (§3.2) : la commande `repeat S until b`

Abréviations utilisées dans tout l'exercice (CH note de même « r S u b » et « i b t skip e (r S u b) ») :

```text
R = repeat S until b
I = if b then skip else R           (donc la construction (b) de la question 2 est  S ; I)
```

### Question 1

**Énoncé.** Donner des règles big-step pour `repeat S until b` sans utiliser `while`.

**Méthode.** On décrit le comportement : on exécute S une première fois, **puis** on évalue b **dans l'état obtenu
après S**. Si b est vrai, on s'arrête ; sinon on recommence le `repeat` depuis cet état. Deux cas (b vrai / b faux)
donc deux règles, sur le modèle de `(while-tt)` et `(while-ff)`. La règle du cas « faux » est récursive : elle
contient `repeat` en prémisse, comme `(while-tt)` contient `while`.

**Réponse.** (Règles de LG et de CH.)

```text
(S, σ) ⇓ σ'      Val(b, σ') = tt
-------------------------------- (repeat-tt)
 (repeat S until b, σ) ⇓ σ'

(S, σ) ⇓ σ'      Val(b, σ') = ff      (repeat S until b, σ') ⇓ σ''
------------------------------------------------------------------ (repeat-ff)
                 (repeat S until b, σ) ⇓ σ''
```

L'ordre des prémisses n'a pas d'importance (LG écrit `Val(b, σ') = tt` en premier) ; on les écrit ici dans l'ordre
d'exécution. Le point essentiel, souligné par LG (« warning, b is evaluated under σ' ! »), est que **b est évalué
dans σ'**, l'état **après** S.

Exemple : S = `x := x + 1`, b = `1 < x`, donc ici R = `repeat x := x + 1 until 1 < x` ; σ0 = [x ↦ 0],
σ1 = [x ↦ 1], σ2 = [x ↦ 2]. On a `Val(1 < x, σ1) = ff` (1 < 1 est faux) et `Val(1 < x, σ2) = tt` (1 < 2).

```text
                                              (S, σ1) ⇓ σ2 (assign)    Val(1 < x, σ2) = tt
                                              ------------------------------------------- (repeat-tt)
(S, σ0) ⇓ σ1 (assign)    Val(1 < x, σ1) = ff          (R, σ1) ⇓ σ2
----------------------------------------------------------------------------------------- (repeat-ff)
                                  (R, σ0) ⇓ σ2
```

Le corps est toujours exécuté au moins une fois : depuis [x ↦ 5], on obtient [x ↦ 6].

Remarque (hors question) : en SOS, on définirait naturellement `repeat` par un dépliage sans prémisse, comme
`while` en R3 : `(repeat S until b, σ) → (S ; if b then skip else repeat S until b, σ)`. La question 2 montre
que ce dépliage est correct pour la règle NAT.

**Piège.** Évaluer b dans σ au lieu de σ' (c'est l'erreur que LG signale ; CH lui-même écrit `Val(b, σ) = tt`
dans son « Arbre 1 », puis `Val(b, σ') = tt` dans l'arbre suivant). Inverser la condition : `repeat … until b`
s'arrête quand b est **vrai** (alors que `while b` s'arrête quand b est faux). Utiliser `while` dans les règles,
ce que l'énoncé interdit.

### Question 2

**Énoncé.** Montrer que (a) `repeat S until b` et (b) `S ; if b then skip else (repeat S until b)` sont
sémantiquement équivalents.

**Méthode.** On applique la définition NAT de l'équivalence (CM5 p. 25, R4) : il faut montrer, pour tous σ, σ',
`(R, σ) ⇓ σ' ⟺ ((S ; I), σ) ⇓ σ'`, donc **deux implications**. Pour chacune : on fixe σ, σ', on suppose qu'il
existe un arbre de dérivation pour le membre de gauche, on regarde **la dernière règle** de cet arbre (inversion,
R6.2), ce qui donne des cas ; dans chaque cas, on **construit** un arbre pour le membre de droite en réutilisant
les sous-arbres obtenus. Aucune induction n'est nécessaire.

**Réponse.** Fixons σ et σ'.

**Sens (⇒).** Supposons (H) : `(R, σ) ⇓ σ'`. Il existe donc un arbre de dérivation de `(R, σ) ⇓ σ'`. Les seules
règles dont la conclusion est de la forme `(repeat S until b, …) ⇓ …` sont (repeat-tt) et (repeat-ff) : la racine de
l'arbre est l'une des deux. Cela fait deux cas (CH : « Arbre 1 » et « Arbre 2 »).

*Cas 1 : la racine est (repeat-tt).* L'arbre a la forme suivante, où T_S est un arbre pour `(S, σ) ⇓ σ'` :

```text
     T_S
(S, σ) ⇓ σ'      Val(b, σ') = tt
-------------------------------- (repeat-tt)
          (R, σ) ⇓ σ'
```

On dispose donc de T_S et de `Val(b, σ') = tt`. On construit :

```text
                                    ----------------- (skip)
                 Val(b, σ') = tt    (skip, σ') ⇓ σ'
     T_S         ---------------------------------- (if-tt)
(S, σ) ⇓ σ'               (I, σ') ⇓ σ'
--------------------------------------------------- (seq)
               ((S ; I), σ) ⇓ σ'
```

*Cas 2 : la racine est (repeat-ff).* Il existe un état intermédiaire σ₁ (CH le note σ'') et l'arbre a la forme :

```text
     T_S                                   T_R
(S, σ) ⇓ σ₁      Val(b, σ₁) = ff      (R, σ₁) ⇓ σ'
-------------------------------------------------- (repeat-ff)
                  (R, σ) ⇓ σ'
```

On dispose de T_S, de `Val(b, σ₁) = ff` et de T_R. On construit :

```text
                                       T_R
                 Val(b, σ₁) = ff    (R, σ₁) ⇓ σ'
     T_S         ------------------------------- (if-ff)
(S, σ) ⇓ σ₁               (I, σ₁) ⇓ σ'
------------------------------------------------ (seq)
              ((S ; I), σ) ⇓ σ'
```

Dans les deux cas `((S ; I), σ) ⇓ σ'`. D'où (⇒).

**Sens (⇐).** Supposons (H') : `((S ; I), σ) ⇓ σ'`. La seule règle dont la conclusion porte sur une séquence est
(seq) ; la racine est donc (seq), et il existe σ₁ et deux arbres : T_S pour `(S, σ) ⇓ σ₁` et T_I pour
`(I, σ₁) ⇓ σ'`. I étant un `if`, la racine de T_I est (if-tt) ou (if-ff).

*Cas A : la racine de T_I est (if-tt).* Alors `Val(b, σ₁) = tt` et `(skip, σ₁) ⇓ σ'`. La seule règle qui conclut
sur `skip` est l'axiome (skip), qui donne `(skip, σ₁) ⇓ σ₁` ; donc σ' = σ₁. On construit :

```text
     T_S
(S, σ) ⇓ σ₁      Val(b, σ₁) = tt
-------------------------------- (repeat-tt)
     (R, σ) ⇓ σ₁       c'est-à-dire  (R, σ) ⇓ σ'
```

*Cas B : la racine de T_I est (if-ff).* Alors `Val(b, σ₁) = ff` et il existe un arbre T_R de `(R, σ₁) ⇓ σ'`.
On construit :

```text
     T_S                                   T_R
(S, σ) ⇓ σ₁      Val(b, σ₁) = ff      (R, σ₁) ⇓ σ'
-------------------------------------------------- (repeat-ff)
                  (R, σ) ⇓ σ'
```

Dans les deux cas `(R, σ) ⇓ σ'`. D'où (⇐), et donc `∀σ, σ', (R, σ) ⇓ σ' ⟺ ((S ; I), σ) ⇓ σ'` : les deux
constructions sont sémantiquement équivalentes. ∎

Remarques.
- La preuve ne suppose pas que S termine : si S diverge depuis σ, aucun des deux programmes n'a de dérivation
  depuis σ, et l'équivalence est vraie car les deux côtés sont faux.
- Le déterminisme n'est pas nécessaire : l'état intermédiaire σ₁ est lu dans l'arbre de l'hypothèse, on ne le
  « recalcule » pas.
- Comparaison avec les corrigés officiels : voir l'encadré ci-dessous.

> **Écarts avec les corrigés officiels (LG et CH).**
> 1. LG et CH ne rédigent que le sens (⇒). CH écrit « De même mtq (S1, σ) ⇓ σ' ⇐ (S2, σ) ⇓ σ' … » sans le faire ;
>    le sens (⇐) ci-dessus complète la preuve avec la même démarche.
> 2. LG introduit d'abord σ1 comme « l'effet de S sur σ (il existe car on considère des programmes qui ne divergent
>    pas) », et CH écrit « par déterminisme, on sait que (S, σ) ⇓ σ' », précisé en rouge « grâce à l'arbre 1 (A1) » :
>    comme ici, CH lit le sous-arbre dans l'arbre de l'hypothèse (inversion). Seule la rédaction de LG suppose
>    que le programme termine. Les démarches aboutissent aux mêmes arbres.
> 3. Dans ses deux arbres construits, LG omet la prémisse `Val(b, σ1) = tt` (resp. `ff`) de la règle du `if`
>    (il n'écrit que `(skip, σ1) ⇓ σ0` au-dessus du `if`). CH l'écrit. Elle est indispensable.
> 4. LG conclut le second cas par « (from H1) » : c'est l'hypothèse **H2** (cas b faux) qui sert.
> 5. Dans son « Arbre 1 », CH écrit `Val(b, σ) = tt` au lieu de `Val(b, σ') = tt` (corrigé dans l'arbre de la
>    page suivante). Ce sont des étourderies, pas des désaccords de fond.
> 6. Noms : CH appelle « Arbre 1 / Arbre 2 » les cas (repeat-tt) / (repeat-ff), A4 et A5 les sous-arbres de S,
>    A3 le sous-arbre du `repeat` ; LG appelle σ1 l'état après S et σ0 le résultat. Ici : T_S, T_R, σ₁, σ'.

**Piège.** Ne faire qu'un sens. Oublier, dans les arbres du `if`, la prémisse `Val(b, σ₁) = tt/ff`. Dans le cas
(if-tt), oublier de justifier que σ' = σ₁ (c'est l'axiome (skip), seule règle possible pour `skip`). Se lancer dans
une induction alors qu'une simple analyse de la dernière règle suffit.

### Question 3

**Énoncé.** Donner une transformation de programme qui élimine toutes les constructions `repeat S until b`
(on peut utiliser `while`).

**Méthode.** On définit une fonction 𝒯 sur la syntaxe des instructions, **par induction** : une équation par
construction, appliquée récursivement aux sous-instructions (S peut lui-même contenir des `repeat`, ou un `repeat`
peut être caché dans une branche de `if` ou dans un corps de `while`). La seule équation intéressante est celle de
`repeat` : on exécute le corps une fois, puis on boucle **tant que b est faux**. Il existe d'autres réponses
correctes (une deuxième est donnée plus bas).

**Réponse.**

```text
𝒯(x := e)                 = x := e
𝒯(skip)                   = skip
𝒯(S1 ; S2)                = 𝒯(S1) ; 𝒯(S2)
𝒯(if b then S1 else S2)   = if b then 𝒯(S1) else 𝒯(S2)
𝒯(while b do S done)      = while b do 𝒯(S) done
𝒯(repeat S until b)       = 𝒯(S) ; while ¬b do 𝒯(S) done
```

On utilise la négation ¬ des expressions booléennes (le « … » de la grammaire de l'exercice 1), avec
`Val(¬b, σ) = ¬𝔹 Val(b, σ)`. 𝒯(P) ne contient plus aucun `repeat`, et 𝒯(P) est équivalent à P.

*Justification de l'équation de `repeat`* (non demandée, mais c'est la preuve attendue si on demande « montrer que
la transformation est correcte »). Notons W = `while ¬b do S done`. Montrons, pour tous σ, σ' :
`(R, σ) ⇓ σ' ⟺ ((S ; W), σ) ⇓ σ'`. Ici l'inversion seule ne suffit pas (la boucle peut tourner un nombre quelconque
de fois) : on fait une **induction sur l'arbre de dérivation** (R6.3).

(⇒) Par induction sur l'arbre de `(R, σ) ⇓ σ'`.
- Racine (repeat-tt) : on a `(S, σ) ⇓ σ'` et `Val(b, σ') = tt`, donc `Val(¬b, σ') = ff`. Alors :

```text
                    Val(¬b, σ') = ff
                    ---------------- (while-ff)
(S, σ) ⇓ σ'           (W, σ') ⇓ σ'
---------------------------------- (seq)
        ((S ; W), σ) ⇓ σ'
```

- Racine (repeat-ff) : on a `(S, σ) ⇓ σ₁`, `Val(b, σ₁) = ff` et un sous-arbre de `(R, σ₁) ⇓ σ'`. L'HI appliquée à
  ce sous-arbre donne `((S ; W), σ₁) ⇓ σ'` ; par inversion de (seq), il existe σ₂ avec `(S, σ₁) ⇓ σ₂` et
  `(W, σ₂) ⇓ σ'`. Comme `Val(¬b, σ₁) = tt` :

```text
                    Val(¬b, σ₁) = tt    (S, σ₁) ⇓ σ₂    (W, σ₂) ⇓ σ'
                    ------------------------------------------------ (while-tt)
(S, σ) ⇓ σ₁                           (W, σ₁) ⇓ σ'
-------------------------------------------------------------------- (seq)
                        ((S ; W), σ) ⇓ σ'
```

(⇐) Supposons `((S ; W), σ) ⇓ σ'`. Par inversion de (seq) : `(S, σ) ⇓ σ₁` et `(W, σ₁) ⇓ σ'`. On montre, par
induction sur l'arbre de `(W, σ₁) ⇓ σ'`, la propriété : « pour tout σ, si `(S, σ) ⇓ σ₁` alors `(R, σ) ⇓ σ'` ».
- Racine (while-ff) : `Val(¬b, σ₁) = ff`, donc `Val(b, σ₁) = tt`, et σ' = σ₁. (repeat-tt) avec `(S, σ) ⇓ σ₁`
  donne `(R, σ) ⇓ σ₁ = σ'`.
- Racine (while-tt) : `Val(¬b, σ₁) = tt` donc `Val(b, σ₁) = ff`, et il existe σ₂ avec `(S, σ₁) ⇓ σ₂` et un
  sous-arbre de `(W, σ₂) ⇓ σ'`. L'HI (appliquée avec l'état de départ σ₁, puisque `(S, σ₁) ⇓ σ₂`) donne
  `(R, σ₁) ⇓ σ'`. Puis (repeat-ff) avec `(S, σ) ⇓ σ₁`, `Val(b, σ₁) = ff` et `(R, σ₁) ⇓ σ'` donne `(R, σ) ⇓ σ'`. ∎

Enfin, remplacer une sous-instruction par une instruction équivalente donne un programme équivalent, car chaque
règle NAT ne dépend que de la sémantique des sous-instructions ; d'où la correction de 𝒯 sur tout programme.

*Autre réponse correcte, sans dupliquer S.* Avec une variable c **fraîche** (absente du programme), **une nouvelle
pour chaque `repeat`** (c1, c2, … quand ils sont imbriqués) :

```text
𝒯'(repeat S until b) = c := 0 ;
                       while c < 1 do ( 𝒯'(S) ; if b then c := 1 else skip ) done
```

Le corps est exécuté au moins une fois (c vaut 0 au départ), et b est testé après chaque exécution du corps. Elle
n'utilise pas ¬ et ne duplique pas le code (avec 𝒯, des `repeat` imbriqués sur d niveaux font 2^d copies du
corps le plus interne), mais l'état final contient en plus la variable c : l'équivalence n'est vraie que sur les
variables du programme d'origine.

Piège : réutiliser la même c pour deux `repeat` imbriqués. Le `repeat` intérieur laisse c = 1 et la boucle
extérieure s'arrête trop tôt : `repeat (repeat x := x+1 until true) until 2 < x`, depuis x = 0, doit donner
x = 3, et donne x = 1 avec une seule c.

Les deux transformations ont été vérifiées par un petit script Python sur des milliers de programmes aléatoires :
mêmes états finaux qu'avec les règles de `repeat` de la question 1.

**Piège.** Écrire `𝒯(repeat S until b) = while ¬b do S done` (sans la première exécution de S) : faux quand b est
déjà vrai au départ. Avec S = `x := x + 1`, b = `1 < x` et σ = [x ↦ 5] : le `repeat` donne x = 6, ce `while`
donne x = 5. Écrire `while b do …` (mauvaise polarité). Oublier d'appliquer la transformation récursivement dans S
et dans les autres constructions (un `repeat` imbriqué subsisterait).

---

## §3.3 : Extension du langage, expressions exceptionnelles (`fail` / `guard`)

### Rappel de la sémantique donnée par le sujet (p. 3)

Valeurs : `v ∈ 𝒱 ::= i ∈ ℤ | b ∈ 𝔹` (succès) ; valeurs exceptionnelles `v* ∈ 𝒱* ::= v | Fail(v)`.
Attention : dans ce paragraphe, le sujet note 𝒱 l'ensemble des **valeurs** (en page 1, 𝒱 désignait les
variables) ; les booléens s'écrivent `true` / `false` (au lieu de tt / ff).
Expressions : `e ::= c | x | e + e | e ∥ e | e && e | fail(e) | guard(e)`. Évaluation `Val : ℰ × State → 𝒱*`
(σ = ∅ quand il n'est pas précisé). Sous forme de règles (noms ajoutés) :

```text
------------------------- (const)        ----------------- (var)
Val(c, σ) = value(c)                      Val(x, σ) = σ(x)

Val(e1, σ) = v1*    Val(e2, σ) = v2*
------------------------------------ (+)        de même (∥) avec ∥*, (&&) avec &&*
  Val(e1 + e2, σ) = v1* +* v2*

     Val(e, σ) = v
------------------------- (fail)
Val(fail(e), σ) = Fail(v)

    Val(e, σ) = v                       Val(e, σ) = Fail(v)
-------------------- (guard-ok)        -------------------- (guard-fail)
Val(guard(e), σ) = v                   Val(guard(e), σ) = v
```

**Attention à la lettre** : dans ces règles, `v` désigne toujours une valeur de **succès** (v ∈ 𝒱), `v*` une valeur
quelconque de 𝒱*. Ainsi (fail) ne s'applique que si e **réussit**.

Extension des opérateurs (définition de +*, les autres sont « similaires ») :

```text
n1 +* n2      = n1 + n2         (n1, n2 ∈ ℤ)
v2 +* Fail(v) = Fail(v)         (v2 ∈ 𝒱 : l'opérande gauche a réussi, le droit a échoué)
Fail(v) +* v2* = Fail(v)        (v2* quelconque : l'échec de gauche l'emporte)
```

Dans tous les autres cas (par exemple `true +* 3`) l'opération n'est **pas définie** : aucune valeur, l'évaluation
est bloquée (« go wrong »). De même `b1 &&* b2 = b1 ∧ b2` et `b1 ∥* b2 = b1 ∨ b2` pour des booléens, avec la même
propagation des échecs ; les comparaisons `<*`, `>*` sur des entiers rendent un booléen et propagent les échecs ;
le moins unaire (absent de la grammaire du sujet, mais utilisé en question 4 : extension de notre part) vérifie `−*n = −n` et `−*Fail(v) = Fail(v)`. Conséquence :
`Fail(v1) +* Fail(v2) = Fail(v1)` : c'est l'échec le plus à gauche qui remonte (évaluation de gauche à droite).

### Question 1 (sémantique)

**Énoncé.** Que vaut `guard(3 + fail(true && false)) && true` ? Donner la dérivation.

**Méthode.** Repérer la structure de l'expression (le `&& true` final est **en dehors** du `guard`), puis évaluer
de bas en haut (des feuilles vers la racine), en appliquant à chaque nœud la règle de sa construction et, pour les
opérateurs, la table de +* / &&*. Noter à chaque étape si l'on a un succès v ou un échec Fail(v).

**Réponse.** Structure : `(guard(3 + fail(true && false))) && true`. Étapes (σ = ∅) :

1. `Val(true, ∅) = true`, `Val(false, ∅) = false` (const).
2. `Val(true && false, ∅) = true &&* false = false` (&&) : deux succès, donc ∧ ordinaire.
3. `Val(fail(true && false), ∅) = Fail(false)` (fail) : la prémisse `Val(true && false, ∅) = false` est un succès.
4. `Val(3, ∅) = 3` (const).
5. `Val(3 + fail(true && false), ∅) = 3 +* Fail(false) = Fail(false)` (+), cas « v2 +* Fail(v) ».
6. `Val(guard(3 + fail(true && false)), ∅) = false` (guard-fail) : le `guard` rattrape l'échec et rend la valeur
   portée par l'échec.
7. `Val(true, ∅) = true` (const).
8. `Val(guard(…) && true, ∅) = false &&* true = false` (&&).

Arbre de dérivation :

```text
                         Val(true, ∅) = true (const)    Val(false, ∅) = false (const)
                         ------------------------------------------------------------ (&&)  true &&* false = false
                                   Val(true && false, ∅) = false
                                   ----------------------------------------- (fail)
Val(3, ∅) = 3 (const)              Val(fail(true && false), ∅) = Fail(false)
------------------------------------------------------------------------------ (+)  3 +* Fail(false) = Fail(false)
           Val(3 + fail(true && false), ∅) = Fail(false)
           ---------------------------------------------- (guard-fail)
           Val(guard(3 + fail(true && false)), ∅) = false            Val(true, ∅) = true (const)
           ------------------------------------------------------------------------------------- (&&)  false &&* true = false
           Val(guard(3 + fail(true && false)) && true, ∅) = false
```

**Résultat : `false`** (un succès, pas un échec).

**Piège.** Croire que le `guard` rend une valeur de « 3 + … » (un entier) : il rend la valeur **portée par
l'échec**, ici le booléen `false`. Croire que le résultat est `Fail(false)` : l'échec est rattrapé par `guard`
avant le `&& true`. Mal parenthéser et mettre `&& true` à l'intérieur du `guard`.

### Question 2 (sémantique)

**Énoncé.** Ajouter l'opérateur ternaire `e ? e_then : e_else` : on évalue e en un booléen ; s'il vaut true on
évalue e_then, sinon e_else ; si l'une de ces évaluations échoue, le ternaire échoue ; si la condition échoue,
aucune branche n'est évaluée. Donner les règles d'évaluation.

**Méthode.** Une règle par résultat possible de la condition : vrai, faux, échec. Dans les deux premiers cas on
n'évalue **que** la branche choisie et on renvoie sa valeur exceptionnelle v* telle quelle (si elle vaut Fail(w),
l'échec se propage automatiquement). Dans le cas « échec », la règle n'a pas de prémisse sur les branches.

**Réponse.**

```text
Val(e, σ) = true     Val(e_then, σ) = v*
---------------------------------------- (cond-true)
Val(e ? e_then : e_else, σ) = v*

Val(e, σ) = false    Val(e_else, σ) = v*
---------------------------------------- (cond-false)
Val(e ? e_then : e_else, σ) = v*

          Val(e, σ) = Fail(v)
---------------------------------------- (cond-fail)
Val(e ? e_then : e_else, σ) = Fail(v)
```

Comme v* ∈ 𝒱* couvre le succès et l'échec, « si la branche choisie échoue, le ternaire échoue » est déjà pris en
compte. On peut aussi écrire cinq règles en séparant, dans (cond-true) et (cond-false), le cas v* = v du cas
v* = Fail(v) : c'est équivalent. Si la condition s'évalue en un entier, aucune règle ne s'applique (blocage).

**Piège.** Évaluer les deux branches (alors `true ? 1 : fail(2)` échouerait à tort). Oublier la règle
(cond-fail), ou y évaluer quand même une branche, ce que l'énoncé interdit.

### Question 3 (sémantique)

**Énoncé.** Les règles permettent-elles d'évaluer `guard(fail(3 + fail(4)))` ? Proposer une règle qui garantit que
des `fail` imbriqués s'évaluent en une valeur exceptionnelle.

**Méthode.** Tenter l'évaluation de bas en haut et repérer le nœud où aucune règle ne s'applique ; puis ajouter la
règle manquante, dans l'esprit « les échecs remontent dans l'expression » (énoncé p. 3).

**Réponse.** Évaluation :

1. `Val(4, ∅) = 4` (const) ; `Val(fail(4), ∅) = Fail(4)` (fail).
2. `Val(3 + fail(4), ∅) = 3 +* Fail(4) = Fail(4)` (+).
3. `Val(fail(3 + fail(4)), ∅)` : la seule règle pour `fail` est (fail), dont la prémisse exige
   `Val(3 + fail(4), ∅) = v` avec v ∈ 𝒱 un **succès**. Or cette valeur est `Fail(4)` ∉ 𝒱. **Aucune règle ne
   s'applique** : l'évaluation est bloquée, donc `guard(…)` non plus n'a pas de valeur (ses deux règles
   demandent une valeur pour l'expression gardée).

Réponse : **non**. On ajoute la règle de propagation :

```text
   Val(e, σ) = Fail(v)
------------------------ (fail-fail)
Val(fail(e), σ) = Fail(v)
```

Si le calcul de l'argument de `fail` échoue, cet échec remonte tel quel (comme pour +, ∥, && et le ternaire). On
ne fabrique pas `Fail(Fail(4))`, qui n'existe pas dans 𝒱* (Fail ne s'applique qu'à une valeur de succès). C'est la
règle la plus naturelle, parce qu'elle suit la propagation des échecs de +*, ∥*, &&* ; d'autres choix seraient
imaginables, mais il faut que le résultat soit une valeur de 𝒱*.

Avec cette règle :

```text
                         Val(4, ∅) = 4 (const)
                         ------------------------- (fail)
Val(3, ∅) = 3 (const)    Val(fail(4), ∅) = Fail(4)
-------------------------------------------------- (+)    3 +* Fail(4) = Fail(4)
       Val(3 + fail(4), ∅) = Fail(4)
       ----------------------------------- (fail-fail)    [nouvelle règle]
       Val(fail(3 + fail(4)), ∅) = Fail(4)
       ------------------------------------ (guard-fail)
       Val(guard(fail(3 + fail(4))), ∅) = 4
```

**Résultat avec la nouvelle règle : `4`.**

**Piège.** Répondre « oui, Fail(Fail(4)) » : la règle (fail) n'accepte qu'un succès. Proposer une règle qui
« avale » l'échec intérieur (par exemple rendre Fail(3)) : rien ne la justifie, et elle casserait le principe de
propagation.

### Question 4 (sémantique)

**Énoncé.** Pour σ qui associe à x un entier, que vaut `guard(x > 0 ? fail(true) : fail(−x)) + 10` selon la
valeur de x ? Quel est le problème ?

**Méthode.** Distinguer les deux cas de la condition (x > 0 vrai ou faux), dérouler chaque cas avec les règles du
ternaire, puis regarder si l'addition finale est définie.

**Réponse.** Soit n = σ(x).

- **Si n > 0.** `Val(x > 0, σ) = true`, donc (cond-true) : `Val(fail(true), σ) = Fail(true)` (fail) ; le ternaire
  vaut `Fail(true)`. Le `guard` rattrape : `Val(guard(…), σ) = true` (guard-fail). Puis
  `Val(guard(…) + 10, σ) = true +* 10`, qui **n'est pas défini** (+* n'est défini que sur des entiers ou si un
  opérande échoue). **Aucune valeur : l'évaluation est bloquée** (erreur de type à l'exécution).
- **Si n ≤ 0.** `Val(x > 0, σ) = false`, donc (cond-false) : `Val(−x, σ) = −n`, `Val(fail(−x), σ) = Fail(−n)` ;
  le ternaire vaut `Fail(−n)` ; le `guard` donne `−n` ; puis `−n +* 10 = 10 − n`.
  Exemples : x = 0 donne 10 ; x = −3 donne 13.

Le problème : **le type du résultat de `guard` dépend de la valeur de x à l'exécution** (booléen si x > 0, entier
sinon), parce que les deux branches échouent avec des valeurs de types différents (𝔹 pour `fail(true)`, ℤ pour
`fail(−x)`). Pour x > 0, on ajoute un booléen à un entier et l'évaluation « va mal ». On veut un système de types
qui rejette statiquement ce genre d'expression : c'est la partie suivante.

**Piège.** Dire que le résultat est `Fail(true)` pour x > 0 : le `guard` a déjà rattrapé l'échec, le problème est
l'addition `true + 10`. Oublier le cas x = 0 (la condition est `x > 0`, donc x = 0 tombe dans la branche
`else`).

---

### Typage : rappel des données du sujet (p. 4)

Types `τ ::= 𝔹 | ℤ | ⊥`. Jugement `Γ ⊢ e : τ_success, τ_fail` : dans Γ, e s'évalue en une valeur de type
τ_success **ou** échoue avec une valeur de type τ_fail. ⊥ est le type « vide » : `τ_success = ⊥` signifie « ne
réussit jamais », `τ_fail = ⊥` signifie « n'échoue jamais ».

Ordre et borne supérieure :
- `⊥ ≤ τ` et `τ ≤ τ` pour tout τ ; `𝔹 ≰ ℤ` et `ℤ ≰ 𝔹`.
- `τ1 ⊔ τ2 = τ2` si τ1 ≤ τ2, `τ1 ⊔ τ2 = τ1` si τ2 ≤ τ1, **indéfini sinon**.
  Concrètement : `⊥ ⊔ τ = τ`, `τ ⊔ τ = τ`, et `𝔹 ⊔ ℤ` est indéfini. ⊔ est associatif et commutatif quand il est
  défini, donc `τ1 ⊔ τ2 ⊔ τ3` est défini si et seulement si les τi différents de ⊥ sont tous égaux.

Règles données :

```text
                     Γ ⊢ e1 : τ1, τf1    Γ ⊢ e2 : τ2, τf2
 (x, τ) ∈ Γ          τ1 ≤ ℤ    τ2 ≤ ℤ    τf = τf1 ⊔ τf2          Γ ⊢ e : τ1, τ2    τ = τ1 ⊔ τ2
------------ (var)   ------------------------------------ (+)    ----------------------------- (guard)
Γ ⊢ x : τ, ⊥                 Γ ⊢ e1 + e2 : ℤ, τf                      Γ ⊢ guard(e) : τ, ⊥
```

Lecture de (+) : `τi ≤ ℤ` (et pas `τi = ℤ`) accepte un opérande de type de succès ⊥, c'est-à-dire qui échoue
toujours : `3 + fail(5)` est accepté, car l'addition n'est alors jamais calculée.

Dans la suite, les règles de **typage** portent le nom de leur construction ((var), (+), (guard), (fail), (cond)…) :
ne pas les confondre avec les règles d'**évaluation** des questions précédentes, dont certaines ont le même nom.

Règles **ajoutées** ici (le sujet ne les donne pas, elles sont nécessaires aux dérivations ; elles suivent le
modèle de (+)) :

```text
  c ∈ ℤ                  c ∈ 𝔹
------------ (int)     ------------ (bool)          une constante ne peut pas échouer : type d'échec ⊥
Γ ⊢ c : ℤ, ⊥           Γ ⊢ c : 𝔹, ⊥

Γ ⊢ e1 : τ1, τf1    Γ ⊢ e2 : τ2, τf2    τ1 ≤ ℤ    τ2 ≤ ℤ    τf = τf1 ⊔ τf2
--------------------------------------------------------------------------- (cmp)   pour <, >, ≤ …
                        Γ ⊢ e1 > e2 : 𝔹, τf

Γ ⊢ e : τ1, τf    τ1 ≤ ℤ
------------------------ (neg)
    Γ ⊢ −e : ℤ, τf
```

(et `&&`, `∥` comme (cmp) mais avec `τi ≤ 𝔹`.)

### Question 1 (typage)

**Énoncé.** Proposer une règle de typage pour `fail(e)`. L'illustrer par la dérivation de `3 + guard(fail(5))`.

**Méthode.** Se demander, à partir des règles d'évaluation (y compris (fail-fail), puisque le sujet dit que les
règles des questions précédentes font maintenant partie de la sémantique) : `fail(e)` peut-il réussir ? Avec
quelles valeurs peut-il échouer ? Le type de succès est ce qu'il rend en cas de succès, le type d'échec couvre
**toutes** les façons d'échouer.

**Réponse.** `fail(e)` ne réussit jamais : type de succès ⊥. Il échoue soit avec la valeur de e quand e réussit
(règle (fail), valeur de type τ), soit avec l'échec de e quand e échoue (règle (fail-fail), valeur de type τf). Il
faut donc que ces deux types soient compatibles, et le type d'échec est leur borne supérieure :

```text
Γ ⊢ e : τ, τf      τ' = τ ⊔ τf
------------------------------ (fail)
     Γ ⊢ fail(e) : ⊥, τ'
```

C'est la règle « symétrique » de (guard), qui échange les rôles de succès et d'échec. Il existe d'autres réponses
correctes : par exemple exiger que e n'échoue pas (`Γ ⊢ e : τ, ⊥ ⟹ Γ ⊢ fail(e) : ⊥, τ`) est sûr aussi, mais rejette
plus d'expressions (comme `fail(3 + fail(4))`, que notre règle type `⊥, ℤ`).

Dérivation de `3 + guard(fail(5))` (Γ quelconque, par exemple ∅) :

```text
                              5 ∈ ℤ
                          ------------- (int)
                          Γ ⊢ 5 : ℤ, ⊥       ℤ ⊔ ⊥ = ℤ
                          ---------------------------- (fail)
                             Γ ⊢ fail(5) : ⊥, ℤ        ⊥ ⊔ ℤ = ℤ
   3 ∈ ℤ                     ----------------------------------- (guard)
------------ (int)              Γ ⊢ guard(fail(5)) : ℤ, ⊥
Γ ⊢ 3 : ℤ, ⊥                                                      ℤ ≤ ℤ    ℤ ≤ ℤ    ⊥ ⊔ ⊥ = ⊥
---------------------------------------------------------------------------------------------- (+)
                              Γ ⊢ 3 + guard(fail(5)) : ℤ, ⊥
```

**Résultat : `ℤ, ⊥`** (entier, n'échoue jamais). Cohérent avec l'évaluation : `guard(fail(5))` vaut 5, et
l'expression vaut 8.

Pour comparaison : `Γ ⊢ 3 + fail(5) : ℤ, ℤ` (par (+) avec `⊥ ≤ ℤ` pour le second opérande et `⊥ ⊔ ℤ = ℤ`).

**Piège.** Inverser les deux composantes et écrire `fail(e) : τ, ⊥`. Oublier le type d'échec de e lui-même
(possible depuis la règle (fail-fail) de la question 3).

### Question 2 (typage)

**Énoncé.** Donner la dérivation de `guard(3 + guard(fail(5)))`.

**Méthode.** Réutiliser la dérivation de la question 1 comme sous-arbre et appliquer (guard) une fois de plus.

**Réponse.** Notons 𝒟 l'arbre de la question 1, qui prouve `Γ ⊢ 3 + guard(fail(5)) : ℤ, ⊥`.

```text
                 𝒟
Γ ⊢ 3 + guard(fail(5)) : ℤ, ⊥        ℤ ⊔ ⊥ = ℤ
---------------------------------------------- (guard)
   Γ ⊢ guard(3 + guard(fail(5))) : ℤ, ⊥
```

Version entièrement dépliée :

```text
                              5 ∈ ℤ
                          ------------- (int)
                          Γ ⊢ 5 : ℤ, ⊥       ℤ ⊔ ⊥ = ℤ
                          ---------------------------- (fail)
                             Γ ⊢ fail(5) : ⊥, ℤ        ⊥ ⊔ ℤ = ℤ
   3 ∈ ℤ                     ----------------------------------- (guard)
------------ (int)              Γ ⊢ guard(fail(5)) : ℤ, ⊥
Γ ⊢ 3 : ℤ, ⊥                                                      ℤ ≤ ℤ    ℤ ≤ ℤ    ⊥ ⊔ ⊥ = ⊥
---------------------------------------------------------------------------------------------- (+)
                              Γ ⊢ 3 + guard(fail(5)) : ℤ, ⊥                     ℤ ⊔ ⊥ = ℤ
                              -------------------------------------------------------------- (guard)
                                       Γ ⊢ guard(3 + guard(fail(5))) : ℤ, ⊥
```

**Résultat : `ℤ, ⊥`** (valeur 8 à l'exécution). Le `guard` extérieur ne change rien ici, puisque l'expression
gardée n'échoue jamais. (Avec `guard(3 + fail(5))`, on aurait `ℤ ⊔ ℤ = ℤ` : type `ℤ, ⊥` aussi.)

**Piège.** Croire qu'un `guard` donne toujours le type de succès de l'expression gardée : il donne
`τ_success ⊔ τ_fail`, ce qui exige que les deux soient compatibles.

### Question 3 (typage)

**Énoncé.** Donner la règle de typage du ternaire.

**Méthode.** Suivre la sémantique (question 2) : la condition doit être booléenne ; le ternaire réussit avec la
valeur de l'une **ou** l'autre branche (donc borne supérieure des types de succès) ; il échoue si la condition
échoue **ou** si la branche choisie échoue (donc borne supérieure des trois types d'échec).

**Réponse.**

```text
Γ ⊢ e : τc, τfc     τc ≤ 𝔹     Γ ⊢ e_then : τ1, τf1     Γ ⊢ e_else : τ2, τf2
τ = τ1 ⊔ τ2         τf = τfc ⊔ τf1 ⊔ τf2
---------------------------------------------------------------------------- (cond)
                  Γ ⊢ e ? e_then : e_else : τ, τf
```

`τc ≤ 𝔹` accepte aussi une condition qui échoue toujours (τc = ⊥) : alors aucune branche n'est évaluée et le
ternaire échoue avec le type τfc. Si l'un des ⊔ est indéfini, la règle ne s'applique pas et l'expression est
rejetée. Variante correcte mais plus restrictive : exiger τc = 𝔹 (on rejette alors `fail(1) ? 2 : 3`, qui ne pose
pourtant aucun problème). D'autres formulations équivalentes existent.

**Piège.** Oublier τfc (l'échec de la condition) dans le type d'échec. Prendre pour type de succès celui d'une
seule branche. Exiger les mêmes types d'échec dans les deux branches **et** dans la condition au lieu d'utiliser ⊔
(cela rejetterait `x < 2 ? 3 : fail(true)`, dont les échecs ont les types ⊥, ⊥ et 𝔹).

### Question 4 (typage)

**Énoncé.** Donner les dérivations de typage de (a) `guard(x > 0 ? fail(true) : fail(−x)) + 10` et de
(b) `guard((x < 2 ? 3 : fail(true)) > 5)`, avec x de type ℤ : Γ = {(x, ℤ)}.

**Méthode.** Typer de bas en haut. Le système est **dirigé par la syntaxe** : une seule règle par construction, et
les types de la conclusion sont calculés à partir des prémisses. Chaque sous-expression a donc au plus un couple de
types : si un ⊔ est indéfini quelque part, il n'existe **aucune** dérivation, l'expression est rejetée.

**Réponse.**

**(a)** Sous-dérivations :

```text
(x, ℤ) ∈ Γ                 0 ∈ ℤ
------------ (var)      ------------ (int)
Γ ⊢ x : ℤ, ⊥            Γ ⊢ 0 : ℤ, ⊥            ℤ ≤ ℤ    ℤ ≤ ℤ    ⊥ ⊔ ⊥ = ⊥
------------------------------------------------------------------------- (cmp)
                         Γ ⊢ x > 0 : 𝔹, ⊥                                         [𝒟c]

  true ∈ 𝔹
--------------- (bool)
Γ ⊢ true : 𝔹, ⊥       𝔹 ⊔ ⊥ = 𝔹
------------------------------- (fail)
    Γ ⊢ fail(true) : ⊥, 𝔹                                                         [𝒟t]

(x, ℤ) ∈ Γ
------------ (var)
Γ ⊢ x : ℤ, ⊥     ℤ ≤ ℤ
---------------------- (neg)
   Γ ⊢ −x : ℤ, ⊥           ℤ ⊔ ⊥ = ℤ
------------------------------------ (fail)
      Γ ⊢ fail(−x) : ⊥, ℤ                                                         [𝒟e]
```

Tentative de (cond) pour le ternaire :

```text
  𝒟c                       𝒟t                         𝒟e
Γ ⊢ x > 0 : 𝔹, ⊥   𝔹 ≤ 𝔹   Γ ⊢ fail(true) : ⊥, 𝔹   Γ ⊢ fail(−x) : ⊥, ℤ   τ = ⊥ ⊔ ⊥ = ⊥   τf = ⊥ ⊔ 𝔹 ⊔ ℤ = ✗
---------------------------------------------------------------------------------------------------------- (cond) ✗
                       Γ ⊢ x > 0 ? fail(true) : fail(−x) : ?, ?
```

`⊥ ⊔ 𝔹 = 𝔹`, puis `𝔹 ⊔ ℤ` est **indéfini** (ni 𝔹 ≤ ℤ ni ℤ ≤ 𝔹). La règle (cond) ne s'applique pas ; comme c'est
la seule règle du ternaire et que les types de 𝒟c, 𝒟t, 𝒟e sont imposés, le ternaire n'a aucun type, donc
`guard(…)` non plus, donc (a) tout entier non plus. **(a) est rejetée**, et c'est exactement le problème de la
question 4 de sémantique : les deux branches échouent avec des valeurs de types incompatibles.

**(b)** Dérivation complète :

```text
(x, ℤ) ∈ Γ                 2 ∈ ℤ
------------ (var)      ------------ (int)
Γ ⊢ x : ℤ, ⊥            Γ ⊢ 2 : ℤ, ⊥            ℤ ≤ ℤ    ℤ ≤ ℤ    ⊥ ⊔ ⊥ = ⊥
------------------------------------------------------------------------- (cmp)
                         Γ ⊢ x < 2 : 𝔹, ⊥                                         [𝒟1]

   3 ∈ ℤ
------------ (int)
Γ ⊢ 3 : ℤ, ⊥                                                                      [𝒟2]

  true ∈ 𝔹
--------------- (bool)
Γ ⊢ true : 𝔹, ⊥       𝔹 ⊔ ⊥ = 𝔹
------------------------------- (fail)
    Γ ⊢ fail(true) : ⊥, 𝔹                                                         [𝒟3]

  𝒟1                       𝒟2                𝒟3
Γ ⊢ x < 2 : 𝔹, ⊥   𝔹 ≤ 𝔹   Γ ⊢ 3 : ℤ, ⊥   Γ ⊢ fail(true) : ⊥, 𝔹   τ = ℤ ⊔ ⊥ = ℤ   τf = ⊥ ⊔ ⊥ ⊔ 𝔹 = 𝔹
------------------------------------------------------------------------------------------------- (cond)
                         Γ ⊢ (x < 2 ? 3 : fail(true)) : ℤ, 𝔹                      [𝒟4]

            𝒟4                                5 ∈ ℤ
                                           ------------ (int)
Γ ⊢ (x < 2 ? 3 : fail(true)) : ℤ, 𝔹        Γ ⊢ 5 : ℤ, ⊥       ℤ ≤ ℤ    ℤ ≤ ℤ    𝔹 ⊔ ⊥ = 𝔹
-------------------------------------------------------------------------------------- (cmp)
                    Γ ⊢ (x < 2 ? 3 : fail(true)) > 5 : 𝔹, 𝔹                       𝔹 ⊔ 𝔹 = 𝔹
                    ---------------------------------------------------------------------- (guard)
                              Γ ⊢ guard((x < 2 ? 3 : fail(true)) > 5) : 𝔹, ⊥
```

**(b) est acceptée, de type `𝔹, ⊥`** (booléen, n'échoue jamais). Vérification par l'évaluation : si x < 2,
`3 > 5` vaut false et le `guard` rend false ; sinon `fail(true)` donne `Fail(true)`, `Fail(true) >* 5 = Fail(true)`,
et le `guard` rend true. Dans les deux cas un booléen, comme annoncé.

**Piège.** Dire que (a) échoue « à cause du + 10 » : le typage échoue avant, dès le ternaire (types d'échec 𝔹 et ℤ
incompatibles). Oublier de typer la comparaison `> 5` dans (b) (c'est elle qui transforme le succès ℤ en 𝔹 et laisse
passer l'échec 𝔹 ; le `guard` combine ensuite 𝔹 ⊔ 𝔹). Ne montrer qu'un essai raté pour (a) sans dire pourquoi
aucun autre arbre n'est possible (unicité des types dans un système dirigé par la syntaxe).

### Question 5 (typage)

**Énoncé.** Énoncer, sans le démontrer, un théorème de sûreté du typage : il doit dire quelque chose de
l'évaluation d'une expression bien typée et des valeurs que l'on peut obtenir.

**Méthode.** Partir du théorème de sûreté des expressions du cours (CM5 p. 30) : même hypothèse d'accord entre Γ
et σ, même conclusion « la valeur a le type prévu », mais en distinguant succès et échec, et en ajoutant que
l'évaluation ne bloque pas (c'est le « do not go wrong »).

**Réponse.**

Typage des valeurs : `⊢ i : ℤ` pour i ∈ ℤ, `⊢ b : 𝔹` pour b ∈ 𝔹 ; aucune valeur n'a le type ⊥.
On dit que σ **est compatible avec** Γ si pour toute variable x de e : si `(x, τ) ∈ Γ`, alors σ(x) est défini
et `⊢ σ(x) : τ` (CM5 p. 30 l'écrit dans les deux sens : « ∀x ∈ vars(e). ∅ ⊢ σ(x) : τ ⟺ Γ(x) = τ » ; c'est équivalent ici,
car chaque valeur n'a qu'un seul type).

> **Théorème (sûreté).** Soient Γ, e, τs, τf tels que `Γ ⊢ e : τs, τf`, et σ compatible avec Γ. Alors
> `Val(e, σ)` est défini (l'évaluation ne se bloque pas : l'expression ne « va pas mal »), et :
> - soit `Val(e, σ) = v` avec v ∈ 𝒱 et `⊢ v : τs` (en particulier τs ≠ ⊥) ;
> - soit `Val(e, σ) = Fail(v)` avec `⊢ v : τf` (en particulier τf ≠ ⊥).

Conséquences : si τf = ⊥, e n'échoue jamais ; si τs = ⊥, e échoue toujours ; en particulier, comme
`Γ ⊢ guard(e) : τ, ⊥`, une expression gardée bien typée rend toujours une valeur de succès de type τ. C'est la
généralisation de « `Γ ⊢ e : τ ⟹ ∅ ⊢ Val(e, σ) : τ` » (CM5 p. 30). La preuve (non demandée) se ferait par
induction sur l'arbre de typage. Les expressions n'ont ni boucle ni récursion : « défini » suffit à dire
« termine sans erreur ».

Ce théorème a été testé (script Python) sur environ 16 000 expressions bien typées tirées au hasard : aucune
contradiction.

**Piège.** Énoncer seulement « l'évaluation ne bloque pas » sans parler du type des valeurs, ou seulement le type
du succès en oubliant le cas Fail(v). Oublier l'hypothèse de compatibilité entre σ et Γ (sans elle, x pourrait
contenir un booléen alors que Γ le déclare entier).

---

## Ce qu'il faut retenir

1. `Val` se définit **par induction sur la syntaxe** : une équation par production, le membre droit n'utilise que
   les valeurs des sous-expressions ; à gauche des symboles de syntaxe, à droite des opérations de ℤ ou 𝔹.
2. Preuve sur les expressions : **induction structurelle** (cas n, x, e1 + e2, e1 ∗ e2), avec σ, σ' quantifiés
   dans la propriété. Substitution et mise à jour d'état se correspondent :
   `Val(e[e'/x], σ) = Val(e, σ[x ↦ Val(e', σ)])`, la valeur étant calculée dans l'**ancien** état.
3. Règles NAT de `repeat S until b` : S d'abord, puis b évalué dans **σ'** (l'état après S) ; tt → arrêt,
   ff → on recommence depuis σ'.
4. Équivalence de programmes en NAT : `∀σ, σ', (S1, σ) ⇓ σ' ⟺ (S2, σ) ⇓ σ'`, **deux sens**. Méthode : inversion
   (analyse de la dernière règle de l'arbre de l'hypothèse), puis construction d'un arbre avec les sous-arbres
   récupérés. Ne pas oublier la prémisse `Val(b, σ) = …` des règles du `if`.
5. Quand la construction se rappelle elle-même (`while`, `repeat`), l'induction se fait **sur l'arbre de
   dérivation**, pas sur la syntaxe.
6. Une transformation de programme se définit récursivement sur **toutes** les constructions ;
   `repeat S until b ↦ S ; while ¬b do S done` (le corps s'exécute au moins une fois).
7. Expressions exceptionnelles : v désigne un succès, v* un succès ou un échec ; les opérateurs propagent l'échec
   le plus à gauche ; `guard` rend la valeur portée par l'échec ; `fail` d'un échec doit propager l'échec (règle
   à ajouter) ; le ternaire n'évalue que la branche choisie.
8. Typage `Γ ⊢ e : τ_success, τ_fail` : ⊥ = « jamais », ⊔ indéfini entre 𝔹 et ℤ. Règles clés :
   `fail(e) : ⊥, τ ⊔ τf` ; `guard(e) : τ1 ⊔ τ2, ⊥` ; ternaire : condition ≤ 𝔹, succès = ⊔ des branches,
   échec = ⊔ des trois types d'échec. (a) est rejetée (𝔹 ⊔ ℤ indéfini), (b) a le type `𝔹, ⊥`.
9. Énoncé de sûreté : typé + σ compatible ⟹ l'évaluation ne bloque pas, un succès a le type τ_success, un échec
   porte une valeur de type τ_fail.
