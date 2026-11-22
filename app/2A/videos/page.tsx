import type { Metadata } from "next";
import Link from "next/link";
import { KIND_LABEL, getSubjects, mediaUrl } from "@/revision/lib/content";
import { Watched } from "@/revision/components/Watched";

export const dynamic = "force-static";
export const dynamicParams = false;
export const metadata: Metadata = { title: "Vidéos" };

export default function VideosPage() {
  const subjects = getSubjects();
  const total = subjects.reduce((n, s) => n + s.items.reduce((m, i) => m + i.videos.length, 0), 0);
  return (
    <>
      <header>
        <p className="eyebrow">Toutes les vidéos</p>
        <h1 className="mt-4 font-mono text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.1] tracking-[-0.03em] text-fg-strong">
          {total} vidéos de révision
        </h1>
        <p className="mt-4 text-[16px] text-fg-weak">Par matière, dans l&apos;ordre : CM, puis TD, puis TP.</p>
      </header>
      {subjects.map((s) => {
        const vids = s.items.flatMap((i) => i.videos.map((v) => ({ v, i })));
        if (vids.length === 0) return null;
        return (
          <section key={s.slug} className="pt-14">
            <div className="mb-5 flex items-baseline gap-4 border-b border-line pb-3">
              <h2 className="font-mono text-[22px] tracking-tight text-fg-strong">
                <Link href={s.href} className="hover:text-link">
                  {s.title}
                </Link>
              </h2>
              <span className="font-mono text-[13px] text-fg-weak">{vids.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {vids.map(({ v, i }) => (
                <Link key={v.path} href={i.href} className="group block">
                  <div className="relative aspect-video overflow-hidden border border-line bg-weak">
                    {v.poster ? (
                      <img src={mediaUrl(v.poster)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="grid h-full place-items-center font-mono text-2xl text-fg-weaker">▶</div>
                    )}
                  </div>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-fg-weak">
                    {KIND_LABEL[i.kind]}
                    {i.num ?? ""} · {v.label}
                  </p>
                  <p className="mt-1 text-[14px] leading-snug text-fg-strong group-hover:text-link">{i.title}</p>
                  <Watched srcs={[v.path]} />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
