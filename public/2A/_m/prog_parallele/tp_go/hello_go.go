package main

import (
	"fmt"
	"time"
	"sync"
)

func say5(s string) {
	for i := 0; i < 5; i++ {
		time.Sleep(100 * time.Millisecond)
		fmt.Println("[", i, "] ", s)
	}
}

func main() {
	var w sync.WaitGroup
	w.Go(func() {say5("Hello")})
	w.Go(func() {say5("World")})
	w.Wait()
}
