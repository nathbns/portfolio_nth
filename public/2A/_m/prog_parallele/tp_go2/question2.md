# §2. Ordonnancement natif de Go

Code : [srcTP-WS/blocs.go](srcTP-WS/blocs.go), modèle : [srcTP-WS/natif.go](srcTP-WS/natif.go).

## Q2.1 : la version `blocs`

**Ce qu'on veut :** p goroutines ; la goroutine i calcule **une seule bande de lignes consécutives**, « comme une boucle OpenMP en schedule(static) ».

```go
func VersionBlocs(P *Params, img *Image) Stats {
	var w sync.WaitGroup // local : VersionBlocs est appelée 3 fois (min de 3 temps)
	for i := range P.P {
		debut := i * P.Taille / P.P
		fin := (i + 1) * P.Taille / P.P
		r := Rect{debut, 0, fin - debut, P.Taille} // Y, X, H lignes, L colonnes
		w.Go(func() { Calculer(P, img, r, i) })   // i : la couleur de la bande dans -o
	}
	w.Wait()
	return Stats{Taches: P.P} // une tâche par bande
}
```

**D'où vient la formule ?** Elle n'est pas dans le sujet, elle se déduit : `taille` lignes à partager entre p goroutines, **une bande contiguë chacune**, de même taille (static). La bande i commence après les i bandes précédentes. C'est le découpage « à la main » du TP1 OpenMP.

**Multiplier avant de diviser :**

```
taille = 10, p = 3 :
  i * taille / p     → 0, 3, 6, 10  → bandes de 3, 3, 4 : tout est couvert ✓
  i * (taille / p)   → 0, 3, 6, 9   → la ligne 9 n'est jamais calculée ✗
```

**Les `Stats`** ne changent pas l'image, mais le sujet demande que chaque version renvoie ses compteurs (comparés en Q4.3). Pour `blocs` : `Taches = p`.

### Les trois découpages à ne pas confondre

| le sujet dit | découpage | code |
|---|---|---|
| **p morceaux** contigus (bandes, `static`) | morceau i : de `i*N/p` à `(i+1)*N/p` | `blocs` |
| morceaux **de taille m** (rectangles m × n, `static, m`) | de m en m, le dernier plus petit | `for y := 0; y < N; y += m` avec `min(m, N-y)` (`Decouper`) |
| **cyclique** (`static, 1`) | la goroutine i prend i, i + p, i + 2p… | `for k := i; k < N; k += p` |

Le premier fixe le **nombre** de morceaux, le deuxième leur **taille** : comme `num_tasks` et `grainsize` au TP2 OpenMP.

> **À retenir.** « Comme X » dans un sujet renvoie à quelque chose de déjà fait : la formule est là-bas.

## Q2.2 : pourquoi `natif` va plus vite que `blocs`

Mesures (12 cœurs, T_seq = 4,07 s) : à p = 12, `natif` va **8,6 fois** plus vite que `seq`, `blocs` seulement **3 fois**. À p = 4, `blocs` n'est pas plus rapide qu'à p = 2.

**L'idée :** tout le travail est **au milieu** de l'image (la partie brillante).

- **`blocs`** : chaque goroutine a **une bande fixe**. Les bandes du haut et du bas finissent tout de suite, puis attendent. Seules celles du milieu travaillent.
- **`natif`** : **4096 petits morceaux**. Une goroutine libre prend le morceau suivant : personne n'attend. (Go fait ça tout seul : un cœur sans travail en prend chez un autre.)

**Image :** un ménage à 4. `blocs` = un étage chacun, le rez-de-chaussée est un chantier, les autres ont fini et regardent. `natif` = les tâches sur des petits papiers, celui qui a fini prend le suivant.

> **À retenir.** Travail inégal → il faut beaucoup de petites tâches, prises à la demande.
