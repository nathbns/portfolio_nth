import { site } from "@/lib/site";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** The internship as a span on the year, drawn like the benchmark's bars. */
export default function Internship() {
  const { from, to, period, fields } = site.internship;
  const [start, end] = period.split(" to ");

  return (
    <div>
      <p>
        I&apos;m looking for one from <span className="whitespace-nowrap">{start}</span> to{" "}
        <span className="whitespace-nowrap">{end}</span>: four months, in {fields}.{" "}
        <a
          href={`mailto:${site.email}`}
          className="whitespace-nowrap underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground"
        >
          Get in touch
        </a>
      </p>

      <div className="mt-6" aria-hidden>
        <div className="grid grid-cols-12 text-center font-mono text-[11px] text-muted">
          {MONTHS.map((month, i) => (
            <span key={i} className={i + 0.5 >= from && i + 0.5 <= to ? "text-foreground" : ""}>
              {month}
            </span>
          ))}
        </div>
        <div className="relative mt-2 h-1.5 rounded-full bg-border">
          <div
            className="absolute inset-y-0 rounded-full bg-accent"
            style={{ left: `${(from / 12) * 100}%`, width: `${((to - from) / 12) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
