# TP Go 2 : le vol de travail

Sujet : `tp-ws-go.pdf` (Ensimag, Algorithmique et Programmation Parallèle, 2026-2027). Code : [srcTP-WS/](srcTP-WS/). À faire sur le Mac avec Go 1.25 (`make`, puis `./mandel <version> -p 4 -o image.png`).

| Partie | Notion | Réponses |
|---|---|---|
| 2 | `natif` (l'ordonnanceur de Go) contre `blocs` (répartition statique) | [question2.md](question2.md) |
| 3 | `vol` : une file par goroutine, vol avec `select … default` | à venir |
| 4 | `volrec-fifo`, `volrec` : tâches créées récursivement, deque | à venir |

## Le problème
- Une image de Mandelbrot : pour chaque pixel, une boucle qui s'arrête vite… ou au bout de `iter` = 5000 tours.
- Le travail est **très inégal** : le cœur de la figure coûte cher, le bord presque rien.
- On découpe l'image en rectangles et on les répartit entre p goroutines. Tout le TP : **bien répartir un travail inégal**, jusqu'au vol de travail.

## Les trois mots du sujet
| mot | ce que c'est | dans le code |
|---|---|---|
| tâche | le travail sur un rectangle | `Calculer(P, img, r, i)` |
| descripteur | la donnée qui décrit la tâche | `Rect{Y, X, H, L}` : ligne et colonne de départ, nombre de lignes et de colonnes |
| goroutine | celle qui exécute les tâches | `wg.Go(func() { ... })` |

## Le code fourni
- `natif.go` : le **modèle** (découpe en rectangles, une goroutine par rectangle, `wg.Wait()`).
- `commun.go` : à ne pas modifier. Utile : `Rect`, `Stats` (Taches, Vols, Echecs, FileMax), `Calculer`.
- `blocs.go`, `vol.go`, `volrec.go` : à compléter ; le commentaire de chaque fonction dit ce qu'on attend.
- Sortie : `version p taille iter m n temps rectangles vols echecs file_max`, le temps étant le min de 3 exécutions.

## Lire un sujet de ce type à l'examen
- **Tout lire avant d'écrire** : les versions se construisent l'une sur l'autre.
- **Le sujet donne les faits utiles** : pas besoin de comprendre le calcul (ici Mandelbrot). La phrase « le travail est très inégalement réparti dans l'image » (page 1) suffit à expliquer la Q2.2.
- **Les indices sont entre parenthèses et en bas de page** (numéro `i` passé à `Calculer`, explication de l'ordonnanceur de Go en Q2.2, « c'est le rôle du cas `default` » en Q3.1).
- **Les mots de contrainte** (« doit », « ne doit pas », « au moins », « sans ») cachent chacun un piège.
- **« Comme X »** renvoie à quelque chose de déjà fait : la formule est là-bas.
- **L'annexe A est la boîte à outils** : chaque paragraphe sert à une question.

| annexe | sert à |
|---|---|
| `sync.WaitGroup`, `wg.Go` | toutes les versions |
| `select` + `default` | voler sans bloquer (Q3.1) |
| `rand.IntN` (« n ≤ 0 : erreur fatale ») | choisir une victime, et prévoir p = 1 (Q3.1) |
| « Compter sans partager » | remplir `Stats` sans data race (Q3.1) |
| `len` et `cap` d'un channel | taille max des files (Q4.1) |
| `sync/atomic` | savoir quand s'arrêter (Q4.1) |
| `sync.Mutex`, slice en pile ou en file | la deque (Q4.2) |
