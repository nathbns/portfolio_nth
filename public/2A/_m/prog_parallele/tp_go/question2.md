# §2. Synchronisation par channels

Code : [channels.go](channels.go).

## Q3 : `power` écrit, `affichpower` lit

```go
func power(x int64, n int, c chan<- int64) { // chan<- : écrit seulement
	var res int64 = 1
	for i := 0; i < n; i++ {
		res *= x
		c <- res // envoie chaque résultat intermédiaire
	}
	close(c) // « j'ai fini d'envoyer »
}

func affichpower(c <-chan int64) { // <-chan : lit seulement
	for v := range c { // s'arrête tout seul au close(c)
		fmt.Println(v)
	}
}

func main() {
	c := make(chan int64) // sans tampon
	var w sync.WaitGroup
	w.Go(func() { power(2, 10, c) })
	w.Go(func() { affichpower(c) })
	w.Wait()
}
```

Résultat : 2, 4, 8, … 1024, toujours dans cet ordre.

**Comment ça marche.** Le channel est **sans tampon** : chaque `c <- res` attend que `affichpower` lise la valeur. C'est un **rendez-vous** : `power` calcule une puissance, la passe de la main à la main, puis calcule la suivante. Les valeurs arrivent donc dans l'ordre d'envoi.

**Pourquoi deux goroutines.** Si `main` appelle `power` puis `affichpower` l'un après l'autre, `power` bloque sur son premier envoi, car personne ne lit encore : `all goroutines are asleep - deadlock!`.

**Pourquoi `close(c)`.** `for v := range c` lit jusqu'à la fermeture du channel. Sans `close`, `affichpower` attend une valeur de plus pour toujours : deadlock.

**Les flèches.** Il n'y en a qu'une, `<-`, qui montre où vont les données :

| écriture | sens |
|---|---|
| `c <- v` | v **entre** dans c (envoi) |
| `v := <-c` | une valeur **sort** de c (lecture) |
| `chan<- int64` | channel où l'on peut seulement envoyer |
| `<-chan int64` | channel où l'on peut seulement lire |

> **À retenir.** Un channel sans tampon synchronise : l'envoi attend la lecture. On ferme toujours côté **écriture**, une seule fois, et on n'écrit plus après.

**Pièges rencontrés.**
- `import "channel"` : il n'y a rien à importer, `chan` fait partie du langage.
- `c := make(...)` hors d'une fonction : interdit, `:=` ne s'utilise que dans une fonction.
- `fmt.println` : il faut `fmt.Println`. Ce qu'on utilise d'un autre package commence par une majuscule.
- `"sync" imported and not used` : en Go, un import inutilisé est une erreur de compilation.
- Espace insécable (Option + espace avant `{`) : voir [question1.md](question1.md).
