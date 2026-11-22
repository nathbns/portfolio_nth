import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KINDS, KIND_LABEL, KIND_TITLE, fileUrl, getSubject, getSubjects, url, type TpState } from "@/revision/lib/content";
import { Card, Grid } from "@/revision/components/Card";
import { FicheCheck, FicheCount } from "@/revision/components/FicheCheck";
import { ficheHref, fichesFor, fichesOf } from "@/revision/fiches";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ subject: string }> };

export function generateStaticParams() {
  return getSubjects().map((s) => ({ subject: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = getSubject(decodeURIComponent((await params).subject));
  return { title: s?.title ?? "Matière" };
}

const STATE: Record<TpState, { label: string; cls: string }> = {
  done: { label: "fait", cls: "text-ok border-ok/40" },
  partial: { label: "en partie", cls: "text-warn border-warn/40" },
  todo: { label: "à faire", cls: "text-fg-weak border-line-strong" },
  unknown: { label: "?", cls: "text-fg-weaker border-line" },
  upcoming: { label: "à venir", cls: "text-fg-weaker border-line" },
};

export default async function SubjectPage({ params }: Props) {
  const s = getSubject(decodeURIComponent((await params).subject));
  if (!s) notFound();

  const sections = KINDS.map((k) => ({ kind: k, items: s.items.filter((i) => i.kind === k) })).filter(
    (x) => x.items.length > 0,
  );
  const visual = fichesOf(s.slug);
  const groups = [
    { exam: "ecrit" as const, title: "Fiches de cours", hint: "Une fiche par cours, courte et visuelle, pour l'écrit." },
    { exam: "tp" as const, title: "Examen de TP", hint: "La méthode, le code à savoir écrire et les pièges, pour l'examen sur machine." },
  ]
    .map((g) => ({ ...g, fiches: visual.filter((f) => f.meta.exam === g.exam) }))
    .filter((g) => g.fiches.length > 0);
  const hasExamBlock = visual.length > 0 || s.fiches.length > 0;
  const nav = [
    ...(hasExamBlock ? [{ id: "examen", label: "Préparer l'examen" }] : []),
    ...sections.map((x) => ({ id: x.kind, label: `${KIND_LABEL[x.kind]} · ${x.items.length}` })),
    ...(s.tpList.length ? [{ id: "suivi", label: "Suivi des TP" }] : []),
  ];

  return (
    <>
      <nav className="font-mono text-[13px] text-fg-weak">
        <Link href={url("/")} className="hover:text-fg-strong">
          ensimag
        </Link>
        <span className="mx-2 text-fg-weaker">/</span>
        <span className="text-fg-strong">{s.short}</span>
      </nav>

      <header className="mt-8">
        <p className="eyebrow">Matière</p>
        <h1 className="mt-4 font-mono text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.1] tracking-[-0.03em] text-fg-strong">
          {s.title}
        </h1>
        {s.exam && (
          <p className="mt-4 max-w-3xl border-l-2 border-link bg-tint px-4 py-2 text-[15px] text-fg">
            <span className="font-mono text-[13px] text-fg-strong">Examen</span> · {s.exam}
          </p>
        )}
      </header>

      <div className="sticky top-14 z-10 -mx-4 mt-10 border-y border-line bg-bg/90 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex gap-6 overflow-x-auto font-mono text-[13px]">
          {nav.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="shrink-0 border-b-2 border-transparent py-3 text-fg-weak hover:border-fg-strong hover:text-fg-strong">
              {n.label}
            </a>
          ))}
        </div>
      </div>

      {hasExamBlock && (
        <section id="examen" className="scroll-mt-32 pt-14">
          <div className="mb-6 flex flex-wrap items-baseline gap-4">
            <h2 className="font-mono text-[24px] tracking-tight text-fg-strong">Préparer l&apos;examen</h2>
            {visual.length > 0 && <FicheCount ids={visual.map((f) => `${f.meta.subject}/${f.meta.slug}`)} />}
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            {groups.map((g) => (
              <div key={g.exam}>
                <p className="eyebrow">{g.title}</p>
                <p className="mt-2 text-[14px] text-fg-weak">{g.hint}</p>
                <ol className="mt-4 border-t border-line">
                  {g.fiches.map((f, k) => {
                    const cm = s.items.find((i) => i.dir === f.meta.related[0]);
                    return (
                      <li key={f.meta.slug} className="flex items-center gap-3 border-b border-line pl-3">
                        <FicheCheck id={`${f.meta.subject}/${f.meta.slug}`} compact />
                        <Link href={ficheHref(f)} className="row flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-3">
                          <span className="font-mono text-[12px] text-fg-weaker">{String(k + 1).padStart(2, "0")}</span>
                          <span className="font-mono text-[14.5px] text-fg-strong">{f.meta.title}</span>
                          <span className="ml-auto font-mono text-[11.5px] text-fg-weaker">
                            {cm ? `${KIND_LABEL[cm.kind]}${cm.num ?? ""} · ` : ""}
                            {f.meta.minutes} min
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
            {s.fiches.length > 0 && (
              <div>
                <p className="eyebrow">Aide-mémoire</p>
                <p className="mt-2 text-[14px] text-fg-weak">Les commandes et la syntaxe, sur une page.</p>
                <ul className="mt-4 border-t border-line">
                  {s.fiches.map((f) => (
                    <li key={f.path} className="border-b border-line">
                      <Link href={fileUrl(f.path)} className="row flex items-center gap-4 px-3 py-3 font-mono text-[14px] text-fg-strong">
                        {f.name.replace(/\.md$/, "").replace(/_/g, " ")}
                        <span className="ml-auto text-[12px] text-fg-weak">ouvrir →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {sections.map(({ kind, items }) => (
        <section key={kind} id={kind} className="scroll-mt-32 pt-14">
          <div className="mb-6 flex items-baseline gap-4">
            <h2 className="font-mono text-[24px] tracking-tight text-fg-strong">{KIND_TITLE[kind]}</h2>
            <span className="font-mono text-[13px] text-fg-weak">{items.length}</span>
          </div>
          <Grid>
            {items.map((i) => (
              <Card key={i.dir} item={i} hasFiche={fichesFor(i.dir).some((f) => f.meta.related[0] === i.dir)} />
            ))}
          </Grid>
        </section>
      ))}

      {sections.length === 0 && (
        <p className="mt-14 font-mono text-[14px] text-fg-weak">Aucun CM, TD ou TP dans ce dossier pour l&apos;instant.</p>
      )}

      {s.tpList.length > 0 && (
        <section id="suivi" className="scroll-mt-32 pt-16">
          <div className="mb-6 flex items-baseline gap-4">
            <h2 className="font-mono text-[24px] tracking-tight text-fg-strong">Suivi des TP</h2>
            <span className="font-mono text-[13px] text-fg-weak">
              {s.tpList.filter((t) => t.state === "done").length}/{s.tpList.length} faits
            </span>
          </div>
          {s.tpNotes.length > 0 && (
            <div className="mb-4 space-y-1 text-[14px] text-fg-weak">
              {s.tpNotes.map((n) => (
                <p key={n}>
                  {n.split(/(https?:\/\/\S+)/).map((part, i) =>
                    /^https?:\/\//.test(part) ? (
                      <a key={i} href={part} target="_blank" rel="noreferrer" className="text-link underline underline-offset-2">
                        {part}
                      </a>
                    ) : (
                      part
                    ),
                  )}
                </p>
              ))}
            </div>
          )}
          <ul className="border-t border-line">
            {s.tpList.map((t) => (
              <li key={t.name} className="grid gap-x-6 gap-y-1 border-b border-line px-3 py-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] sm:items-baseline">
                <span className="font-mono text-[14px] text-fg-strong">{t.name}</span>
                <span className="text-[14px] text-fg-weak">{t.status}</span>
                <span className={`w-fit border px-2 py-0.5 font-mono text-[12px] ${STATE[t.state].cls}`}>
                  {STATE[t.state].label}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[12px] text-fg-weaker">Source : {s.slug}/tp_liste.md</p>
        </section>
      )}

    </>
  );
}
