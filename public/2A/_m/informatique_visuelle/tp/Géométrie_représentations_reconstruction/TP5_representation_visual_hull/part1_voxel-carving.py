import matplotlib.image as mpimg
import numpy as np
from skimage import measure
import trimesh


# Camera Calibration for Al's silhouettes image[0..11].pgm   
# calib[i] is the flattened camera matrix (dimensions: 3x4)
#   calib[i][0: 4] -> first  row (4 elements)
#   calib[i][4: 8] -> second row (4 elements)
#   calib[i][8:12] -> third  row (4 elements)
calib = np.array([
    [-78.8596, -178.763, -127.597, 300, -230.924,        0, -33.6163, 300, -0.525731,         0,  -0.85065, 2],
    [       0, -221.578,  73.2053, 300, -178.763, -127.597, -78.8596, 300,         0,  -0.85065, -0.525731, 2],
    [ 78.8596, -178.763, -127.597, 300, -73.2053,        0, -221.578, 300,  0.525731,         0,  -0.85065, 2],
    [       0,  33.6163, -230.924, 300, -178.763,  127.597, -78.8596, 300,         0,   0.85065, -0.525731, 2],
    [-78.8596, -178.763,  127.597, 300,  73.2053,        0,  221.578, 300, -0.525731,         0,   0.85065, 2],
    [ 78.8596, -178.763,  127.597, 300,  230.924,        0,  33.6163, 300,  0.525731,         0,   0.85065, 2],
    [       0, -221.578, -73.2053, 300,  178.763, -127.597,  78.8596, 300,         0,  -0.85065,  0.525731, 2],
    [       0,  33.6163,  230.924, 300,  178.763,  127.597,  78.8596, 300,         0,   0.85065,  0.525731, 2],
    [-33.6163, -230.924,        0, 300, -127.597, -78.8596,  178.763, 300,  -0.85065, -0.525731,         0, 2],
    [-221.578, -73.2053,        0, 300, -127.597,  78.8596,  178.763, 300,  -0.85065,  0.525731,         0, 2],
    [ 221.578, -73.2053,        0, 300,  127.597,  78.8596, -178.763, 300,   0.85065,  0.525731,         0, 2],
    [ 33.6163, -230.924,        0, 300,  127.597, -78.8596, -178.763, 300,   0.85065, -0.525731,         0, 2]
])

# Build 3D grids
# 3D Grids are of size: resolution x resolution x resolution/2
resolution = 100
step = 2 / resolution

# Voxel coordinates
X, Y, Z = np.mgrid[-1:1:step, -1:1:step, -0.5:0.5:step]

# Voxel occupancy: Voxels are initially occupied
#   then carved with silhouette information
occupancy = np.ndarray((resolution, resolution, resolution // 2), dtype=int)
occupancy.fill(1)

if __name__ == "__main__":
    
    # Read input silhouette 0 (TODO: read all silhouettes)
    i = 0
    myFile = "image{0}.pgm".format(i)
    print(myFile)
    img = mpimg.imread(myFile)
    if img.dtype == np.float32:  # if not integer
        img = (img * 255).astype(np.uint8)

    # TODO: Compute grid projection in images

    # TODO: Update grid occupancy

    # Voxel visualization:
    # 1. Use the marching cubes algorithm
    verts, faces, _, _ = measure.marching_cubes(occupancy, 0.25)
    # 2. Export in a standard file format
    surf_mesh = trimesh.Trimesh(verts, faces, validate=True)
    surf_mesh.export('alvoxels.off')
