package main

// VersionSeq calcule toute l'image d'un coup,
// dans la goroutine principale.
func VersionSeq(P *Params, img *Image) Stats {
	Calculer(P, img, Rect{0, 0, P.Taille, P.Taille}, 0)
	return Stats{Taches: 1}
}
