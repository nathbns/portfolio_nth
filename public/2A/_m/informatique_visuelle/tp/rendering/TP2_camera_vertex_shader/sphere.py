import numpy as np


# la sphère du TP1, en fonction : rayon 1, centrée sur l'origine
def generateSphere(pointPerRing=16, nbRing=12):
  vertices = []
  triangles = []

  for i in range(nbRing):
    theta = i / (nbRing - 1) * np.pi
    z = np.cos(theta)
    ringRadius = np.sin(theta)
    for j in range(pointPerRing):
      phi = j / pointPerRing * 2.0 * np.pi
      vertices.append([ringRadius * np.cos(phi), ringRadius * np.sin(phi), z])

  for i in range(nbRing - 1):
    for j in range(pointPerRing):
      v1 = i * pointPerRing + j
      v2 = i * pointPerRing + (j + 1) % pointPerRing
      v3 = v1 + pointPerRing
      v4 = v2 + pointPerRing
      triangles.append([v1, v2, v3])
      triangles.append([v3, v2, v4])

  return np.array(vertices), np.array(triangles, dtype=int)
