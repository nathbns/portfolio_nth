# §1. Goroutines

Code : [hello_go.go](hello_go.go). Go 1.25 sur le Mac (`w.Go` n'existe pas avant Go 1.25 : le conteneur Docker, en Go 1.18, le refuse).

## Q1 : `go` devant un appel

**La règle.** `go f()` lance `f` dans une goroutine et **rend la main tout de suite**, sans attendre. Quand `main` se termine, le programme s'arrête et **tue toutes les goroutines**, finies ou pas.

Mon `main` appelle `say5("Hello")` puis `say5("World")`. Chaque `say5` affiche 5 lignes, en attendant 100 ms avant chacune (500 ms en tout).

| `main` | affichage | pourquoi |
|---|---|---|
| sans `go` | 5 Hello, puis 5 World | les deux appels se font l'un après l'autre |
| `go` Hello, `go` World | **rien** | `main` lance les deux goroutines et se termine aussitôt, avant leur première ligne (100 ms) |
| `go` Hello, World normal | mélangé, **9 ou 10 lignes** | World tourne dans `main` pendant que Hello tourne à côté. Les deux `[4]` arrivent au même instant : si World affiche le sien en premier, `main` se termine, et le `[4] Hello` est parfois perdu |
| Hello normal, `go` World | **5 Hello seulement** | World n'est lancé qu'à la fin, et `main` se termine juste après |

Dans une même paire (`[0] Hello` et `[0] World`), l'ordre change d'une exécution à l'autre : les deux goroutines se réveillent au même moment, et c'est l'ordonnanceur de Go qui choisit.

> **À retenir.** Rien n'attend une goroutine automatiquement. Le `Sleep` de `say5` ne sert qu'à rendre l'entrelacement visible : attendre avec un `Sleep` est une mauvaise synchronisation. La bonne, c'est le `WaitGroup` (Q2).

## Q2 : attendre avec un `WaitGroup`

```go
func main() {
	var w sync.WaitGroup
	w.Go(func() { say5("Hello") })
	w.Go(func() { say5("World") })
	w.Wait() // attend que les deux goroutines soient finies
}
```

Trois exécutions (une ligne par exécution) :

```
0 World 0 Hello 1 Hello 1 World 2 World 2 Hello 3 World 3 Hello 4 Hello 4 World
0 Hello 0 World 1 World 1 Hello 2 Hello 2 World 3 World 3 Hello 4 Hello 4 World
0 Hello 0 World 1 World 1 Hello 2 Hello 2 World 3 World 3 Hello 4 World 4 Hello
```

**Toujours vrai :** les 10 lignes s'affichent (`Wait`), chaque goroutine affiche ses lignes dans l'ordre (0 à 4), et les lignes vont par paires (`[i]` de chacune vers 100 × (i + 1) ms).

**Pas toujours dans le même ordre :** à l'intérieur d'une paire. Les deux goroutines dorment exactement autant, donc elles se réveillent presque au même instant. Laquelle affiche en premier se joue à quelques microsecondes près, et c'est l'ordonnanceur de Go qui choisit. Le programme ne contrôle pas cet ordre.

> **À retenir.** Deux goroutines sont indépendantes : sans synchronisation entre elles, aucun ordre n'est garanti. `Wait` garantit seulement qu'elles sont **finies**, pas l'ordre dans lequel elles travaillent. Pour imposer un ordre, il faut les faire communiquer : ce sont les channels (partie 2).

**Piège rencontré.** `invalid character U+00A0` : une espace insécable, tapée avec Option + espace juste après `{` (Option + `(` sur un clavier Mac français). Dans vim, `:%s/\%u00a0/ /g` les remplace toutes.
