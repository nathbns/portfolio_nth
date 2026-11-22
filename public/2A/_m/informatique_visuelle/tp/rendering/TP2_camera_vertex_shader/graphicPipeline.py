import numpy as np


class GraphicPipeline:

  def __init__ (self):
    self.newVertices = ()
    pass

  def VertexShader(self, vertex, data) :
    outputVertex = np.zeros_like(vertex)
    
    #todo

    return outputVertex



  def draw(self, vertices, triangles, data):
    self.newVertices = np.zeros_like(vertices)

    for i in range(vertices.shape[0]) :
      self.newVertices[i] = self.VertexShader(vertices[i],data)
      pass
