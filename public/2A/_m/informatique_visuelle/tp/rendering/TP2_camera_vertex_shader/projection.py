import numpy as np
import math

class Projection:
  def __init__(self, near,far,fov,aspectRatio) :
    self.nearPlane = near
    self.farPlane = far
    self.fov = fov
    self.aspectRatio = aspectRatio

  def getMatrix(self) :
    s = 1 / math.tan(self.fov/2)
    a = self.aspectRatio

    return np.array([
      [s/a, 0, 0 ,0],
      [0, s, 0 ,0],
      [0, 0, self.farPlane/(self.farPlane-self.nearPlane) ,-(self.farPlane*self.nearPlane)/(self.farPlane-self.nearPlane)],
      [0, 0 ,1 ,0]
    ])