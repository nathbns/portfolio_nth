package main

import "sync"

// VersionBlocs (à écrire) : P.P goroutines, chacune calcule une
// bande de lignes consécutives de l'image, comme une boucle OpenMP en
// schedule(static). La version natif (natif.go) montre comment découper
// l'image et calculer un rectangle.
func VersionBlocs(P *Params, img *Image) Stats {
	var w sync.WaitGroup

	for i := range P.P {
		debut_ligne := i * P.Taille / P.P
		fin_ligne := (i + 1) * P.Taille / P.P
		r := Rect{debut_ligne, 0, fin_ligne - debut_ligne, P.Taille}
		w.Go(func(){ Calculer(P, img, r, i) })
	}
	w.Wait()
	return Stats{Taches: P.P}
}
