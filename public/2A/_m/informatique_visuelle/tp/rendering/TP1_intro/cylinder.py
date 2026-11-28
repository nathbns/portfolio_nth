import numpy as np
from exportToPly import write_ply_file
import math

vertices = np.array([
  [0.0,0.0,0.0], #first vertex
  [1.0,0.0,0.0], #second vertex
  [0.0,1.0,0.0], #third vertex
])


pointPerRing = 8
nbRing = 3

vertices = []
triangles = []

for i in range (nbRing) :
  for j in range (pointPerRing):
    phi = j/pointPerRing * 2.0 * np.pi
    x= math.cos(phi)
    y= math.sin(phi)
    z= i
    vertices.append([x,y,z])
vertices = np.array(vertices)

for i in range (nbRing-1) : 
  for j in range (pointPerRing) :
    v1 = i* pointPerRing + j
    v2 = i* pointPerRing + j +1 
    if j == pointPerRing-1 :
      v2 = i* pointPerRing
    v3 = v1 + pointPerRing
    v4 = v2 + pointPerRing
    triangles.append([v1,v2,v3])
    triangles.append([v3,v2,v4])


vertices = np.array(vertices)
triangles = np.array(triangles)

write_ply_file(vertices, triangles, 'cylinder.ply' )