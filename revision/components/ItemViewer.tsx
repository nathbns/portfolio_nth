"use client";
// Page d'un CM, TD ou TP : la vidéo reste fixe à gauche avec ses chapitres,
// le contexte (fiche, notes, réponses, sujet, code) est à droite. Quand un
// chapitre commence, la partie correspondante des notes s'affiche.
import { useRef, useState, type ReactNode } from "react";
import { VideoPlayer } from "./VideoPlayer";
import { fmt } from "./progress";

export interface ViewerChapter {
  t: number;
  title: string;
  target?: { tab: string; id: string };
}

export interface ViewerVideo {
  src: string;
  url: string;
  poster?: string;
  label: string;
  chapters: ViewerChapter[];
}

export interface ViewerTab {
  id: string;
  label: string;
  content: ReactNode;
  /** URL du fichier affiché dans l'onglet : un lien vers lui ouvre l'onglet. */
  file?: string;
}

const isWide = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

export function ItemViewer({
  videos,
  tabs,
  initialTab,
  title,
  href,
}: {
  videos: ViewerVideo[];
  tabs: ViewerTab[];
  initialTab?: string;
  title: string;
  href: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [vi, setVi] = useState(0);
  const [tab, setTab] = useState(initialTab ?? tabs[0]?.id ?? "");
  const [current, setCurrent] = useState(-1);
  const [follow, setFollow] = useState(true);
  const video = videos[vi];
  const chapters = video?.chapters ?? [];
  const hasTargets = chapters.some((c) => c.target);

  function show(target: ViewerChapter["target"]) {
    if (!target) return;
    setTab(target.tab);
    // Laisser React afficher l'onglet avant de faire défiler jusqu'au titre.
    setTimeout(() => document.getElementById(target.id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  function onTime(t: number) {
    let k = -1;
    for (let i = 0; i < chapters.length; i++) if (chapters[i].t <= t + 0.25) k = i;
    if (k !== current) {
      setCurrent(k);
      if (follow && k >= 0 && isWide()) show(chapters[k].target);
    }
  }

  function jump(k: number) {
    const v = videoRef.current;
    if (v) {
      v.currentTime = chapters[k].t;
      void v.play().catch(() => {});
    }
    setCurrent(k);
    show(chapters[k].target);
  }

  const tabBar =
    tabs.length > 1 ? (
      <div className="sticky top-14 z-10 -mx-1 flex gap-1 overflow-x-auto border-b border-line bg-bg/95 px-1 backdrop-blur">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`shrink-0 border-b-2 px-3 py-3 font-mono text-[13px] ${tab === t.id ? "border-fg-strong text-fg-strong" : "border-transparent text-fg-weak hover:text-fg-strong"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    ) : null;

  // Un lien vers un fichier déjà affiché dans un onglet ouvre cet onglet.
  function onPanelClick(e: React.MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const path = decodeURIComponent(new URL(a.href, window.location.href).pathname);
    const t = tabs.find((x) => x.file && decodeURIComponent(x.file) === path);
    if (!t) return;
    e.preventDefault();
    setTab(t.id);
    a.closest("[data-panels]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const panels = (
    <div data-panels onClick={onPanelClick} className="min-w-0 scroll-mt-16">
      {tabBar}
      {tabs.map((t) => (
        <div key={t.id} hidden={tab !== t.id} className="pt-8">
          {t.content}
        </div>
      ))}
    </div>
  );

  if (!video) return <div className="mt-10 max-w-4xl">{panels}</div>;

  return (
    <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3 lg:sticky lg:top-[4.5rem] lg:self-start">
        {videos.length > 1 && (
          <div className="flex flex-wrap border border-line font-mono text-[13px]" role="group" aria-label="Vidéos">
            {videos.map((v, k) => (
              <button
                key={v.src}
                type="button"
                onClick={() => {
                  setVi(k);
                  setCurrent(-1);
                }}
                aria-pressed={vi === k}
                className={`row flex-1 px-3 py-2 text-left ${vi === k ? "bg-tint text-fg-strong before:opacity-100" : "text-fg-weak hover:text-fg-strong"}`}
              >
                ▶ {v.label}
              </button>
            ))}
          </div>
        )}
        <VideoPlayer
          key={video.src}
          src={video.src}
          url={video.url}
          poster={video.poster}
          label={video.label}
          title={title}
          href={href}
          videoRef={videoRef}
          onTime={onTime}
        />
        {chapters.length > 1 && (
          <div className="border border-line bg-raised">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
              <span className="eyebrow">Chapitres · {chapters.length}</span>
              {hasTargets && (
                <label className="hidden cursor-pointer items-center gap-2 font-mono text-[12px] text-fg-weak lg:flex">
                  <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="accent-[var(--link)]" />
                  les notes suivent la vidéo
                </label>
              )}
            </div>
            <ol className="max-h-[min(40vh,22rem)] overflow-y-auto py-1">
              {chapters.map((c, k) => (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => jump(k)}
                    className={`row flex w-full items-baseline gap-3 px-4 py-1.5 text-left ${k === current ? "bg-tint before:opacity-100" : ""}`}
                  >
                    <span className="w-11 shrink-0 font-mono text-[12px] text-fg-weaker">{fmt(c.t)}</span>
                    <span className={`text-[14px] leading-snug ${k === current ? "text-fg-strong" : "text-fg"}`}>{c.title}</span>
                    {c.target && <span className="ml-auto shrink-0 font-mono text-[11px] text-link" title="Une partie des notes correspond à ce chapitre">↗ notes</span>}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
      {panels}
    </div>
  );
}
