import numpy as np
from exportToPly import write_ply_file

vertices = np.array([
  [0.0,0.0,0.0], #first vertex
  [1.0,0.0,0.0], #second vertex
  [0.0,1.0,0.0], #third vertex
])

triangles = np.array([
  [0,1,2] # create a triangle with the first, second, and third vertices
], dtype=int)

write_ply_file(vertices,triangles, 'triangle.ply' )
