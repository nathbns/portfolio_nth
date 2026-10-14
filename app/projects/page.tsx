import type { Metadata } from "next";
import Link from "next/link";
import type { Project } from "@/lib/site";
import Shell from "@/components/Shell";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Projects" };

function ProjectItem({ project }: { project: Project }) {
  const url = project.href ?? project.github;

  return (
    <li>
      <h2 className="font-medium tracking-[-0.02em]">
        {url?.startsWith("/") ? (
          <Link href={url} className="hover:underline hover:underline-offset-2">
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
      </h2>
      <p className="mt-1 text-muted">{project.description}</p>
      <p className="mt-1 text-[13px] uppercase tracking-widest text-muted">
        {project.tags.join(" · ")}
      </p>
    </li>
  );
}

export default function ProjectsPage() {
  return (
    <Shell>
      <h1 className="text-2xl font-medium leading-none tracking-[-0.02em]">
        Projects
      </h1>
      <p className="mt-4 text-muted">
        From-scratch implementations of ideas I wanted to understand, and a
        few tools I built for myself.
      </p>
      <ul className="mt-10 space-y-8">
        {site.projects.map((project) => (
          <ProjectItem key={project.title} project={project} />
        ))}
      </ul>
    </Shell>
  );
}
