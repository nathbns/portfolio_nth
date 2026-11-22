"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { fmt, getItem, readProgress, setItem, subscribe, writeProgress } from "./progress";

const RATES = [1, 1.25, 1.5, 2];

function readRate(): number {
  const r = Number(getItem("vp-rate"));
  return RATES.includes(r) ? r : 1;
}

export function VideoPlayer({
  src,
  url,
  poster,
  label,
  title,
  href,
  videoRef,
  onTime,
}: {
  src: string; // chemin dans le dépôt, sert de clé de progression
  url: string;
  poster?: string;
  label: string;
  title: string;
  href: string;
  /** Référence externe vers la balise vidéo (pour avancer à un chapitre). */
  videoRef?: RefObject<HTMLVideoElement | null>;
  /** Appelé à chaque mise à jour de la position de lecture. */
  onTime?: (t: number) => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? localRef;
  const last = useRef(0);
  const rate = useSyncExternalStore(subscribe, readRate, () => 1);
  const [resume, setResume] = useState<number | null>(null);

  // Vitesse choisie : appliquée à la vidéo (réglage commun à toutes les vidéos).
  useEffect(() => {
    if (ref.current) ref.current.playbackRate = rate;
  }, [rate, ref]);

  // Reprise là où la vidéo avait été arrêtée.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const p = readProgress(src);
    if (!p || p.t <= 5 || p.t >= p.d - 5) return;
    const apply = () => {
      v.currentTime = p.t;
      v.playbackRate = readRate();
      setResume(p.t);
    };
    if (v.readyState >= 1) queueMicrotask(apply);
    else v.addEventListener("loadedmetadata", apply, { once: true });
    return () => v.removeEventListener("loadedmetadata", apply);
  }, [src, ref]);

  function save(force = false) {
    const v = ref.current;
    if (!v || !v.duration) return;
    const now = Date.now();
    if (!force && now - last.current < 2000) return;
    last.current = now;
    // Pendant la lecture, pas de notification : les pastilles se mettent à jour à la pause.
    writeProgress(src, { t: v.currentTime, d: v.duration, title, href, poster, ts: now }, force);
  }

  return (
    <figure className="border border-line bg-weak">
      <video
        ref={ref}
        src={url}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        className="block aspect-video w-full bg-black"
        onTimeUpdate={(e) => {
          save();
          onTime?.(e.currentTarget.currentTime);
        }}
        onSeeked={(e) => onTime?.(e.currentTarget.currentTime)}
        onPause={() => save(true)}
        onEnded={() => save(true)}
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = readRate();
        }}
      />
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 font-mono text-[13px]">
        <span className="text-fg-strong">
          {label}
          {resume !== null && <span className="ml-3 text-fg-weak">reprise à {fmt(resume)}</span>}
        </span>
        <span className="flex items-center" role="group" aria-label="Vitesse de lecture">
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setItem("vp-rate", String(r))}
              aria-pressed={rate === r}
              className={`row px-2.5 py-1 ${rate === r ? "bg-tint text-fg-strong before:opacity-100" : "text-fg-weak hover:text-fg-strong"}`}
            >
              {r}×
            </button>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
