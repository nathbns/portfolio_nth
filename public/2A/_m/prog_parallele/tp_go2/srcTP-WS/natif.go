// Ce fichier contient la version 'natif' et la fonction 'Decouper',
// dont les autres versions peuvent s'inspirer.
package main

import "sync"

// Decouper découpe l'image en rectangles d'au plus P.M lignes et P.N
// colonnes, stockés ligne de rectangles par ligne de rectangles.
func Decouper(P *Params) []Rect {
	var rects []Rect
	for y := 0; y < P.Taille; y += P.M {
		for x := 0; x < P.Taille; x += P.N {
			rects = append(rects, Rect{y, x, min(P.M, P.Taille-y), min(P.N, P.Taille-x)})
		}
	}
	return rects
}

// VersionNatif : une goroutine par rectangle, toutes créées
// dès le départ ; l'ordonnanceur de Go les répartit entre ses P.P contextes
// d'exécution (GOMAXPROCS). Chaque goroutine calcule son rectangle
// directement dans l'image.
// Aucune goroutine n'ayant de numéro spécifique (toutes ont 0), l'image est d'une seule couleur.
func VersionNatif(P *Params, img *Image) Stats {
	rects := Decouper(P)
	var wg sync.WaitGroup
	for _, r := range rects {
		// Le 0 en dernier argument est le (même) numéro donné à chaque goroutine
		wg.Go(func() { Calculer(P, img, r, 0) })
	}
	wg.Wait() // les écritures de toutes les goroutines sont alors visibles
	return Stats{Taches: len(rects)}
}
