import numpy as np


def scaleMatrix(s):
  return np.array([
    [s, 0, 0, 0],
    [0, s, 0, 0],
    [0, 0, s, 0],
    [0, 0, 0, 1],
  ])


def translationMatrix(t):
  return np.array([
    [1, 0, 0, t[0]],
    [0, 1, 0, t[1]],
    [0, 0, 1, t[2]],
    [0, 0, 0, 1],
  ])


def rotationMatrixY(angle):
  c, s = np.cos(angle), np.sin(angle)
  return np.array([
    [c,  0, s, 0],
    [0,  1, 0, 0],
    [-s, 0, c, 0],
    [0,  0, 0, 1],
  ])


# (donnée par le sujet) d'abord la taille, puis on éloigne, puis on tourne
def planetModelMatrix(t, orbitRadius, planetRadius, orbitSpeed):
  S = scaleMatrix(planetRadius)
  T = translationMatrix(np.array([orbitRadius, 0.0, 0.0]))
  R = rotationMatrixY(t * orbitSpeed)
  return R @ T @ S


# (donnée par le sujet) la lune tourne autour de sa planète, puis suit la planète
def moonModelMatrix(t, planetMatrix, moonOrbitRadius, moonRadius, moonOrbitSpeed):
  S = scaleMatrix(moonRadius)
  T = translationMatrix(np.array([moonOrbitRadius, 0.0, 0.0]))
  R = rotationMatrixY(t * moonOrbitSpeed)
  return planetMatrix @ R @ T @ S
