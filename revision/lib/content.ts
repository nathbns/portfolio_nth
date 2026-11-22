// Lecture du dépôt Ensimag_2A : matières, CM, TD, TP, vidéos et fichiers.
// Tout est lu sur le disque à chaque requête : il n'y a rien à régénérer
// quand un dossier ou une vidéo est ajouté.
import fs from "node:fs";
import path from "node:path";
import { readChapters, type Chapter } from "./chapters";
import { BASE, CONTENT_DIR, STATIC_MEDIA } from "./config";

export const ROOT = process.env.CONTENT_ROOT
  ? path.resolve(process.env.CONTENT_ROOT)
  : path.resolve(process.cwd(), CONTENT_DIR);

export type Kind = "cm" | "td" | "tp";
export const KINDS: Kind[] = ["cm", "td", "tp"];
export const KIND_LABEL: Record<Kind, string> = { cm: "CM", td: "TD", tp: "TP" };
export const KIND_TITLE: Record<Kind, string> = {
  cm: "Cours magistraux",
  td: "Travaux dirigés",
  tp: "Travaux pratiques",
};

const SHORT: Record<string, string> = {
  compilation: "Compilation",
  informatique_visuelle: "Info visuelle",
  prog_parallele: "Prog parallèle",
  sec: "SEC",
  sgbd: "SGBD",
};

const IGNORED_DIRS = new Set([
  "site", "node_modules", "build", "CMakeFiles", "__pycache__", ".venv", "venv",
  ".next", ".idea", ".vscode", "out",
]);

const CODE_EXT = new Set([
  "c", "h", "cpp", "hpp", "cc", "go", "mod", "sql", "py", "scm", "sh", "java", "g4",
  "v", "ml", "js", "ts", "rb", "s", "asm", "glsl", "vert", "frag", "json", "yaml", "yml",
]);
const NOTE_EXT = new Set(["md", "txt", "info", "1"]);
export const MEDIA_EXT = new Set(["mp4", "webm", "jpg", "jpeg", "png", "gif", "svg", "pdf"]);

export interface FileRef {
  path: string; // relatif au dépôt, séparateur « / »
  name: string; // relatif au dossier de l'élément
  ext: string;
  size: number;
}

export interface Video {
  path: string;
  poster?: string;
  label: string;
  chapters: Chapter[];
}

export interface Item {
  subject: string;
  subjectTitle: string;
  subjectShort: string;
  kind: Kind;
  num?: number;
  dir: string; // relatif au dépôt
  slug: string[]; // relatif à la matière
  title: string;
  description: string;
  videos: Video[];
  notes: FileRef[];
  code: FileRef[];
  pdfs: FileRef[];
  readme?: string; // chemin du README, relatif au dépôt
  href: string;
  order: number;
}

export type TpState = "done" | "partial" | "todo" | "unknown" | "upcoming";
export interface TpEntry {
  name: string;
  status: string;
  state: TpState;
}

export interface Subject {
  slug: string;
  title: string;
  short: string;
  exam?: string;
  examDate?: Date;
  items: Item[];
  fiches: FileRef[];
  tpList: TpEntry[];
  tpNotes: string[];
  href: string;
}

// ---------------------------------------------------------------------------
// Petits outils
// ---------------------------------------------------------------------------

const abs = (rel: string) => path.join(ROOT, ...rel.split("/"));

function readText(rel: string): string | undefined {
  try {
    return fs.readFileSync(abs(rel), "utf8");
  } catch {
    return undefined;
  }
}

function listDir(rel: string): fs.Dirent[] {
  try {
    return fs.readdirSync(abs(rel), { withFileTypes: true });
  } catch {
    return [];
  }
}

const join = (...p: string[]) => p.filter(Boolean).join("/");
const extOf = (name: string) =>
  name === "Makefile" ? "makefile" : name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";

const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

export function encodePath(rel: string): string {
  return rel.split("/").map(encodeURIComponent).join("/");
}

/** URL d'une page du site (préfixe BASE ajouté). */
export function url(p: string): string {
  return BASE + p;
}

export function mediaUrl(rel: string): string {
  return (STATIC_MEDIA ? BASE + "/_m/" : "/media/") + encodePath(rel);
}

export function fileUrl(rel: string): string {
  return BASE + "/f/" + encodePath(rel);
}

/** Texte brut d'un morceau de Markdown : liens réduits à leur texte. */
export function plain(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function firstHeading(md?: string): string | undefined {
  const m = md?.match(/^#\s+(.+)$/m);
  return m?.[1].trim();
}

interface Row {
  title: string;
  href: string;
  desc: string;
}

/** Lignes « | [Titre](lien) | description | » d'un tableau de README. */
function tableRows(md?: string): Row[] {
  if (!md) return [];
  const rows: Row[] = [];
  for (const line of md.split("\n")) {
    const m = line.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*(.*?)\s*\|\s*$/);
    if (m) rows.push({ title: m[1], href: m[2].replace(/^\.\//, "").replace(/\/$/, ""), desc: m[3] });
  }
  return rows;
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** « TD1 : analyses lexicales » → « Analyses lexicales » (le type est affiché à part). */
function stripKind(title: string): string {
  return capitalize(title.replace(/^(CM|TD|TP)\s*\d*\s*[:\-–]?\s*/i, "").trim()) || title;
}

function humanize(name: string): string {
  return (
    capitalize(
      name
        .replace(/^(cm|td|tp)\d*_?/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/([a-zà-ü])(\d+)$/i, "$1 $2")
        .trim(),
    ) || name
  );
}

// ---------------------------------------------------------------------------
// Fichiers d'un élément (CM, TD ou TP)
// ---------------------------------------------------------------------------

function walk(rel: string, base: string, depth: number, out: FileRef[]) {
  if (depth > 5) return;
  for (const d of listDir(rel)) {
    if (d.name.startsWith(".")) continue;
    const child = join(rel, d.name);
    if (d.isDirectory()) {
      if (!IGNORED_DIRS.has(d.name)) walk(child, base, depth + 1, out);
    } else if (d.isFile()) {
      let size = 0;
      try {
        size = fs.statSync(abs(child)).size;
      } catch {}
      out.push({ path: child, name: child.slice(base.length + 1), ext: extOf(d.name), size });
    }
  }
}

function itemFiles(dir: string) {
  const all: FileRef[] = [];
  walk(dir, dir, 0, all);
  all.sort((a, b) => collator.compare(a.name, b.name));
  const byPath = new Set(all.map((f) => f.path));
  const videos = all
    .filter((f) => f.ext === "mp4" || f.ext === "webm")
    .map((f) => {
      const poster = f.path.replace(/\.(mp4|webm)$/, ".jpg");
      return {
        path: f.path,
        poster: byPath.has(poster) ? poster : undefined,
        label: "",
        chapters: readChapters(abs(f.path)),
      };
    })
    .sort((a, b) => {
      const va = a.path.endsWith("/video.mp4") ? 0 : 1;
      const vb = b.path.endsWith("/video.mp4") ? 0 : 1;
      return va - vb || collator.compare(a.path, b.path);
    });
  const readme = all.find((f) => f.name === "README.md");
  return {
    videos,
    readme: readme?.path,
    notes: all.filter((f) => NOTE_EXT.has(f.ext) && f.name !== "README.md"),
    code: all.filter((f) => CODE_EXT.has(f.ext) || f.ext === "makefile"),
    pdfs: all.filter((f) => f.ext === "pdf"),
  };
}

// ---------------------------------------------------------------------------
// Matières
// ---------------------------------------------------------------------------

const ITEM_RE = /^(cm|td|tp)(\d+|_|$)/i;
const CONTAINER_RE = /^(cm|td|tp)s?$/i;

function findItemDirs(rel: string, depth: number): string[] {
  const found: string[] = [];
  for (const d of listDir(rel)) {
    if (!d.isDirectory() || d.name.startsWith(".") || IGNORED_DIRS.has(d.name)) continue;
    const child = join(rel, d.name);
    if (CONTAINER_RE.test(d.name)) {
      if (depth < 2) found.push(...findItemDirs(child, depth + 1));
    } else if (ITEM_RE.test(d.name)) {
      found.push(child);
    }
  }
  return found;
}

const MONTHS: Record<string, number> = {
  janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6,
  août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
};

function parseExamDate(exam?: string): Date | undefined {
  const m = exam?.toLowerCase().match(/(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/);
  if (!m) return undefined;
  const month = MONTHS[m[2]];
  const year = month >= 8 ? 2026 : 2027; // année scolaire 2026-2027
  const h = exam!.match(/(\d{1,2})h(\d{2})?/);
  return new Date(year, month, Number(m[1]), h ? Number(h[1]) : 8, h?.[2] ? Number(h[2]) : 0);
}

function tpState(status: string): TpState {
  const s = status.trim().toLowerCase();
  if (!s || s.startsWith("(")) return "todo";
  if (s.startsWith("?")) return "unknown";
  if (s.includes("à venir")) return "upcoming";
  if (s.startsWith("ok") || s.startsWith("corrigé")) return "done";
  return "partial";
}

function parseTpList(md?: string): { list: TpEntry[]; notes: string[] } {
  const list: TpEntry[] = [];
  const notes: string[] = [];
  for (const raw of md?.split("\n") ?? []) {
    const line = raw.trim();
    if (!line) continue;
    const i = line.indexOf("->");
    if (i < 0) {
      notes.push(line);
      continue;
    }
    const name = line.slice(0, i).trim();
    const status = line.slice(i + 2).trim();
    list.push({ name, status, state: tpState(status) });
  }
  return { list, notes };
}

function loadSubject(slug: string, rootRows: Row[]): Subject {
  const readme = readText(join(slug, "README.md"));
  const rows = tableRows(readme);
  const rowIndex = new Map(rows.map((r, i) => [r.href, i]));
  const rootRow = rootRows.find((r) => r.href === slug);
  const title = firstHeading(readme) ?? rootRow?.desc ?? humanize(slug);
  const short = SHORT[slug] ?? rootRow?.desc ?? title;
  const exam = readme?.match(/^Examen\s*:\s*(.+)$/m)?.[1].trim();

  const items: Item[] = findItemDirs(slug, 0).map((dir) => {
    const rel = dir.slice(slug.length + 1);
    const leaf = rel.split("/").pop()!;
    const m = leaf.match(/^(cm|td|tp)(\d+)?/i)!;
    const kind = m[1].toLowerCase() as Kind;
    const row = rows.find((r) => r.href === rel);
    const files = itemFiles(dir);
    const ownReadme = files.readme ? readText(files.readme) : undefined;
    // Libellés des vidéos : textes des liens vers des .mp4 dans la ligne du tableau.
    const labels = new Map<string, string>();
    for (const l of row?.desc.matchAll(/\[([^\]]+)\]\(([^)]+\.mp4)\)/g) ?? []) {
      labels.set(join(slug, l[2].replace(/^\.\//, "")), l[1]);
    }
    files.videos.forEach((v, i) => {
      v.label =
        labels.get(v.path) ??
        (files.videos.length === 1 ? "Vidéo d'explication" : humanize(v.path.split("/").pop()!.replace(/\.\w+$/, "")) || `Vidéo ${i + 1}`);
    });
    const description = row
      ? plain(
          row.desc
            .replace(/\.?\s*Vidéos?\s*:.*$/i, "")
            .replace(/\[Vidéo\]\([^)]*\)/gi, "")
            .replace(/\s*\(\[[^\]]+\]\([^)]+\)\)/g, ""),
        )
      : "";
    return {
      subject: slug,
      subjectTitle: title,
      subjectShort: short,
      kind,
      num: m[2] ? Number(m[2]) : undefined,
      dir,
      slug: rel.split("/"),
      title: stripKind(row?.title ?? firstHeading(ownReadme) ?? humanize(leaf)),
      description: description.replace(/\.\s*$/, "."),
      videos: files.videos,
      notes: files.notes,
      code: files.code,
      pdfs: files.pdfs,
      readme: files.readme,
      href: BASE + "/s/" + encodePath(dir),
      order: rowIndex.get(rel) ?? 1000,
    };
  });
  items.sort(
    (a, b) =>
      KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) ||
      a.order - b.order ||
      (a.num ?? 999) - (b.num ?? 999) ||
      collator.compare(a.dir, b.dir),
  );

  const fiches: FileRef[] = listDir(slug)
    .filter((d) => d.isFile() && d.name.endsWith(".md") && d.name !== "README.md" && d.name !== "tp_liste.md")
    .map((d) => ({ path: join(slug, d.name), name: d.name, ext: "md", size: 0 }));

  const { list, notes } = parseTpList(readText(join(slug, "tp_liste.md")));
  return {
    slug,
    title,
    short,
    exam,
    examDate: parseExamDate(exam),
    items,
    fiches,
    tpList: list,
    tpNotes: notes,
    href: BASE + "/s/" + encodeURIComponent(slug),
  };
}

export function getSubjects(): Subject[] {
  const rootRows = tableRows(readText("README.md"));
  const order = new Map(rootRows.map((r, i) => [r.href, i]));
  return listDir("")
    .filter(
      (d) =>
        d.isDirectory() &&
        !d.name.startsWith(".") &&
        !IGNORED_DIRS.has(d.name) &&
        fs.existsSync(abs(join(d.name, "README.md"))),
    )
    .map((d) => loadSubject(d.name, rootRows))
    .sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99) || collator.compare(a.slug, b.slug));
}

export function getSubject(slug: string): Subject | undefined {
  return getSubjects().find((s) => s.slug === slug);
}

export function getItem(subject: string, slug: string[]): { subject: Subject; item: Item } | undefined {
  const s = getSubject(subject);
  const dir = join(subject, ...slug);
  const item = s?.items.find((i) => i.dir === dir);
  return s && item ? { subject: s, item } : undefined;
}

// ---------------------------------------------------------------------------
// Accès sûr aux fichiers (pages /f et /media)
// ---------------------------------------------------------------------------

/** Chemin absolu d'un fichier du dépôt, ou undefined s'il sort du dépôt ou est caché. */
export function safeAbs(segments: string[]): string | undefined {
  let parts: string[];
  try {
    parts = segments.map((s) => decodeURIComponent(s));
  } catch {
    return undefined;
  }
  if (parts.some((p) => !p || p === ".." || p.startsWith(".") || p.includes("/") || p.includes("\\"))) return undefined;
  if (parts[0] === "site") return undefined;
  const full = path.join(ROOT, ...parts);
  if (!full.startsWith(ROOT + path.sep)) return undefined;
  return full;
}

export function readRepoFile(rel: string): string | undefined {
  return readText(rel);
}

/** Lien du site pour une cible relative au dépôt (utilisé dans le Markdown). */
export function routeFor(rel: string): string {
  let st: fs.Stats | undefined;
  try {
    st = fs.statSync(abs(rel));
  } catch {}
  const parts = rel.split("/");
  if (st?.isDirectory()) {
    if (parts.length === 1) return BASE + "/s/" + encodeURIComponent(parts[0]);
    const leaf = parts[parts.length - 1];
    if (ITEM_RE.test(leaf) && !CONTAINER_RE.test(leaf)) return BASE + "/s/" + encodePath(rel);
    return BASE + "/s/" + encodeURIComponent(parts[0]);
  }
  const ext = extOf(parts[parts.length - 1]);
  if (MEDIA_EXT.has(ext)) return mediaUrl(rel);
  return fileUrl(rel);
}

/** Dossier d'élément (CM, TD, TP) qui contient un fichier, pour revenir en arrière. */
export function itemOf(rel: string): { subject: Subject; item: Item } | undefined {
  const subject = getSubject(rel.split("/")[0]);
  const item = subject?.items
    .filter((i) => rel.startsWith(i.dir + "/"))
    .sort((a, b) => b.dir.length - a.dir.length)[0];
  return subject && item ? { subject, item } : undefined;
}

// ---------------------------------------------------------------------------
// Contenus liés : CM, TD et TP qui partagent un mot de leur nom de dossier
// (cm_go ↔ tp_go, cm04_moniteurs ↔ tp4_moniteur_lecteur_redacteur…).
// ---------------------------------------------------------------------------

const KEY_STOP = new Set(["de", "du", "le", "la", "les", "et", "en", "un", "une", "code", "memoire"]);

function keywords(dir: string): string[] {
  const leaf = dir.split("/").pop()!.replace(/^(cm|td|tp)\d*_?/i, "");
  return leaf
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .map((w) => w.replace(/\d+$/, ""))
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
    .filter((w) => w.length >= 2 && !KEY_STOP.has(w));
}

function close(a: string, b: string) {
  if (a === b) return true;
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  return s.length >= 4 && l.startsWith(s);
}

export function relatedItems(subject: Subject, item: Item): Item[] {
  const mine = keywords(item.dir);
  return subject.items.filter(
    (other) => other.dir !== item.dir && keywords(other.dir).some((w) => mine.some((m) => close(m, w))),
  );
}

/** Tous les fichiers que la page /f peut afficher (Markdown, texte, code, PDF). */
export function viewableFiles(): string[] {
  const out: FileRef[] = [];
  for (const d of listDir("")) {
    if (!d.isDirectory() || d.name.startsWith(".") || IGNORED_DIRS.has(d.name)) continue;
    walk(d.name, d.name, 0, out);
  }
  return out
    .filter((f) => NOTE_EXT.has(f.ext) || CODE_EXT.has(f.ext) || f.ext === "makefile" || f.ext === "pdf")
    .map((f) => f.path);
}
