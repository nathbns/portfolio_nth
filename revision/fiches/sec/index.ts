import type { FicheEntry } from "../types";
import Processus from "./processus";
import Concurrence from "./concurrence";
import Moniteurs from "./moniteurs";
import Semaphores from "./semaphores";
import Buddy from "./buddy";
import Pagination from "./pagination";
import Fichiers from "./fichiers";
import RemplacementPages from "./remplacement-pages";
import ExamenTp from "./examen-tp";

// Fiches de la matière, dans l'ordre du cours.
export const FICHES: FicheEntry[] = [
  {
    meta: {
      slug: "processus",
      subject: "sec",
      title: "Processus : fork, execvp, waitpid",
      summary:
        "Savoir ce que font fork, execvp et waitpid quand un shell lance une commande, et compter les processus d'une boucle de fork.",
      related: ["sec/cm/cm02_processus", "sec/tp/tp2_ensishell"],
      order: 2,
      exam: "ecrit",
      minutes: 7,
    },
    Component: Processus,
  },
  {
    meta: {
      slug: "concurrence",
      subject: "sec",
      title: "Concurrence : section critique et Peterson",
      summary:
        "Comprendre pourquoi compteur++ perd des incréments, ce qu'exige une section critique, et comment Peterson fait céder le dernier arrivé.",
      related: ["sec/cm/cm03_concurrence", "sec/tp/tp3_comprendre_concu"],
      order: 3,
      exam: "ecrit",
      minutes: 7,
    },
    Component: Concurrence,
  },
  {
    meta: {
      slug: "moniteurs",
      subject: "sec",
      title: "Moniteurs : pourquoi while et pas if",
      summary:
        "Écrire un moniteur (mutex + conditions), savoir ce que fait cnd_wait, choisir signal ou broadcast, et justifier le while par le scénario du parking.",
      related: ["sec/cm/cm04_moniteurs", "sec/tp/tp4_moniteur_lecteur_redacteur", "sec/tp/tp5_channel_moniteur"],
      order: 4,
      exam: "ecrit",
      minutes: 7,
    },
    Component: Moniteurs,
  },
  {
    meta: {
      slug: "semaphores",
      subject: "sec",
      title: "Sémaphores : le tampon borné",
      summary:
        "Utiliser P et V, choisir la valeur initiale, et dérouler le producteur-consommateur avec vides, pleines et mutex, dans le bon ordre.",
      related: ["sec/cm/cm05_semaphores", "sec/tp/tp5_channel_moniteur"],
      order: 5,
      exam: "ecrit",
      minutes: 7,
    },
    Component: Semaphores,
  },
  {
    meta: {
      slug: "buddy",
      subject: "sec",
      title: "Allocateur buddy (exercice)",
      summary:
        "Dérouler un exercice buddy : arrondir à une puissance de 2, couper en compagnons, trouver le compagnon par XOR et fusionner.",
      related: ["sec/cm/cm06_allocation_memoire"],
      order: 6,
      exam: "ecrit",
      minutes: 6,
    },
    Component: Buddy,
  },
  {
    meta: {
      slug: "pagination",
      subject: "sec",
      title: "Pagination : de l'adresse virtuelle à l'adresse physique",
      summary:
        "Calculer les bits de déplacement, les entrées par table et le nombre de niveaux, puis traduire une adresse x86-64 en adresse physique.",
      related: ["sec/cm/cm07_pagination"],
      order: 7,
      exam: "ecrit",
      minutes: 7,
    },
    Component: Pagination,
  },
  {
    meta: {
      slug: "fichiers",
      subject: "sec",
      title: "Fichiers : descripteurs, redirection et tube",
      summary:
        "Savoir ce que font open, dup2, close et pipe pour ls -l > liste.txt et ls -l | wc -l, et pourquoi wc peut attendre pour toujours.",
      related: ["sec/cm/cm08_fichiers", "sec/tp/tp2_ensishell"],
      order: 8,
      exam: "ecrit",
      minutes: 7,
    },
    Component: Fichiers,
  },
  {
    meta: {
      slug: "remplacement-pages",
      subject: "sec",
      title: "Remplacement de pages : FIFO, LRU, horloge",
      summary:
        "Compter les défauts de page avec FIFO, LRU et l'horloge, puis calculer le taux de défauts toléré pour un temps d'accès moyen donné.",
      related: ["sec/cm/cm10_remplacement_pages"],
      order: 10,
      exam: "ecrit",
      minutes: 7,
    },
    Component: RemplacementPages,
  },
  {
    meta: {
      slug: "examen-tp",
      subject: "sec",
      title: "Examen de TP : méthode et code à écrire",
      summary:
        "Les motifs de code à écrire de mémoire, les commandes pour compiler et tester vite, et les bugs reconnus à leur symptôme.",
      related: [
        "sec/tp/tp2_ensishell",
        "sec/tp/tp3_comprendre_concu",
        "sec/tp/tp4_moniteur_lecteur_redacteur",
        "sec/tp/tp5_channel_moniteur",
      ],
      order: 20,
      exam: "tp",
      minutes: 10,
    },
    Component: ExamenTp,
  },
];
