"use client";

import { useSyncExternalStore } from "react";
import { getItem, setItem, subscribe } from "./progress";

type Theme = "system" | "light" | "dark";
const LABEL: Record<Theme, string> = { system: "auto", light: "clair", dark: "sombre" };

function readTheme(): Theme {
  const t = getItem("theme");
  return t === "light" || t === "dark" ? t : "system";
}

function choose(t: Theme) {
  if (t === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  setItem("theme", t === "system" ? null : t);
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);
  return (
    <div className="flex border border-line font-mono text-[12px]" role="group" aria-label="Thème">
      {(Object.keys(LABEL) as Theme[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => choose(t)}
          aria-pressed={theme === t}
          className={`row px-2.5 py-1 ${theme === t ? "bg-tint text-fg-strong before:opacity-100" : "text-fg-weak hover:text-fg-strong"}`}
        >
          {LABEL[t]}
        </button>
      ))}
    </div>
  );
}
