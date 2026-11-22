"use client";

import { useSyncExternalStore } from "react";
import { allProgressSnapshot, fmt, getItem, parse, parseAll, progressKey, ratio, seen, subscribe } from "./progress";

/** Pastille « vu » ou « 45 % » sur une carte, d'après les vidéos de l'élément. */
export function Watched({ srcs }: { srcs: string[] }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => srcs.map((s) => getItem(progressKey(s)) ?? "").join("\u0001"),
    () => null,
  );
  if (snapshot === null || srcs.length === 0) return null;
  const ps = snapshot.split("\u0001").map((raw) => parse(raw));
  const nSeen = ps.filter((p) => seen(p)).length;
  const started = ps.filter((p) => p && !seen(p) && p.t > 5);
  if (nSeen === srcs.length) return <span className="font-mono text-[12px] text-ok">✓ vu</span>;
  if (nSeen > 0)
    return (
      <span className="font-mono text-[12px] text-ok">
        ✓ {nSeen}/{srcs.length} vues
      </span>
    );
  if (started.length > 0)
    return <span className="font-mono text-[12px] text-warn">◐ {Math.round(ratio(started[0]) * 100)} %</span>;
  return null;
}

/** « Reprendre » : les vidéos commencées, les plus récentes d'abord. */
export function ContinueWatching() {
  const snapshot = useSyncExternalStore(subscribe, allProgressSnapshot, () => null);
  const list = parseAll(snapshot)
    .filter((p) => p.t > 5 && !seen(p))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 4);
  if (list.length === 0) return null;
  return (
    <section className="mt-16">
      <p className="eyebrow">Reprendre</p>
      <ul className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2">
        {list.map((p) => (
          <li key={p.src} className="bg-bg">
            <a href={p.href} className="row flex items-center gap-4 px-4 py-3">
              <span className="font-mono text-[13px] text-fg-strong">{p.title}</span>
              <span className="ml-auto shrink-0 font-mono text-[12px] text-fg-weak">
                {fmt(p.t)} / {fmt(p.d)}
              </span>
            </a>
            <div className="h-0.5 bg-weaker">
              <div className="h-full bg-link" style={{ width: `${Math.round(ratio(p) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
