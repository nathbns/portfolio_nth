import { site } from "@/lib/site";

const link =
  "underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground";

/** "Grenoble INP – Ensimag, a tier-1 engineering school in France, ranked…" */
export default function School() {
  const { name, url, ranking } = site.school;
  return (
    <>
      <a href={url} target="_blank" rel="noopener noreferrer" className={link}>
        {name}
      </a>
      , a tier-1 engineering school in France,{" "}
      <a href={ranking} target="_blank" rel="noopener noreferrer" className={link}>
        ranked first for computer science by Le Figaro in 2026
      </a>
    </>
  );
}
