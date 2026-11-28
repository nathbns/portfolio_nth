import numpy as np


class GraphicPipeline:

  def __init__ (self):
    self.newVertices = ()
    pass

  def VertexShader(self, vertex, data) :
    v = np.append(vertex, 1.0) # [x, y, z, 1]
    v = data.get('modelMatrix', np.identity(4)) @ v # on applique la matrice model (identité si absente)
    v = data['viewMatrix'] @ v # on applique la matrice view au vertex
    v = data['projMatrix'] @ v # on applique la matrice projection au vertex
    outputVertex = v[0:3] / v[3] # on garde [x, y, z] / w
    return outputVertex



  def draw(self, vertices, triangles, data):
    self.newVertices = np.zeros_like(vertices)

    for i in range(vertices.shape[0]) :
      self.newVertices[i] = self.VertexShader(vertices[i],data)
      pass
