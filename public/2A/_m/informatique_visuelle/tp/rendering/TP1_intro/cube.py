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

cube = np.array([
    #bas
    [0, 2, 1],
    [3, 1, 2],

    #face
    [4, 0, 1],
    [4, 1, 5],

    #droite
    [5, 1, 3],
    [5, 3, 7],

    #gauche
    [6, 2, 0],
    [6, 0, 4],

    #dos
    [7, 3, 2],
    [7, 2, 6],

    #dessus
    [6, 4, 5],
    [6, 5, 7]
], dtype=int)

write_ply_file(vertices, cube, 'cube.ply' )
