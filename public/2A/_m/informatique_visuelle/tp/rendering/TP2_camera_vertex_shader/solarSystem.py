import numpy as np
from camera import Camera
from projection import Projection
from graphicPipeline import GraphicPipeline
from exportToPly import write_ply_file
from sphere import generateSphere
from matrices import scaleMatrix, planetModelMatrix, moonModelMatrix

cam = Camera(np.array([5,5,5]), np.array([-0.577,-0.577,-0.577]),
             np.array([0.33333333, 0.33333333, -0.66666667]), np.array([-0.57735027, 0.57735027, 0.]))
proj = Projection(1.0, 20.0, 1.22173, 16/9)

# 1) une seule sphère pour tous les astres
vertices, triangles = generateSphere()

pipeline = GraphicPipeline()

# 7) plusieurs valeurs de t
for t in range(8):
  terre = planetModelMatrix(t, 2.8, 0.35, 0.6)
  astres = [
    scaleMatrix(1.0),                             # soleil : juste une taille
    planetModelMatrix(t, 1.8, 0.20, 1.2),         # mercure
    terre,
    planetModelMatrix(t, 3.8, 0.25, 0.4),         # mars
    moonModelMatrix(t, terre, 2.2, 0.35, 2.0),    # lune, autour de la terre
  ]

  # 6) un draw par astre, puis tout dans un seul fichier
  allVertices, allTriangles = [], []
  for k, modelMatrix in enumerate(astres):
    data = dict([
      ('modelMatrix', modelMatrix),
      ('viewMatrix', cam.getMatrix()),
      ('projMatrix', proj.getMatrix())
    ])
    pipeline.draw(vertices, triangles, data)
    allVertices.append(pipeline.newVertices.copy())
    allTriangles.append(triangles + k * len(vertices))   # décaler les numéros de sommets

  write_ply_file(np.vstack(allVertices), np.vstack(allTriangles), f'systeme_t{t}.ply')
