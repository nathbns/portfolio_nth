package main

// VersionVolRecFifo : découpe récursive de
// l'image en quatre, jusqu'au grain de P.M lignes et P.N colonnes, et vol de
// travail ; la file de chaque goroutine est un channel.
func VersionVolRecFifo(P *Params, img *Image) Stats {
	erreur("version volrec-fifo : à écrire")
	return Stats{}
}

// VersionVolRec : la même chose, mais la file de
// chaque goroutine est une deque.
func VersionVolRec(P *Params, img *Image) Stats {
	erreur("version volrec : à écrire")
	return Stats{}
}
