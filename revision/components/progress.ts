// Progression des vidéos et réglages, gardés dans le navigateur (localStorage).
// Les composants s'y abonnent avec useSyncExternalStore.
export interface Progress {
  t: number; // position, en secondes
  d: number; // durée
  title: string;
  href: string;
  poster?: string;
  ts: number; // dernière lecture
}

const KEY = "vp:";
const EVENT = "ensimag-store";

export function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function parse(raw: string | null | undefined): Progress | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Progress;
  } catch {
    return undefined;
  }
}

export const progressKey = (src: string) => KEY + src;

export function readProgress(src: string): Progress | undefined {
  return parse(getItem(progressKey(src)));
}

export function writeProgress(src: string, p: Progress, notify = true) {
  try {
    localStorage.setItem(progressKey(src), JSON.stringify(p));
  } catch {}
  if (notify) window.dispatchEvent(new Event(EVENT));
}

/** Toutes les progressions, sérialisées en une chaîne (instantané stable). */
export function allProgressSnapshot(): string {
  const parts: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(KEY)) parts.push(k.slice(KEY.length) + "\u0001" + localStorage.getItem(k));
    }
  } catch {}
  return parts.sort().join("\u0002");
}

export function parseAll(snapshot: string | null): (Progress & { src: string })[] {
  if (!snapshot) return [];
  return snapshot.split("\u0002").flatMap((part) => {
    const [src, raw] = part.split("\u0001");
    const p = parse(raw);
    return p ? [{ ...p, src }] : [];
  });
}

export const ratio = (p?: Progress) => (p && p.d > 0 ? Math.min(1, p.t / p.d) : 0);
export const seen = (p?: Progress) => ratio(p) >= 0.9;

export function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
