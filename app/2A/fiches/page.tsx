import type { Metadata } from "next";
import Link from "next/link";
import { getSubjects } from "@/revision/lib/content";
import { ficheHref, fichesOf } from "@/revision/fiches";
import { FicheCheck, FicheCount } from "@/revision/components/FicheCheck";

export const dynamic = "force-static";
export const dynamicParams = false;
export const metadata: Metadata = { title: "Fiches" };

export default function FichesPage() {
  const subjects = getSubjects()
    .map((s) => ({ s, fiches: fichesOf(s.slug) }))
    .filter((x) => x.fiches.length > 0);
  const all = subjects.flatMap((x) => x.fiches);
  return (
    <>
      <header>
        <p className="eyebrow">Fiches visuelles</p>
        <h1 className="mt-4 font-mono text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.1] tracking-[-0.03em] text-fg-strong">
          {all.length} fiches pour réviser
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] text-fg-weak">
          Une fiche par cours : l&apos;idée, des schémas animés, ce qu&apos;il faut retenir, les pièges et des questions
          d&apos;examen avec leur réponse cachée.
        </p>
        <div className="mt-4">
          <FicheCount ids={all.map((f) => `${f.meta.subject}/${f.meta.slug}`)} />
        </div>
      </header>
      {subjects.map(({ s, fiches }) => (
        <section key={s.slug} className="pt-14">
          <div className="mb-4 flex flex-wrap items-baseline gap-4 border-b border-line pb-3">
            <h2 className="font-mono text-[22px] tracking-tight text-fg-strong">
              <Link href={`${s.href}#examen`} className="hover:text-link">
                {s.title}
              </Link>
            </h2>
            {s.exam && <span className="text-[14px] text-fg-weak">Examen : {s.exam}</span>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fiches.map((f) => (
              <Link key={f.meta.slug} href={ficheHref(f)} className="group flex flex-col gap-2 border border-line bg-raised p-5 hover:border-line-strong">
                <div className="flex items-center justify-between gap-3">
                  <span className="eyebrow">
                    {f.meta.exam === "tp" ? "Examen de TP" : "Cours"} · {f.meta.minutes} min
                  </span>
                  <FicheCheck id={`${f.meta.subject}/${f.meta.slug}`} compact />
                </div>
                <h3 className="font-mono text-[16px] leading-snug tracking-tight text-fg-strong group-hover:text-link">{f.meta.title}</h3>
                <p className="text-[14px] leading-relaxed text-fg-weak">{f.meta.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
