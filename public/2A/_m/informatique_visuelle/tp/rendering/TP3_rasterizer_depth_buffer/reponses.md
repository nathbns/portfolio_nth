# TP3 : temps mesurés et réponses

Scène du sujet (cube), 1280 × 720, moyenne de 5 passages.

| rasterizer | temps |
|---|---|
| tous les pixels de l'image (sans optimisation) | 10,4 s |
| boîte englobante | 0,45 s (≈ 23 fois plus rapide) |
| scan line | 0,105 s |

Les trois versions donnent exactement la même image.

**Laquelle est la plus rapide ?** Le scan line, environ **4 fois** plus rapide que la boîte englobante.

**Pourquoi le scan line fait moins de travail ?** La boîte englobante teste chaque pixel du rectangle, dont une grande partie est hors du triangle (un triangle couvre au plus la moitié de sa boîte). Le scan line calcule directement, pour chaque ligne, le segment de pixels couverts : il ne teste aucun pixel pour rien. Ici, il écarte aussi tout de suite les triangles mal orientés (faces arrière), alors que la boîte englobante parcourt leur rectangle sans rien dessiner.

**Et avec la résolution, la taille des triangles ?**
- Résolution : l'écart **en temps** grandit (0,09 s gagnées en 640 × 360, 0,35 s en 1280 × 720, 1,4 s en 2560 × 1440), mais le **rapport** reste ≈ 4 : les pixels testés pour rien augmentent dans la même proportion que les pixels utiles.
- Taille des triangles : pour de grands triangles, le gain du scan line est maximal (il ne paie qu'un petit calcul par ligne) ; pour de tout petits triangles (quelques pixels), ce calcul par ligne et le tri des sommets coûtent autant que les tests, et l'écart diminue. Le gain est le plus fort pour les triangles fins et en biais, dont la boîte est presque vide.
