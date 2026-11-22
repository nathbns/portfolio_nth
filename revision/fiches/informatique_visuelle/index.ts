import type { FicheEntry } from "../types";
import Intro from "./intro";
import VertexShader from "./vertex-shader";
import Rasterisation from "./rasterisation";
import Phong from "./phong";
import VisualHull from "./visual-hull";
import Calibration from "./calibration";
import MarchingCubes from "./marching-cubes";

const S = "informatique_visuelle";

// Fiches de la matière, dans l'ordre du cours.
export const FICHES: FicheEntry[] = [
  {
    meta: {
      slug: "intro",
      subject: S,
      title: "Image, couleur, maillages et caméra",
      summary: "Savoir ce qu'est un pixel, convertir RGB en CMYK et en HSL, compter la mémoire d'un maillage et décrire la caméra.",
      related: ["informatique_visuelle/cm1_intro"],
      order: 1,
      exam: "ecrit",
      minutes: 10,
    },
    Component: Intro,
  },
  {
    meta: {
      slug: "vertex-shader",
      subject: S,
      title: "Vertex shader : model, view, projection",
      summary: "Savoir emmener un sommet de l'espace objet jusqu'à l'écran : T R S, view, projection perspective et division par w.",
      related: ["informatique_visuelle/cm2_vertex_shader"],
      order: 2,
      exam: "ecrit",
      minutes: 10,
    },
    Component: VertexShader,
  },
  {
    meta: {
      slug: "rasterisation",
      subject: S,
      title: "Rasterisation et depth buffer",
      summary: "Savoir remplir un triangle pixel par pixel : edgeSide, boîte englobante, coordonnées barycentriques, profondeur et depth buffer.",
      related: ["informatique_visuelle/cm3_rasterisation"],
      order: 3,
      exam: "ecrit",
      minutes: 9,
    },
    Component: Rasterisation,
  },
  {
    meta: {
      slug: "phong",
      subject: S,
      title: "Fragment shader : le modèle de Phong",
      summary: "Savoir calculer la couleur d'un pixel : ambiant, diffus, spéculaire, vecteurs N, L, V, R et brillance.",
      related: ["informatique_visuelle/cm4_fragment_shader"],
      order: 4,
      exam: "ecrit",
      minutes: 10,
    },
    Component: Phong,
  },
  {
    meta: {
      slug: "visual-hull",
      subject: S,
      title: "Représentations de la géométrie et visual hull",
      summary: "Savoir choisir une représentation de la géométrie et reconstruire un objet à partir de ses silhouettes par voxel carving.",
      related: ["informatique_visuelle/cm5_visual_hull"],
      order: 5,
      exam: "ecrit",
      minutes: 10,
    },
    Component: VisualHull,
  },
  {
    meta: {
      slug: "calibration",
      subject: S,
      title: "Caméra sténopé et calibration",
      summary: "Savoir projeter un point 3D avec K, R et t_C, puis retrouver ces 11 paramètres par DLT et affiner l'erreur de reprojection.",
      related: ["informatique_visuelle/cm6_calibration"],
      order: 6,
      exam: "ecrit",
      minutes: 10,
    },
    Component: Calibration,
  },
  {
    meta: {
      slug: "marching-cubes",
      subject: S,
      title: "Marching squares et marching cubes",
      summary: "Savoir tracer une courbe de niveau sur une grille : cas des coins, interpolation sur les arêtes, cas ambigu, passage en 3D.",
      related: ["informatique_visuelle/cm7_marching_cubes"],
      order: 7,
      exam: "ecrit",
      minutes: 10,
    },
    Component: MarchingCubes,
  },
];
