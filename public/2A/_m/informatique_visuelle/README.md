# Introduction à l'informatique visuelle

| Contenu | |
|---|---|
| [CM1 Introduction : image, couleur, maillages, caméra](cm1_intro/) | Pixels et RGB, vision humaine, gamut, conversions RGB vers CMYK et vers HSL, scène, pourquoi des triangles, triangle soup contre indexed triangle (question mémoire), autres représentations, caméra et frustum. [Vidéo](cm1_intro/video.mp4) |
| [CM2 Vertex shader : de l'espace objet à l'espace projeté](cm2_vertex_shader/) | Le pipeline, model = T R S, view, projection perspective, division par w. [Vidéo](cm2_vertex_shader/video.mp4) |
| [CM3 Rasterizer et depth buffer (exercice)](cm3_rasterisation/) | `edgeSide`, boîte englobante, coordonnées barycentriques, interpolation de la profondeur, depth buffer. [Vidéo](cm3_rasterisation/video.mp4) |
| [CM4 Fragment shader : le modèle de Phong](cm4_fragment_shader/) | Ambiant, diffus, spéculaire, vecteurs N, L, V, R, brillance, normales interpolées, textures. [Vidéo](cm4_fragment_shader/video.mp4) |
| [CM5 Représentations de la géométrie et visual hull](cm5_visual_hull/) | Trois formes d'une droite et la bonne forme pour chaque tâche, explicite contre implicite (maillages, nuages de points, SDF, voxels, neural implicits), silhouettes, visual hull et son algorithme sur une grille de voxels. [Vidéo](cm5_visual_hull/video.mp4) |
| [CM6 Caméra sténopé et calibration](cm6_calibration/) | Modèle sténopé, matrice K, paramètres intrinsèques et extrinsèques, DLT, erreur de reprojection. [Vidéo](cm6_calibration/video.mp4) |
| [CM7 Marching squares et marching cubes (exercice)](cm7_marching_cubes/) | Courbe de niveau sur une grille, interpolation sur les arêtes, cas ambigu, passage au marching cubes. [Vidéo](cm7_marching_cubes/video.mp4) |
| [Corrections des TP en vidéo](tp/tp_videos_corrections) | Les 8 TP dans l'ordre : le cours utile, puis la correction question par question et ce qu'il faut retenir. Vidéos : [TP1 maillages](tp/tp_videos_corrections/TP1_maillages_ply.mp4) ; [TP2 caméra](tp/tp_videos_corrections/TP2_camera_vertex_shader.mp4) ; [TP3 rasterizer](tp/tp_videos_corrections/TP3_rasterizer_depth_buffer.mp4) ; [TP4 Phong](tp/tp_videos_corrections/TP4_fragment_shader_phong.mp4) ; [TP5 visual hull](tp/tp_videos_corrections/TP5_visual_hull.mp4) ; [TP6 calibration](tp/tp_videos_corrections/TP6_calibration.mp4) ; [TP7 marching squares](tp/tp_videos_corrections/TP7_marching_squares.mp4) ; [TP8 réseaux de neurones](tp/tp_videos_corrections/TP8_reseaux_de_neurones.mp4) |

Examen : vendredi 11 décembre, 9h00-11h00, écrit (questions de cours, de TP et de raisonnement).

Liste des TP à faire, avec ce qui est fait : [tp_liste.md](tp_liste.md).

