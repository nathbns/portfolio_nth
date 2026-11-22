import Link from "next/link";
import { KINDS, KIND_LABEL, getSubjects } from "@/revision/lib/content";
import { Search, type SearchEntry } from "@/revision/components/Search";
import { ContinueWatching } from "@/revision/components/Watched";
import { fichesOf } from "@/revision/fiches";

export const dynamic = "force-static";
export const dynamicParams = false;

function daysUntil(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return Math.round((day.getTime() - today.getTime()) / 86_400_000);
}

export default function Home() {
  const subjects = getSubjects();
  const items = subjects.flatMap((s) => s.items);
  const nVideos = items.reduce((n, i) => n + i.videos.length, 0);
  const entries: SearchEntry[] = items.map((i) => ({
    title: i.title,
    meta: `${i.subjectShort} · ${KIND_LABEL[i.kind]}${i.num !== undefined ? " " + i.num : ""}`,
    text: i.description,
    href: i.href,
    videos: i.videos.length,
  }));
  const exams = subjects
    .filter((s) => s.examDate)
    .sort((a, b) => a.examDate!.getTime() - b.examDate!.getTime());

  return (
    <>
      <section className="pt-6">
        <p className="eyebrow">Ensimag · 2e année · semestre 7</p>
        <h1 className="mt-5 max-w-3xl font-mono text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.1] tracking-[-0.03em] text-fg-strong">
          Tout le semestre, au même endroit.
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-fg-weak">
          Les cours, TD et TP de chaque matière, avec leurs vidéos d&apos;explication, les réponses et le code.
        </p>
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 font-mono">
          {[
            [subjects.length, "matières"],
            [items.length, "cours, TD et TP"],
            [nVideos, "vidéos"],
          ].map(([n, l]) => (
            <div key={l as string}>
              <dd className="text-3xl tracking-tight text-fg-strong">{n}</dd>
              <dt className="mt-1 text-[12px] uppercase tracking-wider text-fg-weak">{l}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-10 max-w-3xl">
          <Search entries={entries} />
        </div>
      </section>

      <ContinueWatching />

      <section className="mt-16">
        <p className="eyebrow">Matières</p>
        <div className="mt-4 grid gap-px border border-line bg-line md:grid-cols-2">
          {subjects.map((s, idx) => {
            const count = (k: (typeof KINDS)[number]) => s.items.filter((i) => i.kind === k).length;
            const vids = s.items.reduce((n, i) => n + i.videos.length, 0);
            const done = s.tpList.filter((t) => t.state === "done").length;
            return (
              <Link
                key={s.slug}
                href={s.href}
                className={`row flex flex-col gap-4 bg-bg p-6 ${subjects.length % 2 === 1 && idx === subjects.length - 1 ? "md:col-span-2" : ""}`}
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[13px] text-fg-weaker">{String(idx + 1).padStart(2, "0")}</span>
                  <h2 className="font-mono text-[22px] leading-tight tracking-tight text-fg-strong">{s.title}</h2>
                </div>
                <div className="flex flex-wrap gap-2 font-mono text-[12px]">
                  {KINDS.map((k) => (
                    <span
                      key={k}
                      className={`border px-2 py-0.5 ${count(k) ? "border-line-strong text-fg" : "border-line text-fg-weaker"}`}
                    >
                      {count(k)} {KIND_LABEL[k]}
                    </span>
                  ))}
                  <span className="border border-line-strong px-2 py-0.5 text-fg">▶ {vids}</span>
                  {fichesOf(s.slug).length > 0 && (
                    <span className="border border-[color-mix(in_srgb,var(--link)_45%,transparent)] px-2 py-0.5 text-link">
                      ◆ {fichesOf(s.slug).length} fiches
                    </span>
                  )}
                  {s.tpList.length > 0 && (
                    <span className="border border-line px-2 py-0.5 text-fg-weak">
                      suivi {done}/{s.tpList.length}
                    </span>
                  )}
                </div>
                {s.exam && <p className="text-[14px] leading-relaxed text-fg-weak">Examen : {s.exam}</p>}
              </Link>
            );
          })}
        </div>
      </section>

      {exams.length > 0 && (
        <section className="mt-16">
          <p className="eyebrow">Examens</p>
          <ul className="mt-4 border-t border-line">
            {exams.map((s) => {
              const d = daysUntil(s.examDate!);
              return (
                <li key={s.slug} className="border-b border-line">
                  <Link href={s.href} className="row grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-baseline gap-x-6 px-3 py-4">
                    <span className="font-mono text-[13px] text-fg-strong">
                      {s.examDate!.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    <span>
                      <span className="block font-mono text-[15px] text-fg-strong">{s.title}</span>
                      <span className="mt-1 block text-[14px] text-fg-weak">{s.exam}</span>
                    </span>
                    <span className={`font-mono text-[13px] ${d <= 7 ? "text-warn" : "text-fg-weak"}`}>
                      {d > 0 ? `J-${d}` : d === 0 ? "aujourd'hui" : "passé"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
