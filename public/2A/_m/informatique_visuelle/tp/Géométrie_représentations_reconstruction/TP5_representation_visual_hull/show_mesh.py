import matplotlib.pyplot as plt
import trimesh
import numpy as np

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Simple display for 3D meshes.')
    parser.add_argument('file', metavar='mesh_file', type=str, help='the mesh to display')
    args = parser.parse_args()

    mesh = trimesh.load_mesh(args.file)
    print(mesh)

    fig = plt.figure()
    ax = fig.add_subplot(projection='3d')

    _ = ax.plot_trisurf(
        mesh.vertices[:, 0],
        mesh.vertices[:, 1],
        mesh.vertices[:, 2],
        triangles=mesh.faces,
        linewidth=0.2,
        antialiased=True
    )
    ax.set_box_aspect(np.ptp(mesh.vertices, axis=0))
    plt.show()
