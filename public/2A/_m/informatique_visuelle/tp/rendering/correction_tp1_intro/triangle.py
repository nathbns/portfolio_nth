import numpy as np

vertices = np.array([
  [0.0,0.0,0.0], #first vertex
  [1.0,0.0,0.0], #second vertex
  [0.0,1.0,0.0], #third vertex
])

triangles = np.array([
  [0,1,2] # create a triangle with the first second and third vertices
], dtype=int)

from exportToPly import write_ply_file
write_ply_file(vertices,triangles, 'triangle.ply' )