import numpy as np
from camera import Camera
from projection import Projection

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


# camera

position = np.array([5,5,5])
lookAt = np.array([-0.577,-0.577,-0.577])
up = np.array([0.33333333,  0.33333333, -0.66666667])
right = np.array([-0.57735027,  0.57735027,  0.])

cam = Camera(position, lookAt, up, right)


# projection
nearPlane = 1.0
farPlane = 20.0
fov = 1.22173
aspectRatio = 16/9

proj = Projection(nearPlane ,farPlane,fov, aspectRatio)

data = dict([
  ('viewMatrix', cam.getMatrix()),
  ('projMatrix', proj.getMatrix())
])

from generateFrustum import generateFrustum
generateFrustum(cam, proj)

from exportToPly import write_ply_file
write_ply_file(vertices,triangles, 'cube.ply' )

from graphicPipeline import GraphicPipeline
pipeline = GraphicPipeline()
pipeline.draw(vertices, triangles, data)

from generateFrustum import generateFrustumCameraSpace
newvertices = pipeline.newVertices
generateFrustumCameraSpace(proj)
write_ply_file(newvertices,triangles,'cubeCamera.ply' )

write_ply_file(newvertices,triangles, 'cubeProjected.ply' )
from generateFrustum import generateProjectedFrustum
generateProjectedFrustum()