# Vidéos de correction des TD et TP

Une vidéo de 6 à 8 minutes par partie de TD ou de TP, dans l'ordre des séances. Chacune rappelle le cours utile, puis corrige les questions une par une et finit par ce qu'il faut retenir pour l'examen du 11 décembre. Le SQL montré est celui d'Oracle 19, le SGBD de l'école.

| # | Vidéo | Durée | Contenu |
|---|---|---|---|
| 1 | [TD Hôtels, R1 à R8](01_TD_hotels_R1-R8.mp4) | 7 min | Projection, sélection, jointure, différence ; algèbre et SQL. Dans tes réponses : CapCh oublié en R1, filtre « mer » oublié en R3, jointures sur NH seul au lieu de (NS, NH) en R5, R8 et R9, tables jointes sans lien en R6, réservation exigée à tort en R7. |
| 2 | [TD Hôtels, R9 à R16](02_TD_hotels_R9-R16.mp4) | 7 min | Auto-jointure, GROUP BY, maximum sans LIMIT, « toutes » par différence, division, jours consécutifs. R10 compte les jours libres (COUNT(*) au lieu de COUNT(NCL)), R11 ne garde pas le maximum, R12 à R16 corrigées en entier. |
| 3 | [TP EMP, Q1 à Q12](03_TP_EMP_Q1-Q12.mp4) | 7 min | SELECT, DISTINCT, ORDER BY, LIKE, jointures, EXISTS, auto-jointure, NULL. Seule erreur : Q6 trie par salaire décroissant au lieu de croissant. |
| 4 | [TP EMP, Q13 à Q20](04_TP_EMP_Q13-Q20.mp4) | 7 min 40 | GROUP BY, HAVING, jointures externes, NVL, sous-requêtes. Erreurs : Q14 perd KING (LEFT JOIN), Q15 perd le département 40, Q16 donne NULL sans NVL, Q18 tombe juste par hasard. |
| 5 | [TP Tennis](05_TP_tennis.mp4) | 7 min | Intersection, « pour tout » avec NOT EXISTS, division, auto-jointure, GROUP BY et HAVING. TP pas fait : correction complète. |
| 6 | [TP Transactions, atomicité et cohérence](06_TP_transactions_atomicite_coherence.mp4) | 6 min | COMMIT, ROLLBACK, autocommit, points de sauvegarde, contrainte CHECK. TP pas fait : correction complète. |
| 7 | [TP Transactions, isolation](07_TP_transactions_isolation.mp4) | 6 min 40 | Deux sessions, READ COMMITTED et SERIALIZABLE, interblocage, write skew et SELECT ... FOR UPDATE. TP pas fait : correction complète. |
| 8 | [TD Normalisation, ex. 1.1 à 1.4](08_TD_normalisation_ex1.1-1.4.mp4) | 8 min | DF, fermeture, clés, 2FN, 3FN, BCNF, décomposition et synthèse. TD pas fait : correction complète. |
| 9 | [TD Normalisation, ex. 1.5 à 2.2](09_TD_normalisation_ex1.5-2.2.mp4) | 8 min | Relation abstraite pas à pas, couverture minimale, dépendances multivaluées et 4FN. TD pas fait : correction complète. |

Les requêtes ont été vérifiées sur SQLite : avec les vraies données pour EMP (les 20 résultats attendus du sujet sont retrouvés), sur de petites bases construites pour Hôtels et Tennis. Le comportement d'Oracle en concurrence (vidéo 7) vient de sa documentation : il n'a pas pu être exécuté sur un vrai Oracle.

La vidéo 4 a la voix Guillaume, les autres une voix de synthèse plus simple : elles seront refaites avec la même voix après le 28 novembre.
