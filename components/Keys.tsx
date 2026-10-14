"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

// Two-key jumps, like a pager: g then a letter.
const jumps: Record<string, { href: string; label: string }> = {
  h: { href: "/", label: "home" },
  p: { href: "/projects", label: "projects" },
  l: { href: "/log", label: "log" },
  a: { href: "/about", label: "about" },
  c: { href: "/cv", label: "cv" },
};

function typing(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

export default function Keys() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let leader = 0;

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (typing(event.target)) return;

      const key = event.key;
      if (performance.now() - leader < 1000 && jumps[key]) {
        leader = 0;
        setOpen(false);
        router.push(jumps[key].href);
      } else if (key === "g") {
        leader = performance.now();
      } else if (key === "t") {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      } else if (key === "?") {
        setOpen((value) => !value);
      } else if (key === "Escape") {
        setOpen(false);
      } else {
        return;
      }
      event.preventDefault();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, resolvedTheme, setTheme]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Keyboard shortcuts"
      className="fixed right-6 bottom-6 z-50 rounded-lg border border-border bg-background px-4 py-3 font-mono text-[12px] text-muted shadow-sm"
    >
      <ul className="space-y-1">
        {Object.entries(jumps).map(([key, jump]) => (
          <li key={key}>
            <kbd className="text-foreground">g {key}</kbd>
            <span className="ml-3">{jump.label}</span>
          </li>
        ))}
        <li>
          <kbd className="text-foreground">t</kbd>
          <span className="ml-7">theme</span>
        </li>
        <li>
          <kbd className="text-foreground">?</kbd>
          <span className="ml-7">close</span>
        </li>
      </ul>
    </div>
  );
}
