// Relie un chapitre de vidéo (« Q3.13 : taskwait ou taskgroup ») au titre
// correspondant dans les notes Markdown (« ## Q3.13 : `taskwait` ou… »).
// Les identifiants sont calculés comme rehype-slug (github-slugger).
import GithubSlugger from "github-slugger";

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

/** Titres d'un document Markdown, avec l'identifiant que rehype-slug leur donnera. */
export function headings(md: string, stripTitle = false): Heading[] {
  // Même transformation que <Markdown stripTitle> : le titre principal est retiré.
  const src = stripTitle ? md.replace(/^\s*#\s+.+\n/, "") : md;
  const slugger = new GithubSlugger();
  const out: Heading[] = [];
  let fence = false;
  for (const line of src.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const text = m[2]
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/(\*\*|__)(.+?)\1/g, "$2")
      .replace(/(\*|_)(.+?)\1/g, "$2")
      .replace(/&amp;/g, "&")
      .trim();
    out.push({ depth: m[1].length, text, id: slugger.slug(text) });
  }
  return out;
}

type Kind = "q" | "n" | "p" | "s";
interface Token {
  kind: Kind;
  from: number[];
  to?: number[];
}

const num = (s: string) => s.split(".").map(Number);

function token(text: string): Token | undefined {
  const m = text.match(
    /^\s*(§\s*|Q(?:uestions?)?\s*|Partie\s+|Exercices?\s+|Ex\.\s*)?(\d+(?:\.\d+)*)\.?(?:\s*(?:à|-|–)\s*Q?(\d+(?:\.\d+)*))?/i,
  );
  if (!m) return undefined;
  const p = (m[1] ?? "").trim().toLowerCase();
  const kind: Kind = p.startsWith("§") ? "s" : p.startsWith("q") ? "q" : p.startsWith("partie") ? "p" : "n";
  return { kind, from: num(m[2]), to: m[3] ? num(m[3]) : undefined };
}

function cmp(a: number[], b: number[]) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

const STOP = new Set(
  "les des une un le la de du et ou en au aux pour avec dans sans par sur qui que est son ses pas plus tout tous cette ces mon ma mes the and quoi quel quelle comment pourquoi".split(
    " ",
  ),
);

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !STOP.has(w) && (w.length >= 3 || /^\d+$/.test(w)))
      .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w)),
  );
}

export interface Doc {
  tab: string; // identifiant de l'onglet
  prefix: string; // préfixe des identifiants de titres dans cet onglet
  headings: Heading[];
}

export interface Target {
  tab: string;
  id: string; // identifiant HTML complet (préfixe compris)
}

/** Titre des notes qui correspond le mieux à un chapitre, s'il y en a un. */
export function matchChapter(title: string, docs: Doc[]): Target | undefined {
  const t = token(title);
  const all = docs.flatMap((d) => d.headings.map((h) => ({ d, h, tk: token(h.text) })));
  if (t) {
    const exact = (kinds: Kind[]) =>
      all.find(({ tk }) => tk && kinds.includes(tk.kind) && cmp(tk.from, t.from) === 0 && (!t.to || !tk.to || cmp(tk.to, t.to) === 0));
    const inRange = all.find(({ tk }) => tk?.to && tk.kind === t.kind && cmp(tk.from, t.from) <= 0 && cmp(t.from, tk.to) <= 0);
    const hit =
      t.kind === "p"
        ? exact(["p", "s"])
        : (exact([t.kind]) ?? inRange ?? exact(t.kind === "q" ? ["n"] : ["q"]));
    if (hit) return { tab: hit.d.tab, id: hit.d.prefix + hit.h.id };
  }
  // Sinon : le titre qui partage le plus de mots significatifs.
  const cw = words(title);
  if (cw.size === 0) return undefined;
  let best: { d: Doc; h: Heading; score: number; full: boolean } | undefined;
  for (const { d, h } of all) {
    const hw = words(h.text);
    let score = 0;
    for (const w of cw) if (hw.has(w)) score++;
    // Accepté : au moins 2 mots communs, ou un titre court entièrement contenu dans le chapitre.
    const full = score > 0 && score === hw.size;
    const ok = score >= 2 || full || (score === 1 && cw.size <= 2);
    if (ok && (!best || score > best.score || (score === best.score && full && !best.full))) best = { d, h, score, full };
  }
  if (best) return { tab: best.d.tab, id: best.d.prefix + best.h.id };
  return undefined;
}
