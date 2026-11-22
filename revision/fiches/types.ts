import type { ComponentType } from "react";

export interface FicheMeta {
  /** Identifiant dans l'URL : /fiche/<subject>/<slug> */
  slug: string;
  /** Dossier de la matière : "sec", "informatique_visuelle", "prog_parallele"… */
  subject: string;
  title: string;
  /** Une phrase : ce que la fiche permet de savoir faire. */
  summary: string;
  /** Dossiers liés, relatifs au dépôt (ex. "sec/cm/cm04_moniteurs"). Le premier est le cours principal. */
  related: string[];
  /** Ordre dans la matière (celui du cours). */
  order: number;
  /** "ecrit" : fiche de cours pour l'écrit ; "tp" : préparation de l'examen de TP. */
  exam: "ecrit" | "tp";
  /** Temps de lecture estimé, en minutes. */
  minutes: number;
}

export interface FicheEntry {
  meta: FicheMeta;
  /** Composant client (fichier avec "use client") qui affiche le corps de la fiche. */
  Component: ComponentType;
}
