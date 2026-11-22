import Link from "next/link";
import { KIND_LABEL, mediaUrl, type Item } from "@/revision/lib/content";
import { Watched } from "./Watched";

/** Carte d'un CM, TD ou TP : miniature, type, titre, description, contenu. */
export function Card({
  item,
  showSubject = false,
  hasFiche = false,
}: {
  item: Item;
  showSubject?: boolean;
  hasFiche?: boolean;
}) {
  const poster = item.videos.find((v) => v.poster)?.poster;
  const label = `${KIND_LABEL[item.kind]}${item.num !== undefined ? " " + item.num : ""}`;
  const files = item.notes.length + item.code.length + item.pdfs.length;
  return (
    <Link
      href={item.href}
      className="group flex flex-col border border-line bg-raised transition-colors hover:border-line-strong"
    >
      <div className="relative aspect-video overflow-hidden border-b border-line bg-weak">
        {poster ? (
          <img
            src={mediaUrl(poster)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-4xl tracking-tight text-fg-weaker">
            {label}
          </div>
        )}
        {item.videos.length > 0 && (
          <span className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 font-mono text-[12px] text-white">
            ▶ {item.videos.length > 1 ? `${item.videos.length} vidéos` : "vidéo"}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="eyebrow">
          {label}
          {showSubject && <span className="text-fg-weaker"> · {item.subjectShort}</span>}
        </p>
        <h3 className="font-mono text-[16px] leading-snug tracking-tight text-fg-strong group-hover:text-link">
          {item.title}
        </h3>
        {item.description && <p className="line-clamp-3 text-[14px] leading-relaxed text-fg-weak">{item.description}</p>}
        <div className="mt-auto flex items-center gap-3 pt-2 font-mono text-[12px] text-fg-weaker">
          {hasFiche && <span className="text-link">◆ fiche</span>}
          {files > 0 && <span>{files} fichier{files > 1 ? "s" : ""}</span>}
          <span className="ml-auto">
            <Watched srcs={item.videos.map((v) => v.path)} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
