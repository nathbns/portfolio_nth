package main

import (
	"fmt"
	"sync"
)

func power(x int64, n int, c chan<- int64) {
	// ici chan<-: power ne fait que ecrire
	var res int64 = 1
	for i:=0; i<n; i++ {
		res *= x
		c <- res // envoie chaque resultat intermediaire
	}
	close(c)
}

func affichpower(c <-chan int64) {
	for v := range c {
		// lit chaque valeur, jusqu'au close(c)
		fmt.Println(v)
	}
}

func main() {
	c := make(chan int64)
	var w sync.WaitGroup
	w.Go(func(){power(2, 10, c)})
	w.Go(func(){affichpower(c)})
	w.Wait()
} 
