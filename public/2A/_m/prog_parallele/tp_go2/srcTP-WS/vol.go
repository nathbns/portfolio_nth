package main

import (
	"sync"
	"sync/atomic"
	"math/rand/v2"
)

func victime(i, p int) int {
	// p == P.P
	for {
		j := rand.IntN(p) // entre 0 et p-1
		if j != i { // ce n'est pas moi
			return j // c'est ma victime
		}
	} // sinon on retire au sort
}

// VersionVol (à écrire) : P.P goroutines de calcul, chacune avec sa
// file de descripteurs (Rect), un channel rempli au départ ; une goroutine
// dont la file est vide vole des descripteurs dans la file d'une autre.
func VersionVol(P *Params, img *Image) Stats {
	rects := Decouper(P) // liste de tous les rects de l'img (natif version)
	
	// une pile de goroutine
	files := make([]chan Rect, P.P)
	for i := range P.P {
		// pile de la goroutine i
		files[i] = make(chan Rect, len(rects))
	}

	// on distrib les rect, chacun son tour
	for k, r := range rects {
		// le rect k va dans la pile num k % P.P
		files[k%P.P] <- r
	}
	
	var w sync.WaitGroup
	var aPrendre atomic.Int64 // nb rect que personne n'a encore pris
	aPrendre.Store(int64(len(rects))) // tous = 4096

	stats := make([]Stats, P.P)

	for i := range P.P {
		var st Stats
		w.Go(func() {
			for aPrendre.Load() > 0 { // tq il reste des rect
				select {
				// j'essaie de prendre un rect dans MA pile
				case r := <-files[i]:
					aPrendre.Add(-1)
					Calculer(P, img, r, i)
				default: // ma pile est vide
					j := victime(i, P.P)
					select {
					case r := <- files[j]:
						st.Vols++
						aPrendre.Add(-1)
						Calculer(P, img, r, i)
					default:
						st.Echecs++
					}
				}
			}
			stats[i] = st
		})
	}
	w.Wait()
	var total Stats
	for _, s := range stats {
		total.Ajouter(s)
	}
	total.Taches = len(rects)
	return total
}
