import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KIND_LABEL, getSubject, url } from "@/revision/lib/content";
import { FICHES, ficheHref, fichesOf, getFiche } from "@/revision/fiches";
import { FicheCheck } from "@/revision/components/FicheCheck";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ subject: string; slug: string }> };

export function generateStaticParams() {
  return FICHES.map((f) => ({ subject: f.meta.subject, slug: f.meta.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject, slug } = await params;
  const f = getFiche(decodeURIComponent(subject), decodeURIComponent(slug));
  return { title: f ? `Fiche · ${f.meta.title}` : "Fiche" };
}

export default async function FichePage({ params }: Props) {
  const p = await params;
  const subjectSlug = decodeURIComponent(p.subject);
  const fiche = getFiche(subjectSlug, decodeURIComponent(p.slug));
  if (!fiche) notFound();
  const subject = getSubject(subjectSlug);
  const { meta, Component } = fiche;
  const related = (subject?.items ?? []).filter((i) => meta.related.includes(i.dir));
  const list = fichesOf(subjectSlug).filter((f) => f.meta.exam === meta.exam);
  const idx = list.findIndex((f) => f.meta.slug === meta.slug);
  const prev = list[idx - 1];
  const next = list[idx + 1];
  const id = `${meta.subject}/${meta.slug}`;

  return (
    <>
      <nav className="flex flex-wrap items-center font-mono text-[13px] text-fg-weak">
        <Link href={url("/")} className="hover:text-fg-strong">
          ensimag
        </Link>
        <span className="mx-2 text-fg-weaker">/</span>
        <Link href={subject?.href ?? url("/")} className="hover:text-fg-strong">
          {subject?.short ?? meta.subject}
        </Link>
        <span className="mx-2 text-fg-weaker">/</span>
        <Link href={`${subject?.href ?? url("/")}#examen`} className="hover:text-fg-strong">
          Fiches
        </Link>
      </nav>

      <header className="mt-8 max-w-3xl">
        <p className="eyebrow">
          Fiche {meta.exam === "tp" ? "examen de TP" : "de cours"} · {subject?.short} · {meta.minutes} min
        </p>
        <h1 className="mt-4 font-mono text-[clamp(1.9rem,4.2vw,3rem)] leading-[1.1] tracking-[-0.03em] text-fg-strong">
          {meta.title}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-fg-weak">{meta.summary}</p>
        {related.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 font-mono text-[12.5px]">
            {related.map((r) => (
              <Link key={r.dir} href={r.href} className="row border border-line px-3 py-1.5 text-fg hover:text-fg-strong">
                {r.videos.length > 0 ? "▶ " : ""}
                {KIND_LABEL[r.kind]}
                {r.num ?? ""} · {r.title}
              </Link>
            ))}
          </div>
        )}
      </header>

      <article className="fiche mt-12 max-w-4xl">
        <Component />
      </article>

      <div className="mt-16 flex max-w-4xl flex-wrap items-center gap-4 border-t border-line pt-6">
        <FicheCheck id={id} />
        <span className="font-mono text-[12px] text-fg-weaker">gardé dans ce navigateur</span>
      </div>

      {(prev || next) && (
        <nav className="mt-10 grid max-w-4xl gap-px border border-line bg-line sm:grid-cols-2">
          {prev ? (
            <Link href={ficheHref(prev)} className="row bg-bg p-5">
              <p className="eyebrow">← fiche précédente</p>
              <p className="mt-2 font-mono text-[15px] text-fg-strong">{prev.meta.title}</p>
            </Link>
          ) : (
            <span className="hidden bg-bg sm:block" />
          )}
          {next && (
            <Link href={ficheHref(next)} className="row bg-bg p-5 sm:text-right">
              <p className="eyebrow">fiche suivante →</p>
              <p className="mt-2 font-mono text-[15px] text-fg-strong">{next.meta.title}</p>
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
