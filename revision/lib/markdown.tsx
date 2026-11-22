// Rendu Markdown des fichiers du dépôt, avec réécriture des liens relatifs :
// un lien vers un dossier de TP ouvre sa page, un .md ou un .c ouvre la
// visionneuse, une vidéo ou un PDF est servi par /media.
import path from "node:path";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import type { Element } from "hast";
import { mediaUrl, routeFor } from "./content";

function resolve(dir: string, href: string): { href: string; external: boolean } {
  if (/^(https?:|mailto:)/.test(href)) return { href, external: true };
  if (href.startsWith("#") || href.startsWith("/")) return { href, external: false };
  const [p, hash] = href.split("#");
  let target: string;
  try {
    target = path.posix.normalize(path.posix.join(dir, decodeURIComponent(p))).replace(/\/$/, "");
  } catch {
    return { href, external: false };
  }
  if (!target || target.startsWith("..")) return { href, external: false };
  return { href: routeFor(target) + (hash ? "#" + hash : ""), external: false };
}

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export function Markdown({
  source,
  file,
  stripTitle = false,
  idPrefix = "",
}: {
  source: string;
  file: string; // chemin du fichier Markdown, relatif au dépôt
  stripTitle?: boolean;
  /** Préfixe des identifiants de titres, quand plusieurs documents sont sur la même page. */
  idPrefix?: string;
}) {
  const heading = (Tag: HeadingTag) =>
    function H({ id, children }: { id?: string; children?: React.ReactNode }) {
      return <Tag id={id ? idPrefix + id : undefined}>{children}</Tag>;
    };
  const dir = path.posix.dirname(file);
  const text = stripTitle ? source.replace(/^\s*#\s+.+\n/, "") : source;
  return (
    <div className="doc">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeHighlight, { detect: false }]]}
        components={{
          h1: heading("h1"),
          h2: heading("h2"),
          h3: heading("h3"),
          h4: heading("h4"),
          h5: heading("h5"),
          h6: heading("h6"),
          a({ href = "", children, node }) {
            if (href.startsWith("#")) return <a href={"#" + idPrefix + href.slice(1)}>{children}</a>;
            const r = resolve(dir, href);
            // La miniature cliquable des README est remplacée par le lecteur de la page.
            const hasImg = (node as Element | undefined)?.children?.some(
              (c) => c.type === "element" && c.tagName === "img",
            );
            if (hasImg && /\.(mp4|webm)(#.*)?$/i.test(href)) return null;
            if (r.external)
              return (
                <a href={r.href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              );
            if (r.href.startsWith(mediaUrl("")) || r.href.startsWith("#"))
              return <a href={r.href}>{children}</a>;
            return <Link href={r.href}>{children}</Link>;
          },
          img({ src = "", alt }) {
            const s = typeof src === "string" ? src : "";
            const url = /^(https?:|\/)/.test(s)
              ? s
              : mediaUrl(path.posix.normalize(path.posix.join(dir, decodeURIComponent(s))));
            return <img src={url} alt={alt ?? ""} loading="lazy" />;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
