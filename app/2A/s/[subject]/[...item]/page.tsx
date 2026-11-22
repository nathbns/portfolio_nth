import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  KIND_LABEL,
  KIND_TITLE,
  fileUrl,
  getItem,
  mediaUrl,
  readRepoFile,
  relatedItems,
  url,
  getSubjects,
  type FileRef,
  type Item,
} from "@/revision/lib/content";
import { Markdown } from "@/revision/lib/markdown";
import { headings, matchChapter, type Doc } from "@/revision/lib/anchors";
import { ficheHref, fichesFor } from "@/revision/fiches";
import { ItemViewer, type ViewerTab, type ViewerVideo } from "@/revision/components/ItemViewer";
import { FicheCheck } from "@/revision/components/FicheCheck";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ subject: string; item: string[] }> };

export function generateStaticParams() {
  return getSubjects().flatMap((s) => s.items.map((i) => ({ subject: s.slug, item: i.slug })));
}

async function load(params: Props["params"]) {
  const p = await params;
  return getItem(decodeURIComponent(p.subject), p.item.map((s) => decodeURIComponent(s)));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await load(params);
  return { title: r ? `${KIND_LABEL[r.item.kind]}${r.item.num ?? ""} ${r.item.title}` : "Introuvable" };
}

function size(n: number) {
  return n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} Mo` : n > 1000 ? `${Math.round(n / 1000)} ko` : `${n} o`;
}

const label = (i: Item) => `${KIND_LABEL[i.kind]}${i.num !== undefined ? " " + i.num : ""}`;

/** Libellé court d'un document : son premier titre, sinon son nom de fichier. */
function docLabel(f: FileRef, text: string): string {
  if (/corrig/i.test(f.name)) return "Corrigé";
  const q = f.name.match(/question(\d+)/i);
  if (q) return `Partie ${q[1]}`;
  const h = text.match(/^#{1,3}\s+(.+)$/m)?.[1]?.replace(/[`*]/g, "").trim();
  const base = f.name.replace(/\.(md|txt)$/, "");
  if (!h) return base;
  return h.length > 28 ? h.slice(0, 27) + "…" : h;
}

function FileRows({ files, media = false }: { files: FileRef[]; media?: boolean }) {
  return (
    <ul className="border-t border-line">
      {files.map((f) => {
        const inner = (
          <>
            <span className="min-w-0 break-all font-mono text-[13px] text-fg-strong">{f.name}</span>
            <span className="ml-auto shrink-0 font-mono text-[11px] text-fg-weaker">{size(f.size)}</span>
          </>
        );
        return (
          <li key={f.path} className="border-b border-line">
            {media ? (
              <a href={mediaUrl(f.path)} target="_blank" rel="noreferrer" className="row flex items-baseline gap-3 px-3 py-2.5">
                {inner}
              </a>
            ) : (
              <Link href={fileUrl(f.path)} className="row flex items-baseline gap-3 px-3 py-2.5">
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default async function ItemPage({ params }: Props) {
  const r = await load(params);
  if (!r) notFound();
  const { subject, item } = r;

  const tabs: ViewerTab[] = [];
  const docs: Doc[] = [];

  // 1. La fiche visuelle du cours (pour un CM, elle passe en premier).
  const fiches = fichesFor(item.dir);
  const own = fiches.filter((f) => f.meta.related[0] === item.dir);
  const ficheTabs: ViewerTab[] = [];
  for (const f of own) {
    const C = f.Component;
    ficheTabs.push({
      id: `fiche-${f.meta.slug}`,
      label: own.length > 1 ? `Fiche : ${f.meta.title}` : "Fiche",
      content: (
        <>
          <article className="fiche">
            <C />
          </article>
          <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-line pt-6">
            <FicheCheck id={`${f.meta.subject}/${f.meta.slug}`} />
            <Link href={ficheHref(f)} className="font-mono text-[12px] text-fg-weak hover:text-fg-strong">
              ouvrir la fiche en plein écran ↗
            </Link>
          </div>
        </>
      ),
    });
  }

  // 2. Les notes : README, réponses (questionN.md), corrigé.
  const readme = item.readme ? readRepoFile(item.readme) : undefined;
  const readmeBody = readme
    ?.replace(/^\s*#\s+.+\n/, "")
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "")
    .trim();
  const readmeTab =
    readme && readmeBody && readmeBody.length > 40
      ? {
          id: "notes",
          label: item.kind === "tp" ? "Le TP" : "Notes",
          content: <Markdown source={readme} file={item.readme!} stripTitle idPrefix="notes-" />,
        }
      : undefined;
  if (readmeTab) docs.push({ tab: "notes", prefix: "notes-", headings: headings(readme!, true) });

  const noteTabs: ViewerTab[] = [];
  item.notes.forEach((f, k) => {
    const text = readRepoFile(f.path);
    if (text === undefined) return;
    const id = `doc${k}`;
    const prefix = `${id}-`;
    if (f.ext === "md") {
      docs.push({ tab: id, prefix, headings: headings(text) });
      noteTabs.push({
        id,
        label: docLabel(f, text),
        file: fileUrl(f.path),
        content: (
          <>
            <p className="mb-6 font-mono text-[12px] text-fg-weaker">
              <Link href={fileUrl(f.path)} className="hover:text-fg-strong">
                {f.name} ↗
              </Link>
            </p>
            <Markdown source={text} file={f.path} idPrefix={prefix} />
          </>
        ),
      });
    } else {
      noteTabs.push({
        id,
        label: docLabel(f, ""),
        file: fileUrl(f.path),
        content: (
          <pre className="overflow-x-auto border border-line bg-weak p-4 font-mono text-[13px] leading-relaxed text-fg">{text}</pre>
        ),
      });
    }
  });
  // Pour un TD, le corrigé passe avant les notes.
  const corrige = noteTabs.filter((t) => t.label === "Corrigé");
  const others = noteTabs.filter((t) => t.label !== "Corrigé");
  // Pour un CM, la fiche passe en premier ; pour un TD ou un TP, après les notes
  // (elle contient la correction).
  if (item.kind === "cm") tabs.push(...ficheTabs);
  tabs.push(...corrige);
  if (readmeTab) tabs.push(readmeTab);
  tabs.push(...others);
  if (item.kind !== "cm") tabs.push(...ficheTabs);

  // 3. Sujet (PDF) et code.
  if (item.pdfs.length > 0) {
    tabs.push({
      id: "sujet",
      label: item.kind === "cm" ? "Diapositives" : "Sujet",
      content: (
        <div className="space-y-4">
          <iframe src={mediaUrl(item.pdfs[0].path)} title={item.pdfs[0].name} className="h-[78vh] w-full border border-line bg-white" />
          <FileRows files={item.pdfs} media />
        </div>
      ),
    });
  }
  if (item.code.length > 0) {
    tabs.push({
      id: "code",
      label: `Code · ${item.code.length}`,
      content: <FileRows files={item.code} />,
    });
  }

  // 4. Ce qui est lié : autres CM/TD/TP et fiches.
  const related = relatedItems(subject, item);
  const otherFiches = fiches.filter((f) => f.meta.related[0] !== item.dir);
  if (related.length + otherFiches.length > 0) {
    tabs.push({
      id: "lies",
      label: `Liés · ${related.length + otherFiches.length}`,
      content: (
        <ul className="border-t border-line">
          {otherFiches.map((f) => (
            <li key={f.meta.slug} className="border-b border-line">
              <Link href={ficheHref(f)} className="row flex flex-wrap items-baseline gap-x-4 gap-y-1 px-3 py-3">
                <span className="font-mono text-[12px] uppercase tracking-wider text-link">Fiche</span>
                <span className="text-fg-strong">{f.meta.title}</span>
              </Link>
            </li>
          ))}
          {related.map((i) => (
            <li key={i.dir} className="border-b border-line">
              <Link href={i.href} className="row flex flex-wrap items-baseline gap-x-4 gap-y-1 px-3 py-3">
                <span className="font-mono text-[12px] uppercase tracking-wider text-fg-weak">{label(i)}</span>
                <span className="text-fg-strong">{i.title}</span>
                {i.videos.length > 0 && <span className="ml-auto font-mono text-[12px] text-fg-weak">▶ {i.videos.length}</span>}
              </Link>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (tabs.length === 0) {
    tabs.push({
      id: "vide",
      label: "Notes",
      content: <p className="font-mono text-[14px] text-fg-weak">Pas encore de notes pour ce {KIND_LABEL[item.kind]}.</p>,
    });
  }

  const videos: ViewerVideo[] = item.videos.map((v) => ({
    src: v.path,
    url: mediaUrl(v.path),
    poster: v.poster ? mediaUrl(v.poster) : undefined,
    label: v.label,
    chapters: v.chapters.map((c) => ({ ...c, target: matchChapter(c.title, docs) })),
  }));

  const siblings = subject.items.filter((i) => i.kind === item.kind);
  const idx = siblings.findIndex((i) => i.dir === item.dir);
  const prev = siblings[idx - 1];
  const next = siblings[idx + 1];

  return (
    <>
      <nav className="flex flex-wrap items-center font-mono text-[13px] text-fg-weak">
        <Link href={url("/")} className="hover:text-fg-strong">
          ensimag
        </Link>
        <span className="mx-2 text-fg-weaker">/</span>
        <Link href={subject.href} className="hover:text-fg-strong">
          {subject.short}
        </Link>
        <span className="mx-2 text-fg-weaker">/</span>
        <Link href={`${subject.href}#${item.kind}`} className="hover:text-fg-strong">
          {KIND_TITLE[item.kind]}
        </Link>
      </nav>

      <header className="mt-6 max-w-5xl">
        <p className="eyebrow">
          {label(item)} · {subject.short}
        </p>
        <h1 className="mt-3 font-mono text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.15] tracking-[-0.03em] text-fg-strong">
          {item.title}
        </h1>
        {item.description && <p className="mt-3 text-[15.5px] leading-relaxed text-fg-weak">{item.description}</p>}
      </header>

      <ItemViewer
        videos={videos}
        tabs={tabs}
        initialTab={tabs[0].id}
        title={`${label(item)} · ${item.title}`}
        href={item.href}
      />

      {(prev || next) && (
        <nav className="mt-20 grid gap-px border border-line bg-line sm:grid-cols-2">
          {prev ? (
            <Link href={prev.href} className="row bg-bg p-5">
              <p className="eyebrow">← {label(prev)}</p>
              <p className="mt-2 font-mono text-[15px] text-fg-strong">{prev.title}</p>
            </Link>
          ) : (
            <span className="hidden bg-bg sm:block" />
          )}
          {next && (
            <Link href={next.href} className="row bg-bg p-5 sm:text-right">
              <p className="eyebrow">{label(next)} →</p>
              <p className="mt-2 font-mono text-[15px] text-fg-strong">{next.title}</p>
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
