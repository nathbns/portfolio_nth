# Vidéos de correction des TP

Une vidéo par TP, dans l'ordre. Chacune explique d'abord le cours dont le TP a besoin, puis corrige le TP question par question, et finit par ce qu'il faut retenir pour l'examen.

| TP | Vidéo | Durée | Contenu |
|---|---|---|---|
| TP1 Maillages et fichiers PLY | [TP1_maillages_ply.mp4](TP1_maillages_ply.mp4) | 22 min | Maillages, triangle soup contre indexed triangle, format PLY, ordre des sommets et normales. Dans le code rendu, les normales de la sphère pointent vers l'intérieur : il faut `z = -cos θ`. |
| TP2 Caméra et vertex shader | [TP2_camera_vertex_shader.mp4](TP2_camera_vertex_shader.mp4) | 23 min | Matrices model, view et projection, division par w. Le fichier `cubeCamera.ply` rendu est en fait le cube projeté. |
| TP3 Rasterizer et depth buffer | [TP3_rasterizer_depth_buffer.mp4](TP3_rasterizer_depth_buffer.mp4) | 20 min 30 | `edgeSide`, coordonnées barycentriques, depth buffer, scan line. Le code est juste. La réponse sur la résolution manque l'argument du cours. |
| TP4 Fragment shader et Phong | [TP4_fragment_shader_phong.mp4](TP4_fragment_shader_phong.mp4) | 23 min 40 | Modèle de Phong, textures, matrice des normales. TP pas fait : correction complète. |
| TP5 Visual hull et MLP implicite | [TP5_visual_hull.mp4](TP5_visual_hull.mp4) | 27 min 30 | Silhouettes, voxel carving, représentation implicite par un MLP. Partie 1 : `img[v, u]` doit devenir `img[u, v]`. Partie 2 pas commencée. |
| TP6 Calibration et réalité augmentée | [TP6_calibration.mp4](TP6_calibration.mp4) | 17 min 20 | Matrice K, PnP, DLT, OpenCV. TP pas fait : correction complète. |
| TP7 Marching squares | [TP7_marching_squares.mp4](TP7_marching_squares.mp4) | 23 min 50 | Les 16 cas, interpolation sur les arêtes, cas ambigus. Le code est juste. |
| TP8 Réseaux de neurones | [TP8_reseaux_de_neurones.mp4](TP8_reseaux_de_neurones.mp4) | 23 min 30 | Du neurone au CNN, classification, régression de boîte englobante. TP pas fait : correction complète. |

Les vidéos des TP6 et TP8 ont pour l'instant une voix de synthèse plus simple. Elles seront refaites avec la même voix que les autres après le 28 novembre.
