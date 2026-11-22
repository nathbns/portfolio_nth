import numpy as np
from exportToPly import write_ply_file

vertices = []
triangles = []

pointPerRing = 8
nbRing = 3

for i in range (nbRing) : 
  for j in range (pointPerRing) :
    phi = j/pointPerRing * 2.0 * np.pi
    x = np.cos(phi) 
    y = np.sin(phi)
    z = i
    vertices.append([x,y,z])


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

from exportToPly import write_ply_file
write_ply_file(vertices,triangles, 'cylinder.ply' )

