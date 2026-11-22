"use client";

import { useSyncExternalStore } from "react";
import { getItem, setItem, subscribe } from "./progress";

const key = (id: string) => "fiche:" + id;

/** Case « fiche relue », gardée dans le navigateur. */
export function FicheCheck({ id, compact = false }: { id: string; compact?: boolean }) {
  const done = useSyncExternalStore(subscribe, () => getItem(key(id)) === "1", () => false);
  const toggle = () => setItem(key(id), done ? null : "1");
  if (compact)
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }}
        aria-pressed={done}
        aria-label={done ? "Marquer comme non relue" : "Marquer comme relue"}
        className={`grid h-5 w-5 shrink-0 place-items-center border font-mono text-[12px] ${done ? "border-ok bg-[color-mix(in_srgb,var(--ok)_15%,transparent)] text-ok" : "border-line-strong text-transparent hover:text-fg-weaker"}`}
      >
        ✓
      </button>
    );
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={done}
      className={`border px-4 py-2 font-mono text-[13px] ${done ? "border-ok text-ok" : "border-line-strong text-fg-strong hover:border-fg-weak"}`}
    >
      {done ? "✓ Fiche relue" : "Marquer comme relue"}
    </button>
  );
}

/** Nombre de fiches relues parmi une liste. */
export function FicheCount({ ids }: { ids: string[] }) {
  const n = useSyncExternalStore(
    subscribe,
    () => ids.filter((id) => getItem(key(id)) === "1").length,
    () => -1,
  );
  if (n < 0) return null;
  return (
    <span className={`font-mono text-[13px] ${n === ids.length && n > 0 ? "text-ok" : "text-fg-weak"}`}>
      {n}/{ids.length} relues
    </span>
  );
}
