# §3. Imprimer

Code : [impressions.go](impressions.go).

## 3.1 : le squelette

Une `Impression` est un message déposé dans une **boîte aux lettres** (le channel), qu'une imprimante vient relever.

```go
type TImpression int
const (
	ImpNoirEtBlanc TImpression = iota // 0
	ImpCouleur                        // 1
)

type Impression struct {
	utilisateur string      // qui imprime
	typeI       TImpression // noir et blanc ou couleur
	ack         chan string // réponse de l'imprimante (sert en Q8, nil avant)
}
```

- **`iota`** numérote les constantes : 0, 1, … C'est l'équivalent d'un `enum` en C.
- **`imprimante(nom, t, vitesse, balImp <-chan Impression)`** lit la boîte en boucle (`for imp := range balImp`). Pour chaque impression du bon type, elle attend `vitesse` ms, puis affiche « terminée ». Elle ne s'arrête qu'au `close` du channel.
- **`utilisateur(nom, t, balImp chan<- Impression)`** dépose une impression, affiche « s'en va », et c'est fini.
- Les flèches des paramètres : l'utilisateur ne fait qu'**écrire** (`chan<-`), l'imprimante ne fait que **lire** (`<-chan`).
- **Piège du squelette** : les `Printf` de l'imprimante n'ont pas de `\n`, donc leurs messages se collent. Il faut l'ajouter.

## 3.2 : la première impression

### Q4 : `go` utilisateur, `go` imprimante, puis fin du `main`

```go
c := make(chan Impression)
go utilisateur("Margot", ImpNoirEtBlanc, c)
go imprimante("epson", ImpNoirEtBlanc, 100, c)
```

**Affiche : rien.** `main` lance les deux goroutines et se termine aussitôt, ce qui tue tout le programme (comme en Q1).

### Q5 : avec `time.Sleep(5 * time.Second)` à la fin du `main`

```
Margot s'en va
Impression sur l'imprimante epson du document Margot, en mode 0, terminée
```

Puis le programme s'arrête au bout de 5 s.
- **« s'en va » avant « terminée ».** Le channel est sans tampon : l'envoi est un rendez-vous. Dès que l'imprimante a **reçu** l'impression, l'utilisateur repart et affiche « s'en va », pendant que l'imprimante passe ses 100 ms à imprimer. L'utilisateur part donc **avant** la fin de son impression (c'est ce que corrige la Q8).
- **Pas de blocage.** L'imprimante attend une autre impression pour toujours (personne ne ferme le channel), mais `main` ne l'attend pas : au bout des 5 s, il se termine et le programme s'arrête.
- **`en mode 0`** : `ImpNoirEtBlanc` vaut 0 (`iota`). On passe toujours les constantes, jamais un nombre au hasard.

## Piège : un `WaitGroup` sans `close`

Avec `w.Go` pour les deux puis `w.Wait()` :

```
Margot s'en va
Impression … terminée
fatal error: all goroutines are asleep - deadlock!
```

L'utilisateur a fini, mais l'imprimante reste dans `for imp := range c`, qui attend une impression de plus **jusqu'à ce que le channel soit fermé**. Personne ne le ferme, donc `Wait` attend l'imprimante pour toujours. Toutes les goroutines sont bloquées, et Go arrête le programme.

> **À retenir.** Une goroutine qui fait `range` sur un channel ne se termine qu'au `close`. Pour l'attendre, il faut d'abord fermer le channel, et donc d'abord attendre tous ceux qui écrivent dedans (Q6).

## 3.3 : attendre 10 utilisateurs et une imprimante

```go
c := make(chan Impression)
var wUser, wImp sync.WaitGroup
wImp.Go(func() { imprimante("epson", ImpNoirEtBlanc, 100, c) }) // lancer, sans attendre
for i := 0; i < 10; i++ {
	wUser.Go(func() { utilisateur("user"+strconv.Itoa(i), ImpNoirEtBlanc, c) })
}
wUser.Wait() // 1. tous les utilisateurs ont déposé
close(c)     // 2. plus personne n'écrit : l'imprimante sort de son range
wImp.Wait()  // 3. l'imprimante a fini
```

**Deux `WaitGroup`, car il faut fermer `c` entre les deux attentes.** On ne ferme qu'une fois tous les écrivains finis (écrire dans un channel fermé fait planter le programme). Et on n'attend l'imprimante qu'après le `close` (sinon : deadlock). Un `wImp.Wait()` juste après avoir lancé l'imprimante bloque tout de suite, car elle attend des impressions que personne n'a encore envoyées.

### Q6 : l'entrelacement (channel sans tampon)

```
user0 s'en va
Impression … du document user0 … terminée
user2 s'en va
Impression … du document user2 … terminée
user1 s'en va
…
```

- **Strictement alterné, une impression à la fois.** L'envoi est un rendez-vous : un utilisateur ne peut repartir que lorsque l'imprimante **prend** son document. Or l'imprimante n'en prend qu'un, l'imprime pendant 100 ms, puis revient au `range` pour prendre le suivant. Pendant ce temps, les 9 autres utilisateurs restent **bloqués sur leur envoi**.
- **Chaque utilisateur part dès que l'imprimante a pris son document**, juste avant que celle-ci l'imprime : « s'en va » précède donc toujours son « terminée ».
- **L'ordre des utilisateurs change à chaque exécution** (user0, user2, user1…). Les 10 attendent en même temps sur le channel, et rien ne fixe lequel passe en premier : c'est l'ordonnanceur qui choisit.
- **Durée ≈ 10 × 100 ms** (mesuré : 1,3 s). Le dernier utilisateur a attendu près d'une seconde avant de pouvoir partir.

### Q7 : avec un tampon de 10 (`make(chan Impression, 10)`)

```
user9 s'en va
user3 s'en va
… (les 10 « s'en va » d'un coup)
Impression … du document user9 … terminée
Impression … du document user0 … terminée
… (puis une impression toutes les 100 ms)
```

- **Les 10 utilisateurs partent tout de suite.** Avec un tampon, l'envoi ne bloque que si le tampon est plein. Il y a 10 places pour 10 utilisateurs : chacun dépose son document dans la boîte et repart, sans attendre l'imprimante.
- **L'imprimante vide ensuite la boîte**, une impression toutes les 100 ms.
- **La durée totale ne change pas** (mesuré : 1,35 s contre 1,3 s). C'est toujours l'imprimante, seule, qui fait les 10 impressions. Le tampon fait gagner du temps aux **utilisateurs**, pas au programme.
- **Les impressions sortent dans l'ordre des dépôts**, car un channel est une file FIFO. L'ordre des « s'en va » peut être un peu différent : entre son dépôt et son `Println`, un utilisateur peut se faire doubler par un autre.

| | sans tampon (Q6) | tampon de 10 (Q7) |
|---|---|---|
| envoi | rendez-vous : attend que l'imprimante prenne | dépose et repart (sauf si plein) |
| messages | alternés : « s'en va », « terminée », … | 10 « s'en va », puis 10 « terminée » |
| un utilisateur attend | son tour (jusqu'à ≈ 1 s) | rien |
| durée totale | ≈ 1 s | ≈ 1 s |

**Le nombre dans `make(chan T, n)`** est la taille du tampon : une file de n places entre l'envoyeur et le receveur. L'envoi bloque seulement quand les n places sont prises ; la lecture bloque seulement quand la file est vide. Sans nombre (ou 0), il n'y a aucune place : c'est la remise en main propre.

Test avec **3 places** : 4 « s'en va » d'un coup (3 documents dans la file + 1 dans l'imprimante), puis un « s'en va » après chaque « terminée », car chaque impression libère une place.

> **À retenir.** Un channel **sans tampon synchronise** l'envoyeur et le receveur. Un channel **avec tampon découple** : l'envoyeur n'attend que si la boîte est pleine. Dans les deux cas, l'utilisateur part **sans savoir si son impression est finie** : c'est la Q8.

## 3.4 : attendre la fin de son impression

Chaque utilisateur crée **son propre** channel de réponse, le glisse dans l'`Impression`, puis attend dessus. L'imprimante répond dans ce channel une fois l'impression finie.

```go
func utilisateur(nom string, t TImpression, balImp chan<- Impression) {
	ack := make(chan string)          // boîte retour, vide
	balImp <- Impression{nom, t, ack} // la boîte part avec le document
	imp := <-ack                      // attend que l'imprimante écrive dedans
	fmt.Println(nom, "s'en va, imprimé sur", imp)
}

// dans imprimante, à chaque tour de « for imp := range balImp » :
	imp.ack <- nom // après le if/else : l'utilisateur reçoit toujours une réponse
```

**Qui écrit dans `ack` ?** Pas l'utilisateur : il crée la boîte, la donne, puis **attend** (`<-ack` bloque tant que la boîte est vide). C'est l'imprimante qui écrit dedans, via `imp.ack`, le champ `ack` de la structure qu'elle a reçue. Les deux désignent **le même channel** : comme une enveloppe retour, ou un numéro de téléphone qu'on laisse pour être rappelé.

**Réponse aussi en cas de type incompatible.** Sinon l'utilisateur attendrait pour toujours (utile à la 3.6). Ici, `imp.ack <- nom` est placé après le `if/else`, ce qui couvre les deux cas.

### Q8 : l'entrelacement

```
Impression … du document user4 … terminée
user4 s'en va, imprimé sur epson
Impression … du document user0 … terminée
user0 s'en va, imprimé sur epson
…
```

- **Chaque « s'en va » vient juste après son « terminée ».** L'utilisateur ne part qu'après la réponse, et l'imprimante ne répond qu'après avoir imprimé. Cet ordre est désormais **garanti**, plus seulement probable.
- Avec le tampon de 10, les 10 documents sont déposés tout de suite, mais **personne ne part** avant d'avoir sa réponse : ils attendent chacun sur leur `ack`.
- L'ordre des utilisateurs change toujours d'une exécution à l'autre (ordre des dépôts).

> **À retenir.** Pour savoir quand un travail confié à une autre goroutine est fini, on lui donne un channel de réponse et on attend dessus. Un channel par requête : la réponse arrive exactement à celui qui l'attend.

## 3.5 : un serveur et deux imprimantes (100 et 200 ms)

```
                                   ──c1──▶  imprimante "rapide" (100 ms)
utilisateurs ──balImp──▶ SERVEUR
                                   ──c2──▶  imprimante "lente"  (200 ms)
                          ▲    ▲
                   pret1 ─┘    └─ pret2      « je suis libre »
```

Image : une boutique. Les utilisateurs déposent au **guichet** (`balImp`). Le **serveur** est l'employé : il donne chaque document à une imprimante libre. Les imprimantes **lèvent la main** quand elles sont libres (`pret1`, `pret2`).

```go
func imprimante(nom string, t TImpression, vitesse int, balImp <-chan Impression, pret chan<- bool) {
	pret <- true // libre dès le départ
	for imp := range balImp {
		// … impression, puis imp.ack <- nom …
		pret <- true // de nouveau libre
	}
}

func serveur(balImp <-chan Impression) {
	c1, c2 := make(chan Impression), make(chan Impression)
	pret1, pret2 := make(chan bool, 1), make(chan bool, 1) // 1 place : voir le piège
	var w sync.WaitGroup
	w.Go(func() { imprimante("rapide", ImpNoirEtBlanc, 100, c1, pret1) })
	w.Go(func() { imprimante("lente", ImpNoirEtBlanc, 200, c2, pret2) })
	for imp := range balImp {
		select { // attend la PREMIÈRE imprimante libre
		case <-pret1:
			c1 <- imp
		case <-pret2:
			c2 <- imp
		}
	}
	close(c1) // plus de documents : les imprimantes sortent de leur range
	close(c2)
	w.Wait()
}
```

Dans `main`, on lance `serveur(c)` à la place de l'imprimante, avec `wServ.Go(...)`. Le reste ne change pas : les utilisateurs, `wUser.Wait()`, `close(c)`, `wServ.Wait()`.

**`select`** attend sur plusieurs channels à la fois et exécute le premier `case` prêt. Si plusieurs le sont, Go en choisit un au hasard.

**La terminaison, dans l'ordre :** `main` ferme `c`, le serveur sort de sa boucle et ferme `c1` et `c2`, les imprimantes sortent de leur `range`, le serveur les attend, puis `main` attend le serveur.

**Le piège : `pret` a 1 place.** Après son dernier document, chaque imprimante dit encore `pret <- true`, mais le serveur ne lit plus `pret`. Sans place, elle reste bloquée sur cet envoi, n'atteint jamais le `range` qui verrait le `close`, et le `w.Wait()` du serveur l'attend pour toujours : **deadlock** (testé). Une place suffit, car une imprimante ne dit jamais deux fois « libre » de suite sans recevoir un document entre les deux.

**Résultat** (mon `impressions.go`, 5 exécutions) : 6 documents sur la rapide, 4 sur la lente, en 0,80 s au lieu de 1,3 s avec une seule imprimante. La rapide se libère deux fois plus souvent, donc elle en reçoit plus.

**Erreurs rencontrées (deadlock immédiat) :**
- pas de `pret <- true` **avant** la boucle : le serveur attend une main levée, les imprimantes attendent un document ;
- `main` qui appelle seulement `serveur(c)` : aucun utilisateur, et personne ne ferme `c`.
