import numpy as np
from exportToPly import write_ply_file

vertices = np.array([
  [0.0,0.0,0.0], #0
  [1.0,0.0,0.0], #1
  [0.0,1.0,0.0], #2 
  [1.0,1.0,0.0], #3 
  [0.0,0.0,1.0], #4 
  [1.0,0.0,1.0], #5 
  [0.0,1.0,1.0], #6
  [1.0,1.0,1.0], #7
])

triangles = np.array([
  [1,0,2],
  [3,1,2],
  [4,5,6],
  [5,7,6],
  [0,1,4],
  [4,1,5],
  [2,6,3],
  [3,6,7],
  [0,6,2],
  [4,6,0],
  [1,3,7],
  [5,1,7]
], dtype=int)

from exportToPly import write_ply_file
write_ply_file(vertices,triangles, 'cube.ply' )