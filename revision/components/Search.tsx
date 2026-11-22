"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export interface SearchEntry {
  title: string;
  meta: string; // « Prog parallèle · TP 2 »
  text: string; // texte cherché
  href: string;
  videos: number;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function Search({ entries }: { entries: SearchEntry[] }) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = (e.target as HTMLElement)?.closest("input, textarea");
      if ((e.key === "/" && !typing) || (e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        input.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return entries
      .map((e) => ({ e, hay: norm(`${e.title} ${e.meta} ${e.text}`) }))
      .filter(({ hay }) => words.every((w) => hay.includes(w)))
      .slice(0, 12)
      .map(({ e }) => e);
  }, [q, entries]);

  return (
    <div>
      <label className="flex h-11 items-center gap-3 border border-line bg-raised px-4 font-mono text-[14px] focus-within:border-line-strong">
        <span className="text-fg-weaker">›</span>
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher un cours, un TD, un TP… (mutex, select, Phong, normalisation)"
          className="min-w-0 flex-1 bg-transparent text-fg-strong outline-none placeholder:text-fg-weaker"
          aria-label="Chercher"
        />
        <kbd className="hidden border border-line px-1.5 text-[11px] text-fg-weak sm:inline">/</kbd>
      </label>
      {q && (
        <ul className="border-x border-b border-line">
          {results.length === 0 && (
            <li className="px-4 py-3 font-mono text-[13px] text-fg-weak">Aucun résultat.</li>
          )}
          {results.map((r) => (
            <li key={r.href} className="border-t border-line first:border-t-0">
              <Link href={r.href} className="row flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
                <span className="font-mono text-[12px] uppercase tracking-wider text-fg-weak">{r.meta}</span>
                <span className="text-fg-strong">{r.title}</span>
                {r.videos > 0 && <span className="ml-auto font-mono text-[12px] text-fg-weak">▶ {r.videos}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
