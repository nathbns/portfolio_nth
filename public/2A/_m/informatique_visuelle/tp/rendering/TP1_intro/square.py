import numpy as np
from exportToPly import write_ply_file

vertices = np.array([
  [0.0,0.0,0.0], #first vertex
  [1.0,0.0,0.0], #second vertex
  [0.0,1.0,0.0], #third vertex
  [1.0,1.0,0.0], #fourth vertex
])

square = np.array([
  [0,1,2], # create a triangle with the first, second, and third vertices
  [3,2,1] 
], dtype=int)

write_ply_file(vertices, square, 'square.ply' )
