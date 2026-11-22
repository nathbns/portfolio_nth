// TP « vol de travail en Go » : image de l'ensemble de Mandelbrot sur le carré
// [-2, 2] x [-2, 2] du plan complexe.
//
// Ce fichier fournit les fonctions et structures de données communes
// à toutes les versions : paramètres, calcul
// d'un rectangle de pixels dans l'image, image PNG, mesure du temps.
//
// Usage : ./mandel version [options]
//
//	-taille 2048   côté de l'image, en pixels
//	-iter 5000     nombre maximal d'itérations par pixel
//	-p 0           nombre de goroutines de calcul (0 : autant que de cœurs) ;
//	               fixe aussi GOMAXPROCS
//	-m 32 -n 32    taille d'un rectangle (tâche) : m lignes, n colonnes
//	-o image.png   écrit l'image, colorée selon la goroutine qui a calculé
//	               chaque pixel
//
// Le programme affiche une ligne en retour :
//
//	version p taille iter m n temps(s) rectangles vols echecs file_max
//
// Le temps est le min de 3 exécutions ; les compteurs sont ceux de la
// dernière exécution.
//
// Le calcul d'un pixel suit le programme Go de Rosetta Code
// (https://rosettacode.org/wiki/Mandelbrot_set#Go), en nombres complexes,
// mais avec z0 = 0 (comme dans le TP MPI + OpenMP).
package main

import (
	"flag"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
	"runtime"
	"time"
)

// Params regroupe les paramètres caractéristiques d'une exécution.
type Params struct {
	Taille int // côté de l'image, en pixels
	Iter   int // nombre maximal d'itérations par pixel
	P      int // nombre de goroutines de calcul
	M, N   int // un rectangle compte au plus M lignes et N colonnes
}

// Rect est un rectangle de pixels de l'image : H lignes et L colonnes à
// partir de la ligne Y et de la colonne X.
type Rect struct{ Y, X, H, L int }

// Image contient, pour chaque pixel (ligne par ligne), son nombre
// d'itérations et le numéro de la goroutine qui l'a calculé.
type Image struct {
	K            []uint16
	NumGoroutine []uint8
}

// Stats compte ce qu'ont fait les goroutines pendant une exécution : les
// rectangles calculés, les vols réussis, les tentatives de vol échouées, et
// le plus grand nombre de descripteurs observé dans une file.
type Stats struct {
	Taches, Vols, Echecs, FileMax int
}

// Ajouter cumule les compteurs de s dans t (le maximum pour FileMax).
func (t *Stats) Ajouter(s Stats) {
	t.Taches += s.Taches
	t.Vols += s.Vols
	t.Echecs += s.Echecs
	t.FileMax = max(t.FileMax, s.FileMax)
}

// Calculer est la fonction qui implémente le calcul de l'ensemble de
// Mandelbrot : elle calcule les pixels du rectangle r, stocke leur nombre
// d'itérations dans l'image et y note numGoroutine, le numéro de la goroutine
// de calcul qui les a calculés. Elle ne touche qu'aux cases de r : plusieurs goroutines peuvent
// l'appeler en même temps sur des rectangles disjoints, sans synchronisation.
func Calculer(P *Params, img *Image, r Rect, numGoroutine int) {
	pas := 4.0 / float64(P.Taille)
	for i := range r.H {
		ci := 2.0 - pas*float64(r.Y+i)
		ligne := (r.Y + i) * P.Taille
		for j := range r.L {
			cr := -2.0 + pas*float64(r.X+j)
			c := complex(cr, ci)
			var z complex128 // z0 = 0
			n := 0
			// |z| <= 2, écrit |z|² <= 4 : cmplx.Abs calcule une racine
			// carrée et doublerait le temps de calcul.
			for n < P.Iter && real(z)*real(z)+imag(z)*imag(z) <= 4 {
				z = z*z + c
				n++
			}
			img.K[ligne+r.X+j] = uint16(n)
			img.NumGoroutine[ligne+r.X+j] = uint8(numGoroutine)
		}
	}
}

// EcrireImage écrit l'image au format PNG : une teinte par goroutine ; les
// pixels qui s'échappent vite sont sombres, ceux de l'ensemble ont la couleur
// vive.
func EcrireImage(P *Params, img *Image, fichier string) error {
	t := P.Taille
	png_ := image.NewNRGBA(image.Rect(0, 0, t, t))
	lmax := math.Log(1 + float64(P.Iter))
	for p, k := range img.K {
		h := 6 * float64(img.NumGoroutine[p]) / float64(P.P) // teinte, de 0 à 6
		s := int(h)
		f := h - float64(s)
		tab := [6][3]float64{{1, f, 0}, {1 - f, 1, 0}, {0, 1, f},
			{0, 1 - f, 1}, {f, 0, 1}, {1, 0, 1 - f}}
		v := 0.15 + 0.85*math.Log(1+float64(k))/lmax
		var c [3]uint8
		for i := range 3 {
			c[i] = uint8(255 * v * (0.25 + 0.75*tab[s%6][i]))
		}
		png_.SetNRGBA(p%t, p/t, color.NRGBA{c[0], c[1], c[2], 255})
	}
	f, err := os.Create(fichier)
	if err != nil {
		return err
	}
	if err := png.Encode(f, png_); err != nil {
		f.Close()
		return err
	}
	return f.Close()
}

// version est le type commun à toutes les versions du calcul (VersionSeq,
// VersionNatif, VersionBlocs, VersionVol, VersionVolRecFifo, VersionVolRec) :
// une version calcule toute l'image dans img et renvoie ses compteurs. La table versions
// ci-dessous associe à chaque nom de la ligne de commande la fonction
// correspondante, que main appelle.
type version func(P *Params, img *Image) Stats

// Les versions, dans l'ordre où l'usage les affiche.
var ordreVersions = []string{"seq", "natif", "blocs", "vol", "volrec-fifo", "volrec"}

var versions = map[string]version{
	"seq":         VersionSeq,
	"natif":       VersionNatif,
	"blocs":       VersionBlocs,
	"vol":         VersionVol,
	"volrec-fifo": VersionVolRecFifo,
	"volrec":      VersionVolRec,
}

func main() {
	if len(os.Args) < 2 || versions[os.Args[1]] == nil {
		usage()
	}
	nom := os.Args[1]
	var P Params
	opts := flag.NewFlagSet(nom, flag.ExitOnError)
	opts.IntVar(&P.Taille, "taille", 2048, "côté de l'image, en pixels")
	opts.IntVar(&P.Iter, "iter", 5000, "nombre maximal d'itérations par pixel")
	opts.IntVar(&P.P, "p", 0, "nombre de goroutines de calcul (0 : autant que de cœurs)")
	opts.IntVar(&P.M, "m", 32, "nombre de lignes d'un rectangle")
	opts.IntVar(&P.N, "n", 32, "nombre de colonnes d'un rectangle")
	fichier := opts.String("o", "", "fichier PNG à écrire")
	opts.Parse(os.Args[2:])
	if P.P == 0 {
		P.P = runtime.NumCPU()
	}
	switch {
	case P.Taille < 1 || P.Taille > 16384:
		erreur("il faut 1 <= taille <= 16384")
	case P.Iter < 1 || P.Iter > math.MaxUint16:
		erreur("il faut 1 <= iter <= 65535")
	case P.P < 1 || P.P > 256:
		erreur("il faut 1 <= p <= 256")
	case P.M < 1 || P.N < 1:
		erreur("il faut m >= 1 et n >= 1")
	}
	runtime.GOMAXPROCS(P.P)

	img := Image{make([]uint16, P.Taille*P.Taille), make([]uint8, P.Taille*P.Taille)}
	var meilleur time.Duration
	var st Stats
	for e := range 3 {
		clear(img.K)
		clear(img.NumGoroutine)
		debut := time.Now()
		// Exécute la version demandée (premier argument de la commande),
		// trouvée dans la table versions ; on garde le meilleur des trois temps.
		st = versions[nom](&P, &img)
		if d := time.Since(debut); e == 0 || d < meilleur {
			meilleur = d
		}
	}
	fmt.Printf("%s %d %d %d %d %d %.4f %d %d %d %d\n", nom, P.P, P.Taille, P.Iter,
		P.M, P.N, meilleur.Seconds(), st.Taches, st.Vols, st.Echecs, st.FileMax)
	if *fichier != "" {
		if err := EcrireImage(&P, &img, *fichier); err != nil {
			erreur(err.Error())
		}
	}
}

func usage() {
	fmt.Fprint(os.Stderr, "usage : ./mandel version [-taille 2048] [-iter 5000] [-p 0] [-m 32] [-n 32] [-o image.png]\nversions :")
	for _, v := range ordreVersions {
		fmt.Fprint(os.Stderr, " ", v)
	}
	fmt.Fprintln(os.Stderr)
	os.Exit(1)
}

func erreur(msg string) {
	fmt.Fprintln(os.Stderr, msg)
	os.Exit(1)
}
