import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DIR = path.join(process.cwd(), "content/log");

export type LogEntry = {
  slug: string;
  title: string;
  date: string;
  content: string;
};

function toDateString(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "");
}

export function getLogEntries(): LogEntry[] {
  if (!fs.existsSync(DIR)) return [];

  return fs
    .readdirSync(DIR)
    .filter((file) => file.endsWith(".md"))
    .flatMap((file) => {
      const raw = fs.readFileSync(path.join(DIR, file), "utf8");
      const { data, content } = matter(raw);
      if (data.draft) return [];

      return [
        {
          slug: file.replace(/\.md$/, ""),
          title: String(data.title ?? file),
          date: toDateString(data.date),
          content: content.trim(),
        },
      ];
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getLogEntry(slug: string) {
  return getLogEntries().find((entry) => entry.slug === slug);
}

export function formatLogDate(date: string) {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
