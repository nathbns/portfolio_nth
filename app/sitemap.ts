import type { MetadataRoute } from "next";
import { getLogEntries } from "@/lib/log";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/projects", "/log", "/about", "/cv"].map(
    (path) => ({ url: `${site.url}${path}` }),
  );
  const entries = getLogEntries().map((entry) => ({
    url: `${site.url}/log/${entry.slug}`,
    lastModified: entry.date,
  }));
  return [...pages, ...entries];
}
