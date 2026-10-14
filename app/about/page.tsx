import type { Metadata } from "next";
import Link from "next/link";
import Shell from "@/components/Shell";
import School from "@/components/School";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "About" };

// Set like a typeset manual page: bold section names, an indented body,
// the page name in the running head and foot.

const built = process.env.BUILD_DATE;
const issued = built
  ? new Date(`${built}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
  : "";

const external = "underline underline-offset-2 hover:text-muted";

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-[15px] font-semibold tracking-[0.06em]">{title}</h2>
      <div className="mt-3 space-y-4 sm:pl-10">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  const { year, period, fields } = site.internship;
  const elsewhere = site.links.filter((link) => !link.href.startsWith("mailto:"));

  return (
    <Shell>
      <h1 className="sr-only">About</h1>
      <div className="flex justify-between gap-4 font-mono text-[12px] text-muted">
        <span>NATHAN(1)</span>
        <span className="hidden sm:inline">Ensimag Student Manual</span>
        <span>NATHAN(1)</span>
      </div>

      <Part title="NAME">
        <p>
          <span className="font-semibold">nathan</span> — computer science
          engineering student, concurrency, parallel computing and machine
          learning
        </p>
      </Part>

      <Part title="SYNOPSIS">
        <p className="font-mono text-[14px]">
          <span className="font-semibold">nathan</span>{" "}
          {site.about.options.map((option) => (
            <span key={option.flag}>
              <span className="whitespace-nowrap">
                [<span className="font-semibold">{option.flag}</span>]
              </span>{" "}
            </span>
          ))}
        </p>
      </Part>

      <Part title="DESCRIPTION">
        <p>
          <span className="font-semibold">nathan</span> is a computer science
          engineering student at <School />. Drawn to the layer where software
          meets the machine.
        </p>
        {site.about.description.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </Part>

      <Part title="OPTIONS">
        <dl className="space-y-4">
          {site.about.options.map((option) => (
            <div key={option.flag}>
              <dt className="font-mono text-[14px] font-semibold">{option.flag}</dt>
              <dd className="mt-1 pl-6 text-muted sm:pl-8">{option.text}</dd>
            </div>
          ))}
        </dl>
      </Part>

      <Part title="ENVIRONMENT">
        <dl className="space-y-2">
          {site.tools.map((tool) => (
            <div
              key={tool.label}
              className="sm:grid sm:grid-cols-[7.5rem_1fr] sm:items-baseline sm:gap-4"
            >
              <dt className="font-mono text-[13px] text-muted">{tool.label}</dt>
              <dd>{tool.value}</dd>
            </div>
          ))}
        </dl>
      </Part>

      <Part title="AVAILABILITY">
        <p>
          An internship from {period} {year}, four months, in {fields}.{" "}
          <a href={`mailto:${site.email}`} className={external}>
            Get in touch
          </a>
          <span className="text-muted"> · </span>
          <Link href="/cv" className={external}>
            CV
          </Link>
        </p>
      </Part>

      <Part title="SEE ALSO">
        <p className="font-mono text-[14px]">
          <Link href="/projects" className={external}>
            projects
          </Link>
          (7),{" "}
          {elsewhere.map((link, index) => (
            <span key={link.href}>
              <a href={link.href} target="_blank" rel="noopener noreferrer" className={external}>
                {link.label.toLowerCase()}
              </a>
              (1){index < elsewhere.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </Part>

      <div className="mt-12 flex justify-between gap-4 font-mono text-[12px] text-muted">
        <span>Grenoble</span>
        <span>{issued}</span>
        <span>NATHAN(1)</span>
      </div>
    </Shell>
  );
}
