import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Shell from "@/components/Shell";
import { formatLogDate, getLogEntries, getLogEntry } from "@/lib/log";

export function generateStaticParams() {
  return getLogEntries().map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getLogEntry(slug);
  if (!entry) return {};
  return { title: entry.title, description: entry.content.slice(0, 160) };
}

export default async function LogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getLogEntry(slug);
  if (!entry) notFound();

  return (
    <Shell>
      <Link
        href="/log"
        className="inline-flex items-center gap-2 text-[15px] text-muted hover:text-foreground"
      >
        <Image
          src="/pfp.jpg"
          alt=""
          width={32}
          height={32}
          className="size-8 rounded-full object-cover"
        />
        <span>← Log</span>
      </Link>
      <h1 className="mt-8 text-2xl font-medium leading-none tracking-[-0.02em]">
        {entry.title}
      </h1>
      <time
        dateTime={entry.date}
        className="mt-2 block text-[15px] text-muted"
      >
        {formatLogDate(entry.date)}
      </time>
      <article className="prose mt-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
      </article>
    </Shell>
  );
}
