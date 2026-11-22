import type { FicheEntry } from "../types";
import Mpi from "./mpi";
import Go from "./go";
import VolDeTravail from "./vol-de-travail";

// Fiches de la matière, dans l'ordre du cours.
export const FICHES: FicheEntry[] = [
  {
    meta: {
      slug: "mpi",
      subject: "prog_parallele",
      title: "MPI : des processus qui ne partagent rien",
      summary:
        "Envoyer et recevoir des messages, éviter l'interblocage de l'échange symétrique, utiliser les collectives et estimer le coût d'un message.",
      related: ["prog_parallele/cm_mpi"],
      order: 2,
      exam: "ecrit",
      minutes: 9,
    },
    Component: Mpi,
  },
  {
    meta: {
      slug: "go",
      subject: "prog_parallele",
      title: "Go : goroutines et channels",
      summary:
        "Lancer et attendre des goroutines, synchroniser par channels avec ou sans tampon, fermer, choisir avec select et éviter le deadlock.",
      related: ["prog_parallele/cm_go", "prog_parallele/tp_go"],
      order: 3,
      exam: "ecrit",
      minutes: 9,
    },
    Component: Go,
  },
  {
    meta: {
      slug: "vol-de-travail",
      subject: "prog_parallele",
      title: "Le vol de travail",
      summary:
        "Comprendre pourquoi un découpage statique s'effondre sur un travail inégal, et comment le vol de travail avec des deques rééquilibre la charge.",
      related: ["prog_parallele/tp_go2", "prog_parallele/cm_go"],
      order: 4,
      exam: "ecrit",
      minutes: 8,
    },
    Component: VolDeTravail,
  },
];
