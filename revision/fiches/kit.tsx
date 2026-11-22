"use client";
// Boîte à outils des fiches visuelles : sections, encadrés, schémas animés,
// pas à pas, curseurs et code coloré. Toutes les fiches s'en servent, pour
// garder le même style que le reste du site (voir app/globals.css).
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import hljs from "highlight.js/lib/core";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import go from "highlight.js/lib/languages/go";
import bash from "highlight.js/lib/languages/bash";
import glsl from "highlight.js/lib/languages/glsl";
import python from "highlight.js/lib/languages/python";

hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("go", go);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("glsl", glsl);
hljs.registerLanguage("python", python);

export { motion, AnimatePresence };

/** Couleurs des schémas : variables CSS, elles suivent le thème clair ou sombre. */
export const C = {
  blue: "var(--c-blue)",
  green: "var(--c-green)",
  orange: "var(--c-orange)",
  purple: "var(--c-purple)",
  red: "var(--c-red)",
  cyan: "var(--c-cyan)",
  yellow: "var(--c-yellow)",
  ink: "var(--grey-11)", // texte fort
  text: "var(--grey-10)",
  weak: "var(--grey-8)",
  faint: "var(--grey-7)",
  line: "var(--grey-5)",
  lineStrong: "var(--grey-6)",
  paper: "var(--grey-2)", // fond des cadres
  fill: "var(--grey-3)", // fond des boîtes
  fill2: "var(--grey-4)",
} as const;

export type Color = keyof typeof C;

/** Section numérotée automatiquement (01, 02, …). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="fiche-section">
      <h2 className="mb-5 font-mono text-[22px] leading-tight tracking-tight text-fg-strong">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** L'idée clé, en une ou deux phrases, en gros. */
export function Idea({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-2 border-link py-1 pl-5 font-mono text-[clamp(1.1rem,2.2vw,1.4rem)] leading-snug tracking-tight text-fg-strong">
      {children}
    </p>
  );
}

/** Encadré « À retenir » : passer des <li> en enfants. */
export function Points({ title = "À retenir", children }: { title?: string; children: ReactNode }) {
  return (
    <div className="border border-line bg-raised p-5">
      <p className="eyebrow">{title}</p>
      <ul className="flist mt-3">{children}</ul>
    </div>
  );
}

/** Encadré « Piège d'examen ». */
export function Trap({ title = "Piège d'examen", children }: { title?: string; children: ReactNode }) {
  return (
    <div className="border-l-2 border-warn bg-[color-mix(in_srgb,var(--warn)_8%,transparent)] px-5 py-4">
      <p className="font-mono text-[12px] uppercase tracking-wider text-warn">⚠ {title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

/** Note neutre (rappel, définition). */
export function Note({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="border-l-2 border-line-strong bg-weak px-5 py-4">
      {title && <p className="font-mono text-[12px] uppercase tracking-wider text-fg-weak">{title}</p>}
      <div className={title ? "mt-2 space-y-2" : "space-y-2"}>{children}</div>
    </div>
  );
}

/** Question type d'examen, réponse cachée : pour s'entraîner avant de regarder. */
export function Reveal({
  question,
  children,
  label = "Voir la réponse",
}: {
  question: ReactNode;
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-line bg-raised">
      <div className="px-5 py-4">
        <p className="font-mono text-[12px] uppercase tracking-wider text-link">Question type</p>
        <div className="mt-2 text-fg-strong">{question}</div>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="row w-full border-t border-line px-5 py-2.5 text-left font-mono text-[13px] text-fg-weak hover:text-fg-strong"
      >
        {open ? "▾ Cacher la réponse" : `▸ ${label}`}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-line bg-weak px-5 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Cadre d'un schéma (SVG, canvas…) avec sa légende. */
export function Figure({ caption, children }: { caption?: ReactNode; children: ReactNode }) {
  return (
    <figure className="border border-line bg-raised">
      <div className="overflow-x-auto p-4">{children}</div>
      {caption && (
        <figcaption className="border-t border-line px-4 py-2.5 font-mono text-[12.5px] leading-relaxed text-fg-weak">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Pas à pas animé. `steps` : le libellé de chaque étape ; `children(i)` dessine
 * l'étape i (0 ≤ i < steps.length). Boutons précédent / lecture / suivant.
 */
export function Stepper({
  steps,
  children,
  interval = 1800,
  caption,
}: {
  steps: string[];
  children: (step: number) => ReactNode;
  interval?: number;
  caption?: ReactNode;
}) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const n = steps.length;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setI((k) => {
        if (k >= n - 1) {
          setPlaying(false);
          return k;
        }
        return k + 1;
      });
    }, interval);
    return () => clearInterval(id);
  }, [playing, n, interval]);
  const btn = "row px-3 py-1.5 text-fg-weak hover:text-fg-strong disabled:opacity-30";
  return (
    <figure className="border border-line bg-raised">
      <div className="overflow-x-auto p-4">{children(i)}</div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-3 py-2 font-mono text-[13px]">
        <div className="flex items-center">
          <button type="button" className={btn} onClick={() => { setPlaying(false); setI(0); }} disabled={i === 0} aria-label="Début">
            ⏮
          </button>
          <button type="button" className={btn} onClick={() => { setPlaying(false); setI((k) => Math.max(0, k - 1)); }} disabled={i === 0} aria-label="Précédent">
            ◀
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => {
              if (i >= n - 1) setI(0);
              setPlaying((p) => !p);
            }}
            aria-label={playing ? "Pause" : "Lecture"}
          >
            {playing ? "⏸" : "⏵"}
          </button>
          <button type="button" className={btn} onClick={() => { setPlaying(false); setI((k) => Math.min(n - 1, k + 1)); }} disabled={i >= n - 1} aria-label="Suivant">
            ▶
          </button>
        </div>
        <span className="text-fg-weaker">
          {i + 1}/{n}
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="text-fg-strong"
          >
            {steps[i]}
          </motion.span>
        </AnimatePresence>
      </div>
      {caption && (
        <figcaption className="border-t border-line px-4 py-2.5 font-mono text-[12.5px] leading-relaxed text-fg-weak">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Curseur numérique. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="flex items-center gap-3 font-mono text-[13px]">
      <span className="w-40 shrink-0 text-fg-weak">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 accent-[var(--link)]"
      />
      <span className="w-20 shrink-0 text-right text-fg-strong">{format ? format(value) : value}</span>
    </label>
  );
}

/** Choix parmi quelques options (boutons segmentés). */
export function Choice<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly (T | { value: T; label: string })[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-[13px]">
      {label && <span className="text-fg-weak">{label}</span>}
      <div className="flex flex-wrap border border-line" role="group">
        {options.map((o) => {
          const v = typeof o === "object" ? o.value : o;
          const l = typeof o === "object" ? o.label : String(o);
          return (
            <button
              key={String(v)}
              type="button"
              aria-pressed={v === value}
              onClick={() => onChange(v)}
              className={`row px-3 py-1 ${v === value ? "bg-tint text-fg-strong before:opacity-100" : "text-fg-weak hover:text-fg-strong"}`}
            >
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Code coloré ; `mark` : numéros de lignes (1 = première) à surligner. */
export function Code({ code, lang = "c", mark = [] }: { code: string; lang?: string; mark?: number[] }) {
  const lines = useMemo(() => {
    const text = code.replace(/^\n+|\s+$/g, "");
    const html = hljs.getLanguage(lang) ? hljs.highlight(text, { language: lang }).value : escapeHtml(text);
    return splitHtmlLines(html);
  }, [code, lang]);
  return (
    <pre className="overflow-x-auto border border-line bg-weak py-3 font-mono text-[13px] leading-[1.55]">
      {lines.map((l, k) => (
        <div
          key={k}
          className={`px-4 ${mark.includes(k + 1) ? "border-l-2 border-link bg-tint pl-[14px]" : ""}`}
          dangerouslySetInnerHTML={{ __html: l || " " }}
        />
      ))}
    </pre>
  );
}

/** Formule ou règle, centrée, en mono. */
export function Formula({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line bg-weak px-5 py-4 text-center font-mono text-[15px] text-fg-strong">
      {children}
    </div>
  );
}

/** Pointes de flèche pour les <line>/<path> d'un SVG : markerEnd="url(#arr-blue)". */
export function ArrowMarkers() {
  return (
    <defs>
      {(Object.keys(C) as Color[]).map((k) => (
        <marker key={k} id={`arr-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C[k]} />
        </marker>
      ))}
    </defs>
  );
}

/** Petite étiquette colorée en ligne (ex. un état, un registre). */
export function Tag({ color = "blue", children }: { color?: Color; children: ReactNode }) {
  return (
    <span
      className="inline-block border px-1.5 py-px font-mono text-[0.82em]"
      style={{ color: C[color], borderColor: `color-mix(in srgb, ${C[color]} 45%, transparent)` }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Découpe le HTML coloré en lignes en refermant/rouvrant les <span> ouverts. */
function splitHtmlLines(html: string): string[] {
  const out: string[] = [];
  const open: string[] = [];
  let cur = "";
  const re = /(<span[^>]*>)|(<\/span>)|(\n)|([^<\n]+|<)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[1]) {
      open.push(m[1]);
      cur += m[1];
    } else if (m[2]) {
      open.pop();
      cur += m[2];
    } else if (m[3]) {
      out.push(cur + "</span>".repeat(open.length));
      cur = open.join("");
    } else cur += m[4];
  }
  out.push(cur + "</span>".repeat(open.length));
  return out;
}
