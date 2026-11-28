import numpy as np

class Fragment:
  def __init__(self, x : int, y : int, depth : float):
    self.x = x
    self.y = y
    self.depth = depth

def edgeSide(p, v0, v1) : 
  return (p[0] - v0[0]) * (v1[1] - v0[1]) - (p[1] - v0[1]) * (v1[0] - v0[0])

class GraphicPipeline:
  def __init__ (self, width, height):
    self.width = width
    self.height = height
    self.depthBuffer = np.ones((height, width))

  def VertexShader(self, vertex, data) :
    outputVertex = np.zeros_like(vertex)
    x = vertex[0]
    y = vertex[1]
    z = vertex[2]
    w = 1.0


    vec = np.array([[x],[y],[z],[w]])
    vec = np.matmul(data['projMatrix'],np.matmul(data['viewMatrix'],vec))


    outputVertex[0] = vec[0, 0] / vec[3, 0]
    outputVertex[1] = vec[1, 0] / vec[3, 0]
    outputVertex[2] = vec[2, 0] / vec[3, 0]

    return outputVertex


  def Rasterizer(self, v0, v1, v2) :
    fragments = []

    # boîte englobante du triangle, en numéros de pixels (sans sortir de l'image)
    imin = max(0, int((min(v0[0], v1[0], v2[0]) + 1) / 2 * self.width))
    imax = min(self.width - 1, int((max(v0[0], v1[0], v2[0]) + 1) / 2 * self.width))
    jmin = max(0, int((min(v0[1], v1[1], v2[1]) + 1) / 2 * self.height))
    jmax = min(self.height - 1, int((max(v0[1], v1[1], v2[1]) + 1) / 2 * self.height))

    for j in range(jmin, jmax + 1) :
      for i in range(imin, imax + 1) :
        x = (i + 0.5) / self.width * 2 - 1
        y = (j + 0.5) / self.height * 2 - 1
        p = [x, y]
        e0 = edgeSide(p, v1, v2) # arrete opposée a v0
        e1 = edgeSide(p, v2, v0) # arrete opposée a v1
        e2 = edgeSide(p, v0, v1) # arrete opposée a v2

        if e0 >= 0 and e1 >= 0 and e2 >= 0:
          total = edgeSide(v0, v1, v2) # aire du triangle entier
          l0 = e0 / total # le poid de v0
          l1 = e1 / total # le poid de v1
          l2 = e2 / total # le poid de v2
          
          depth = l0 * v0[2] + l1 * v1[2] + l2 * v2[2]
          fragments.append(Fragment(i, j, depth))
    
    return fragments

  def RasterizerScanLine(self, v0, v1, v2) :
    fragments = []
    total = edgeSide(v0, v1, v2)
    if total <= 0 :   # comme Rasterizer : seuls les triangles dans ce sens sont dessinés
      return fragments

    # 1) coordonnées écran (le centre du pixel i est en i), triées par y croissant
    def ecran(v) :
      return ((v[0] + 1) / 2 * self.width - 0.5, (v[1] + 1) / 2 * self.height - 0.5)
    haut, milieu, bas = sorted([ecran(v0), ecran(v1), ecran(v2)], key=lambda s: s[1])

    # x où l'arête a-b coupe la ligne y (interpolation linéaire le long de l'arête)
    def xSurArete(a, b, y) :
      if b[1] == a[1] :
        return a[0]
      return a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])

    # 2) pour chaque ligne entre le sommet du haut et celui du bas
    for j in range(max(0, int(np.ceil(haut[1]))), min(self.height - 1, int(np.floor(bas[1]))) + 1) :
      xa = xSurArete(haut, bas, j)            # la grande arête
      if j < milieu[1] :
        xb = xSurArete(haut, milieu, j)       # moitié haute du triangle
      else :
        xb = xSurArete(milieu, bas, j)        # moitié basse
      gauche, droite = min(xa, xb), max(xa, xb)

      # 3) entre les deux bornes (dans l'image) : un fragment par pixel, profondeur comme avant
      for i in range(max(0, int(np.ceil(gauche))), min(self.width - 1, int(np.floor(droite))) + 1) :
        p = [(i + 0.5) / self.width * 2 - 1, (j + 0.5) / self.height * 2 - 1]
        l0 = edgeSide(p, v1, v2) / total
        l1 = edgeSide(p, v2, v0) / total
        l2 = edgeSide(p, v0, v1) / total
        depth = l0 * v0[2] + l1 * v1[2] + l2 * v2[2]
        fragments.append(Fragment(i, j, depth))

    return fragments

  def draw(self, vertices, triangles, data, scanLine=False):
    self.newVertices = np.zeros_like(vertices)

    for i in range(vertices.shape[0]) :
       self.newVertices[i] = self.VertexShader(vertices[i],data)


    fragments = []
    for t in triangles :
      v0 = self.newVertices[t[0]]    # les 3 sommets du triangle, déjà projetés
      v1 = self.newVertices[t[1]]
      v2 = self.newVertices[t[2]]
      if scanLine :
        fragments += self.RasterizerScanLine(v0, v1, v2)
      else :
        fragments += self.Rasterizer(v0, v1, v2)

    for f in fragments:
        if f.depth < self.depthBuffer[f.y][f.x]:
          self.depthBuffer[f.y][f.x] = f.depth