import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import Shell from "@/components/Shell";
import Section from "@/components/Section";
import { cv, type Entry } from "@/lib/cv";

export const metadata: Metadata = { title: "CV" };

const pdf = path.join(process.cwd(), "public", "cv.pdf");

function Row({ when, children }: { when: string; children: React.ReactNode }) {
  return (
    <div className="sm:grid sm:grid-cols-[10rem_1fr] sm:items-baseline sm:gap-4">
      <p className="font-mono text-[13px] text-muted">{when}</p>
      <div className="mt-1 sm:mt-0">{children}</div>
    </div>
  );
}

function Entries({ entries }: { entries: Entry[] }) {
  return (
    <div className="space-y-6">
      {entries.map((entry) => (
        <Row key={entry.title} when={entry.when}>
          <p>
            {entry.href ? (
              <a
                href={entry.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline hover:underline-offset-2"
              >
                {entry.title}
              </a>
            ) : (
              entry.title
            )}
            {entry.place && <span className="text-muted"> · {entry.place}</span>}
          </p>
          {entry.detail && <p className="mt-1 text-muted">{entry.detail}</p>}
        </Row>
      ))}
    </div>
  );
}

export default function CVPage() {
  const size = fs.existsSync(pdf) ? Math.round(fs.statSync(pdf).size / 1024) : null;

  return (
    <Shell>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-medium leading-none tracking-[-0.02em]">CV</h1>
        {size !== null && (
          <a
            href="/cv.pdf"
            download
            className="font-mono text-[12px] text-muted transition-colors hover:text-foreground"
          >
            cv.pdf · {size} KB ↓
          </a>
        )}
      </div>

      <Section title="Education">
        <Entries entries={cv.education} />
      </Section>

      <Section title="Projects">
        <Entries entries={cv.projects} />
      </Section>

      <Section title="Experience">
        <Entries entries={cv.experience} />
      </Section>

      <Section title="Skills">
        <div className="space-y-3">
          {cv.skills.map((skill) => (
            <Row key={skill.label} when={skill.label}>
              <p>{skill.value}</p>
            </Row>
          ))}
        </div>
      </Section>
    </Shell>
  );
}
