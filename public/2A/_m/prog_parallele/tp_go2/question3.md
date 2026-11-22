# §3. Vol de tâches statiques : la version `vol`

Code : [srcTP-WS/vol.go](srcTP-WS/vol.go).

**L'idée :** chaque goroutine a **sa file** de rectangles. Elle prend dans sa file ; quand elle est vide, elle **vole** un rectangle dans la file d'une autre. On s'arrête quand il n'y a plus rien nulle part.

## Q3.1, étape 1 : créer les files et les remplir

Le sujet : *« Tous les descripteurs sont stockés dans les channels avant le début du calcul, selon une répartition initiale à votre choix. »* Remplir avant est demandé ; la façon de répartir est libre.

```go
rects := Decouper(P)                         // la liste de tous les rectangles (4096)
files := make([]chan Rect, P.P)              // une rangée de P.P cases, vides
for i := range P.P {
	files[i] = make(chan Rect, len(rects))   // on CRÉE la file i (vide, place pour 4096)
}
for k, r := range rects {                    // k : numéro, r : le rectangle (comme enumerate)
	files[k%P.P] <- r                        // on REMPLIT : r entre dans la file k % P.P
}
```

- **File, pas pile :** un channel est une **file** (on ajoute d'un côté, on retire de l'autre). La **deque** (partie 4) permet d'ajouter et retirer des deux côtés.
- **La flèche montre où va le rectangle :** `files[i] <- r` le fait entrer (écrire), `r := <-files[i]` le fait sortir (lire).
- **`k % P.P`** donne toujours 0, 1, …, P.P − 1 : chacun son tour, comme une distribution de cartes. `files[k]` planterait (`index out of range`) : il n'y a que P.P files.
- **Capacité `len(rects)` :** on remplit avant que quiconque lise ; une file trop petite bloquerait l'envoi (deadlock).

## Q3.1, étape 2 : chaque goroutine vide sa file

```go
var wg sync.WaitGroup
for i := range P.P {
	wg.Go(func() {
		for {
			select {
			case r := <-files[i]:      // j'essaie de prendre un rectangle dans MA file
				Calculer(P, img, r, i) // je le calcule, puis je recommence
			default:                   // ma file est vide
				return                 // étape 3 : on volera ici au lieu de s'arrêter
			}
		}
	})
}
wg.Wait()
return Stats{Taches: len(rects)}
```

**`select` + `default` = « essaie de prendre ; si c'est vide, ne reste pas bloqué ».** Sans `default`, une goroutine à la file vide attendrait pour toujours.

**L'image (`-o vol.png`, p = 4) :** des bandes verticales de 4 couleurs qui alternent : la distribution chacun son tour.

## Q3.1, étape 3 : voler, et savoir quand s'arrêter

Chaque phrase du sujet (page 3) devient une ligne de code :

| le sujet dit | dans le code |
|---|---|
| « prend ses descripteurs dans son propre channel » | `case r := <-files[i]:` |
| « quand il est vide, elle tire au sort une victime j ≠ i » | `default:` puis `j := victime(i, P.P)` |
| « et tente de lui voler un descripteur » | `case r := <-files[j]:` |
| « ne doit pas bloquer la voleuse […] : rôle du cas default » | le **deuxième** `select` et son `default` |
| « chaque goroutine [doit savoir] quand s'arrêter » | `for aPrendre.Load() > 0` |

```go
func victime(i, nb int) int { // une autre goroutine que i, au hasard
	for {
		j := rand.IntN(nb)
		if j != i {
			return j
		}
	}
}

var aPrendre atomic.Int64         // rectangles que personne n'a encore pris
aPrendre.Store(int64(len(rects)))
// dans la goroutine i :
for aPrendre.Load() > 0 {
	select {
	case r := <-files[i]: // je prends dans MA file
		aPrendre.Add(-1)
		Calculer(P, img, r, i)
	default: // ma file est vide : je vole
		j := victime(i, P.P)
		select {
		case r := <-files[j]: // je prends dans SA file
			aPrendre.Add(-1)
			Calculer(P, img, r, i) // i : c'est MOI qui calcule (couleur de l'image)
		default: // sa file est vide : je réessaierai
		}
	}
}
```

- **Deux `select` :** le premier pour ma file, le second pour celle de la victime.
- **`aPrendre` en `atomic` :** plusieurs goroutines font −1 en même temps ; un entier normal perdrait des −1 (comme `sum += x` sans `atomic` au TP1). À 0, il n'y a plus rien nulle part : tout le monde s'arrête.

**Erreurs rencontrées :** voler dans `files[i]` (sa propre file vide : blocage pour toujours) ; `<-files[j]` sans `select` (bloque si la victime est vide) ; `Calculer(…, j)` au lieu de `i` ; `Taches: P.P` au lieu de `len(rects)`.

## Q3.1, étape 4 : compter les vols et les échecs

Le sujet (annexe, « Compter sans partager ») : chaque goroutine compte **dans ses propres variables**, range son total dans **sa case** d'un tableau, et on additionne après `wg.Wait()`. Pas de partage, donc pas besoin d'`atomic`.

```go
stats := make([]Stats, P.P)  // une case par goroutine
// dans la goroutine i :
var st Stats                 // mes compteurs : st.Vols++ (vol réussi), st.Echecs++ (vol raté)
…
stats[i] = st                // À LA FIN de ma boucle, DANS la goroutine
// après w.Wait() :
var total Stats
for _, s := range stats {
	total.Ajouter(s)         // déjà écrite dans commun.go
}
total.Taches = len(rects)
return total
```

**Piège rencontré :** `stats[i] = st` écrit **après** `w.Go(…)`, hors de la goroutine : `w.Go` rend la main tout de suite (TP Go 1, Q1), donc on recopie les compteurs à 0, avant le calcul.

## Q3.1 : comparaison

| p | natif | blocs | vol | vols / échecs |
|---|---|---|---|---|
| 1 | 4,07 s | 4,08 s | 4,07 s | 0 / 0 |
| 4 | 1,12 s | 2,09 s | 1,14 s | 389 / 606 |
| 8 | 0,59 s | 1,76 s | 0,58 s | 309 / 1018 |
| 12 | 0,47 s | 1,36 s | 0,47 s | 671 / 862 |

- **`vol` = `natif`**, presque 3 fois plus rapide que `blocs` à 12 : le vol écrit à la main fait aussi bien que celui de Go.
- **Peu de vols** (671 sur 4096 à p = 12, environ 1 sur 6) : le vol sert à **rééquilibrer la fin**.
- **Échecs** : tentatives sur une file déjà vide, surtout à la fin.

## Q3.2 : channel ou deque ?

- **Channel = file** (comme `queue.Queue` en Python) : une seule sortie, on prend toujours le plus ancien.
- **Deque = deux sorties** (comme `collections.deque`) : `popleft` (le plus ancien, FIFO) ou `pop` (le plus récent, LIFO).

```
channel :  propriétaire → [2 3 4 5 6 7 8]        les deux prennent à gauche
           voleuse      → ↑ prend le 2
deque   :  propriétaire → [2 3 4 5 6 7 8] ← voleuse prend le 8
```

- **Channel :** la voleuse obtient **le prochain rectangle de la propriétaire** ; elles se disputent le même bout.
- **Deque :** la voleuse prend **à l'autre bout**, ce que la propriétaire aurait fait en dernier ; elles ne se gênent pas, la propriétaire garde sa suite de rectangles voisins.
- Ici les rectangles ont la même taille : peu d'effet sur le temps. En partie 4, le plus ancien sera **le plus gros** : là, ça compte.
