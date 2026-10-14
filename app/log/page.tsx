import type { Metadata } from "next";
import Link from "next/link";
import Shell from "@/components/Shell";
import { formatLogDate, getLogEntries } from "@/lib/log";

export const metadata: Metadata = { title: "Log" };

export default function LogIndex() {
  const entries = getLogEntries();

  return (
    <Shell>
      <h1 className="text-2xl font-medium leading-none tracking-[-0.02em]">
        Log
      </h1>
      <p className="mt-4 text-muted">
        Short notes on what I&apos;m building and learning.
      </p>

      {entries.length === 0 ? (
        <p className="mt-10 text-muted">Nothing here yet.</p>
      ) : (
        <ul className="mt-10 space-y-3">
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
      )}
    </Shell>
  );
}
