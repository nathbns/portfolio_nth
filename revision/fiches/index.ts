// Registre de toutes les fiches visuelles (une liste par matière).
import type { FicheEntry } from "./types";
import { BASE } from "../lib/config";
import { FICHES as SEC } from "./sec";
import { FICHES as IIV } from "./informatique_visuelle";
import { FICHES as PP } from "./prog_parallele";

export const FICHES: FicheEntry[] = [...SEC, ...IIV, ...PP];

export function fichesOf(subject: string): FicheEntry[] {
  return FICHES.filter((f) => f.meta.subject === subject).sort((a, b) => a.meta.order - b.meta.order);
}

export function getFiche(subject: string, slug: string): FicheEntry | undefined {
  return FICHES.find((f) => f.meta.subject === subject && f.meta.slug === slug);
}

/** Fiches liées à un dossier du dépôt (un CM, un TD ou un TP). */
export function fichesFor(dir: string): FicheEntry[] {
  return FICHES.filter((f) => f.meta.related.includes(dir));
}

export const ficheHref = (f: FicheEntry) => `${BASE}/fiche/${f.meta.subject}/${f.meta.slug}`;
