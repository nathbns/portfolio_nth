import numpy as np
from exportToPly import write_ply_file

vertices = []
triangles = []

pointPerRing = 8
nbRing = 8
radius = 1.0

# Uniform spacing of the polar angle theta gives equal angular steps between
# rings, so every meridian segment from one ring to the next has the same
# chord length (2*radius*sin(dTheta/2), constant since dTheta is constant).
for i in range (nbRing) :
  theta = i/(nbRing-1) * np.pi
  z = radius * np.cos(theta)
  ringRadius = radius * np.sin(theta)
  for j in range (pointPerRing) :
    phi = j/pointPerRing * 2.0 * np.pi
    x = ringRadius * np.cos(phi)
    y = ringRadius * np.sin(phi)
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

write_ply_file(vertices,triangles, 'sphere.ply' )
