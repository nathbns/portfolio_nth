package main

import (
	"fmt"
	"time"
	"sync"
	"strconv"
)

type TImpression int

const (
	ImpNoirEtBlanc TImpression = iota
	ImpCouleur
)

type Impression struct {
	utilisateur string
	typeI       TImpression
	ack         chan string
}

func imprimante(nom string, t TImpression, vitesse int, balImp <-chan Impression, pret chan<- bool) {
	pret<- true
	for imp := range balImp {
		if t == imp.typeI {
			time.Sleep(time.Duration(vitesse) * time.Millisecond)
			fmt.Printf("Impression sur l'imprimante %v du document %v, en mode %v, terminée\n", nom, imp.utilisateur, t)
		} else {
			fmt.Printf("Reçu une demande d'un type d'impression incompatible")
		}
		imp.ack<- nom
		pret<- true
	}
}

func utilisateur(nom string, t TImpression, balImp chan<- Impression) {
	ack := make(chan string)
	balImp<- Impression{nom, t, ack}
	imp := <-ack
	fmt.Println(nom, "s'en va, imprimé sur", imp) 
}

func serveur(balImp <-chan Impression) {
	c1, c2 := make(chan Impression), make(chan Impression)
	pret1, pret2 := make(chan bool, 1), make(chan bool, 1)
	var w sync.WaitGroup
	w.Go(func(){imprimante("rapide", ImpNoirEtBlanc, 100, c1, pret1)})
	w.Go(func(){imprimante("lente", ImpNoirEtBlanc, 200, c2, pret2)})

	for imp := range balImp {
		select {
		case <-pret1:
			c1<- imp
		case <-pret2:
			c2<- imp
		}
	}
	close(c1) // plus de documents
	close(c2)
	w.Wait() // attend qu'elles aient fini
}

func main() {
	// TODO
	c := make(chan Impression, 10)
	
	var wUser, wServ sync.WaitGroup
	
	//w.Go(func(){utilisateur("Margot", ImpNoirEtBlanc, c)})
	//w.Go(func(){imprimante("epson", ImpNoirEtBlanc, 100, c)})
	//time.Sleep(time.Duration(5) * time.Second)
	
	wServ.Go(func(){serveur(c)})
	for i:=0; i<10; i++ {
		wUser.Go(func(){utilisateur("user" + strconv.Itoa(i), ImpNoirEtBlanc, c)})
	}
	wUser.Wait()
	close(c)
	wServ.Wait()
}
