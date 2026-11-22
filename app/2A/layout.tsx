// Mise en page de /2A dans le portfolio (copiée par scripts/publier-portfolio.py
// vers app/2A/layout.tsx). Le thème est celui du portfolio (next-themes).
import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import ThemeToggle from "@/components/ThemeToggle";
import { getSubjects, url } from "@/revision/lib/content";
import "./revision.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Ensimag 2A", template: "%s · Ensimag 2A" },
  description: "Révisions de 2e année.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function RevisionLayout({ children }: { children: React.ReactNode }) {
  const subjects = getSubjects();
  return (
    <div lang="fr" className={`rev ${inter.variable} flex min-h-screen flex-col antialiased`}>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href={url("/")} className="flex shrink-0 items-center gap-2 font-mono text-[15px] text-fg-strong">
            <span className="grid h-5 w-5 place-items-center bg-fg-strong text-[11px] text-bg">2A</span>
            ensimag
          </Link>
          <nav className="-mx-1 flex min-w-0 flex-1 items-center overflow-x-auto font-mono text-[13px]">
            {subjects.map((s) => (
              <Link key={s.slug} href={s.href} className="shrink-0 px-2.5 py-1 text-fg-weak hover:text-fg-strong">
                {s.short}
              </Link>
            ))}
            <Link href={url("/fiches")} className="shrink-0 px-2.5 py-1 text-link hover:text-fg-strong">
              Fiches
            </Link>
            <Link href={url("/videos")} className="shrink-0 px-2.5 py-1 text-fg-weak hover:text-fg-strong">
              Vidéos
            </Link>
          </nav>
          <div className="shrink-0 font-mono">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-10 sm:px-6">{children}</main>
    </div>
  );
}
