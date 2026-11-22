from typing import Callable

import numpy as np
import matplotlib.pyplot as plt

type Point = tuple[float, float]
type Segment = tuple[Point, Point]
type ScalarField = Callable[..., float]

# =============================================================================
# Visualization
# =============================================================================

def plot_scalar_field(
    f: ScalarField,
    level: float | None = None, # uses matplotlib.axes.Axes.contour for reference
    xlim: tuple[float, float] = (-3, 3),
    ylim: tuple[float, float] = (-3, 3),
    nx: int = 32,
    ny: int = 32,
    segments: list[Segment] | None = None, # result of marching_squares
):
    """
    Sample and display a scalar field on a regular grid.

    Parameters
    ----------
    f : callable
        Scalar field f(x, y). Must accept NumPy arrays.
    level : float, optional
        Level value to display with matplotlib `contour` function.
    xlim, ylim : tuple[float, float]
        Bounds of the rectangular domain.
    nx, ny : int
        Number of samples along x and y.
    segments : iterable, optional
        Level-set segments to display. Each segment is given as
        ((x0, y0), (x1, y1)).
    """
    x = np.linspace(*xlim, nx)
    y = np.linspace(*ylim, ny)
    X, Y = np.meshgrid(x, y)
    Z = f(X, Y)

    fig, ax = plt.subplots()

    # align imshow pixels with grid boundaries
    dx = x[1] - x[0]
    dy = y[1] - y[0]
    image = ax.imshow(
        Z,
        extent=(
            xlim[0] - dx / 2,
            xlim[1] + dx / 2,
            ylim[0] - dy / 2,
            ylim[1] + dy / 2,
        ),
        origin="lower",
        aspect="equal",
        cmap="viridis",
        interpolation="none",
    )

    # Draw cell boundaries.
    for x_value in x:
        _ = ax.axvline(
            x_value,
            color="white",
            linewidth=0.25,
            alpha=0.25,
        )

    for y_value in y:
        _ = ax.axhline(
            y_value,
            color="white",
            linewidth=0.25,
            alpha=0.25,
        )

    # Reference contour
    if level is not None:
        _ = ax.contour(
            X, Y, Z,
            levels=[level],
            colors="black",
            linewidths=4,
        )

    # Marching squares segment
    if segments is not None:
        for (x0, y0), (x1, y1) in segments:
            _ = ax.plot(
                [x0, x1], [y0, y1],
                color="red",
                linewidth=1,
            )

    ax.set_xlabel("$x$")
    ax.set_ylabel("$y$")
    fig.colorbar(image, ax=ax, label="$f(x,y)$")

    plt.show()

# =============================================================================
# Scalar fields
# =============================================================================

def scalar_field1(x, y): return x**2 + y**2
def scalar_field2(x, y): return x**2 - y**2
def scalar_field3(x, y): return np.sin(x) + np.cos(y)
def scalar_field4(x, y): return np.exp(-(x**2 + y**2))
def scalar_field5(x, y): return np.exp(-((x - 1.5)**2 + y**2)) + np.exp(-((x + 1.5)**2 + y**2))
def scalar_field6(x, y):
    r = np.sqrt(x**2 + y**2)
    theta = np.arctan2(y, x)
    return r - 2 - 0.3 * np.cos(3 * theta)

# =============================================================================
# Implementation
# =============================================================================

# Question 1
def cell_index(
    cell_values: list[float], 
    level: float
) -> int:
    ...

# Question 2
def crossed_edges(
    cell_values: list[float], 
    level: float
) -> list[bool]:
    ...

# Question 3
def edge_intersection(
    p0: Point,
    p1: Point,
    f: ScalarField,
    level: float,
) -> Point:
    ...

# Question 4
def cell_intersections(
    cell_points: list[Point],
    f: ScalarField,
    level: float,
) -> list[Point | None]:
    ...

# Question 5
def cell_segments(
    cell_points: list[Point],
    f: ScalarField,
    level: float,
) -> list[Segment]:
    ...

# Question 6
def marching_squares(
    X: np.ndarray, # obtained from np.meshgrid
    Y: np.ndarray, # obtained from np.meshgrid
    f: ScalarField,
    level: float,
) -> list[Segment]:
    ...


# =============================================================================
# Main
# =============================================================================

if __name__ == "__main__":
    # Example of visualization
    plot_scalar_field(
        scalar_field1,
        xlim=(-3, 3),
        ylim=(-3, 3),
        nx=16,
        ny=16,
    )
