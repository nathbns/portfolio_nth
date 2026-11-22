import numpy as np

class Fragment:
  def __init__(self, x : int, y : int, depth : float):
    self.x = x
    self.y = y
    self.depth = depth

def edgeSide(p, v0, v1) : 
  pass
  #todo

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


    outputVertex[0] = vec[0]/vec[3]
    outputVertex[1] = vec[1]/vec[3]
    outputVertex[2] = vec[2]/vec[3]

    return outputVertex


  def Rasterizer(self, v0, v1, v2) :
    fragments = []

    for j in range(0, self.height) : 
      for i in range(0, self.width) :
        #x = ...
        #y = ...

        #if inside 
          #emit a fragment
        pass
    
    return fragments

  def draw(self, vertices, triangles, data):
    self.newVertices = np.zeros_like(vertices)

    for i in range(vertices.shape[0]) :
       self.newVertices[i] = self.VertexShader(vertices[i],data)


    fragments = []
    for t in triangles :
      #call the rasterizer the triangle t
      pass

    for f in fragments:
      #todo Process each fragment using the depth buffer
      pass