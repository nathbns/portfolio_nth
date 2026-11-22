import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import fs from "node:fs";
import hljs from "highlight.js/lib/common";
import scheme from "highlight.js/lib/languages/scheme";
import { KIND_LABEL, getSubject, itemOf, mediaUrl, safeAbs, url, viewableFiles } from "@/revision/lib/content";
import { Markdown } from "@/revision/lib/markdown";

export const dynamic = "force-static";
export const dynamicParams = false;

hljs.registerLanguage("scheme", scheme);

const LANG: Record<string, string> = {
  c: "c", h: "c", cpp: "cpp", hpp: "cpp", cc: "cpp", go: "go", mod: "go", sql: "sql", py: "python",
  scm: "scheme", sh: "bash", java: "java", rb: "ruby", js: "javascript", ts: "typescript",
  json: "json", yaml: "yaml", yml: "yaml", makefile: "makefile", s: "x86asm", asm: "x86asm",
};

type Props = { params: Promise<{ path: string[] }> };

export function generateStaticParams() {
  return viewableFiles().map((p) => ({ path: p.split("/") }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = (await params).path;
  return { title: decodeURIComponent(p[p.length - 1] ?? "Fichier") };
}

export default async function FilePage({ params }: Props) {
  const segments = (await params).path;
  const full = safeAbs(segments);
  if (!full || !fs.existsSync(full) || !fs.statSync(full).isFile()) notFound();
  const rel = segments.map((s) => decodeURIComponent(s)).join("/");
  const name = rel.split("/").pop()!;
  const ext = name === "Makefile" ? "makefile" : name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  const stat = fs.statSync(full);

  const owner = itemOf(rel);
  const subject = owner?.subject ?? getSubject(rel.split("/")[0]);

  let body: React.ReactNode;
  if (ext === "pdf") {
    body = <iframe src={mediaUrl(rel)} className="h-[80vh] w-full border border-line bg-white" title={name} />;
  } else if (stat.size > 2_000_000) {
    body = <p className="font-mono text-[14px] text-fg-weak">Fichier trop gros pour être affiché.</p>;
  } else {
    const text = fs.readFileSync(full, "utf8");
    if (ext === "md") {
      body = <Markdown source={text} file={rel} />;
    } else {
      const lang = LANG[ext];
      const html = lang && hljs.getLanguage(lang) ? hljs.highlight(text, { language: lang }).value : hljs.highlight(text, { language: "plaintext" }).value;
      const lines = text.split("\n").length;
      body = (
        <div className="doc">
          <pre className="!p-0">
            <div className="flex">
              <div aria-hidden className="select-none border-r border-line px-3 py-4 text-right font-mono text-[13px] leading-[20px] text-fg-weaker">
                {Array.from({ length: lines }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <code className="hljs block flex-1 overflow-x-auto px-4 py-4 font-mono !text-[13px] !leading-[20px]" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </pre>
        </div>
      );
    }
  }

  return (
    <>
      <nav className="flex flex-wrap items-center font-mono text-[13px] text-fg-weak">
        <Link href={url("/")} className="hover:text-fg-strong">
          ensimag
        </Link>
        {subject && (
          <>
            <span className="mx-2 text-fg-weaker">/</span>
            <Link href={subject.href} className="hover:text-fg-strong">
              {subject.short}
            </Link>
          </>
        )}
        {owner && (
          <>
            <span className="mx-2 text-fg-weaker">/</span>
            <Link href={owner.item.href} className="hover:text-fg-strong">
              {KIND_LABEL[owner.item.kind]}
              {owner.item.num ?? ""} {owner.item.title}
            </Link>
          </>
        )}
      </nav>
      <header className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow">{ext === "md" ? "Document" : ext === "pdf" ? "PDF" : "Fichier"}</p>
          <h1 className="mt-3 break-all font-mono text-[clamp(1.4rem,3vw,2rem)] tracking-tight text-fg-strong">{name}</h1>
        </div>
        <a href={mediaUrl(rel)} target="_blank" rel="noreferrer" className="border border-line px-3 py-1.5 font-mono text-[12px] text-fg-weak hover:border-line-strong hover:text-fg-strong">
          fichier brut ↗
        </a>
      </header>
      <div className={`mt-10 ${ext === "md" ? "max-w-3xl" : ""}`}>{body}</div>
    </>
  );
}
