import Link from "next/link";
import Shell from "@/components/Shell";
import Section from "@/components/Section";
import Benchmark from "@/components/Benchmark";
import Internship from "@/components/Internship";
import Bio from "@/components/Bio";
import { site } from "@/lib/site";
import { formatLogDate, getLogEntries } from "@/lib/log";

export default function Home() {
  const entries = getLogEntries().slice(0, 3);
  const featured = site.projects.filter((project) => project.featured);

  return (
    <Shell>
      <h1 className="sr-only">{site.name}</h1>

      <p className="text-muted">
        {site.links.map((link, index) => (
          <span key={link.href}>
            {index > 0 && <span aria-hidden> · </span>}
            <a
              href={link.href}
              className="hover:text-foreground hover:underline hover:underline-offset-2"
            >
              {link.label}
            </a>
          </span>
        ))}
      </p>

      <div className="mt-12">
        <Bio />
      </div>

      <Section title={`Internship · ${site.internship.year}`}>
        <Internship />
      </Section>


      {featured.length > 0 && (
        <Section title="Selected work">
          <ul className="space-y-4">
            {featured.map((project) => {
              const url = project.href ?? project.github;
              return (
                <li key={project.title}>
                  {url?.startsWith("/") ? (
                    <Link
                      href={url}
                      className="hover:underline hover:underline-offset-2"
                    >
                      {project.title}
                    </Link>
                  ) : url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline hover:underline-offset-2"
                    >
                      {project.title}
                    </a>
                  ) : (
                    project.title
                  )}
                  <p className="text-muted">{project.description}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-[15px]">
            <Link
              href="/projects"
              className="text-muted hover:text-foreground"
            >
              All projects →
            </Link>
          </p>
        </Section>
      )}

      <Section title="On your machine">
        <Benchmark />
        <p className="mt-4 text-muted">
          Press run and the page starts one Web Worker per logical core, then
          times the same integer loop split 1, 2, 4… ways. The tick on each bar
          is perfect scaling; a bar that stops short of it, or runs past it, is
          your hardware: performance and efficiency cores, clocks that change
          as cores wake up, whatever else the system is running. The serial
          fraction is the Karp–Flatt metric those timings imply. Nothing leaves
          the page.
        </p>
      </Section>

      {entries.length > 0 && (
        <Section title="Writing">
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.slug}
                className="grid grid-cols-[1fr_auto] items-baseline gap-4"
              >
                <Link
                  href={`/log/${entry.slug}`}
                  className="hover:underline hover:underline-offset-2"
                >
                  {entry.title}
                </Link>
                <time dateTime={entry.date} className="text-[15px] text-muted">
                  {formatLogDate(entry.date)}
                </time>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[15px]">
            <Link href="/log" className="text-muted hover:text-foreground">
              All writing →
            </Link>
          </p>
        </Section>
      )}
    </Shell>
  );
}
